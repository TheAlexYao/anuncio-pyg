"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { decrypt } from "../lib/crypto";
import {
  mapMetaAd,
  mapMetaAdSet,
  mapMetaCampaign,
} from "../lib/apiMappers";

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v21.0";
const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const META_MAX_PAGES = 10;

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

function buildMetaInsightsUrl(
  platformAccountId: string,
  level: "campaign" | "adset" | "ad",
  datePreset: string
): URL {
  const url = new URL(
    `${META_GRAPH_BASE_URL}/act_${platformAccountId}/insights`
  );

  url.searchParams.set("level", level);
  url.searchParams.set("date_preset", datePreset);
  url.searchParams.set("time_increment", "1");

  if (level === "campaign") {
    url.searchParams.set(
      "fields",
      [
        "account_id",
        "date_start",
        "campaign_id",
        "campaign_name",
        "status",
        "objective",
        "currency",
        "spend",
        "impressions",
        "clicks",
        "reach",
        "actions",
        "frequency",
        "unique_clicks",
        "unique_ctr",
        "video_play_actions",
        "video_p25_watched_actions",
        "video_p50_watched_actions",
        "video_p75_watched_actions",
        "video_p100_watched_actions",
        "cost_per_action_type",
        "quality_ranking",
        "engagement_rate_ranking",
        "conversion_rate_ranking",
        "inline_post_engagement",
        "cpc",
        "cpm",
        "ctr",
        "updated_time",
      ].join(",")
    );
  } else if (level === "adset") {
    url.searchParams.set(
      "fields",
      [
        "account_id",
        "date_start",
        "campaign_id",
        "campaign_name",
        "adset_id",
        "adset_name",
        "adset_status",
        "optimization_goal",
        "spend",
        "impressions",
        "clicks",
        "reach",
        "actions",
        "frequency",
        "unique_clicks",
        "unique_ctr",
        "video_play_actions",
        "video_p25_watched_actions",
        "video_p50_watched_actions",
        "video_p75_watched_actions",
        "video_p100_watched_actions",
        "cost_per_action_type",
        "quality_ranking",
        "engagement_rate_ranking",
        "conversion_rate_ranking",
        "inline_post_engagement",
        "cpc",
        "cpm",
        "ctr",
        "updated_time",
      ].join(",")
    );
  } else {
    url.searchParams.set(
      "fields",
      [
        "account_id",
        "date_start",
        "campaign_id",
        "campaign_name",
        "adset_id",
        "adset_name",
        "ad_id",
        "ad_name",
        "ad_status",
        "spend",
        "impressions",
        "clicks",
        "reach",
        "actions",
        "frequency",
        "unique_clicks",
        "unique_ctr",
        "video_play_actions",
        "video_p25_watched_actions",
        "video_p50_watched_actions",
        "video_p75_watched_actions",
        "video_p100_watched_actions",
        "cost_per_action_type",
        "quality_ranking",
        "engagement_rate_ranking",
        "conversion_rate_ranking",
        "inline_post_engagement",
        "creative{thumbnail_url,title,body}",
        "preview_shareable_link",
        "cpc",
        "cpm",
        "ctr",
        "updated_time",
      ].join(",")
    );
  }

  return url;
}

function parseMetaPage(payload: unknown): {
  rows: unknown[];
  nextUrl?: string;
  errorMessage?: string;
} {
  const record = asRecord(payload);
  const data = Array.isArray(record.data) ? record.data : [];
  const paging = asRecord(record.paging);
  const nextUrl =
    typeof paging.next === "string" && paging.next
      ? paging.next
      : undefined;

  const error = asRecord(record.error);
  const errorMessage =
    typeof error.message === "string" && error.message
      ? error.message
      : undefined;

  return {
    rows: data,
    nextUrl,
    errorMessage,
  };
}

async function fetchMetaRows(
  accessToken: string,
  initialUrl: URL
): Promise<unknown[]> {
  const rows: unknown[] = [];

  let nextUrl: string | undefined = initialUrl.toString();
  let pages = 0;

  while (nextUrl && pages < META_MAX_PAGES) {
    const url = new URL(nextUrl);
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const bodyText = await response.text();
    let payload: unknown;
    try {
      payload = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      payload = {};
    }

    const parsed = parseMetaPage(payload);
    if (!response.ok) {
      throw new Error(
        `Meta API request failed (${response.status}): ${
          parsed.errorMessage ?? bodyText
        }`
      );
    }

    rows.push(...parsed.rows);
    nextUrl = parsed.nextUrl;
    pages += 1;
  }

  return rows;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown Meta campaign sync error";
}

export const syncMetaCampaigns = internalAction({
  args: {
    connectedAccountId: v.id("connected_accounts"),
    syncRunType: v.optional(syncRunTypeValidator),
    datePreset: v.optional(v.string()),
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

    if (syncContext.connectedAccount.platform !== "meta") {
      throw new Error("Connected account is not a Meta account");
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
      const datePreset = args.datePreset ?? "last_30d";

      const [campaignRawRows, adSetRawRows, adRawRows] = await Promise.all([
        fetchMetaRows(
          accessToken,
          buildMetaInsightsUrl(
            syncContext.connectedAccount.platformAccountId,
            "campaign",
            datePreset
          )
        ),
        fetchMetaRows(
          accessToken,
          buildMetaInsightsUrl(
            syncContext.connectedAccount.platformAccountId,
            "adset",
            datePreset
          )
        ),
        fetchMetaRows(
          accessToken,
          buildMetaInsightsUrl(
            syncContext.connectedAccount.platformAccountId,
            "ad",
            datePreset
          )
        ),
      ]);

      const mappedCampaigns = campaignRawRows.map((row) => mapMetaCampaign(row));
      const mappedAdSets = adSetRawRows.map((row) => mapMetaAdSet(row));
      const mappedAds = adRawRows.map((row) => mapMetaAd(row));

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

export const syncMetaAccount = internalAction({
  args: {
    connectedAccountId: v.id("connected_accounts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction((internal as any).meta.sync.syncMetaCampaigns, {
      connectedAccountId: args.connectedAccountId,
      syncRunType: "incremental",
    });
    return null;
  },
});

export const syncDueMetaCampaigns = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueCampaignSyncAccountIds,
      {
        platform: "meta",
        now: Date.now(),
        limit: args.limit ?? 20,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.scheduler.runAfter(
        0,
        (internal as any).meta.sync.syncMetaCampaigns,
        {
          connectedAccountId,
          syncRunType: "incremental",
        }
      );
    }

    return accountIds.length;
  },
});

export const syncAllMetaAccounts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueCampaignSyncAccountIds,
      {
        platform: "meta",
        now: Number.MAX_SAFE_INTEGER,
        limit: 500,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.runAction((internal as any).meta.sync.syncMetaCampaigns, {
        connectedAccountId,
        syncRunType: "incremental",
      });
    }

    return null;
  },
});
