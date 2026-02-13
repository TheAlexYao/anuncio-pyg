import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertLeadForm = internalMutation({
  args: {
    accountId: v.id("connected_accounts"),
    advertiserId: v.string(),
    formId: v.string(),
    formName: v.string(),
    campaignId: v.optional(v.string()),
    adgroupId: v.optional(v.string()),
    adId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("lead_forms")
      .withIndex("by_form", (q) => q.eq("formId", args.formId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        formName: args.formName,
        campaignId: args.campaignId,
        adgroupId: args.adgroupId,
        adId: args.adId,
        syncedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("lead_forms", {
        accountId: args.accountId,
        advertiserId: args.advertiserId,
        formId: args.formId,
        formName: args.formName,
        campaignId: args.campaignId,
        adgroupId: args.adgroupId,
        adId: args.adId,
        syncedAt: Date.now(),
      });
    }
  },
});
