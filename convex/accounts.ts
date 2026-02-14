import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Public queries and mutations for frontend account management.
 * US-013: listConnectedAccounts, toggleAccountSync, getConnectionStatus
 */

export const listConnectedAccounts = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("connected_accounts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    return accounts.map((account) => ({
      _id: account._id,
      platform: account.platform,
      platformAccountId: account.platformAccountId,
      accountName: account.accountName,
      accountType: account.accountType,
      syncEnabled: account.syncEnabled,
      syncStatus: account.syncStatus,
      discoveryStatus: account.discoveryStatus,
      backfillStatus: account.backfillStatus,
      lastCampaignSyncAt: account.lastCampaignSyncAt,
      lastLeadSyncAt: account.lastLeadSyncAt,
      lastSyncError: account.lastSyncError,
      connectedAt: account.connectedAt,
      updatedAt: account.updatedAt,
    }));
  },
});

export const toggleAccountSync = mutation({
  args: {
    tenantId: v.id("tenants"),
    accountId: v.id("connected_accounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.tenantId !== args.tenantId) {
      throw new Error("Account does not belong to this tenant");
    }

    const newSyncEnabled = !account.syncEnabled;

    await ctx.db.patch(args.accountId, {
      syncEnabled: newSyncEnabled,
      updatedAt: Date.now(),
    });

    return { syncEnabled: newSyncEnabled };
  },
});

export const getConnectionStatus = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const googleAuth = await ctx.db
      .query("user_auth")
      .withIndex("by_tenant_platform", (q) =>
        q.eq("tenantId", args.tenantId).eq("platform", "google")
      )
      .first();

    return { connected: googleAuth !== null };
  },
});
