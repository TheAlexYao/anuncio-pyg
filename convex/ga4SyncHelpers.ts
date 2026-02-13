import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get all GA4 accounts
// Note: GA4 properties are stored as platform="google" - we distinguish them
// from Google Ads by checking if the account was created via GA4 flow
// For now, we sync ALL Google accounts (both Ads and GA4 use same OAuth)
export const getAllGA4Accounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Return all Google accounts - GA4 sync will work for those with analytics scope
    // Filter by scopes including analytics.readonly would be more precise
    return await ctx.db
      .query("connected_accounts")
      .filter((q) => q.eq(q.field("platform"), "google"))
      .collect();
  },
});

// Store GA4 daily metrics
export const storeGA4Metrics = internalMutation({
  args: {
    accountId: v.id("connected_accounts"),
    metrics: v.array(
      v.object({
        date: v.string(),
        sessions: v.number(),
        activeUsers: v.number(),
        pageViews: v.number(),
        conversions: v.number(),
        bounceRate: v.number(),
        avgSessionDuration: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const m of args.metrics) {
      const existing = await ctx.db
        .query("ga4_daily")
        .withIndex("by_account_date", (q) =>
          q.eq("accountId", args.accountId).eq("date", m.date)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          sessions: m.sessions,
          activeUsers: m.activeUsers,
          pageViews: m.pageViews,
          conversions: m.conversions,
          bounceRate: m.bounceRate,
          avgSessionDuration: m.avgSessionDuration,
          fetchedAt: now,
        });
      } else {
        await ctx.db.insert("ga4_daily", {
          accountId: args.accountId,
          date: m.date,
          sessions: m.sessions,
          activeUsers: m.activeUsers,
          pageViews: m.pageViews,
          conversions: m.conversions,
          bounceRate: m.bounceRate,
          avgSessionDuration: m.avgSessionDuration,
          fetchedAt: now,
        });
      }
    }
  },
});
