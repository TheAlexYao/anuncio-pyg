import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const storeTokens = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
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
  returns: v.id("user_auth"),
  handler: async (ctx, args) => {
    const existing = args.brandId
      ? await ctx.db
          .query("user_auth")
          .withIndex("by_tenant_brand_platform", (q) =>
            q
              .eq("tenantId", args.tenantId)
              .eq("brandId", args.brandId)
              .eq("platform", args.platform)
          )
          .unique()
      : (
          await ctx.db
            .query("user_auth")
            .withIndex("by_tenant_platform", (q) =>
              q.eq("tenantId", args.tenantId).eq("platform", args.platform)
            )
            .collect()
        ).find((record) => record.brandId === undefined);

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
      tenantId: args.tenantId,
      brandId: args.brandId,
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
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      encryptedAccessToken: args.encryptedAccessToken,
      tokenExpiresAt: args.tokenExpiresAt,
      updatedAt: Date.now(),
    });
  },
});

export const getTokensById = internalQuery({
  args: {
    id: v.id("user_auth"),
  },
  returns: v.union(v.null(), v.object({ _id: v.id("user_auth"), encryptedAccessToken: v.string(), encryptedRefreshToken: v.optional(v.string()), tokenExpiresAt: v.number() })),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getTokens = internalQuery({
  args: {
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    platform: v.union(
      v.literal("google"),
      v.literal("meta"),
      v.literal("tiktok")
    ),
  },
  returns: v.union(v.null(), v.object({ _id: v.id("user_auth"), encryptedAccessToken: v.string(), encryptedRefreshToken: v.optional(v.string()), tokenExpiresAt: v.number() })),
  handler: async (ctx, args) => {
    if (args.brandId) {
      return await ctx.db
        .query("user_auth")
        .withIndex("by_tenant_brand_platform", (q) =>
          q
            .eq("tenantId", args.tenantId)
            .eq("brandId", args.brandId)
            .eq("platform", args.platform)
        )
        .unique();
    }

    const records = await ctx.db
      .query("user_auth")
      .withIndex("by_tenant_platform", (q) =>
        q.eq("tenantId", args.tenantId).eq("platform", args.platform)
      )
      .collect();
    return records.find((record) => record.brandId === undefined) ?? null;
  },
});
