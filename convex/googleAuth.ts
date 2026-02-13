import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserAuth = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user_auth")
      .withIndex("by_user_platform", (q) => q.eq("userId", args.userId).eq("platform", "google"))
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
      .withIndex("by_user_platform", (q) => q.eq("userId", args.userId).eq("platform", "google"))
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
        platform: "google",
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

export const updateAccessToken = internalMutation({
  args: {
    userId: v.id("users"),
    encryptedAccessToken: v.string(),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_auth")
      .withIndex("by_user_platform", (q) => q.eq("userId", args.userId).eq("platform", "google"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedAccessToken: args.encryptedAccessToken,
        tokenExpiresAt: args.tokenExpiresAt,
        updatedAt: Date.now(),
      });
    }
  },
});

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

    const existing = await ctx.db
      .query("connected_accounts")
      .withIndex("by_user_platform", (q) => q.eq("userId", args.userId).eq("platform", "google"))
      .collect();

    const existingIds = new Set(existing.map((a) => a.platformAccountId));
    const newIds = new Set(args.accounts.map((a) => a.platformAccountId));

    // Remove deselected
    for (const acc of existing) {
      if (!newIds.has(acc.platformAccountId)) {
        await ctx.db.delete(acc._id);
      }
    }

    // Add new
    for (const acc of args.accounts) {
      if (!existingIds.has(acc.platformAccountId)) {
        await ctx.db.insert("connected_accounts", {
          userId: args.userId,
          platform: "google",
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

export const getAllGoogleAccounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("connected_accounts")
      .filter((q) => q.eq(q.field("platform"), "google"))
      .collect();
  },
});
