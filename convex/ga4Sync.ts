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

// Fetch GA4 properties for account selection
export const fetchGA4Properties = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error("ENCRYPTION_KEY not set");

    const auth = await ctx.runQuery(internal.googleAuth.getUserAuth, { userId: args.userId });
    if (!auth) throw new Error("No Google auth found");

    // Refresh token if needed
    if (auth.tokenExpiresAt < Date.now() + 60000) {
      await ctx.runAction(internal.googleOAuth.refreshAccessToken, { userId: args.userId });
    }

    const accessToken = decrypt(auth.encryptedAccessToken, encryptionKey);

    // List all GA4 accounts
    const accountsRes = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!accountsRes.ok) {
      const err = await accountsRes.text();
      throw new Error(`Failed to fetch GA4 accounts: ${err}`);
    }

    const accountsData = await accountsRes.json();
    const properties: Array<{ propertyId: string; displayName: string; accountName: string }> = [];

    for (const account of accountsData.accountSummaries || []) {
      for (const prop of account.propertySummaries || []) {
        // property format: "properties/123456789"
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

    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // GA4 Data API request
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

    const data = await res.json();
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
      // GA4 returns date as YYYYMMDD, convert to YYYY-MM-DD
      const date = dateValue.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");

      metrics.push({
        date,
        sessions: parseInt(row.metricValues?.[0]?.value) || 0,
        activeUsers: parseInt(row.metricValues?.[1]?.value) || 0,
        pageViews: parseInt(row.metricValues?.[2]?.value) || 0,
        conversions: parseInt(row.metricValues?.[3]?.value) || 0,
        bounceRate: parseFloat(row.metricValues?.[4]?.value) || 0,
        avgSessionDuration: parseFloat(row.metricValues?.[5]?.value) || 0,
      });
    }

    // Store metrics
    await ctx.runMutation(internal.ga4SyncHelpers.storeGA4Metrics, {
      accountId: args.accountId,
      metrics,
    });

    // Update lastSyncAt
    await ctx.runMutation(internal.metaSyncHelpers.updateLastSync, { accountId: args.accountId });

    return { success: true, metricsCount: metrics.length };
  },
});

// Sync all GA4 properties
export const syncAllGA4Properties = action({
  args: {},
  handler: async (ctx) => {
    // GA4 properties are stored as platform="google" with propertyId prefix
    const accounts = await ctx.runQuery(internal.ga4SyncHelpers.getAllGA4Accounts, {});

    const results = [];
    for (const account of accounts) {
      try {
        const result = await ctx.runAction(internal.ga4Sync.syncPropertyMetrics, {
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
