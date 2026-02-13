"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { decrypt } from "./lib/crypto";
import type { Doc, Id } from "./_generated/dataModel";

interface GoogleAdsStreamResponse {
  results?: Array<{
    campaign?: { id?: string; name?: string };
    segments?: { date?: string };
    metrics?: {
      impressions?: string;
      clicks?: string;
      costMicros?: string;
      conversions?: string;
    };
  }>;
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

    const data = (await res.json()) as GoogleAdsStreamResponse[];
    const metrics: Array<{
      platformCampaignId: string;
      campaignName: string;
      date: string;
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
    }> = [];

    for (const batch of data || []) {
      for (const row of batch.results || []) {
        metrics.push({
          platformCampaignId: row.campaign?.id || "",
          campaignName: row.campaign?.name || "",
          date: row.segments?.date || "",
          impressions: parseInt(row.metrics?.impressions || "0") || 0,
          clicks: parseInt(row.metrics?.clicks || "0") || 0,
          spend: Math.round((parseInt(row.metrics?.costMicros || "0") || 0) / 10000),
          conversions: Math.round(parseFloat(row.metrics?.conversions || "0") || 0),
        });
      }
    }

    await ctx.runMutation(internal.googleAdsSyncHelpers.storeCampaignMetrics, {
      accountId: args.accountId,
      currency: "USD",
      metrics,
    });

    await ctx.runMutation(internal.metaSyncHelpers.updateLastSync, { accountId: args.accountId });

    return { success: true, metricsCount: metrics.length };
  },
});

// Sync all Google Ads accounts
export const syncAllGoogleAdsAccounts = internalAction({
  args: {},
  handler: async (ctx): Promise<Array<{ accountId: Id<"connected_accounts">; success: boolean; metricsCount?: number; error?: string }>> => {
    const accounts = await ctx.runQuery(internal.googleAuth.getAllGoogleAccounts, {}) as Doc<"connected_accounts">[];

    const results: Array<{ accountId: Id<"connected_accounts">; success: boolean; metricsCount?: number; error?: string }> = [];
    for (const account of accounts) {
      try {
        const result = await ctx.runAction(internal.googleAdsSync.syncAccountCampaigns, {
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
