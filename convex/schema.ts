import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const platformValidator = v.union(
  v.literal("google"),
  v.literal("meta"),
  v.literal("tiktok")
);

const oauthStatusValidator = v.union(
  v.literal("active"),
  v.literal("expired"),
  v.literal("revoked"),
  v.literal("error")
);

const discoveryStatusValidator = v.union(
  v.literal("not_started"),
  v.literal("discovering"),
  v.literal("completed"),
  v.literal("failed")
);

const backfillStatusValidator = v.union(
  v.literal("not_started"),
  v.literal("priority_in_progress"),
  v.literal("priority_completed"),
  v.literal("historical_in_progress"),
  v.literal("completed"),
  v.literal("failed")
);

const syncStatusValidator = v.union(
  v.literal("idle"),
  v.literal("syncing"),
  v.literal("paused"),
  v.literal("error")
);

const syncRunTypeValidator = v.union(
  v.literal("incremental"),
  v.literal("backfill")
);

const leadStatusValidator = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("qualified"),
  v.literal("converted"),
  v.literal("archived")
);

const subscriptionPlanValidator = v.union(
  v.literal("starter"),
  v.literal("growth"),
  v.literal("agency")
);

const subscriptionStatusValidator = v.union(
  v.literal("trialing"),
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled")
);

const mappingStatusValidator = v.union(
  v.literal("active"),
  v.literal("review"),
  v.literal("archived")
);

export default defineSchema({
  tenants: defineTable({
    name: v.string(),
    slug: v.string(),
    countryCode: v.string(),
    timezone: v.string(),
    currencyCode: v.string(),
    plan: subscriptionPlanValidator,
    subscriptionStatus: subscriptionStatusValidator,
    whatsappReportNumber: v.optional(v.string()),
    whatsappAlertNumber: v.optional(v.string()),
    reportDayOfWeek: v.optional(v.number()),
    reportHourLocal: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_subscription_status", ["subscriptionStatus"])
    .index("by_is_active", ["isActive"]),

  brands: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    slug: v.string(),
    timezone: v.optional(v.string()),
    currencyCode: v.optional(v.string()),
    whatsappGroupId: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_slug", ["tenantId", "slug"])
    .index("by_tenant_name", ["tenantId", "name"])
    .index("by_tenant_is_active", ["tenantId", "isActive"]),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    tenantId: v.optional(v.id("tenants")),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_tenant", ["tenantId"]),

  user_auth: defineTable({
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    platform: platformValidator,
    encryptedAccessToken: v.string(),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
    status: v.optional(oauthStatusValidator),
    oauthEmail: v.optional(v.string()),
    oauthProviderUserId: v.optional(v.string()),
    lastRefreshedAt: v.optional(v.number()),
    lastRefreshError: v.optional(v.string()),
    disconnectedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_platform", ["tenantId", "platform"])
    .index("by_tenant_brand_platform", ["tenantId", "brandId", "platform"])
    .index("by_platform_token_expires_at", ["platform", "tokenExpiresAt"])
    .index("by_status", ["status"]),

  connected_accounts: defineTable({
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    userAuthId: v.id("user_auth"),
    platform: platformValidator,
    platformAccountId: v.string(),
    accountName: v.string(),
    accountType: v.string(),
    syncEnabled: v.boolean(),
    discoveryStatus: v.optional(discoveryStatusValidator),
    backfillStatus: v.optional(backfillStatusValidator),
    backfillPriorityMonths: v.optional(v.number()),
    backfillProgressPercent: v.optional(v.number()),
    backfillCursor: v.optional(v.string()),
    backfillError: v.optional(v.string()),
    backfillStartedAt: v.optional(v.number()),
    backfillCompletedAt: v.optional(v.number()),
    syncStatus: v.optional(syncStatusValidator),
    campaignsSyncFrequencyMinutes: v.optional(v.number()),
    leadsSyncFrequencyMinutes: v.optional(v.number()),
    lastCampaignSyncAt: v.optional(v.number()),
    lastLeadSyncAt: v.optional(v.number()),
    nextCampaignSyncAt: v.optional(v.number()),
    nextLeadSyncAt: v.optional(v.number()),
    lastSyncError: v.optional(v.string()),
    syncErrorCount: v.optional(v.number()),
    connectedAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user_auth", ["userAuthId"])
    .index("by_user_auth_platform", ["userAuthId", "platform"])
    .index("by_platform_account", ["platform", "platformAccountId"])
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_platform", ["tenantId", "platform"])
    .index("by_tenant_brand", ["tenantId", "brandId"])
    .index("by_tenant_brand_platform", ["tenantId", "brandId", "platform"])
    .index("by_sync_enabled", ["syncEnabled"])
    .index("by_next_campaign_sync_at", ["nextCampaignSyncAt"])
    .index("by_next_lead_sync_at", ["nextLeadSyncAt"])
    .index("by_backfill_status", ["backfillStatus"])
    .index("by_backfill_status_connected_at", ["backfillStatus", "connectedAt"]),

  campaigns_daily: defineTable({
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    connectedAccountId: v.optional(v.id("connected_accounts")),
    platform: platformValidator,
    platformAccountId: v.string(),
    date: v.string(),
    campaignExternalId: v.string(),
    campaignName: v.string(),
    campaignStatus: v.optional(v.string()),
    objective: v.optional(v.string()),
    currencyCode: v.optional(v.string()),
    spend: v.number(),
    impressions: v.number(),
    clicks: v.number(),
    conversions: v.optional(v.number()),
    leads: v.optional(v.number()),
    reach: v.optional(v.number()),
    videoViews: v.optional(v.number()),
    ctr: v.optional(v.number()),
    cpc: v.optional(v.number()),
    cpm: v.optional(v.number()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    sourceUpdatedAt: v.optional(v.number()),
    syncRunType: v.optional(syncRunTypeValidator),
    syncedAt: v.number(),
  })
    .index("by_tenant_date", ["tenantId", "date"])
    .index("by_brand_date", ["brandId", "date"])
    .index("by_connected_account_date", ["connectedAccountId", "date"])
    .index("by_tenant_platform_account_date", [
      "tenantId",
      "platform",
      "platformAccountId",
      "date",
    ])
    .index("by_tenant_campaign_date", ["tenantId", "campaignExternalId", "date"])
    .index("by_tenant_utm_campaign_date", ["tenantId", "utmCampaign", "date"]),

  ad_sets_daily: defineTable({
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    connectedAccountId: v.optional(v.id("connected_accounts")),
    platform: platformValidator,
    platformAccountId: v.string(),
    date: v.string(),
    campaignExternalId: v.string(),
    campaignName: v.optional(v.string()),
    adSetExternalId: v.string(),
    adSetName: v.string(),
    adSetStatus: v.optional(v.string()),
    optimizationGoal: v.optional(v.string()),
    spend: v.number(),
    impressions: v.number(),
    clicks: v.number(),
    conversions: v.optional(v.number()),
    leads: v.optional(v.number()),
    reach: v.optional(v.number()),
    ctr: v.optional(v.number()),
    cpc: v.optional(v.number()),
    cpm: v.optional(v.number()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    sourceUpdatedAt: v.optional(v.number()),
    syncRunType: v.optional(syncRunTypeValidator),
    syncedAt: v.number(),
  })
    .index("by_tenant_date", ["tenantId", "date"])
    .index("by_brand_date", ["brandId", "date"])
    .index("by_connected_account_date", ["connectedAccountId", "date"])
    .index("by_tenant_campaign_date", ["tenantId", "campaignExternalId", "date"])
    .index("by_tenant_ad_set_date", ["tenantId", "adSetExternalId", "date"])
    .index("by_tenant_utm_campaign_date", ["tenantId", "utmCampaign", "date"]),

  ads_daily: defineTable({
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    connectedAccountId: v.optional(v.id("connected_accounts")),
    platform: platformValidator,
    platformAccountId: v.string(),
    date: v.string(),
    campaignExternalId: v.string(),
    campaignName: v.optional(v.string()),
    adSetExternalId: v.string(),
    adSetName: v.optional(v.string()),
    adExternalId: v.string(),
    adName: v.string(),
    adStatus: v.optional(v.string()),
    spend: v.number(),
    impressions: v.number(),
    clicks: v.number(),
    conversions: v.optional(v.number()),
    leads: v.optional(v.number()),
    reach: v.optional(v.number()),
    ctr: v.optional(v.number()),
    cpc: v.optional(v.number()),
    cpm: v.optional(v.number()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    sourceUpdatedAt: v.optional(v.number()),
    syncRunType: v.optional(syncRunTypeValidator),
    syncedAt: v.number(),
  })
    .index("by_tenant_date", ["tenantId", "date"])
    .index("by_brand_date", ["brandId", "date"])
    .index("by_connected_account_date", ["connectedAccountId", "date"])
    .index("by_tenant_campaign_date", ["tenantId", "campaignExternalId", "date"])
    .index("by_tenant_ad_set_date", ["tenantId", "adSetExternalId", "date"])
    .index("by_tenant_ad_date", ["tenantId", "adExternalId", "date"])
    .index("by_tenant_utm_campaign_date", ["tenantId", "utmCampaign", "date"]),

  leads: defineTable({
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    connectedAccountId: v.optional(v.id("connected_accounts")),
    sourcePlatform: platformValidator,
    platformAccountId: v.string(),
    leadExternalId: v.optional(v.string()),
    campaignExternalId: v.optional(v.string()),
    adSetExternalId: v.optional(v.string()),
    adExternalId: v.optional(v.string()),
    campaignName: v.optional(v.string()),
    adSetName: v.optional(v.string()),
    adName: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    message: v.optional(v.string()),
    leadStatus: v.optional(leadStatusValidator),
    capturedAt: v.number(),
    importedAt: v.number(),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    landingPageUrl: v.optional(v.string()),
    referrerUrl: v.optional(v.string()),
    gclid: v.optional(v.string()),
    fbclid: v.optional(v.string()),
    ttclid: v.optional(v.string()),
    platformDataExpiryAt: v.optional(v.number()),
    rawPayload: v.optional(v.any()),
  })
    .index("by_tenant_captured_at", ["tenantId", "capturedAt"])
    .index("by_brand_captured_at", ["brandId", "capturedAt"])
    .index("by_connected_account_captured_at", ["connectedAccountId", "capturedAt"])
    .index("by_source_platform_captured_at", ["sourcePlatform", "capturedAt"])
    .index("by_tenant_campaign_captured_at", ["tenantId", "campaignExternalId", "capturedAt"])
    .index("by_tenant_utm_campaign_captured_at", ["tenantId", "utmCampaign", "capturedAt"])
    .index("by_source_platform_lead_external_id", ["sourcePlatform", "leadExternalId"])
    .index("by_tenant_email", ["tenantId", "email"])
    .index("by_tenant_phone", ["tenantId", "phone"]),

  ga4_sessions: defineTable({
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    connectedAccountId: v.optional(v.id("connected_accounts")),
    ga4PropertyId: v.string(),
    sessionDate: v.string(),
    source: v.string(),
    medium: v.string(),
    campaign: v.string(),
    content: v.optional(v.string()),
    term: v.optional(v.string()),
    landingPagePath: v.optional(v.string()),
    sessions: v.number(),
    engagedSessions: v.optional(v.number()),
    users: v.optional(v.number()),
    newUsers: v.optional(v.number()),
    conversions: v.optional(v.number()),
    purchaseRevenue: v.optional(v.number()),
    avgEngagementTimeSeconds: v.optional(v.number()),
    bounceRate: v.optional(v.number()),
    syncRunType: v.optional(syncRunTypeValidator),
    syncedAt: v.number(),
  })
    .index("by_tenant_session_date", ["tenantId", "sessionDate"])
    .index("by_brand_session_date", ["brandId", "sessionDate"])
    .index("by_connected_account_session_date", ["connectedAccountId", "sessionDate"])
    .index("by_ga4_property_session_date", ["ga4PropertyId", "sessionDate"])
    .index("by_tenant_utm_campaign_session_date", ["tenantId", "campaign", "sessionDate"])
    .index("by_tenant_source_medium_campaign_session_date", [
      "tenantId",
      "source",
      "medium",
      "campaign",
      "sessionDate",
    ]),

  campaign_mappings: defineTable({
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    mappingKey: v.string(),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.string(),
    utmContent: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    googleCampaignExternalId: v.optional(v.string()),
    metaCampaignExternalId: v.optional(v.string()),
    tiktokCampaignExternalId: v.optional(v.string()),
    googleCampaignName: v.optional(v.string()),
    metaCampaignName: v.optional(v.string()),
    tiktokCampaignName: v.optional(v.string()),
    primaryPlatform: v.optional(platformValidator),
    confidenceScore: v.optional(v.number()),
    status: mappingStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant_mapping_key", ["tenantId", "mappingKey"])
    .index("by_tenant_utm_campaign", ["tenantId", "utmCampaign"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_google_campaign_external_id", ["googleCampaignExternalId"])
    .index("by_meta_campaign_external_id", ["metaCampaignExternalId"])
    .index("by_tiktok_campaign_external_id", ["tiktokCampaignExternalId"]),
});
