import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  connectedAccounts: defineTable({
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

  campaigns_daily: defineTable({
    accountId: v.id("connectedAccounts"),
    platformCampaignId: v.string(),
    campaignName: v.string(),
    date: v.string(),
    impressions: v.number(),
    clicks: v.number(),
    spend: v.number(),
    cpc: v.number(),
    cpm: v.number(),
    ctr: v.number(),
    leads: v.number(),
    conversions: v.number(),
    currency: v.string(),
    fetchedAt: v.number(),
  })
    .index("by_account_date", ["accountId", "date"])
    .index("by_account_campaign_date", [
      "accountId",
      "platformCampaignId",
      "date",
    ]),

  leads: defineTable({
    userId: v.id("users"),
    connectedAccountId: v.id("connectedAccounts"),
    platformLeadId: v.string(),
    formId: v.string(),
    formName: v.string(),
    pageName: v.string(),
    pageId: v.string(),
    fieldData: v.array(
      v.object({ name: v.string(), values: v.array(v.string()) })
    ),
    platform: v.literal("meta"),
    createdAtPlatform: v.number(),
    syncedAt: v.number(),
  })
    .index("by_platform_lead", ["platformLeadId"])
    .index("by_user", ["userId"])
    .index("by_user_form", ["userId", "formId"])
    .index("by_synced_at", ["syncedAt"]),

  leadSyncLog: defineTable({
    connectedAccountId: v.id("connectedAccounts"),
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("error")
    ),
    leadsFound: v.number(),
    leadsCreated: v.number(),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_account", ["connectedAccountId"])
    .index("by_status", ["status"]),
});
