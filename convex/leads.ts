import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const upsertLead = internalMutation({
  args: {
    userId: v.id("users"),
    connectedAccountId: v.id("connectedAccounts"),
    platformLeadId: v.string(),
    formId: v.string(),
    formName: v.string(),
    pageName: v.string(),
    pageId: v.string(),
    fieldData: v.array(
      v.object({ name: v.string(), values: v.array(v.string()) })
    ),
    platform: v.literal("meta"),
    createdAtPlatform: v.number(),
    syncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Query by_platform_lead index for deduplication
    const existing = await (ctx.db as any)
      .query("leads")
      .withIndex("by_platform_lead", (q: any) =>
        q.eq("platformLeadId", args.platformLeadId)
      )
      .first();

    if (existing) {
      return { inserted: false };
    }

    await (ctx.db as any).insert("leads", args);
    return { inserted: true };
  },
});

export const createSyncLog = internalMutation({
  args: {
    connectedAccountId: v.id("connectedAccounts"),
  },
  handler: async (ctx, args) => {
    const logId = await (ctx.db as any).insert("leadSyncLog", {
      connectedAccountId: args.connectedAccountId,
      status: "running" as const,
      leadsFound: 0,
      leadsCreated: 0,
      startedAt: Date.now(),
    });
    return logId;
  },
});

export const completeSyncLog = internalMutation({
  args: {
    logId: v.id("leadSyncLog"),
    status: v.union(v.literal("success"), v.literal("error")),
    leadsFound: v.number(),
    leadsCreated: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await (ctx.db as any).patch(args.logId, {
      status: args.status,
      leadsFound: args.leadsFound,
      leadsCreated: args.leadsCreated,
      completedAt: Date.now(),
      ...(args.error !== undefined ? { error: args.error } : {}),
    });
  },
});
