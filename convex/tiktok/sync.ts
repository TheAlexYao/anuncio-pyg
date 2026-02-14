"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { decrypt } from "../lib/crypto";
import {
  mapTikTokAd,
  mapTikTokAdGroup,
  mapTikTokCampaign,
  mapTikTokLead,
} from "../lib/apiMappers";

const TIKTOK_BASE_URL = "https://business-api.tiktok.com/open_api/v1.3";
const TIKTOK_MAX_PAGES = 20;

const syncRunTypeValidator = v.union(
  v.literal("incremental"),
  v.literal("backfill")
);

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function requireEncryptionKey(): string {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY environment variable is not set");
  }
  return key;
}

function decryptAccessToken(encryptedAccessToken: string): string {
  return decrypt(encryptedAccessToken, requireEncryptionKey());
}

function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function defaultDateRange(): { startDate: string; endDate: string } {
  const now = Date.now();
  const thirtyDaysAgo = now - 29 * 24 * 60 * 60 * 1000;

  return {
    startDate: toDateString(thirtyDaysAgo),
    endDate: toDateString(now),
  };
}

function parseTikTokEnvelope(payload: unknown): {
  rows: unknown[];
  errorMessage?: string;
  currentPage?: number;
  totalPage?: number;
  hasMore?: boolean;
} {
  const record = asRecord(payload);

  const code = typeof record.code === "number" ? record.code : 0;
  const message =
    typeof record.message === "string"
      ? record.message
      : typeof record.msg === "string"
      ? record.msg
      : undefined;

  if (code !== 0) {
    return {
      rows: [],
      errorMessage: message ?? `TikTok API returned code ${code}`,
    };
  }

  const data = asRecord(record.data);
  const pageInfo = asRecord(data.page_info ?? data.pageInfo);

  const rows =
    Array.isArray(data.list)
      ? data.list
      : Array.isArray(data.rows)
      ? data.rows
      : Array.isArray(data.data)
      ? data.data
      : [];

  const currentPage =
    typeof pageInfo.page === "number"
      ? pageInfo.page
      : typeof pageInfo.current_page === "number"
      ? pageInfo.current_page
      : undefined;

  const totalPage =
    typeof pageInfo.total_page === "number"
      ? pageInfo.total_page
      : typeof pageInfo.totalPage === "number"
      ? pageInfo.totalPage
      : undefined;

  const hasMore =
    typeof pageInfo.has_next_page === "boolean"
      ? pageInfo.has_next_page
      : typeof pageInfo.hasMore === "boolean"
      ? pageInfo.hasMore
      : undefined;

  return {
    rows,
    errorMessage: message,
    currentPage,
    totalPage,
    hasMore,
  };
}

async function fetchTikTokReportRows(
  accessToken: string,
  advertiserId: string,
  dataLevel: "AUCTION_CAMPAIGN" | "AUCTION_ADGROUP" | "AUCTION_AD",
  dimensions: string[],
  metrics: string[],
  startDate: string,
  endDate: string
): Promise<unknown[]> {
  const allRows: unknown[] = [];

  for (let page = 1; page <= TIKTOK_MAX_PAGES; page += 1) {
    const response = await fetch(`${TIKTOK_BASE_URL}/report/integrated/get/`, {
      method: "POST",
      headers: {
        "Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        advertiser_id: advertiserId,
        report_type: "BASIC",
        data_level: dataLevel,
        dimensions,
        metrics,
        start_date: startDate,
        end_date: endDate,
        page,
        page_size: 1000,
      }),
    });

    const bodyText = await response.text();
    let payload: unknown;

    try {
      payload = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      payload = {};
    }

    const parsed = parseTikTokEnvelope(payload);
    if (!response.ok || parsed.errorMessage) {
      throw new Error(
        `TikTok report request failed (${response.status}): ${
          parsed.errorMessage ?? bodyText
        }`
      );
    }

    allRows.push(...parsed.rows);

    if (parsed.hasMore === false) {
      break;
    }

    if (
      typeof parsed.currentPage === "number" &&
      typeof parsed.totalPage === "number" &&
      parsed.currentPage >= parsed.totalPage
    ) {
      break;
    }

    if (parsed.rows.length === 0) {
      break;
    }
  }

  return allRows;
}

async function fetchTikTokPageLeads(
  accessToken: string,
  pageId: string
): Promise<unknown[]> {
  const response = await fetch(`${TIKTOK_BASE_URL}/pages/${pageId}/leads/`, {
    method: "GET",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  const bodyText = await response.text();
  let payload: unknown;

  try {
    payload = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    payload = {};
  }

  const parsed = parseTikTokEnvelope(payload);
  if (!response.ok || parsed.errorMessage) {
    throw new Error(
      `TikTok leads request failed (${response.status}): ${
        parsed.errorMessage ?? bodyText
      }`
    );
  }

  return parsed.rows;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown TikTok sync error";
}

export const syncTikTokCampaigns = internalAction({
  args: {
    connectedAccountId: v.id("connected_accounts"),
    syncRunType: v.optional(syncRunTypeValidator),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
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
            platform: "google" | "meta" | "tiktok";
            syncEnabled: boolean;
            tenantId: string;
            brandId?: string;
            platformAccountId: string;
          };
          userAuth: {
            encryptedAccessToken: string;
          };
        }
      | null;

    if (!syncContext) {
      throw new Error("Connected account or user auth record not found");
    }

    if (syncContext.connectedAccount.platform !== "tiktok") {
      throw new Error("Connected account is not a TikTok account");
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
      const accessToken = decryptAccessToken(
        syncContext.userAuth.encryptedAccessToken
      );

      const defaultRange = defaultDateRange();
      const startDate = args.startDate ?? defaultRange.startDate;
      const endDate = args.endDate ?? defaultRange.endDate;

      const metrics = [
        "spend",
        "impressions",
        "clicks",
        "conversion",
        "reach",
        "video_views",
        "ctr",
        "cpc",
        "cpm",
      ];

      const [campaignRawRows, adSetRawRows, adRawRows] = await Promise.all([
        fetchTikTokReportRows(
          accessToken,
          syncContext.connectedAccount.platformAccountId,
          "AUCTION_CAMPAIGN",
          ["campaign_id", "campaign_name", "stat_time_day", "advertiser_id"],
          metrics,
          startDate,
          endDate
        ),
        fetchTikTokReportRows(
          accessToken,
          syncContext.connectedAccount.platformAccountId,
          "AUCTION_ADGROUP",
          [
            "campaign_id",
            "campaign_name",
            "adgroup_id",
            "adgroup_name",
            "stat_time_day",
            "advertiser_id",
          ],
          metrics,
          startDate,
          endDate
        ),
        fetchTikTokReportRows(
          accessToken,
          syncContext.connectedAccount.platformAccountId,
          "AUCTION_AD",
          [
            "campaign_id",
            "campaign_name",
            "adgroup_id",
            "adgroup_name",
            "ad_id",
            "ad_name",
            "stat_time_day",
            "advertiser_id",
          ],
          metrics,
          startDate,
          endDate
        ),
      ]);

      const mappedCampaigns = campaignRawRows.map((row) => mapTikTokCampaign(row));
      const mappedAdSets = adSetRawRows.map((row) => mapTikTokAdGroup(row));
      const mappedAds = adRawRows.map((row) => mapTikTokAd(row));

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

export const syncTikTokAccount = internalAction({
  args: {
    connectedAccountId: v.id("connected_accounts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction((internal as any).tiktok.sync.syncTikTokCampaigns, {
      connectedAccountId: args.connectedAccountId,
      syncRunType: "incremental",
    });
    return null;
  },
});

export const syncTikTokLeads = internalAction({
  args: {
    connectedAccountId: v.id("connected_accounts"),
    pageIds: v.optional(v.array(v.string())),
  },
  returns: v.object({
    leadRows: v.number(),
    pageCount: v.number(),
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
            platform: "google" | "meta" | "tiktok";
            syncEnabled: boolean;
            tenantId: string;
            brandId?: string;
            platformAccountId: string;
          };
          userAuth: {
            encryptedAccessToken: string;
          };
        }
      | null;

    if (!syncContext) {
      throw new Error("Connected account or user auth record not found");
    }

    if (syncContext.connectedAccount.platform !== "tiktok") {
      throw new Error("Connected account is not a TikTok account");
    }

    if (!syncContext.connectedAccount.syncEnabled) {
      return {
        leadRows: 0,
        pageCount: 0,
      };
    }

    await ctx.runMutation((internal as any).queries.markLeadSyncStarted, {
      connectedAccountId: args.connectedAccountId,
    });

    try {
      const accessToken = decryptAccessToken(
        syncContext.userAuth.encryptedAccessToken
      );

      const envPageIds =
        process.env.TIKTOK_LEADS_PAGE_IDS
          ?.split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0) ?? [];
      const pageIds = args.pageIds ?? envPageIds;

      if (pageIds.length === 0) {
        await ctx.runMutation((internal as any).queries.markLeadSyncCompleted, {
          connectedAccountId: args.connectedAccountId,
        });

        return {
          leadRows: 0,
          pageCount: 0,
        };
      }

      const leadRowsPerPage = await Promise.all(
        pageIds.map((pageId) => fetchTikTokPageLeads(accessToken, pageId))
      );

      const mappedLeads = leadRowsPerPage
        .flat()
        .map((row) => {
          const record = asRecord(row);
          return mapTikTokLead({
            ...record,
            advertiser_id: syncContext.connectedAccount.platformAccountId,
          });
        });

      await ctx.runMutation((internal as any).queries.upsertLeads, {
        tenantId: syncContext.connectedAccount.tenantId,
        brandId: syncContext.connectedAccount.brandId,
        connectedAccountId: args.connectedAccountId,
        rows: mappedLeads,
      });

      await ctx.runMutation((internal as any).queries.markLeadSyncCompleted, {
        connectedAccountId: args.connectedAccountId,
      });

      return {
        leadRows: mappedLeads.length,
        pageCount: pageIds.length,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      await ctx.runMutation((internal as any).queries.markSyncFailed, {
        connectedAccountId: args.connectedAccountId,
        scope: "leads",
        message,
      });

      throw error;
    }
  },
});

export const syncDueTikTokCampaigns = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueCampaignSyncAccountIds,
      {
        platform: "tiktok",
        now: Date.now(),
        limit: args.limit ?? 20,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.scheduler.runAfter(
        0,
        (internal as any).tiktok.sync.syncTikTokCampaigns,
        {
          connectedAccountId,
          syncRunType: "incremental",
        }
      );
    }

    return accountIds.length;
  },
});

export const syncDueTikTokLeads = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueLeadSyncAccountIds,
      {
        platform: "tiktok",
        now: Date.now(),
        limit: args.limit ?? 20,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.scheduler.runAfter(
        0,
        (internal as any).tiktok.sync.syncTikTokLeads,
        {
          connectedAccountId,
        }
      );
    }

    return accountIds.length;
  },
});

export const syncAllTikTokAccounts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueCampaignSyncAccountIds,
      {
        platform: "tiktok",
        now: Number.MAX_SAFE_INTEGER,
        limit: 500,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.runAction((internal as any).tiktok.sync.syncTikTokCampaigns, {
        connectedAccountId,
        syncRunType: "incremental",
      });
    }

    return null;
  },
});

export const syncAllTikTokLeadAccounts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueLeadSyncAccountIds,
      {
        platform: "tiktok",
        now: Number.MAX_SAFE_INTEGER,
        limit: 500,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.runAction((internal as any).tiktok.sync.syncTikTokLeads, {
        connectedAccountId,
      });
    }

    return null;
  },
});
