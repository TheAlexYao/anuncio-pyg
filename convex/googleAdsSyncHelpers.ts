import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

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
          conversions: m.conversions,
          fetchedAt: now,
        });
      }
    }
  },
});
