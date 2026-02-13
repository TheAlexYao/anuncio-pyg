import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getAccount = internalQuery({
  args: { accountId: v.id("connected_accounts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.accountId);
  },
});

export const getAllMetaAccounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("connected_accounts")
      .filter((q) => q.eq(q.field("platform"), "meta"))
      .collect();
  },
});

export const storeCampaignMetrics = internalMutation({
  args: {
    accountId: v.id("connected_accounts"),
    currency: v.string(),
    metrics: v.array(
      v.object({
        platformCampaignId: v.string(),
        campaignName: v.string(),
        date: v.string(),
        impressions: v.number(),
        clicks: v.number(),
        spend: v.number(),
        leads: v.number(),
        conversions: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const m of args.metrics) {
      // Check if exists (upsert)
      const existing = await ctx.db
        .query("campaigns_daily")
        .withIndex("by_campaign_date", (q) =>
          q.eq("platformCampaignId", m.platformCampaignId).eq("date", m.date)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          campaignName: m.campaignName,
          impressions: m.impressions,
          clicks: m.clicks,
          spend: m.spend,
          leads: m.leads,
          conversions: m.conversions,
          fetchedAt: now,
        });
      } else {
        await ctx.db.insert("campaigns_daily", {
          accountId: args.accountId,
          platformCampaignId: m.platformCampaignId,
          campaignName: m.campaignName,
          date: m.date,
          impressions: m.impressions,
          clicks: m.clicks,
          spend: m.spend,
          currency: args.currency,
          leads: m.leads,
          conversions: m.conversions,
          fetchedAt: now,
        });
      }
    }
  },
});

export const updateLastSync = internalMutation({
  args: { accountId: v.id("connected_accounts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, { lastSyncAt: Date.now() });
  },
});

// Public query to get campaign metrics
export const getCampaignMetrics = internalQuery({
  args: {
    accountId: v.id("connected_accounts"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("campaigns_daily")
      .withIndex("by_account_date", (q) => q.eq("accountId", args.accountId));

    const results = await query.collect();

    // Filter by date range if provided
    if (args.startDate || args.endDate) {
      return results.filter((r) => {
        if (args.startDate && r.date < args.startDate) return false;
        if (args.endDate && r.date > args.endDate) return false;
        return true;
      });
    }

    return results;
  },
});
