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

// Sync campaigns for a single Google Ads account
export const syncAccountCampaigns = internalAction({
  args: { accountId: v.id("connected_accounts") },
  handler: async (ctx, args) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const mccCustomerId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID;

    if (!encryptionKey || !developerToken) {
      throw new Error("Missing credentials");
    }

    const account = await ctx.runQuery(internal.metaSyncHelpers.getAccount, { accountId: args.accountId });
    if (!account) throw new Error("Account not found");

    const accessToken = decrypt(account.encryptedAccessToken, encryptionKey);
    const customerId = account.platformAccountId;

    // Get campaign performance for last 30 days using Google Ads Query Language
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY segments.date DESC
    `;

    const url = `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "login-customer-id": mccCustomerId || customerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch campaigns: ${err}`);
    }

    const data = await res.json();
    const metrics: Array<{
      platformCampaignId: string;
      campaignName: string;
      date: string;
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
    }> = [];

    // Process response (streaming format returns array of batches)
    for (const batch of data || []) {
      for (const row of batch.results || []) {
        metrics.push({
          platformCampaignId: row.campaign?.id || "",
          campaignName: row.campaign?.name || "",
          date: row.segments?.date || "",
          impressions: parseInt(row.metrics?.impressions) || 0,
          clicks: parseInt(row.metrics?.clicks) || 0,
          spend: Math.round((parseInt(row.metrics?.costMicros) || 0) / 10000), // micros to cents
          conversions: Math.round(parseFloat(row.metrics?.conversions) || 0),
        });
      }
    }

    // Store metrics
    await ctx.runMutation(internal.googleAdsSyncHelpers.storeCampaignMetrics, {
      accountId: args.accountId,
      currency: "USD", // Could fetch from account settings
      metrics,
    });

    // Update lastSyncAt
    await ctx.runMutation(internal.metaSyncHelpers.updateLastSync, { accountId: args.accountId });

    return { success: true, metricsCount: metrics.length };
  },
});

// Sync all Google Ads accounts
export const syncAllGoogleAdsAccounts = action({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.runQuery(internal.googleAuth.getAllGoogleAccounts, {});

    const results = [];
    for (const account of accounts) {
      try {
        const result = await ctx.runAction(internal.googleAdsSync.syncAccountCampaigns, {
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
