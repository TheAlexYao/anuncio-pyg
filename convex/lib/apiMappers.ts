import {
  costMicrosToLocal,
  normalizeStatus,
  parseDate,
  parseTimestamp,
  safeNumber,
  safeString,
} from "./normalize";

type Platform = "meta" | "google" | "tiktok";
type UnknownRecord = Record<string, unknown>;
type FieldCandidate = string | string[];

export type CampaignDailyFields = {
  platform: Platform;
  platformAccountId: string;
  date: string;
  campaignExternalId: string;
  campaignName: string;
  campaignStatus?: "active" | "paused" | "deleted";
  objective?: string;
  currencyCode?: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions?: number;
  leads?: number;
  reach?: number;
  videoViews?: number;
  frequency?: number;
  uniqueClicks?: number;
  uniqueCtr?: number;
  videoP25?: number;
  videoP50?: number;
  videoP75?: number;
  videoP100?: number;
  costPerLead?: number;
  costPerConversion?: number;
  qualityRanking?: string;
  engagementRateRanking?: string;
  conversionRateRanking?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  sourceUpdatedAt?: number;
  syncedAt: number;
};

export type AdSetDailyFields = {
  platform: Platform;
  platformAccountId: string;
  date: string;
  campaignExternalId: string;
  campaignName?: string;
  adSetExternalId: string;
  adSetName: string;
  adSetStatus?: "active" | "paused" | "deleted";
  optimizationGoal?: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions?: number;
  leads?: number;
  reach?: number;
  frequency?: number;
  uniqueClicks?: number;
  uniqueCtr?: number;
  videoP25?: number;
  videoP50?: number;
  videoP75?: number;
  videoP100?: number;
  costPerLead?: number;
  costPerConversion?: number;
  qualityRanking?: string;
  engagementRateRanking?: string;
  conversionRateRanking?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  sourceUpdatedAt?: number;
  syncedAt: number;
};

export type AdDailyFields = {
  platform: Platform;
  platformAccountId: string;
  date: string;
  campaignExternalId: string;
  campaignName?: string;
  adSetExternalId: string;
  adSetName?: string;
  adExternalId: string;
  adName: string;
  adStatus?: "active" | "paused" | "deleted";
  spend: number;
  impressions: number;
  clicks: number;
  conversions?: number;
  leads?: number;
  reach?: number;
  frequency?: number;
  uniqueClicks?: number;
  uniqueCtr?: number;
  videoP25?: number;
  videoP50?: number;
  videoP75?: number;
  videoP100?: number;
  costPerLead?: number;
  costPerConversion?: number;
  qualityRanking?: string;
  engagementRateRanking?: string;
  conversionRateRanking?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  thumbnailUrl?: string;
  headline?: string;
  bodyText?: string;
  previewLink?: string;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  sourceUpdatedAt?: number;
  syncedAt: number;
};

export type LeadFields = {
  sourcePlatform: Platform;
  platformAccountId: string;
  leadExternalId?: string;
  campaignExternalId?: string;
  adSetExternalId?: string;
  adExternalId?: string;
  campaignName?: string;
  adSetName?: string;
  adName?: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  message?: string;
  capturedAt: number;
  importedAt: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPageUrl?: string;
  referrerUrl?: string;
  gclid?: string;
  fbclid?: string;
  ttclid?: string;
  rawPayload?: unknown;
};

export type GA4SessionDailyFields = {
  ga4PropertyId: string;
  date: string;
  source: string;
  medium: string;
  campaignName: string;
  content?: string;
  term?: string;
  landingPagePath?: string;
  sessions: number;
  engagedSessions?: number;
  users?: number;
  newUsers?: number;
  conversions?: number;
  purchaseRevenue?: number;
  avgEngagementTimeSeconds?: number;
  bounceRate?: number;
  sourceUpdatedAt?: number;
  syncedAt: number;
};

/**
 * Map a Meta campaign insight row into campaigns_daily fields.
 */
export function mapMetaCampaign(raw: unknown): CampaignDailyFields {
  const record = asRecord(raw);
  const actions = parseMetaActions(read(record, ["actions", ["metrics", "actions"]]));
  const actionLeads = actions.leads + actions.messageContactsNew;
  const fallbackLeads = readOptionalNumber(record, ["leads", ["metrics", "leads"]]);
  const costPerActions = parseMetaCostPerActionType(
    read(record, ["cost_per_action_type", ["metrics", "cost_per_action_type"]])
  );
  const inlinePostEngagement = readOptionalNumber(record, [
    "inline_post_engagement",
    ["metrics", "inline_post_engagement"],
  ]);
  const videoViews =
    readMetaActionMetricValue(
      read(record, ["video_play_actions", ["metrics", "video_play_actions"]])
    ) ??
    readOptionalNumber(record, [
      "video_views",
      "videoViews",
      ["metrics", "video_views"],
      ["metrics", "videoViews"],
    ]);
  const videoP25 = readMetaActionMetricValue(
    read(record, [
      "video_p25_watched_actions",
      ["metrics", "video_p25_watched_actions"],
      "video_p25",
      "videoP25",
      ["metrics", "videoP25"],
    ])
  );
  const videoP50 = readMetaActionMetricValue(
    read(record, [
      "video_p50_watched_actions",
      ["metrics", "video_p50_watched_actions"],
      "video_p50",
      "videoP50",
      ["metrics", "videoP50"],
    ])
  );
  const videoP75 = readMetaActionMetricValue(
    read(record, [
      "video_p75_watched_actions",
      ["metrics", "video_p75_watched_actions"],
      "video_p75",
      "videoP75",
      ["metrics", "videoP75"],
    ])
  );
  const videoP100 = readMetaActionMetricValue(
    read(record, [
      "video_p100_watched_actions",
      ["metrics", "video_p100_watched_actions"],
      "video_p100",
      "videoP100",
      ["metrics", "videoP100"],
    ])
  );

  return {
    platform: "meta",
    platformAccountId: readString(record, ["account_id", "accountId", "ad_account_id"]),
    date: parseDate(readString(record, ["date_start", "dateStart", "date", ["segments", "date"]])),
    campaignExternalId: readString(record, ["campaign_id", "campaignId", "id"]),
    campaignName: readString(record, ["campaign_name", "campaignName", "name"]),
    campaignStatus: normalizeStatus(
      "meta",
      readString(record, ["status", "campaign_status", "effective_status"])
    ),
    objective: readOptionalString(record, ["objective", "objective_type"]),
    currencyCode: readOptionalString(record, ["currency", "account_currency", "currency_code"]),
    spend: safeNumber(read(record, ["spend", ["metrics", "spend"]]), 0),
    impressions: readNumber(record, ["impressions", ["metrics", "impressions"]]),
    clicks: readNumber(record, ["clicks", ["metrics", "clicks"]]),
    conversions: actions.purchases || readOptionalNumber(record, ["conversions", ["metrics", "conversions"]]),
    leads: actionLeads || fallbackLeads,
    reach: readOptionalNumber(record, ["reach", ["metrics", "reach"]]),
    videoViews,
    frequency: readOptionalNumber(record, ["frequency", ["metrics", "frequency"]]),
    uniqueClicks: readOptionalNumber(record, [
      "unique_clicks",
      "uniqueClicks",
      ["metrics", "unique_clicks"],
      ["metrics", "uniqueClicks"],
    ]),
    uniqueCtr: readOptionalNumber(record, [
      "unique_ctr",
      "uniqueCtr",
      ["metrics", "unique_ctr"],
      ["metrics", "uniqueCtr"],
    ]),
    videoP25,
    videoP50,
    videoP75,
    videoP100,
    costPerLead: costPerActions.costPerLead,
    costPerConversion: costPerActions.costPerConversion,
    qualityRanking: readOptionalString(record, [
      "quality_ranking",
      "qualityRanking",
      ["metrics", "quality_ranking"],
    ]),
    engagementRateRanking: readOptionalString(record, [
      "engagement_rate_ranking",
      "engagementRateRanking",
      ["metrics", "engagement_rate_ranking"],
    ]),
    conversionRateRanking: readOptionalString(record, [
      "conversion_rate_ranking",
      "conversionRateRanking",
      ["metrics", "conversion_rate_ranking"],
    ]),
    likes: actions.likes || inlinePostEngagement,
    comments: actions.comments || inlinePostEngagement,
    shares: actions.shares || inlinePostEngagement,
    ctr: readOptionalNumber(record, ["ctr", ["metrics", "ctr"]]),
    cpc: readOptionalNumber(record, ["cpc", ["metrics", "cpc"]]),
    cpm: readOptionalNumber(record, ["cpm", ["metrics", "cpm"]]),
    sourceUpdatedAt: readOptionalTimestamp(record, [
      "updated_time",
      "updatedAt",
      "last_updated",
      "lastModifiedTime",
    ]),
    syncedAt: Date.now(),
  };
}

/**
 * Map a Meta ad set insight row into ad_sets_daily fields.
 */
export function mapMetaAdSet(raw: unknown): AdSetDailyFields {
  const record = asRecord(raw);
  const actions = parseMetaActions(read(record, ["actions", ["metrics", "actions"]]));
  const actionLeads = actions.leads + actions.messageContactsNew;
  const fallbackLeads = readOptionalNumber(record, ["leads", ["metrics", "leads"]]);
  const costPerActions = parseMetaCostPerActionType(
    read(record, ["cost_per_action_type", ["metrics", "cost_per_action_type"]])
  );
  const inlinePostEngagement = readOptionalNumber(record, [
    "inline_post_engagement",
    ["metrics", "inline_post_engagement"],
  ]);
  const videoP25 = readMetaActionMetricValue(
    read(record, [
      "video_p25_watched_actions",
      ["metrics", "video_p25_watched_actions"],
      "video_p25",
      "videoP25",
      ["metrics", "videoP25"],
    ])
  );
  const videoP50 = readMetaActionMetricValue(
    read(record, [
      "video_p50_watched_actions",
      ["metrics", "video_p50_watched_actions"],
      "video_p50",
      "videoP50",
      ["metrics", "videoP50"],
    ])
  );
  const videoP75 = readMetaActionMetricValue(
    read(record, [
      "video_p75_watched_actions",
      ["metrics", "video_p75_watched_actions"],
      "video_p75",
      "videoP75",
      ["metrics", "videoP75"],
    ])
  );
  const videoP100 = readMetaActionMetricValue(
    read(record, [
      "video_p100_watched_actions",
      ["metrics", "video_p100_watched_actions"],
      "video_p100",
      "videoP100",
      ["metrics", "videoP100"],
    ])
  );

  return {
    platform: "meta",
    platformAccountId: readString(record, ["account_id", "accountId", "ad_account_id"]),
    date: parseDate(readString(record, ["date_start", "dateStart", "date", ["segments", "date"]])),
    campaignExternalId: readString(record, ["campaign_id", "campaignId"]),
    campaignName: readOptionalString(record, ["campaign_name", "campaignName"]),
    adSetExternalId: readString(record, ["adset_id", "ad_set_id", "adsetId", "id"]),
    adSetName: readString(record, ["adset_name", "ad_set_name", "adsetName", "name"]),
    adSetStatus: normalizeStatus(
      "meta",
      readString(record, ["status", "adset_status", "effective_status"])
    ),
    optimizationGoal: readOptionalString(record, ["optimization_goal", "optimizationGoal"]),
    spend: safeNumber(read(record, ["spend", ["metrics", "spend"]]), 0),
    impressions: readNumber(record, ["impressions", ["metrics", "impressions"]]),
    clicks: readNumber(record, ["clicks", ["metrics", "clicks"]]),
    conversions: actions.purchases || readOptionalNumber(record, ["conversions", ["metrics", "conversions"]]),
    leads: actionLeads || fallbackLeads,
    reach: readOptionalNumber(record, ["reach", ["metrics", "reach"]]),
    frequency: readOptionalNumber(record, ["frequency", ["metrics", "frequency"]]),
    uniqueClicks: readOptionalNumber(record, [
      "unique_clicks",
      "uniqueClicks",
      ["metrics", "unique_clicks"],
      ["metrics", "uniqueClicks"],
    ]),
    uniqueCtr: readOptionalNumber(record, [
      "unique_ctr",
      "uniqueCtr",
      ["metrics", "unique_ctr"],
      ["metrics", "uniqueCtr"],
    ]),
    videoP25,
    videoP50,
    videoP75,
    videoP100,
    costPerLead: costPerActions.costPerLead,
    costPerConversion: costPerActions.costPerConversion,
    qualityRanking: readOptionalString(record, [
      "quality_ranking",
      "qualityRanking",
      ["metrics", "quality_ranking"],
    ]),
    engagementRateRanking: readOptionalString(record, [
      "engagement_rate_ranking",
      "engagementRateRanking",
      ["metrics", "engagement_rate_ranking"],
    ]),
    conversionRateRanking: readOptionalString(record, [
      "conversion_rate_ranking",
      "conversionRateRanking",
      ["metrics", "conversion_rate_ranking"],
    ]),
    likes: actions.likes || inlinePostEngagement,
    comments: actions.comments || inlinePostEngagement,
    shares: actions.shares || inlinePostEngagement,
    ctr: readOptionalNumber(record, ["ctr", ["metrics", "ctr"]]),
    cpc: readOptionalNumber(record, ["cpc", ["metrics", "cpc"]]),
    cpm: readOptionalNumber(record, ["cpm", ["metrics", "cpm"]]),
    sourceUpdatedAt: readOptionalTimestamp(record, [
      "updated_time",
      "updatedAt",
      "last_updated",
      "lastModifiedTime",
    ]),
    syncedAt: Date.now(),
  };
}

/**
 * Map a Meta ad insight row into ads_daily fields.
 */
export function mapMetaAd(raw: unknown): AdDailyFields {
  const record = asRecord(raw);
  const actions = parseMetaActions(read(record, ["actions", ["metrics", "actions"]]));
  const actionLeads = actions.leads + actions.messageContactsNew;
  const fallbackLeads = readOptionalNumber(record, ["leads", ["metrics", "leads"]]);
  const costPerActions = parseMetaCostPerActionType(
    read(record, ["cost_per_action_type", ["metrics", "cost_per_action_type"]])
  );
  const inlinePostEngagement = readOptionalNumber(record, [
    "inline_post_engagement",
    ["metrics", "inline_post_engagement"],
  ]);
  const videoP25 = readMetaActionMetricValue(
    read(record, [
      "video_p25_watched_actions",
      ["metrics", "video_p25_watched_actions"],
      "video_p25",
      "videoP25",
      ["metrics", "videoP25"],
    ])
  );
  const videoP50 = readMetaActionMetricValue(
    read(record, [
      "video_p50_watched_actions",
      ["metrics", "video_p50_watched_actions"],
      "video_p50",
      "videoP50",
      ["metrics", "videoP50"],
    ])
  );
  const videoP75 = readMetaActionMetricValue(
    read(record, [
      "video_p75_watched_actions",
      ["metrics", "video_p75_watched_actions"],
      "video_p75",
      "videoP75",
      ["metrics", "videoP75"],
    ])
  );
  const videoP100 = readMetaActionMetricValue(
    read(record, [
      "video_p100_watched_actions",
      ["metrics", "video_p100_watched_actions"],
      "video_p100",
      "videoP100",
      ["metrics", "videoP100"],
    ])
  );

  return {
    platform: "meta",
    platformAccountId: readString(record, ["account_id", "accountId", "ad_account_id"]),
    date: parseDate(readString(record, ["date_start", "dateStart", "date", ["segments", "date"]])),
    campaignExternalId: readString(record, ["campaign_id", "campaignId"]),
    campaignName: readOptionalString(record, ["campaign_name", "campaignName"]),
    adSetExternalId: readString(record, ["adset_id", "ad_set_id", "adsetId"]),
    adSetName: readOptionalString(record, ["adset_name", "ad_set_name", "adsetName"]),
    adExternalId: readString(record, ["ad_id", "adId", "id"]),
    adName: readString(record, ["ad_name", "adName", "name"]),
    adStatus: normalizeStatus("meta", readString(record, ["status", "ad_status", "effective_status"])),
    spend: safeNumber(read(record, ["spend", ["metrics", "spend"]]), 0),
    impressions: readNumber(record, ["impressions", ["metrics", "impressions"]]),
    clicks: readNumber(record, ["clicks", ["metrics", "clicks"]]),
    conversions: actions.purchases || readOptionalNumber(record, ["conversions", ["metrics", "conversions"]]),
    leads: actionLeads || fallbackLeads,
    reach: readOptionalNumber(record, ["reach", ["metrics", "reach"]]),
    frequency: readOptionalNumber(record, ["frequency", ["metrics", "frequency"]]),
    uniqueClicks: readOptionalNumber(record, [
      "unique_clicks",
      "uniqueClicks",
      ["metrics", "unique_clicks"],
      ["metrics", "uniqueClicks"],
    ]),
    uniqueCtr: readOptionalNumber(record, [
      "unique_ctr",
      "uniqueCtr",
      ["metrics", "unique_ctr"],
      ["metrics", "uniqueCtr"],
    ]),
    videoP25,
    videoP50,
    videoP75,
    videoP100,
    costPerLead: costPerActions.costPerLead,
    costPerConversion: costPerActions.costPerConversion,
    qualityRanking: readOptionalString(record, [
      "quality_ranking",
      "qualityRanking",
      ["metrics", "quality_ranking"],
    ]),
    engagementRateRanking: readOptionalString(record, [
      "engagement_rate_ranking",
      "engagementRateRanking",
      ["metrics", "engagement_rate_ranking"],
    ]),
    conversionRateRanking: readOptionalString(record, [
      "conversion_rate_ranking",
      "conversionRateRanking",
      ["metrics", "conversion_rate_ranking"],
    ]),
    likes: actions.likes || inlinePostEngagement,
    comments: actions.comments || inlinePostEngagement,
    shares: actions.shares || inlinePostEngagement,
    thumbnailUrl: readOptionalString(record, [
      ["creative", "thumbnail_url"],
      ["creative", "thumbnailUrl"],
      "thumbnail_url",
      "thumbnailUrl",
    ]),
    headline: readOptionalString(record, [["creative", "title"], "headline", "title"]),
    bodyText: readOptionalString(record, [
      ["creative", "body"],
      "body_text",
      "bodyText",
      "body",
    ]),
    previewLink: readOptionalString(record, [
      "preview_shareable_link",
      "previewLink",
    ]),
    ctr: readOptionalNumber(record, ["ctr", ["metrics", "ctr"]]),
    cpc: readOptionalNumber(record, ["cpc", ["metrics", "cpc"]]),
    cpm: readOptionalNumber(record, ["cpm", ["metrics", "cpm"]]),
    sourceUpdatedAt: readOptionalTimestamp(record, [
      "updated_time",
      "updatedAt",
      "last_updated",
      "lastModifiedTime",
    ]),
    syncedAt: Date.now(),
  };
}

/**
 * Map a Meta lead row into leads fields.
 */
export function mapMetaLead(raw: unknown): LeadFields {
  const record = asRecord(raw);
  const { fullName, phone, email } = parseMetaLeadFieldData(
    read(record, ["field_data", "fieldData"])
  );

  return {
    sourcePlatform: "meta",
    platformAccountId: readString(record, ["ad_account_id", "account_id", "accountId"]),
    leadExternalId: readOptionalString(record, ["id", "leadgen_id", "lead_id", "leadId"]),
    campaignExternalId: readOptionalString(record, ["campaign_id", "campaignId"]),
    adSetExternalId: readOptionalString(record, ["adset_id", "ad_set_id", "adsetId"]),
    adExternalId: readOptionalString(record, ["ad_id", "adId"]),
    campaignName: readOptionalString(record, ["campaign_name", "campaignName"]),
    adSetName: readOptionalString(record, ["adset_name", "ad_set_name", "adsetName"]),
    adName: readOptionalString(record, ["ad_name", "adName"]),
    name: fullName || readOptionalString(record, ["full_name", "name"]),
    email: email || readOptionalString(record, ["email"]),
    phone: phone || readOptionalString(record, ["phone_number", "phone"]),
    city: readOptionalString(record, ["city"]),
    country: readOptionalString(record, ["country"]),
    message: readOptionalString(record, ["message"]),
    capturedAt:
      readTimestamp(record, ["created_time", "createdTime", "capturedAt", "captured_at"]) ||
      Date.now(),
    importedAt: Date.now(),
    utmSource: readOptionalString(record, ["utm_source", "utmSource"]),
    utmMedium: readOptionalString(record, ["utm_medium", "utmMedium"]),
    utmCampaign: readOptionalString(record, ["utm_campaign", "utmCampaign"]),
    utmContent: readOptionalString(record, ["utm_content", "utmContent"]),
    utmTerm: readOptionalString(record, ["utm_term", "utmTerm"]),
    landingPageUrl: readOptionalString(record, ["landing_page_url", "landingPageUrl"]),
    referrerUrl: readOptionalString(record, ["referrer_url", "referrerUrl"]),
    fbclid: readOptionalString(record, ["fbclid"]),
    rawPayload: raw,
  };
}

/**
 * Map a Google campaign row into campaigns_daily fields.
 */
export function mapGoogleCampaign(raw: unknown): CampaignDailyFields {
  const record = asRecord(raw);

  return {
    platform: "google",
    platformAccountId: normalizeResourceId(
      readString(record, ["customer_id", "customerId", ["customer", "id"]])
    ),
    date: parseDate(readString(record, ["date", "segments_date", ["segments", "date"]])),
    campaignExternalId: readString(record, ["campaign_id", "campaignId", ["campaign", "id"]]),
    campaignName: readString(record, ["campaign_name", "campaignName", ["campaign", "name"]]),
    campaignStatus: normalizeStatus(
      "google",
      readString(record, ["campaign_status", "campaignStatus", ["campaign", "status"], "status"])
    ),
    objective: readOptionalString(record, [
      "objective",
      "objectiveType",
      ["campaign", "advertising_channel_type"],
      ["campaign", "advertisingChannelType"],
    ]),
    currencyCode: readOptionalString(record, [
      "currency_code",
      "currencyCode",
      ["customer", "currency_code"],
      ["customer", "currencyCode"],
    ]),
    spend: costMicrosToLocal(
      readNumber(record, [
        "cost_micros",
        "costMicros",
        ["metrics", "cost_micros"],
        ["metrics", "costMicros"],
      ])
    ),
    impressions: readNumber(record, ["impressions", ["metrics", "impressions"]]),
    clicks: readNumber(record, ["clicks", ["metrics", "clicks"]]),
    conversions: readOptionalNumber(record, ["conversions", ["metrics", "conversions"]]),
    leads: readOptionalNumber(record, ["leads", ["metrics", "leads"]]),
    reach: readOptionalNumber(record, ["reach", ["metrics", "reach"]]),
    videoViews: readOptionalNumber(record, [
      "video_views",
      "videoViews",
      ["metrics", "video_views"],
      ["metrics", "videoViews"],
    ]),
    ctr: readOptionalNumber(record, ["ctr", ["metrics", "ctr"]]),
    cpc: readOptionalNumber(record, [
      "cpc",
      "average_cpc",
      ["metrics", "average_cpc"],
      ["metrics", "averageCpc"],
    ]),
    cpm: readOptionalNumber(record, [
      "cpm",
      "average_cpm",
      ["metrics", "average_cpm"],
      ["metrics", "averageCpm"],
    ]),
    sourceUpdatedAt: readOptionalTimestamp(record, [
      "updated_at",
      "updatedAt",
      "last_modified_time",
      "lastModifiedTime",
    ]),
    syncedAt: Date.now(),
  };
}

/**
 * Map a Google ad group row into ad_sets_daily fields.
 */
export function mapGoogleAdGroup(raw: unknown): AdSetDailyFields {
  const record = asRecord(raw);

  return {
    platform: "google",
    platformAccountId: normalizeResourceId(
      readString(record, ["customer_id", "customerId", ["customer", "id"]])
    ),
    date: parseDate(readString(record, ["date", "segments_date", ["segments", "date"]])),
    campaignExternalId: readString(record, ["campaign_id", "campaignId", ["campaign", "id"]]),
    campaignName: readOptionalString(record, ["campaign_name", "campaignName", ["campaign", "name"]]),
    adSetExternalId: readString(record, [
      "ad_group_id",
      "adGroupId",
      "adgroup_id",
      ["ad_group", "id"],
      ["adGroup", "id"],
    ]),
    adSetName: readString(record, [
      "ad_group_name",
      "adGroupName",
      "adgroup_name",
      ["ad_group", "name"],
      ["adGroup", "name"],
    ]),
    adSetStatus: normalizeStatus(
      "google",
      readString(record, [
        "ad_group_status",
        "adGroupStatus",
        ["ad_group", "status"],
        ["adGroup", "status"],
      ])
    ),
    optimizationGoal: readOptionalString(record, [
      "optimization_goal",
      "optimizationGoal",
      ["ad_group", "type"],
      ["adGroup", "type"],
    ]),
    spend: costMicrosToLocal(
      readNumber(record, [
        "cost_micros",
        "costMicros",
        ["metrics", "cost_micros"],
        ["metrics", "costMicros"],
      ])
    ),
    impressions: readNumber(record, ["impressions", ["metrics", "impressions"]]),
    clicks: readNumber(record, ["clicks", ["metrics", "clicks"]]),
    conversions: readOptionalNumber(record, ["conversions", ["metrics", "conversions"]]),
    leads: readOptionalNumber(record, ["leads", ["metrics", "leads"]]),
    reach: readOptionalNumber(record, ["reach", ["metrics", "reach"]]),
    ctr: readOptionalNumber(record, ["ctr", ["metrics", "ctr"]]),
    cpc: readOptionalNumber(record, [
      "cpc",
      "average_cpc",
      ["metrics", "average_cpc"],
      ["metrics", "averageCpc"],
    ]),
    cpm: readOptionalNumber(record, [
      "cpm",
      "average_cpm",
      ["metrics", "average_cpm"],
      ["metrics", "averageCpm"],
    ]),
    sourceUpdatedAt: readOptionalTimestamp(record, [
      "updated_at",
      "updatedAt",
      "last_modified_time",
      "lastModifiedTime",
    ]),
    syncedAt: Date.now(),
  };
}

/**
 * Map a Google ad row into ads_daily fields.
 */
export function mapGoogleAd(raw: unknown): AdDailyFields {
  const record = asRecord(raw);

  return {
    platform: "google",
    platformAccountId: normalizeResourceId(
      readString(record, ["customer_id", "customerId", ["customer", "id"]])
    ),
    date: parseDate(readString(record, ["date", "segments_date", ["segments", "date"]])),
    campaignExternalId: readString(record, ["campaign_id", "campaignId", ["campaign", "id"]]),
    campaignName: readOptionalString(record, ["campaign_name", "campaignName", ["campaign", "name"]]),
    adSetExternalId: readString(record, [
      "ad_group_id",
      "adGroupId",
      "adgroup_id",
      ["ad_group", "id"],
      ["adGroup", "id"],
    ]),
    adSetName: readOptionalString(record, [
      "ad_group_name",
      "adGroupName",
      "adgroup_name",
      ["ad_group", "name"],
      ["adGroup", "name"],
    ]),
    adExternalId: readString(record, [
      "ad_id",
      "adId",
      ["ad_group_ad", "ad", "id"],
      ["adGroupAd", "ad", "id"],
      ["ad", "id"],
    ]),
    adName: readString(record, [
      "ad_name",
      "adName",
      ["ad_group_ad", "ad", "name"],
      ["adGroupAd", "ad", "name"],
      ["ad", "name"],
    ]),
    adStatus: normalizeStatus(
      "google",
      readString(record, [
        "ad_status",
        "adStatus",
        ["ad_group_ad", "status"],
        ["adGroupAd", "status"],
      ])
    ),
    spend: costMicrosToLocal(
      readNumber(record, [
        "cost_micros",
        "costMicros",
        ["metrics", "cost_micros"],
        ["metrics", "costMicros"],
      ])
    ),
    impressions: readNumber(record, ["impressions", ["metrics", "impressions"]]),
    clicks: readNumber(record, ["clicks", ["metrics", "clicks"]]),
    conversions: readOptionalNumber(record, ["conversions", ["metrics", "conversions"]]),
    leads: readOptionalNumber(record, ["leads", ["metrics", "leads"]]),
    reach: readOptionalNumber(record, ["reach", ["metrics", "reach"]]),
    ctr: readOptionalNumber(record, ["ctr", ["metrics", "ctr"]]),
    cpc: readOptionalNumber(record, [
      "cpc",
      "average_cpc",
      ["metrics", "average_cpc"],
      ["metrics", "averageCpc"],
    ]),
    cpm: readOptionalNumber(record, [
      "cpm",
      "average_cpm",
      ["metrics", "average_cpm"],
      ["metrics", "averageCpm"],
    ]),
    sourceUpdatedAt: readOptionalTimestamp(record, [
      "updated_at",
      "updatedAt",
      "last_modified_time",
      "lastModifiedTime",
    ]),
    syncedAt: Date.now(),
  };
}

/**
 * Map a TikTok campaign row into campaigns_daily fields.
 */
export function mapTikTokCampaign(raw: unknown): CampaignDailyFields & { adSetExternalId?: string } {
  const record = asRecord(raw);

  return {
    platform: "tiktok",
    platformAccountId: readString(record, ["advertiser_id", "advertiserId"]),
    date: parseDate(readString(record, ["stat_time_day", "date"])),
    campaignExternalId: readString(record, ["campaign_id", "campaignId", "id"]),
    campaignName: readString(record, ["campaign_name", "campaignName", "name"]),
    campaignStatus: normalizeStatus("tiktok", readString(record, ["status", "campaign_status"])),
    objective: readOptionalString(record, ["objective_type", "objectiveType"]),
    currencyCode: readOptionalString(record, ["currency", "currency_code", "currencyCode"]),
    adSetExternalId: readOptionalString(record, ["adgroup_id", "adgroupId"]),
    spend: readNumber(record, ["spend", "cost"]),
    impressions: readNumber(record, ["impressions"]),
    clicks: readNumber(record, ["clicks"]),
    conversions: readOptionalNumber(record, ["conversion", "conversions"]),
    leads: readOptionalNumber(record, ["leads"]),
    reach: readOptionalNumber(record, ["reach"]),
    videoViews: readOptionalNumber(record, ["video_views", "videoViews"]),
    ctr: readOptionalNumber(record, ["ctr"]),
    cpc: readOptionalNumber(record, ["cpc"]),
    cpm: readOptionalNumber(record, ["cpm"]),
    sourceUpdatedAt: readOptionalTimestamp(record, ["updated_at", "updatedAt", "modify_time"]),
    syncedAt: Date.now(),
  };
}

/**
 * Map a TikTok ad group row into ad_sets_daily fields.
 */
export function mapTikTokAdGroup(raw: unknown): AdSetDailyFields {
  const record = asRecord(raw);

  return {
    platform: "tiktok",
    platformAccountId: readString(record, ["advertiser_id", "advertiserId"]),
    date: parseDate(readString(record, ["stat_time_day", "date"])),
    campaignExternalId: readString(record, ["campaign_id", "campaignId"]),
    campaignName: readOptionalString(record, ["campaign_name", "campaignName"]),
    adSetExternalId: readString(record, ["adgroup_id", "adgroupId", "ad_set_id", "adSetId", "id"]),
    adSetName: readString(record, ["adgroup_name", "adgroupName", "ad_set_name", "adSetName", "name"]),
    adSetStatus: normalizeStatus(
      "tiktok",
      readString(record, ["status", "adgroup_status", "adGroupStatus"])
    ),
    optimizationGoal: readOptionalString(record, [
      "optimization_goal",
      "optimizationGoal",
      "optimization_event",
    ]),
    spend: readNumber(record, ["spend", "cost"]),
    impressions: readNumber(record, ["impressions"]),
    clicks: readNumber(record, ["clicks"]),
    conversions: readOptionalNumber(record, ["conversion", "conversions"]),
    leads: readOptionalNumber(record, ["leads"]),
    reach: readOptionalNumber(record, ["reach"]),
    ctr: readOptionalNumber(record, ["ctr"]),
    cpc: readOptionalNumber(record, ["cpc"]),
    cpm: readOptionalNumber(record, ["cpm"]),
    sourceUpdatedAt: readOptionalTimestamp(record, ["updated_at", "updatedAt", "modify_time"]),
    syncedAt: Date.now(),
  };
}

/**
 * Map a TikTok ad row into ads_daily fields.
 */
export function mapTikTokAd(raw: unknown): AdDailyFields {
  const record = asRecord(raw);

  return {
    platform: "tiktok",
    platformAccountId: readString(record, ["advertiser_id", "advertiserId"]),
    date: parseDate(readString(record, ["stat_time_day", "date"])),
    campaignExternalId: readString(record, ["campaign_id", "campaignId"]),
    campaignName: readOptionalString(record, ["campaign_name", "campaignName"]),
    adSetExternalId: readString(record, ["adgroup_id", "adgroupId", "ad_set_id", "adSetId"]),
    adSetName: readOptionalString(record, ["adgroup_name", "adgroupName", "ad_set_name", "adSetName"]),
    adExternalId: readString(record, ["ad_id", "adId", "id"]),
    adName: readString(record, ["ad_name", "adName", "name"]),
    adStatus: normalizeStatus("tiktok", readString(record, ["status", "ad_status", "adStatus"])),
    spend: readNumber(record, ["spend", "cost"]),
    impressions: readNumber(record, ["impressions"]),
    clicks: readNumber(record, ["clicks"]),
    conversions: readOptionalNumber(record, ["conversion", "conversions"]),
    leads: readOptionalNumber(record, ["leads"]),
    reach: readOptionalNumber(record, ["reach"]),
    ctr: readOptionalNumber(record, ["ctr"]),
    cpc: readOptionalNumber(record, ["cpc"]),
    cpm: readOptionalNumber(record, ["cpm"]),
    sourceUpdatedAt: readOptionalTimestamp(record, ["updated_at", "updatedAt", "modify_time"]),
    syncedAt: Date.now(),
  };
}

/**
 * Map a TikTok lead row into leads fields.
 */
export function mapTikTokLead(raw: unknown): LeadFields {
  const record = asRecord(raw);
  const { fullName, email, phone } = parseTikTokLeadContacts(record);

  return {
    sourcePlatform: "tiktok",
    platformAccountId: readString(record, ["advertiser_id", "advertiserId", "account_id", "accountId"]),
    leadExternalId: readOptionalString(record, ["lead_id", "leadId", "id"]),
    campaignExternalId: readOptionalString(record, ["campaign_id", "campaignId"]),
    adSetExternalId: readOptionalString(record, ["adgroup_id", "adgroupId", "ad_set_id", "adSetId"]),
    adExternalId: readOptionalString(record, ["ad_id", "adId"]),
    campaignName: readOptionalString(record, ["campaign_name", "campaignName"]),
    adSetName: readOptionalString(record, ["adgroup_name", "adgroupName", "ad_set_name", "adSetName"]),
    adName: readOptionalString(record, ["ad_name", "adName"]),
    name: fullName,
    email,
    phone,
    city: readOptionalString(record, ["city"]),
    country: readOptionalString(record, ["country"]),
    message: readOptionalString(record, ["message", "comment"]),
    capturedAt:
      readTimestamp(record, ["create_time", "created_at", "createdAt", "captured_at", "capturedAt"]) ||
      Date.now(),
    importedAt: Date.now(),
    utmSource: readOptionalString(record, ["utm_source", "utmSource"]),
    utmMedium: readOptionalString(record, ["utm_medium", "utmMedium"]),
    utmCampaign: readOptionalString(record, ["utm_campaign", "utmCampaign"]),
    utmContent: readOptionalString(record, ["utm_content", "utmContent"]),
    utmTerm: readOptionalString(record, ["utm_term", "utmTerm"]),
    landingPageUrl: readOptionalString(record, ["landing_page_url", "landingPageUrl"]),
    referrerUrl: readOptionalString(record, ["referrer_url", "referrerUrl"]),
    ttclid: readOptionalString(record, ["ttclid"]),
    rawPayload: raw,
  };
}

/**
 * Map a GA4 session row into ga4_sessions_daily fields.
 */
export function mapGA4Session(raw: unknown): GA4SessionDailyFields {
  const record = asRecord(raw);

  return {
    ga4PropertyId: readString(record, ["ga4PropertyId", "ga4_property_id", "propertyId", "property_id"]),
    date: parseDate(readString(record, ["date", "sessionDate", "session_date"])),
    source: readString(record, ["sessionSource", "session_source", "source"]),
    medium: readString(record, ["sessionMedium", "session_medium", "medium"]),
    campaignName: readString(record, [
      "sessionCampaignName",
      "session_campaign_name",
      "campaignName",
      "campaign",
    ]),
    content: readOptionalString(record, ["sessionContent", "session_content", "content"]),
    term: readOptionalString(record, ["sessionTerm", "session_term", "term"]),
    landingPagePath: readOptionalString(record, ["landingPagePath", "landing_page_path"]),
    sessions: readNumber(record, ["sessions", "sessionCount", "session_count"]),
    engagedSessions: readOptionalNumber(record, ["engagedSessions", "engaged_sessions"]),
    users: readOptionalNumber(record, ["users"]),
    newUsers: readOptionalNumber(record, ["newUsers", "new_users"]),
    conversions: readOptionalNumber(record, ["conversions"]),
    purchaseRevenue: readOptionalNumber(record, ["purchaseRevenue", "purchase_revenue"]),
    avgEngagementTimeSeconds: readOptionalNumber(record, [
      "avgEngagementTimeSeconds",
      "avg_engagement_time_seconds",
    ]),
    bounceRate: readOptionalNumber(record, ["bounceRate", "bounce_rate"]),
    sourceUpdatedAt: readOptionalTimestamp(record, ["updatedAt", "updated_at"]),
    syncedAt: Date.now(),
  };
}

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function read(record: UnknownRecord, candidates: FieldCandidate[]): unknown {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const value = record[candidate];
      if (value !== undefined && value !== null) return value;
      continue;
    }

    const value = readPath(record, candidate);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function readPath(record: UnknownRecord, path: string[]): unknown {
  let current: unknown = record;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as UnknownRecord)[segment];
  }
  return current;
}

function readString(record: UnknownRecord, candidates: FieldCandidate[], fallback = ""): string {
  return safeString(read(record, candidates), fallback);
}

function readOptionalString(record: UnknownRecord, candidates: FieldCandidate[]): string | undefined {
  return toOptionalString(read(record, candidates));
}

function readNumber(record: UnknownRecord, candidates: FieldCandidate[], fallback = 0): number {
  return safeNumber(read(record, candidates), fallback);
}

function readOptionalNumber(record: UnknownRecord, candidates: FieldCandidate[]): number | undefined {
  const value = read(record, candidates);
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = safeNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readTimestamp(record: UnknownRecord, candidates: FieldCandidate[]): number {
  const value = read(record, candidates);
  if (typeof value !== "string" && typeof value !== "number") return 0;
  return parseTimestamp(value);
}

function readOptionalTimestamp(record: UnknownRecord, candidates: FieldCandidate[]): number | undefined {
  const timestamp = readTimestamp(record, candidates);
  return timestamp || undefined;
}

function toOptionalString(value: unknown): string | undefined {
  const parsed = safeString(value).trim();
  return parsed ? parsed : undefined;
}

function normalizeResourceId(value: string): string {
  const trimmed = safeString(value).trim();
  if (!trimmed) return "";
  const parts = trimmed.split("/");
  return parts[parts.length - 1] ?? trimmed;
}

function readMetaActionMetricValue(metric: unknown): number | undefined {
  if (metric === undefined || metric === null || metric === "") return undefined;

  if (Array.isArray(metric)) {
    for (const item of metric) {
      const itemRecord = asRecord(item);
      const value = safeNumber(read(itemRecord, ["value", "count"]), Number.NaN);
      if (Number.isFinite(value)) {
        return value;
      }
    }
    return undefined;
  }

  if (typeof metric === "object") {
    const metricRecord = asRecord(metric);
    const value = safeNumber(read(metricRecord, ["value", "count"]), Number.NaN);
    return Number.isFinite(value) ? value : undefined;
  }

  const value = safeNumber(metric, Number.NaN);
  return Number.isFinite(value) ? value : undefined;
}

function isMetaLeadActionType(actionType: string): boolean {
  return (
    actionType === "lead" ||
    actionType.includes("fb_pixel_lead") ||
    actionType.includes("onsite_conversion.lead") ||
    actionType.includes("lead_grouped")
  );
}

function isMetaMessageActionType(actionType: string): boolean {
  return (
    actionType.includes("message_contacts_new") ||
    actionType.includes("messaging_conversation_started") ||
    actionType.includes("message")
  );
}

function parseMetaCostPerActionType(costPerActionType: unknown): {
  costPerLead?: number;
  costPerConversion?: number;
} {
  if (!Array.isArray(costPerActionType)) {
    return {};
  }

  let costPerLead: number | undefined;
  let costPerConversion: number | undefined;

  for (const action of costPerActionType) {
    const actionRecord = asRecord(action);
    const actionType = safeString(
      read(actionRecord, ["action_type", "actionType", "type"])
    ).toLowerCase();
    const value = readMetaActionMetricValue(read(actionRecord, ["value", "cost"]));
    if (!actionType || value === undefined) continue;

    if (costPerLead === undefined && isMetaLeadActionType(actionType)) {
      costPerLead = value;
      continue;
    }

    if (costPerConversion === undefined && actionType.includes("purchase")) {
      costPerConversion = value;
    }
  }

  return { costPerLead, costPerConversion };
}

function parseMetaActions(actions: unknown): {
  leads: number;
  purchases: number;
  messageContactsNew: number;
  likes: number;
  comments: number;
  shares: number;
} {
  if (!Array.isArray(actions)) {
    return { leads: 0, purchases: 0, messageContactsNew: 0, likes: 0, comments: 0, shares: 0 };
  }

  let leads = 0;
  let purchases = 0;
  let messageContactsNew = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;

  for (const action of actions) {
    const actionRecord = asRecord(action);
    const actionType = safeString(
      read(actionRecord, ["action_type", "actionType", "type"])
    ).toLowerCase();
    const value = safeNumber(read(actionRecord, ["value", "count"]), 0);
    if (!actionType || !Number.isFinite(value)) continue;

    if (isMetaLeadActionType(actionType)) {
      leads += value;
      continue;
    }

    if (actionType.includes("purchase")) {
      purchases += value;
      continue;
    }

    if (isMetaMessageActionType(actionType)) {
      messageContactsNew += value;
      continue;
    }

    if (
      actionType === "like" ||
      actionType.includes("post_reaction") ||
      actionType.includes("like")
    ) {
      likes += value;
      continue;
    }

    if (actionType.includes("comment")) {
      comments += value;
      continue;
    }

    if (
      actionType === "post" ||
      actionType.includes("post_share") ||
      actionType.includes("share")
    ) {
      shares += value;
    }
  }

  return { leads, purchases, messageContactsNew, likes, comments, shares };
}

function parseMetaLeadFieldData(fieldData: unknown): {
  fullName?: string;
  phone?: string;
  email?: string;
} {
  if (!Array.isArray(fieldData)) return {};

  let fullName: string | undefined;
  let phone: string | undefined;
  let email: string | undefined;

  for (const item of fieldData) {
    const itemRecord = asRecord(item);
    const rawName = safeString(read(itemRecord, ["name", "field_name"])).toLowerCase().trim();
    if (!rawName) continue;

    const values = read(itemRecord, ["values"]);
    let rawValue: unknown;
    if (Array.isArray(values)) {
      rawValue = values[0];
    } else {
      rawValue = read(itemRecord, ["value"]);
    }

    const value = toOptionalString(rawValue);
    if (!value) continue;

    if (!email && (rawName === "email" || rawName.includes("email"))) {
      email = value;
      continue;
    }
    if (!phone && (rawName.includes("phone") || rawName.includes("mobile"))) {
      phone = value;
      continue;
    }
    if (
      !fullName &&
      (rawName === "full_name" || rawName === "fullname" || rawName === "name")
    ) {
      fullName = value;
    }
  }

  return { fullName, phone, email };
}

function parseTikTokLeadContacts(record: UnknownRecord): {
  fullName?: string;
  email?: string;
  phone?: string;
} {
  let fullName = readOptionalString(record, ["name", "full_name", "fullName"]);
  let email = readOptionalString(record, ["email"]);
  let phone = readOptionalString(record, ["phone", "phone_number", "phoneNumber"]);

  const candidates = [read(record, ["field_data"]), read(record, ["question_answers"]), read(record, ["answers"])];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;

    for (const item of candidate) {
      const itemRecord = asRecord(item);
      const question = safeString(
        read(itemRecord, ["name", "question", "key", "field_name"])
      ).toLowerCase();
      if (!question) continue;

      const values = read(itemRecord, ["values"]);
      const value = toOptionalString(
        Array.isArray(values) ? values[0] : read(itemRecord, ["value", "answer"])
      );
      if (!value) continue;

      if (!email && question.includes("email")) {
        email = value;
        continue;
      }
      if (!phone && (question.includes("phone") || question.includes("mobile"))) {
        phone = value;
        continue;
      }
      if (!fullName && question.includes("name")) {
        fullName = value;
      }
    }
  }

  return { fullName, email, phone };
}
