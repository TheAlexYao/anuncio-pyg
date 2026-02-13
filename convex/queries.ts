import { query } from "./_generated/server";
import { v } from "convex/values";

// List connected accounts for a user (without sensitive token data)
export const listConnectedAccounts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("connected_accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return accounts.map((a) => ({
      _id: a._id,
      platform: a.platform,
      platformAccountId: a.platformAccountId,
      accountName: a.accountName,
      connectedAt: a.connectedAt,
      lastSyncAt: a.lastSyncAt,
    }));
  },
});

// Get campaign metrics for an account
export const getCampaignMetrics = query({
  args: {
    accountId: v.id("connected_accounts"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("campaigns_daily")
      .withIndex("by_account_date", (q) => q.eq("accountId", args.accountId))
      .collect();

    // Filter by date range if provided
    let filtered = results;
    if (args.startDate || args.endDate) {
      filtered = results.filter((r) => {
        if (args.startDate && r.date < args.startDate) return false;
        if (args.endDate && r.date > args.endDate) return false;
        return true;
      });
    }

    return filtered;
  },
});

// Get aggregated metrics by campaign
export const getCampaignSummary = query({
  args: {
    accountId: v.id("connected_accounts"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("campaigns_daily")
      .withIndex("by_account_date", (q) => q.eq("accountId", args.accountId))
      .collect();

    const filtered = metrics.filter(
      (r) => r.date >= args.startDate && r.date <= args.endDate
    );

    // Aggregate by campaign
    const byCampaign = new Map<
      string,
      {
        campaignName: string;
        impressions: number;
        clicks: number;
        spend: number;
        leads: number;
        conversions: number;
        days: number;
      }
    >();

    for (const m of filtered) {
      const existing = byCampaign.get(m.platformCampaignId);
      if (existing) {
        existing.impressions += m.impressions;
        existing.clicks += m.clicks;
        existing.spend += m.spend;
        existing.leads += m.leads || 0;
        existing.conversions += m.conversions || 0;
        existing.days += 1;
      } else {
        byCampaign.set(m.platformCampaignId, {
          campaignName: m.campaignName,
          impressions: m.impressions,
          clicks: m.clicks,
          spend: m.spend,
          leads: m.leads || 0,
          conversions: m.conversions || 0,
          days: 1,
        });
      }
    }

    return Array.from(byCampaign.entries()).map(([id, data]) => ({
      platformCampaignId: id,
      ...data,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
    }));
  },
});

// Check auth status for a user
export const getAuthStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const auths = await ctx.db
      .query("user_auth")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return auths.map((a) => ({
      platform: a.platform,
      connected: true,
      expiresAt: a.tokenExpiresAt,
      isExpired: a.tokenExpiresAt < Date.now(),
    }));
  },
});
