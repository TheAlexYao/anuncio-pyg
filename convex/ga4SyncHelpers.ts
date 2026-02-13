import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get all GA4 accounts (properties)
export const getAllGA4Accounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    // GA4 properties are stored with platformAccountId starting with "ga4_"
    const googleAccounts = await ctx.db
      .query("connected_accounts")
      .filter((q) => q.eq(q.field("platform"), "google"))
      .collect();

    // Filter to GA4 properties (not Google Ads accounts)
    return googleAccounts.filter((a) => a.platformAccountId.startsWith("ga4_"));
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
      // Check for existing record
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
