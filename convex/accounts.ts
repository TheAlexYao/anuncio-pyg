import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const getByPlatform = internalQuery({
  args: {
    platform: v.union(
      v.literal("meta"),
      v.literal("google"),
      v.literal("tiktok")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("connectedAccounts")
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .collect();
  },
});

export const getById = internalQuery({
  args: {
    id: v.id("connectedAccounts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
