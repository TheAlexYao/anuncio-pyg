import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const platformValidator = v.union(
  v.literal("google"),
  v.literal("meta"),
  v.literal("tiktok")
);

export const storeAccount = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    userAuthId: v.id("user_auth"),
    platform: platformValidator,
    platformAccountId: v.string(),
    accountName: v.string(),
    accountType: v.string(),
    syncEnabled: v.boolean(),
  },
  returns: v.id("connected_accounts"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("connected_accounts", {
      tenantId: args.tenantId,
      brandId: args.brandId,
      userAuthId: args.userAuthId,
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
        tenantId: v.id("tenants"),
        brandId: v.optional(v.id("brands")),
        userAuthId: v.id("user_auth"),
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
        tenantId: account.tenantId,
        brandId: account.brandId,
        userAuthId: account.userAuthId,
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
  returns: v.array(v.id("connected_accounts")),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      syncEnabled: args.syncEnabled,
    });
  },
});

export const listByTenant = internalQuery({
  args: {
    tenantId: v.id("tenants"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("connected_accounts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const listByTenantPlatform = internalQuery({
  args: {
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    platform: platformValidator,
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    if (args.brandId) {
      return await ctx.db
        .query("connected_accounts")
        .withIndex("by_tenant_brand_platform", (q) =>
          q
            .eq("tenantId", args.tenantId)
            .eq("brandId", args.brandId)
            .eq("platform", args.platform)
        )
        .collect();
    }

    const records = await ctx.db
      .query("connected_accounts")
      .withIndex("by_tenant_platform", (q) =>
        q.eq("tenantId", args.tenantId).eq("platform", args.platform)
      )
      .collect();

    return records.filter((record) => record.brandId === undefined);
  },
});
