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
