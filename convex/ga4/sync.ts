"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { mapGA4Session } from "../lib/apiMappers";

const GA4_DATA_API_BASE_URL = "https://analyticsdata.googleapis.com/v1beta";

const syncRunTypeValidator = v.union(
  v.literal("incremental"),
  v.literal("backfill")
);

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function parseGA4ErrorMessage(payload: unknown, fallback: string): string {
  const record = asRecord(payload);
  const error = asRecord(record.error);
  const message =
    typeof error.message === "string" && error.message
      ? error.message
      : undefined;

  return message ?? fallback;
}

export function mapGA4ReportRows(
  payload: unknown,
  ga4PropertyId: string
): Record<string, unknown>[] {
  const record = asRecord(payload);

  const dimensionHeaders = Array.isArray(record.dimensionHeaders)
    ? record.dimensionHeaders
        .map((header) => {
          const parsed = asRecord(header);
          return typeof parsed.name === "string" ? parsed.name : "";
        })
        .filter((name) => name.length > 0)
    : [];

  const metricHeaders = Array.isArray(record.metricHeaders)
    ? record.metricHeaders
        .map((header) => {
          const parsed = asRecord(header);
          return typeof parsed.name === "string" ? parsed.name : "";
        })
        .filter((name) => name.length > 0)
    : [];

  const rows = Array.isArray(record.rows) ? record.rows : [];

  return rows.map((row) => {
    const rowRecord = asRecord(row);
    const dimensions = Array.isArray(rowRecord.dimensionValues)
      ? rowRecord.dimensionValues
      : [];
    const metrics = Array.isArray(rowRecord.metricValues)
      ? rowRecord.metricValues
      : [];

    const flattened: Record<string, unknown> = {
      ga4PropertyId,
    };

    for (let i = 0; i < dimensionHeaders.length; i += 1) {
      const headerName = dimensionHeaders[i];
      const value = asRecord(dimensions[i]);
      flattened[headerName!] = value.value;
    }

    for (let i = 0; i < metricHeaders.length; i += 1) {
      const headerName = metricHeaders[i];
      const value = asRecord(metrics[i]);
      flattened[headerName!] = value.value;
    }

    return flattened;
  });
}

async function fetchGA4ReportRows(
  accessToken: string,
  ga4PropertyId: string
): Promise<Record<string, unknown>[]> {
  const response = await fetch(
    `${GA4_DATA_API_BASE_URL}/properties/${ga4PropertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [
          { name: "date" },
          { name: "sessionSource" },
          { name: "sessionMedium" },
          { name: "sessionCampaignName" },
          { name: "sessionContent" },
          { name: "sessionTerm" },
          { name: "landingPagePath" },
        ],
        metrics: [
          { name: "sessions" },
          { name: "engagedSessions" },
          { name: "totalUsers" },
          { name: "newUsers" },
          { name: "conversions" },
          { name: "purchaseRevenue" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
        ],
      }),
    }
  );

  const bodyText = await response.text();
  let payload: unknown;

  try {
    payload = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const errorMessage = parseGA4ErrorMessage(payload, bodyText);
    throw new Error(
      `GA4 runReport failed (${response.status}): ${errorMessage}`
    );
  }

  return mapGA4ReportRows(payload, ga4PropertyId);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown GA4 sync error";
}

export const syncGA4Sessions = internalAction({
  args: {
    connectedAccountId: v.id("connected_accounts"),
    syncRunType: v.optional(syncRunTypeValidator),
  },
  returns: v.object({
    sessionRows: v.number(),
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

    if (syncContext.connectedAccount.accountType !== "ga4") {
      throw new Error("Connected account is not a GA4 account");
    }

    if (!syncContext.connectedAccount.syncEnabled) {
      return {
        sessionRows: 0,
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

      const rawRows = await fetchGA4ReportRows(
        accessToken,
        syncContext.connectedAccount.platformAccountId
      );

      const mappedRows = rawRows.map((row) => mapGA4Session(row));

      await ctx.runMutation((internal as any).queries.upsertGA4Sessions, {
        tenantId: syncContext.connectedAccount.tenantId,
        brandId: syncContext.connectedAccount.brandId,
        connectedAccountId: args.connectedAccountId,
        syncRunType: args.syncRunType,
        rows: mappedRows,
      });

      await ctx.runMutation((internal as any).queries.markCampaignSyncCompleted, {
        connectedAccountId: args.connectedAccountId,
      });

      return {
        sessionRows: mappedRows.length,
      };
    } catch (error) {
      const message = getErrorMessage(error);

      await ctx.runMutation((internal as any).queries.markSyncFailed, {
        connectedAccountId: args.connectedAccountId,
        scope: "ga4",
        message,
      });

      throw error;
    }
  },
});

export const syncGA4Property = internalAction({
  args: {
    connectedAccountId: v.id("connected_accounts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction((internal as any).ga4.sync.syncGA4Sessions, {
      connectedAccountId: args.connectedAccountId,
      syncRunType: "incremental",
    });
    return null;
  },
});

export const syncDueGA4Sessions = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueCampaignSyncAccountIds,
      {
        platform: "google",
        accountType: "ga4",
        now: Date.now(),
        limit: args.limit ?? 20,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.scheduler.runAfter(0, (internal as any).ga4.sync.syncGA4Sessions, {
        connectedAccountId,
        syncRunType: "incremental",
      });
    }

    return accountIds.length;
  },
});

export const syncAllGA4Properties = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueCampaignSyncAccountIds,
      {
        platform: "google",
        accountType: "ga4",
        now: Number.MAX_SAFE_INTEGER,
        limit: 500,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.runAction((internal as any).ga4.sync.syncGA4Sessions, {
        connectedAccountId,
        syncRunType: "incremental",
      });
    }

    return null;
  },
});
