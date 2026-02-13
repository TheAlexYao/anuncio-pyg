"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { decrypt } from "./lib/crypto";
import type { Doc, Id } from "./_generated/dataModel";

interface MetaLeadsResponse {
  data?: Array<{
    id: string;
    form_id: string;
    field_data: Array<{ name: string; values: string[] }>;
    created_time: string;
    ad_id?: string;
    campaign_id?: string;
  }>;
  paging?: { next?: string };
}

interface MetaFormsResponse {
  data?: Array<{
    id: string;
    name: string;
  }>;
}

// Sync leads for a single account
export const syncAccountLeads = internalAction({
  args: { accountId: v.id("connected_accounts") },
  handler: async (ctx, args) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error("ENCRYPTION_KEY not set");

    const account = await ctx.runQuery(internal.metaSyncHelpers.getAccount, { accountId: args.accountId });
    if (!account) throw new Error("Account not found");

    const accessToken = decrypt(account.encryptedAccessToken, encryptionKey);

    // Get all lead forms for the account
    const formsUrl = `https://graph.facebook.com/v21.0/${account.platformAccountId}/leadgen_forms?fields=id,name&access_token=${accessToken}`;
    const formsRes = await fetch(formsUrl);
    if (!formsRes.ok) {
      const err = await formsRes.text();
      throw new Error(`Failed to fetch lead forms: ${err}`);
    }
    const formsData = (await formsRes.json()) as MetaFormsResponse;

    let totalLeads = 0;

    for (const form of formsData.data || []) {
      // Fetch leads for each form
      const leadsUrl = `https://graph.facebook.com/v21.0/${form.id}/leads?fields=id,field_data,created_time,ad_id,campaign_id&access_token=${accessToken}`;
      const leadsRes = await fetch(leadsUrl);
      if (!leadsRes.ok) continue;

      const leadsData = (await leadsRes.json()) as MetaLeadsResponse;

      for (const lead of leadsData.data || []) {
        // Convert field_data to object
        const fields: Record<string, string> = {};
        for (const field of lead.field_data || []) {
          fields[field.name] = field.values[0] || "";
        }

        await ctx.runMutation(internal.metaLeadHelpers.upsertLead, {
          accountId: args.accountId,
          platformLeadId: lead.id,
          formId: form.id,
          formName: form.name,
          campaignId: lead.campaign_id,
          adId: lead.ad_id,
          fields,
          createdTime: lead.created_time,
        });
        totalLeads++;
      }
    }

    return { success: true, totalLeads };
  },
});

// Sync all Meta accounts
export const syncAllMetaLeads = internalAction({
  args: {},
  handler: async (ctx): Promise<Array<{ accountId: Id<"connected_accounts">; success: boolean; totalLeads?: number; error?: string }>> => {
    const accounts = await ctx.runQuery(internal.metaSyncHelpers.getAllMetaAccounts, {}) as Doc<"connected_accounts">[];

    const results: Array<{ accountId: Id<"connected_accounts">; success: boolean; totalLeads?: number; error?: string }> = [];
    for (const account of accounts) {
      try {
        const result = await ctx.runAction(internal.metaLeadSync.syncAccountLeads, {
          accountId: account._id,
        }) as { success: boolean; totalLeads: number };
        results.push({ accountId: account._id, ...result });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({ accountId: account._id, success: false, error: message });
      }
    }

    return results;
  },
});
