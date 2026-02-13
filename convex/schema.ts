import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users
  users: defineTable({
    name: v.string(),
    email: v.string(),
  }).index("by_email", ["email"]),

  // OAuth tokens per platform (for the logged-in user's tokens)
  user_auth: defineTable({
    userId: v.id("users"),
    platform: v.union(
      v.literal("meta"),
      v.literal("google"),
      v.literal("tiktok")
    ),
    encryptedAccessToken: v.string(),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_platform", ["userId", "platform"]),

  // Connected ad accounts (selected by user after OAuth)
  connected_accounts: defineTable({
    userId: v.id("users"),
    platform: v.union(
      v.literal("meta"),
      v.literal("google"),
      v.literal("tiktok")
    ),
    platformAccountId: v.string(),
    accountName: v.string(),
    encryptedAccessToken: v.string(),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
    connectedAt: v.number(),
    lastSyncAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_platform", ["userId", "platform"])
    .index("by_platform_account", ["platform", "platformAccountId"]),

  // Daily campaign metrics
  campaigns_daily: defineTable({
    accountId: v.id("connected_accounts"),
    platformCampaignId: v.string(),
    campaignName: v.string(),
    date: v.string(), // YYYY-MM-DD
    impressions: v.number(),
    clicks: v.number(),
    spend: v.number(), // in cents
    currency: v.string(),
    leads: v.optional(v.number()),
    conversions: v.optional(v.number()),
    fetchedAt: v.number(),
  })
    .index("by_account_date", ["accountId", "date"])
    .index("by_campaign_date", ["platformCampaignId", "date"]),
});
