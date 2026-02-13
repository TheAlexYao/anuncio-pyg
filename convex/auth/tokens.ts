import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const storeTokens = internalMutation({
  args: {
    userId: v.id("users"),
    platform: v.union(
      v.literal("google"),
      v.literal("meta"),
      v.literal("tiktok")
    ),
    encryptedAccessToken: v.string(),
    encryptedRefreshToken: v.string(),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_auth")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedAccessToken: args.encryptedAccessToken,
        encryptedRefreshToken: args.encryptedRefreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        scopes: args.scopes,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("user_auth", {
      userId: args.userId,
      platform: args.platform,
      encryptedAccessToken: args.encryptedAccessToken,
      encryptedRefreshToken: args.encryptedRefreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      scopes: args.scopes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTokens = internalMutation({
  args: {
    id: v.id("user_auth"),
    encryptedAccessToken: v.string(),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      encryptedAccessToken: args.encryptedAccessToken,
      tokenExpiresAt: args.tokenExpiresAt,
      updatedAt: Date.now(),
    });
  },
});

export const getTokens = internalQuery({
  args: {
    userId: v.id("users"),
    platform: v.union(
      v.literal("google"),
      v.literal("meta"),
      v.literal("tiktok")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user_auth")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .unique();
  },
});
