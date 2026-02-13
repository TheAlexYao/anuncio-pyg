"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { decrypt } from "./lib/crypto";
import type { Doc, Id } from "./_generated/dataModel";

interface GA4AccountSummary {
  accountSummaries?: Array<{
    displayName?: string;
    propertySummaries?: Array<{
      property?: string;
      displayName?: string;
    }>;
  }>;
}

interface GA4ReportResponse {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
}

// Fetch GA4 properties for account selection
export const fetchGA4Properties = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error("ENCRYPTION_KEY not set");

    const auth = await ctx.runQuery(internal.googleAuth.getUserAuth, { userId: args.userId });
    if (!auth) throw new Error("No Google auth found");

    if (auth.tokenExpiresAt < Date.now() + 60000) {
      await ctx.runAction(internal.googleTokenRefresh.refreshAccessToken, { userId: args.userId });
    }

    const accessToken = decrypt(auth.encryptedAccessToken, encryptionKey);

    const accountsRes = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!accountsRes.ok) {
      const err = await accountsRes.text();
      throw new Error(`Failed to fetch GA4 accounts: ${err}`);
    }

    const accountsData = (await accountsRes.json()) as GA4AccountSummary;
    const properties: Array<{ propertyId: string; displayName: string; accountName: string }> = [];

    for (const account of accountsData.accountSummaries || []) {
      for (const prop of account.propertySummaries || []) {
        const propertyId = prop.property?.replace("properties/", "") || "";
        properties.push({
          propertyId,
          displayName: prop.displayName || propertyId,
          accountName: account.displayName || "Unknown Account",
        });
      }
    }

    return properties;
  },
});

// Sync GA4 metrics for a single property
export const syncPropertyMetrics = internalAction({
  args: { accountId: v.id("connected_accounts") },
  handler: async (ctx, args) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error("ENCRYPTION_KEY not set");

    const account = await ctx.runQuery(internal.metaSyncHelpers.getAccount, { accountId: args.accountId });
    if (!account) throw new Error("Account not found");

    const accessToken = decrypt(account.encryptedAccessToken, encryptionKey);
    const propertyId = account.platformAccountId;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "conversions" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch GA4 metrics: ${err}`);
    }

    const data = (await res.json()) as GA4ReportResponse;
    const metrics: Array<{
      date: string;
      sessions: number;
      activeUsers: number;
      pageViews: number;
      conversions: number;
      bounceRate: number;
      avgSessionDuration: number;
    }> = [];

    for (const row of data.rows || []) {
      const dateValue = row.dimensionValues?.[0]?.value || "";
      const date = dateValue.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");

      metrics.push({
        date,
        sessions: parseInt(row.metricValues?.[0]?.value || "0") || 0,
        activeUsers: parseInt(row.metricValues?.[1]?.value || "0") || 0,
        pageViews: parseInt(row.metricValues?.[2]?.value || "0") || 0,
        conversions: parseInt(row.metricValues?.[3]?.value || "0") || 0,
        bounceRate: parseFloat(row.metricValues?.[4]?.value || "0") || 0,
        avgSessionDuration: parseFloat(row.metricValues?.[5]?.value || "0") || 0,
      });
    }

    await ctx.runMutation(internal.ga4SyncHelpers.storeGA4Metrics, {
      accountId: args.accountId,
      metrics,
    });

    await ctx.runMutation(internal.metaSyncHelpers.updateLastSync, { accountId: args.accountId });

    return { success: true, metricsCount: metrics.length };
  },
});

// Sync all GA4 properties
export const syncAllGA4Properties = internalAction({
  args: {},
  handler: async (ctx): Promise<Array<{ accountId: Id<"connected_accounts">; success: boolean; metricsCount?: number; error?: string }>> => {
    const accounts = await ctx.runQuery(internal.ga4SyncHelpers.getAllGA4Accounts, {}) as Doc<"connected_accounts">[];

    const results: Array<{ accountId: Id<"connected_accounts">; success: boolean; metricsCount?: number; error?: string }> = [];
    for (const account of accounts) {
      try {
        const result = await ctx.runAction(internal.ga4Sync.syncPropertyMetrics, {
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
