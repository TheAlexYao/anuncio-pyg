"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { decrypt } from "./lib/crypto";
import type { Doc, Id } from "./_generated/dataModel";

interface MetaInsightsResponse {
  data?: Array<{
    campaign_id?: string;
    campaign_name?: string;
    date_start?: string;
    impressions?: string;
    clicks?: string;
    spend?: string;
    actions?: Array<{ action_type: string; value: string }>;
  }>;
}

// Fetch campaign insights for a single account
export const syncAccountCampaigns = internalAction({
  args: { accountId: v.id("connected_accounts") },
  handler: async (ctx, args) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error("ENCRYPTION_KEY not set");

    const account = await ctx.runQuery(internal.metaSyncHelpers.getAccount, { accountId: args.accountId });
    if (!account) throw new Error("Account not found");

    const accessToken = decrypt(account.encryptedAccessToken, encryptionKey);

    const datePreset = "last_30d";
    const fields = "campaign_name,impressions,clicks,spend,actions";
    const url = `https://graph.facebook.com/v21.0/${account.platformAccountId}/insights?fields=${fields}&date_preset=${datePreset}&level=campaign&time_increment=1&access_token=${accessToken}`;

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch insights: ${err}`);
    }
    const data = (await res.json()) as MetaInsightsResponse;

    const metrics: Array<{
      platformCampaignId: string;
      campaignName: string;
      date: string;
      impressions: number;
      clicks: number;
      spend: number;
      leads: number;
      conversions: number;
    }> = [];

    for (const row of data.data || []) {
      let leads = 0;
      let conversions = 0;
      for (const action of row.actions || []) {
        if (action.action_type === "lead") leads += parseInt(action.value) || 0;
        if (action.action_type === "purchase" || action.action_type === "complete_registration") {
          conversions += parseInt(action.value) || 0;
        }
      }

      metrics.push({
        platformCampaignId: row.campaign_id || "",
        campaignName: row.campaign_name || "",
        date: row.date_start || "",
        impressions: parseInt(row.impressions || "0") || 0,
        clicks: parseInt(row.clicks || "0") || 0,
        spend: Math.round(parseFloat(row.spend || "0") * 100),
        leads,
        conversions,
      });
    }

    await ctx.runMutation(internal.metaSyncHelpers.storeCampaignMetrics, {
      accountId: args.accountId,
      currency: "USD",
      metrics,
    });

    await ctx.runMutation(internal.metaSyncHelpers.updateLastSync, { accountId: args.accountId });

    return { success: true, metricsCount: metrics.length };
  },
});

// Sync all connected Meta accounts
export const syncAllMetaAccounts = internalAction({
  args: {},
  handler: async (ctx): Promise<Array<{ accountId: Id<"connected_accounts">; success: boolean; metricsCount?: number; error?: string }>> => {
    const accounts = await ctx.runQuery(internal.metaSyncHelpers.getAllMetaAccounts, {}) as Doc<"connected_accounts">[];
    
    const results: Array<{ accountId: Id<"connected_accounts">; success: boolean; metricsCount?: number; error?: string }> = [];
    for (const account of accounts) {
      try {
        const result = await ctx.runAction(internal.metaSync.syncAccountCampaigns, {
          accountId: account._id,
        }) as { success: boolean; metricsCount: number };
        results.push({ accountId: account._id, ...result });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({ accountId: account._id, success: false, error: message });
      }
    }

    return results;
  },
});
