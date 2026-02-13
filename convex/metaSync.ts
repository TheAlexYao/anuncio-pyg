"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { createDecipheriv } from "crypto";

// Decrypt helper
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

// Fetch campaign insights for a single account
export const syncAccountCampaigns = internalAction({
  args: { accountId: v.id("connected_accounts") },
  handler: async (ctx, args) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error("ENCRYPTION_KEY not set");

    // Get account
    const account = await ctx.runQuery(internal.metaSyncHelpers.getAccount, { accountId: args.accountId });
    if (!account) throw new Error("Account not found");

    const accessToken = decrypt(account.encryptedAccessToken, encryptionKey);

    // Fetch campaigns with insights for last 30 days
    const datePreset = "last_30d";
    const fields = "campaign_name,impressions,clicks,spend,actions";
    const url = `https://graph.facebook.com/v21.0/${account.platformAccountId}/insights?fields=${fields}&date_preset=${datePreset}&level=campaign&time_increment=1&access_token=${accessToken}`;

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch insights: ${err}`);
    }
    const data = await res.json();

    // Process each day's data
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
      // Parse actions for leads/conversions
      let leads = 0;
      let conversions = 0;
      for (const action of row.actions || []) {
        if (action.action_type === "lead") leads += parseInt(action.value) || 0;
        if (action.action_type === "purchase" || action.action_type === "complete_registration") {
          conversions += parseInt(action.value) || 0;
        }
      }

      metrics.push({
        platformCampaignId: row.campaign_id,
        campaignName: row.campaign_name,
        date: row.date_start, // YYYY-MM-DD
        impressions: parseInt(row.impressions) || 0,
        clicks: parseInt(row.clicks) || 0,
        spend: Math.round(parseFloat(row.spend) * 100), // Convert to cents
        leads,
        conversions,
      });
    }

    // Store metrics
    await ctx.runMutation(internal.metaSyncHelpers.storeCampaignMetrics, {
      accountId: args.accountId,
      currency: account.platformAccountId.includes("act_") ? "USD" : "USD", // TODO: get from account
      metrics,
    });

    // Update lastSyncAt
    await ctx.runMutation(internal.metaSyncHelpers.updateLastSync, { accountId: args.accountId });

    return { success: true, metricsCount: metrics.length };
  },
});

// Sync all connected Meta accounts
export const syncAllMetaAccounts = action({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.runQuery(internal.metaSyncHelpers.getAllMetaAccounts, {});
    
    const results = [];
    for (const account of accounts) {
      try {
        const result = await ctx.runAction(internal.metaSync.syncAccountCampaigns, {
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
