import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const leadExists = internalQuery({
  args: { platformLeadId: v.string() },
  handler: async (ctx, args) => {
    const lead = await ctx.db
      .query("leads")
      .withIndex("by_platform_lead", (q) => q.eq("platformLeadId", args.platformLeadId))
      .first();
    return lead !== null;
  },
});

export const insertLead = internalMutation({
  args: {
    accountId: v.id("connected_accounts"),
    platformLeadId: v.string(),
    formId: v.string(),
    formName: v.optional(v.string()),
    campaignId: v.optional(v.string()),
    adId: v.optional(v.string()),
    fields: v.any(),
    createdTime: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leads", {
      ...args,
      syncedAt: Date.now(),
      notified: false,
    });
  },
});

export const getUnnotifiedLeads = internalQuery({
  args: { accountId: v.id("connected_accounts") },
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .collect();
    return leads.filter((l) => !l.notified);
  },
});

export const markLeadNotified = internalMutation({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, { notified: true });
  },
});
