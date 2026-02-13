"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createDecipheriv } from "crypto";

function decrypt(ciphertext: string, keyHex: string): string {
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Invalid ciphertext");
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
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

    // Get lead forms for this ad account
    const formsUrl = `https://graph.facebook.com/v21.0/${account.platformAccountId}/leadgen_forms?access_token=${accessToken}`;
    const formsRes = await fetch(formsUrl);
    if (!formsRes.ok) {
      const err = await formsRes.text();
      throw new Error(`Failed to fetch lead forms: ${err}`);
    }
    const formsData = await formsRes.json();

    let totalLeads = 0;
    let newLeads = 0;

    // For each form, get recent leads
    for (const form of formsData.data || []) {
      const leadsUrl = `https://graph.facebook.com/v21.0/${form.id}/leads?access_token=${accessToken}`;
      const leadsRes = await fetch(leadsUrl);
      if (!leadsRes.ok) continue;

      const leadsData = await leadsRes.json();

      for (const lead of leadsData.data || []) {
        totalLeads++;

        // Check if lead already exists
        const exists = await ctx.runQuery(internal.metaLeadHelpers.leadExists, {
          platformLeadId: lead.id,
        });

        if (!exists) {
          // Parse field data
          const fields: Record<string, string> = {};
          for (const field of lead.field_data || []) {
            fields[field.name] = field.values?.[0] || "";
          }

          await ctx.runMutation(internal.metaLeadHelpers.insertLead, {
            accountId: args.accountId,
            platformLeadId: lead.id,
            formId: form.id,
            formName: form.name,
            campaignId: lead.campaign_id,
            adId: lead.ad_id,
            fields,
            createdTime: lead.created_time,
          });
          newLeads++;
        }
      }
    }

    return { success: true, totalLeads, newLeads };
  },
});

// Sync all accounts
export const syncAllMetaLeads = action({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.runQuery(internal.metaSyncHelpers.getAllMetaAccounts, {});

    const results = [];
    for (const account of accounts) {
      try {
        const result = await ctx.runAction(internal.metaLeadSync.syncAccountLeads, {
          accountId: account._id,
        });
        results.push({ accountId: account._id, ...result });
      } catch (error: any) {
        results.push({ accountId: account._id, success: false, error: error.message });
      }
    }

    return results;
  },
});
