import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users
  users: defineTable({
    name: v.string(),
    email: v.string(),
  }).index("by_email", ["email"]),

  // OAuth tokens per platform
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

  // Connected ad accounts
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
    date: v.string(),
    impressions: v.number(),
    clicks: v.number(),
    spend: v.number(),
    currency: v.string(),
    leads: v.optional(v.number()),
    conversions: v.optional(v.number()),
    fetchedAt: v.number(),
  })
    .index("by_account_date", ["accountId", "date"])
    .index("by_campaign_date", ["platformCampaignId", "date"]),

  // Leads from Meta Lead Ads
  leads: defineTable({
    accountId: v.id("connected_accounts"),
    platformLeadId: v.string(),
    formId: v.string(),
    formName: v.optional(v.string()),
    campaignId: v.optional(v.string()),
    adId: v.optional(v.string()),
    fields: v.any(),
    createdTime: v.string(),
    syncedAt: v.number(),
    notified: v.optional(v.boolean()),
  })
    .index("by_platform_lead", ["platformLeadId"])
    .index("by_account", ["accountId"])
    .index("by_form", ["formId"]),
});
