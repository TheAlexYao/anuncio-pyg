"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  mapGoogleAd,
  mapGoogleAdGroup,
  mapGoogleCampaign,
} from "../lib/apiMappers";
import { buildGoogleAdsHeaders } from "./accounts";

const GOOGLE_ADS_API_VERSION = "v18";
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

const GOOGLE_CAMPAIGN_GAQL = `
SELECT
  customer.id,
  customer.currency_code,
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  segments.date,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.video_views,
  metrics.ctr,
  metrics.average_cpc,
  metrics.average_cpm
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
`;

const GOOGLE_AD_GROUP_GAQL = `
SELECT
  customer.id,
  campaign.id,
  campaign.name,
  ad_group.id,
  ad_group.name,
  ad_group.status,
  ad_group.type,
  segments.date,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.ctr,
  metrics.average_cpc,
  metrics.average_cpm
FROM ad_group
WHERE segments.date DURING LAST_30_DAYS
`;

const GOOGLE_AD_GAQL = `
SELECT
  customer.id,
  campaign.id,
  campaign.name,
  ad_group.id,
  ad_group.name,
  ad_group_ad.ad.id,
  ad_group_ad.ad.name,
  ad_group_ad.status,
  segments.date,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.ctr,
  metrics.average_cpc,
  metrics.average_cpm
FROM ad_group_ad
WHERE segments.date DURING LAST_30_DAYS
`;

const syncRunTypeValidator = v.union(
  v.literal("incremental"),
  v.literal("backfill")
);

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function parseGoogleSearchStreamRows(payload: unknown): unknown[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const rows: unknown[] = [];
  for (const chunk of payload) {
    const record = asRecord(chunk);
    const results = Array.isArray(record.results) ? record.results : [];
    rows.push(...results);
  }

  return rows;
}

function parseGoogleErrorMessage(payload: unknown, fallback: string): string {
  const record = asRecord(payload);
  const error = asRecord(record.error);
  const message =
    typeof error.message === "string" && error.message
      ? error.message
      : undefined;

  return message ?? fallback;
}

function getGoogleAdsEnv(): {
  developerToken: string;
  loginCustomerId?: string;
} {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN environment variable is not set");
  }

  const loginCustomerId =
    process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ??
    process.env.GOOGLE_ADS_MCC_CUSTOMER_ID;

  return {
    developerToken,
    loginCustomerId,
  };
}

async function fetchGoogleAdsRows(
  accessToken: string,
  customerId: string,
  gaqlQuery: string
): Promise<unknown[]> {
  const { developerToken, loginCustomerId } = getGoogleAdsEnv();

  const response = await fetch(
    `${GOOGLE_ADS_BASE_URL}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: buildGoogleAdsHeaders(
        accessToken,
        developerToken,
        loginCustomerId
      ),
      body: JSON.stringify({ query: gaqlQuery }),
    }
  );

  const bodyText = await response.text();
  let payload: unknown;

  try {
    payload = bodyText ? JSON.parse(bodyText) : [];
  } catch {
    payload = [];
  }

  if (!response.ok) {
    const errorMessage = parseGoogleErrorMessage(payload, bodyText);
    throw new Error(
      `Google Ads searchStream failed (${response.status}): ${errorMessage}`
    );
  }

  return parseGoogleSearchStreamRows(payload);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown Google campaign sync error";
}

export const syncGoogleCampaigns = internalAction({
  args: {
    connectedAccountId: v.id("connected_accounts"),
    syncRunType: v.optional(syncRunTypeValidator),
  },
  returns: v.object({
    campaignRows: v.number(),
    adSetRows: v.number(),
    adRows: v.number(),
  }),
  handler: async (ctx, args) => {
    const syncContext = (await ctx.runQuery(
      (internal as any).queries.getSyncContextByConnectedAccountId,
      {
        connectedAccountId: args.connectedAccountId,
      }
    )) as
      | {
          connectedAccount: {
            _id: string;
            userAuthId: string;
            platform: "google" | "meta" | "tiktok";
            accountType: string;
            syncEnabled: boolean;
            tenantId: string;
            brandId?: string;
            platformAccountId: string;
          };
        }
      | null;

    if (!syncContext) {
      throw new Error("Connected account or user auth record not found");
    }

    if (syncContext.connectedAccount.platform !== "google") {
      throw new Error("Connected account is not a Google account");
    }

    if (syncContext.connectedAccount.accountType !== "google_ads") {
      throw new Error("Connected account is not a Google Ads account");
    }

    if (!syncContext.connectedAccount.syncEnabled) {
      return {
        campaignRows: 0,
        adSetRows: 0,
        adRows: 0,
      };
    }

    await ctx.runMutation((internal as any).queries.markCampaignSyncStarted, {
      connectedAccountId: args.connectedAccountId,
    });

    try {
      const accessToken: string = await ctx.runAction(
        (internal as any).google.oauth.getValidAccessToken,
        {
          userAuthId: syncContext.connectedAccount.userAuthId,
        }
      );

      const [campaignRawRows, adGroupRawRows, adRawRows] = await Promise.all([
        fetchGoogleAdsRows(
          accessToken,
          syncContext.connectedAccount.platformAccountId,
          GOOGLE_CAMPAIGN_GAQL
        ),
        fetchGoogleAdsRows(
          accessToken,
          syncContext.connectedAccount.platformAccountId,
          GOOGLE_AD_GROUP_GAQL
        ),
        fetchGoogleAdsRows(
          accessToken,
          syncContext.connectedAccount.platformAccountId,
          GOOGLE_AD_GAQL
        ),
      ]);

      const mappedCampaigns = campaignRawRows.map((row) => mapGoogleCampaign(row));
      const mappedAdSets = adGroupRawRows.map((row) => mapGoogleAdGroup(row));
      const mappedAds = adRawRows.map((row) => mapGoogleAd(row));

      await Promise.all([
        ctx.runMutation((internal as any).queries.upsertCampaignsDaily, {
          tenantId: syncContext.connectedAccount.tenantId,
          brandId: syncContext.connectedAccount.brandId,
          connectedAccountId: args.connectedAccountId,
          syncRunType: args.syncRunType,
          rows: mappedCampaigns,
        }),
        ctx.runMutation((internal as any).queries.upsertAdSetsDaily, {
          tenantId: syncContext.connectedAccount.tenantId,
          brandId: syncContext.connectedAccount.brandId,
          connectedAccountId: args.connectedAccountId,
          syncRunType: args.syncRunType,
          rows: mappedAdSets,
        }),
        ctx.runMutation((internal as any).queries.upsertAdsDaily, {
          tenantId: syncContext.connectedAccount.tenantId,
          brandId: syncContext.connectedAccount.brandId,
          connectedAccountId: args.connectedAccountId,
          syncRunType: args.syncRunType,
          rows: mappedAds,
        }),
      ]);

      await ctx.runMutation((internal as any).queries.markCampaignSyncCompleted, {
        connectedAccountId: args.connectedAccountId,
      });

      return {
        campaignRows: mappedCampaigns.length,
        adSetRows: mappedAdSets.length,
        adRows: mappedAds.length,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      await ctx.runMutation((internal as any).queries.markSyncFailed, {
        connectedAccountId: args.connectedAccountId,
        scope: "campaigns",
        message,
      });

      throw error;
    }
  },
});

export const syncGoogleAdsAccount = internalAction({
  args: {
    connectedAccountId: v.id("connected_accounts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction((internal as any).google.sync.syncGoogleCampaigns, {
      connectedAccountId: args.connectedAccountId,
      syncRunType: "incremental",
    });
    return null;
  },
});

export const syncDueGoogleCampaigns = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueCampaignSyncAccountIds,
      {
        platform: "google",
        accountType: "google_ads",
        now: Date.now(),
        limit: args.limit ?? 20,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.scheduler.runAfter(
        0,
        (internal as any).google.sync.syncGoogleCampaigns,
        {
          connectedAccountId,
          syncRunType: "incremental",
        }
      );
    }

    return accountIds.length;
  },
});

export const syncAllGoogleAdsAccounts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueCampaignSyncAccountIds,
      {
        platform: "google",
        accountType: "google_ads",
        now: Number.MAX_SAFE_INTEGER,
        limit: 500,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.runAction((internal as any).google.sync.syncGoogleCampaigns, {
        connectedAccountId,
        syncRunType: "incremental",
      });
    }

    return null;
  },
});
