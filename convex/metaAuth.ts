// Queries and mutations for Meta auth (non-Node.js runtime)
import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserAuth = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user_auth")
      .withIndex("by_user_platform", (q) => q.eq("userId", args.userId).eq("platform", "meta"))
      .first();
  },
});

export const storeUserAuth = internalMutation({
  args: {
    userId: v.id("users"),
    encryptedAccessToken: v.string(),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_auth")
      .withIndex("by_user_platform", (q) => q.eq("userId", args.userId).eq("platform", "meta"))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedAccessToken: args.encryptedAccessToken,
        encryptedRefreshToken: args.encryptedRefreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        scopes: args.scopes,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("user_auth", {
        userId: args.userId,
        platform: "meta",
        encryptedAccessToken: args.encryptedAccessToken,
        encryptedRefreshToken: args.encryptedRefreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        scopes: args.scopes,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Save selected ad accounts as connected_accounts
export const saveConnectedAccounts = internalMutation({
  args: {
    userId: v.id("users"),
    accounts: v.array(
      v.object({
        platformAccountId: v.string(),
        accountName: v.string(),
      })
    ),
    encryptedAccessToken: v.string(),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get existing connected accounts for this user/platform
    const existing = await ctx.db
      .query("connected_accounts")
      .withIndex("by_user_platform", (q) => q.eq("userId", args.userId).eq("platform", "meta"))
      .collect();

    const existingIds = new Set(existing.map((a) => a.platformAccountId));
    const newIds = new Set(args.accounts.map((a) => a.platformAccountId));

    // Remove deselected accounts
    for (const acc of existing) {
      if (!newIds.has(acc.platformAccountId)) {
        await ctx.db.delete(acc._id);
      }
    }

    // Add new accounts
    for (const acc of args.accounts) {
      if (!existingIds.has(acc.platformAccountId)) {
        await ctx.db.insert("connected_accounts", {
          userId: args.userId,
          platform: "meta",
          platformAccountId: acc.platformAccountId,
          accountName: acc.accountName,
          encryptedAccessToken: args.encryptedAccessToken,
          encryptedRefreshToken: args.encryptedRefreshToken,
          tokenExpiresAt: args.tokenExpiresAt,
          scopes: args.scopes,
          connectedAt: now,
        });
      }
    }
  },
});

// List connected accounts for a user
export const listConnectedAccounts = internalQuery({
  args: { userId: v.id("users"), platform: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let query = ctx.db.query("connected_accounts").withIndex("by_user", (q) => q.eq("userId", args.userId));
    const accounts = await query.collect();
    if (args.platform) {
      return accounts.filter((a) => a.platform === args.platform);
    }
    return accounts;
  },
});
