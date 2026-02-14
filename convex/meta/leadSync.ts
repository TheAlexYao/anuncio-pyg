"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { decrypt } from "../lib/crypto";
import { mapMetaLead } from "../lib/apiMappers";

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v21.0";
const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const META_MAX_PAGES = 10;

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

function buildLeadFormsUrl(platformAccountId: string): URL {
  const url = new URL(
    `${META_GRAPH_BASE_URL}/act_${platformAccountId}/leadgen_forms`
  );
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("limit", "200");
  return url;
}

function buildFormLeadsUrl(leadFormId: string): URL {
  const url = new URL(`${META_GRAPH_BASE_URL}/${leadFormId}/leads`);
  url.searchParams.set(
    "fields",
    [
      "id",
      "created_time",
      "field_data",
      "ad_id",
      "campaign_id",
      "adset_id",
      "ad_name",
      "campaign_name",
      "adset_name",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "landing_page_url",
      "referrer_url",
      "fbclid",
    ].join(",")
  );
  url.searchParams.set("limit", "500");
  return url;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown Meta lead sync error";
}

export const syncMetaLeads = internalAction({
  args: {
    connectedAccountId: v.id("connected_accounts"),
    maxForms: v.optional(v.number()),
  },
  returns: v.object({
    leadRows: v.number(),
    formCount: v.number(),
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
        leadRows: 0,
        formCount: 0,
      };
    }

    await ctx.runMutation((internal as any).queries.markLeadSyncStarted, {
      connectedAccountId: args.connectedAccountId,
    });

    try {
      const accessToken = decryptAccessToken(
        syncContext.userAuth.encryptedAccessToken
      );

      const formRows = await fetchMetaRows(
        accessToken,
        buildLeadFormsUrl(syncContext.connectedAccount.platformAccountId)
      );

      const leadFormIds = formRows
        .map((row) => {
          const record = asRecord(row);
          return typeof record.id === "string" ? record.id : "";
        })
        .filter((id) => id.length > 0);

      const maxForms = Math.max(1, args.maxForms ?? leadFormIds.length);
      const selectedFormIds = leadFormIds.slice(0, maxForms);

      const leadRowsPerForm = await Promise.all(
        selectedFormIds.map((leadFormId) =>
          fetchMetaRows(accessToken, buildFormLeadsUrl(leadFormId))
        )
      );

      const mappedLeads = leadRowsPerForm
        .flat()
        .map((row) => {
          const record = asRecord(row);
          return mapMetaLead({
            ...record,
            ad_account_id: syncContext.connectedAccount.platformAccountId,
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
        formCount: selectedFormIds.length,
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

export const syncMetaLeadAccount = internalAction({
  args: {
    connectedAccountId: v.id("connected_accounts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction((internal as any).meta.leadSync.syncMetaLeads, {
      connectedAccountId: args.connectedAccountId,
    });
    return null;
  },
});

export const syncDueMetaLeads = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueLeadSyncAccountIds,
      {
        platform: "meta",
        now: Date.now(),
        limit: args.limit ?? 20,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.scheduler.runAfter(
        0,
        (internal as any).meta.leadSync.syncMetaLeads,
        {
          connectedAccountId,
        }
      );
    }

    return accountIds.length;
  },
});

export const syncAllMetaLeadAccounts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const accountIds = (await ctx.runQuery(
      (internal as any).queries.listDueLeadSyncAccountIds,
      {
        platform: "meta",
        now: Number.MAX_SAFE_INTEGER,
        limit: 500,
      }
    )) as string[];

    for (const connectedAccountId of accountIds) {
      await ctx.runAction((internal as any).meta.leadSync.syncMetaLeads, {
        connectedAccountId,
      });
    }

    return null;
  },
});
