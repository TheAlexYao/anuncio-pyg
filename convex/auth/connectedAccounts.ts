import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const platformValidator = v.union(
  v.literal("google"),
  v.literal("meta"),
  v.literal("tiktok")
);

export const storeAccount = internalMutation({
  args: {
    userId: v.id("users"),
    platform: platformValidator,
    platformAccountId: v.string(),
    accountName: v.string(),
    accountType: v.string(),
    syncEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("connected_accounts", {
      userId: args.userId,
      platform: args.platform,
      platformAccountId: args.platformAccountId,
      accountName: args.accountName,
      accountType: args.accountType,
      syncEnabled: args.syncEnabled,
      connectedAt: now,
    });
  },
});

export const bulkStoreAccounts = internalMutation({
  args: {
    accounts: v.array(
      v.object({
        userId: v.id("users"),
        platform: platformValidator,
        platformAccountId: v.string(),
        accountName: v.string(),
        accountType: v.string(),
        syncEnabled: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids = [];
    for (const account of args.accounts) {
      const id = await ctx.db.insert("connected_accounts", {
        userId: account.userId,
        platform: account.platform,
        platformAccountId: account.platformAccountId,
        accountName: account.accountName,
        accountType: account.accountType,
        syncEnabled: account.syncEnabled,
        connectedAt: now,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const toggleSync = internalMutation({
  args: {
    id: v.id("connected_accounts"),
    syncEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      syncEnabled: args.syncEnabled,
    });
  },
});

export const listByUser = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("connected_accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listByUserPlatform = internalQuery({
  args: {
    userId: v.id("users"),
    platform: platformValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("connected_accounts")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .collect();
  },
});
