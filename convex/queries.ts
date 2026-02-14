import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const platformValidator = v.union(
  v.literal("google"),
  v.literal("meta"),
  v.literal("tiktok")
);

const leadStatusValidator = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("qualified"),
  v.literal("converted"),
  v.literal("archived")
);

const oauthStatusValidator = v.union(
  v.literal("active"),
  v.literal("expired"),
  v.literal("revoked"),
  v.literal("error")
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

const campaignDailyRowValidator = v.object({
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
  sourceUpdatedAt: v.optional(v.number()),
  syncedAt: v.number(),
});

const adSetDailyRowValidator = v.object({
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
  sourceUpdatedAt: v.optional(v.number()),
  syncedAt: v.number(),
});

const adDailyRowValidator = v.object({
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
  sourceUpdatedAt: v.optional(v.number()),
  syncedAt: v.number(),
});

const leadRowValidator = v.object({
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
  rawPayload: v.optional(v.any()),
});

const ga4RowValidator = v.object({
  ga4PropertyId: v.string(),
  date: v.string(),
  source: v.string(),
  medium: v.string(),
  campaignName: v.string(),
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
  sourceUpdatedAt: v.optional(v.number()),
  syncedAt: v.number(),
});

const syncContextValidator = v.object({
  connectedAccount: v.object({
    _id: v.id("connected_accounts"),
    userAuthId: v.id("user_auth"),
    platform: platformValidator,
    accountType: v.string(),
    syncEnabled: v.boolean(),
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    platformAccountId: v.string(),
    campaignsSyncFrequencyMinutes: v.optional(v.number()),
    leadsSyncFrequencyMinutes: v.optional(v.number()),
    syncErrorCount: v.optional(v.number()),
  }),
  userAuth: v.object({
    _id: v.id("user_auth"),
    encryptedAccessToken: v.string(),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiresAt: v.number(),
  }),
});

export const getSyncContextByConnectedAccountId = internalQuery({
  args: {
    connectedAccountId: v.id("connected_accounts"),
  },
  returns: v.union(v.null(), syncContextValidator),
  handler: async (ctx, args) => {
    const connectedAccount = await ctx.db.get(args.connectedAccountId);
    if (!connectedAccount) {
      return null;
    }

    const userAuth = await ctx.db.get(connectedAccount.userAuthId);
    if (!userAuth) {
      return null;
    }

    return {
      connectedAccount: {
        _id: connectedAccount._id,
        userAuthId: connectedAccount.userAuthId,
        platform: connectedAccount.platform,
        accountType: connectedAccount.accountType,
        syncEnabled: connectedAccount.syncEnabled,
        tenantId: connectedAccount.tenantId,
        brandId: connectedAccount.brandId,
        platformAccountId: connectedAccount.platformAccountId,
        campaignsSyncFrequencyMinutes:
          connectedAccount.campaignsSyncFrequencyMinutes,
        leadsSyncFrequencyMinutes: connectedAccount.leadsSyncFrequencyMinutes,
        syncErrorCount: connectedAccount.syncErrorCount,
      },
      userAuth: {
        _id: userAuth._id,
        encryptedAccessToken: userAuth.encryptedAccessToken,
        encryptedRefreshToken: userAuth.encryptedRefreshToken,
        tokenExpiresAt: userAuth.tokenExpiresAt,
      },
    };
  },
});

export const markCampaignSyncStarted = internalMutation({
  args: {
    connectedAccountId: v.id("connected_accounts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectedAccountId, {
      syncStatus: "syncing",
      lastSyncError: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markCampaignSyncCompleted = internalMutation({
  args: {
    connectedAccountId: v.id("connected_accounts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.connectedAccountId);
    if (!account) {
      return null;
    }

    const now = Date.now();
    const frequencyMinutes = account.campaignsSyncFrequencyMinutes ?? 240;

    await ctx.db.patch(args.connectedAccountId, {
      syncStatus: "idle",
      lastCampaignSyncAt: now,
      nextCampaignSyncAt: now + frequencyMinutes * 60 * 1000,
      lastSyncError: undefined,
      syncErrorCount: 0,
      updatedAt: now,
    });
    return null;
  },
});

export const markLeadSyncStarted = internalMutation({
  args: {
    connectedAccountId: v.id("connected_accounts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectedAccountId, {
      syncStatus: "syncing",
      lastSyncError: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const markLeadSyncCompleted = internalMutation({
  args: {
    connectedAccountId: v.id("connected_accounts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.connectedAccountId);
    if (!account) {
      return null;
    }

    const now = Date.now();
    const frequencyMinutes = account.leadsSyncFrequencyMinutes ?? 15;

    await ctx.db.patch(args.connectedAccountId, {
      syncStatus: "idle",
      lastLeadSyncAt: now,
      nextLeadSyncAt: now + frequencyMinutes * 60 * 1000,
      lastSyncError: undefined,
      syncErrorCount: 0,
      updatedAt: now,
    });
    return null;
  },
});

export const markSyncFailed = internalMutation({
  args: {
    connectedAccountId: v.id("connected_accounts"),
    scope: v.union(
      v.literal("campaigns"),
      v.literal("leads"),
      v.literal("ga4")
    ),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.connectedAccountId);
    await ctx.db.patch(args.connectedAccountId, {
      syncStatus: "error",
      lastSyncError: `[${args.scope}] ${args.message}`,
      syncErrorCount: (account?.syncErrorCount ?? 0) + 1,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const listDueCampaignSyncAccountIds = internalQuery({
  args: {
    platform: platformValidator,
    accountType: v.optional(v.string()),
    now: v.number(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.id("connected_accounts")),
  handler: async (ctx, args) => {
    const enabledAccounts = await ctx.db
      .query("connected_accounts")
      .withIndex("by_sync_enabled", (q) => q.eq("syncEnabled", true))
      .collect();

    const filtered = enabledAccounts
      .filter(
        (account) =>
          account.platform === args.platform &&
          (args.accountType === undefined ||
            account.accountType === args.accountType) &&
          (account.nextCampaignSyncAt ?? 0) <= args.now
      )
      .sort(
        (a, b) => (a.nextCampaignSyncAt ?? 0) - (b.nextCampaignSyncAt ?? 0)
      );

    return filtered
      .slice(0, args.limit ?? 20)
      .map((account) => account._id);
  },
});

export const listDueLeadSyncAccountIds = internalQuery({
  args: {
    platform: platformValidator,
    now: v.number(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.id("connected_accounts")),
  handler: async (ctx, args) => {
    const enabledAccounts = await ctx.db
      .query("connected_accounts")
      .withIndex("by_sync_enabled", (q) => q.eq("syncEnabled", true))
      .collect();

    const filtered = enabledAccounts
      .filter(
        (account) =>
          account.platform === args.platform &&
          (account.nextLeadSyncAt ?? 0) <= args.now
      )
      .sort((a, b) => (a.nextLeadSyncAt ?? 0) - (b.nextLeadSyncAt ?? 0));

    return filtered
      .slice(0, args.limit ?? 20)
      .map((account) => account._id);
  },
});

export const upsertCampaignsDaily = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    connectedAccountId: v.id("connected_accounts"),
    syncRunType: v.optional(syncRunTypeValidator),
    rows: v.array(campaignDailyRowValidator),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const existingByDate = new Map<
      string,
      Map<string, Id<"campaigns_daily">>
    >();

    for (const row of args.rows) {
      let dateMap = existingByDate.get(row.date);
      if (!dateMap) {
        const existingRows = await ctx.db
          .query("campaigns_daily")
          .withIndex("by_connected_account_date", (q) =>
            q.eq("connectedAccountId", args.connectedAccountId).eq("date", row.date)
          )
          .collect();

        dateMap = new Map(
          existingRows.map((existingRow) => [
            `${existingRow.platformAccountId}:${existingRow.campaignExternalId}`,
            existingRow._id,
          ])
        );
        existingByDate.set(row.date, dateMap);
      }

      const key = `${row.platformAccountId}:${row.campaignExternalId}`;
      const doc = {
        tenantId: args.tenantId,
        brandId: args.brandId,
        connectedAccountId: args.connectedAccountId,
        ...row,
        syncRunType: args.syncRunType,
      };

      const existingId = dateMap.get(key);
      if (existingId) {
        await ctx.db.patch(existingId, doc);
      } else {
        const insertedId = await ctx.db.insert("campaigns_daily", doc);
        dateMap.set(key, insertedId);
      }
    }

    return args.rows.length;
  },
});

export const upsertAdSetsDaily = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    connectedAccountId: v.id("connected_accounts"),
    syncRunType: v.optional(syncRunTypeValidator),
    rows: v.array(adSetDailyRowValidator),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const existingByDate = new Map<string, Map<string, Id<"ad_sets_daily">>>();

    for (const row of args.rows) {
      let dateMap = existingByDate.get(row.date);
      if (!dateMap) {
        const existingRows = await ctx.db
          .query("ad_sets_daily")
          .withIndex("by_connected_account_date", (q) =>
            q.eq("connectedAccountId", args.connectedAccountId).eq("date", row.date)
          )
          .collect();

        dateMap = new Map(
          existingRows.map((existingRow) => [
            `${existingRow.platformAccountId}:${existingRow.campaignExternalId}:${existingRow.adSetExternalId}`,
            existingRow._id,
          ])
        );
        existingByDate.set(row.date, dateMap);
      }

      const key = `${row.platformAccountId}:${row.campaignExternalId}:${row.adSetExternalId}`;
      const doc = {
        tenantId: args.tenantId,
        brandId: args.brandId,
        connectedAccountId: args.connectedAccountId,
        ...row,
        syncRunType: args.syncRunType,
      };

      const existingId = dateMap.get(key);
      if (existingId) {
        await ctx.db.patch(existingId, doc);
      } else {
        const insertedId = await ctx.db.insert("ad_sets_daily", doc);
        dateMap.set(key, insertedId);
      }
    }

    return args.rows.length;
  },
});

export const upsertAdsDaily = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    connectedAccountId: v.id("connected_accounts"),
    syncRunType: v.optional(syncRunTypeValidator),
    rows: v.array(adDailyRowValidator),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const existingByDate = new Map<string, Map<string, Id<"ads_daily">>>();

    for (const row of args.rows) {
      let dateMap = existingByDate.get(row.date);
      if (!dateMap) {
        const existingRows = await ctx.db
          .query("ads_daily")
          .withIndex("by_connected_account_date", (q) =>
            q.eq("connectedAccountId", args.connectedAccountId).eq("date", row.date)
          )
          .collect();

        dateMap = new Map(
          existingRows.map((existingRow) => [
            `${existingRow.platformAccountId}:${existingRow.campaignExternalId}:${existingRow.adSetExternalId}:${existingRow.adExternalId}`,
            existingRow._id,
          ])
        );
        existingByDate.set(row.date, dateMap);
      }

      const key = `${row.platformAccountId}:${row.campaignExternalId}:${row.adSetExternalId}:${row.adExternalId}`;
      const doc = {
        tenantId: args.tenantId,
        brandId: args.brandId,
        connectedAccountId: args.connectedAccountId,
        ...row,
        syncRunType: args.syncRunType,
      };

      const existingId = dateMap.get(key);
      if (existingId) {
        await ctx.db.patch(existingId, doc);
      } else {
        const insertedId = await ctx.db.insert("ads_daily", doc);
        dateMap.set(key, insertedId);
      }
    }

    return args.rows.length;
  },
});

export const upsertLeads = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    connectedAccountId: v.id("connected_accounts"),
    rows: v.array(leadRowValidator),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const existingByExternalId = new Map<string, Id<"leads">>();

    for (const row of args.rows) {
      const doc = {
        tenantId: args.tenantId,
        brandId: args.brandId,
        connectedAccountId: args.connectedAccountId,
        ...row,
      };

      if (!row.leadExternalId) {
        await ctx.db.insert("leads", {
          ...doc,
          leadStatus: "new",
        });
        continue;
      }

      const cacheKey = `${row.sourcePlatform}:${row.leadExternalId}`;
      let existingId = existingByExternalId.get(cacheKey);
      if (!existingId) {
        const candidates = await ctx.db
          .query("leads")
          .withIndex("by_source_platform_lead_external_id", (q) =>
            q
              .eq("sourcePlatform", row.sourcePlatform)
              .eq("leadExternalId", row.leadExternalId)
          )
          .collect();

        const match = candidates.find(
          (candidate) =>
            candidate.tenantId === args.tenantId &&
            candidate.connectedAccountId === args.connectedAccountId
        );

        if (match) {
          existingId = match._id;
          existingByExternalId.set(cacheKey, existingId);
        }
      }

      if (existingId) {
        const existingLead = await ctx.db.get(existingId);
        await ctx.db.patch(existingId, {
          ...doc,
          leadStatus: existingLead?.leadStatus ?? "new",
        });
      } else {
        const insertedId = await ctx.db.insert("leads", {
          ...doc,
          leadStatus: "new",
        });
        existingByExternalId.set(cacheKey, insertedId);
      }
    }

    return args.rows.length;
  },
});

export const upsertGA4Sessions = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    connectedAccountId: v.id("connected_accounts"),
    syncRunType: v.optional(syncRunTypeValidator),
    rows: v.array(ga4RowValidator),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const existingByDate = new Map<string, Map<string, Id<"ga4_sessions">>>();

    for (const row of args.rows) {
      let dateMap = existingByDate.get(row.date);
      if (!dateMap) {
        const existingRows = await ctx.db
          .query("ga4_sessions")
          .withIndex("by_connected_account_session_date", (q) =>
            q
              .eq("connectedAccountId", args.connectedAccountId)
              .eq("sessionDate", row.date)
          )
          .collect();

        dateMap = new Map(
          existingRows.map((existingRow) => [
            `${existingRow.ga4PropertyId}:${existingRow.source}:${existingRow.medium}:${existingRow.campaign}:${existingRow.content ?? ""}:${existingRow.term ?? ""}:${existingRow.landingPagePath ?? ""}`,
            existingRow._id,
          ])
        );
        existingByDate.set(row.date, dateMap);
      }

      const key = `${row.ga4PropertyId}:${row.source}:${row.medium}:${row.campaignName}:${row.content ?? ""}:${row.term ?? ""}:${row.landingPagePath ?? ""}`;
      const doc = {
        tenantId: args.tenantId,
        brandId: args.brandId,
        connectedAccountId: args.connectedAccountId,
        ga4PropertyId: row.ga4PropertyId,
        sessionDate: row.date,
        source: row.source,
        medium: row.medium,
        campaign: row.campaignName,
        content: row.content,
        term: row.term,
        landingPagePath: row.landingPagePath,
        sessions: row.sessions,
        engagedSessions: row.engagedSessions,
        users: row.users,
        newUsers: row.newUsers,
        conversions: row.conversions,
        purchaseRevenue: row.purchaseRevenue,
        avgEngagementTimeSeconds: row.avgEngagementTimeSeconds,
        bounceRate: row.bounceRate,
        syncRunType: args.syncRunType,
        syncedAt: row.syncedAt,
      };

      const existingId = dateMap.get(key);
      if (existingId) {
        await ctx.db.patch(existingId, doc);
      } else {
        const insertedId = await ctx.db.insert("ga4_sessions", doc);
        dateMap.set(key, insertedId);
      }
    }

    return args.rows.length;
  },
});

export const getCampaignMetrics = query({
  args: {
    tenantId: v.id("tenants"),
    dateRange: v.object({
      startDate: v.string(),
      endDate: v.string(),
    }),
  },
  returns: v.object({
    totals: v.object({
      spend: v.number(),
      impressions: v.number(),
      clicks: v.number(),
      conversions: v.number(),
      leads: v.number(),
    }),
    byPlatform: v.array(
      v.object({
        platform: platformValidator,
        spend: v.number(),
        impressions: v.number(),
        clicks: v.number(),
        conversions: v.number(),
        leads: v.number(),
      })
    ),
    byDate: v.array(
      v.object({
        date: v.string(),
        spend: v.number(),
        impressions: v.number(),
        clicks: v.number(),
        conversions: v.number(),
        leads: v.number(),
      })
    ),
    campaignCount: v.number(),
    rowCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("campaigns_daily")
      .withIndex("by_tenant_date", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .gte("date", args.dateRange.startDate)
          .lte("date", args.dateRange.endDate)
      )
      .collect();

    const totals = {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      leads: 0,
    };

    const platformTotals = new Map<
      "google" | "meta" | "tiktok",
      {
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
        leads: number;
      }
    >();

    const dateTotals = new Map<
      string,
      {
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
        leads: number;
      }
    >();

    const uniqueCampaigns = new Set<string>();

    for (const row of rows) {
      totals.spend += row.spend;
      totals.impressions += row.impressions;
      totals.clicks += row.clicks;
      totals.conversions += row.conversions ?? 0;
      totals.leads += row.leads ?? 0;

      uniqueCampaigns.add(`${row.platform}:${row.campaignExternalId}`);

      const platformMetric = platformTotals.get(row.platform) ?? {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        leads: 0,
      };
      platformMetric.spend += row.spend;
      platformMetric.impressions += row.impressions;
      platformMetric.clicks += row.clicks;
      platformMetric.conversions += row.conversions ?? 0;
      platformMetric.leads += row.leads ?? 0;
      platformTotals.set(row.platform, platformMetric);

      const dateMetric = dateTotals.get(row.date) ?? {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        leads: 0,
      };
      dateMetric.spend += row.spend;
      dateMetric.impressions += row.impressions;
      dateMetric.clicks += row.clicks;
      dateMetric.conversions += row.conversions ?? 0;
      dateMetric.leads += row.leads ?? 0;
      dateTotals.set(row.date, dateMetric);
    }

    const byPlatform = Array.from(platformTotals.entries())
      .map(([platform, metric]) => ({
        platform,
        ...metric,
      }))
      .sort((a, b) => a.platform.localeCompare(b.platform));

    const byDate = Array.from(dateTotals.entries())
      .map(([date, metric]) => ({
        date,
        ...metric,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totals,
      byPlatform,
      byDate,
      campaignCount: uniqueCampaigns.size,
      rowCount: rows.length,
    };
  },
});

export const getLeads = query({
  args: {
    tenantId: v.id("tenants"),
    filters: v.optional(
      v.object({
        sourcePlatform: v.optional(platformValidator),
        leadStatus: v.optional(leadStatusValidator),
        campaignExternalId: v.optional(v.string()),
        search: v.optional(v.string()),
        capturedFrom: v.optional(v.number()),
        capturedTo: v.optional(v.number()),
        limit: v.optional(v.number()),
      })
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("leads"),
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
      _creationTime: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const filters = args.filters;
    const capturedFrom = filters?.capturedFrom ?? 0;
    const capturedTo = filters?.capturedTo ?? Date.now();
    const limit = Math.max(1, Math.min(filters?.limit ?? 100, 500));

    const rows = await ctx.db
      .query("leads")
      .withIndex("by_tenant_captured_at", (q) =>
        q
          .eq("tenantId", args.tenantId)
          .gte("capturedAt", capturedFrom)
          .lte("capturedAt", capturedTo)
      )
      .order("desc")
      .collect();

    const normalizedSearch = filters?.search?.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (filters?.sourcePlatform && row.sourcePlatform !== filters.sourcePlatform) {
        return false;
      }

      if (filters?.leadStatus && row.leadStatus !== filters.leadStatus) {
        return false;
      }

      if (
        filters?.campaignExternalId &&
        row.campaignExternalId !== filters.campaignExternalId
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        row.name,
        row.email,
        row.phone,
        row.message,
        row.campaignName,
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    return filtered.slice(0, limit);
  },
});

export const getAccountStatus = query({
  args: {
    tenantId: v.id("tenants"),
  },
  returns: v.array(
    v.object({
      connectedAccountId: v.id("connected_accounts"),
      userAuthId: v.id("user_auth"),
      platform: platformValidator,
      platformAccountId: v.string(),
      accountName: v.string(),
      accountType: v.string(),
      syncEnabled: v.boolean(),
      syncStatus: v.optional(syncStatusValidator),
      discoveryStatus: v.optional(
        v.union(
          v.literal("not_started"),
          v.literal("discovering"),
          v.literal("completed"),
          v.literal("failed")
        )
      ),
      backfillStatus: v.optional(
        v.union(
          v.literal("not_started"),
          v.literal("priority_in_progress"),
          v.literal("priority_completed"),
          v.literal("historical_in_progress"),
          v.literal("completed"),
          v.literal("failed")
        )
      ),
      lastCampaignSyncAt: v.optional(v.number()),
      lastLeadSyncAt: v.optional(v.number()),
      nextCampaignSyncAt: v.optional(v.number()),
      nextLeadSyncAt: v.optional(v.number()),
      lastSyncError: v.optional(v.string()),
      syncErrorCount: v.optional(v.number()),
      oauthStatus: v.optional(oauthStatusValidator),
      tokenExpiresAt: v.optional(v.number()),
      isTokenExpired: v.optional(v.boolean()),
      updatedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("connected_accounts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const userAuthRecords = await Promise.all(
      accounts.map(async (account) => {
        const auth = await ctx.db.get(account.userAuthId);
        return {
          userAuthId: account.userAuthId,
          status: auth?.status,
          tokenExpiresAt: auth?.tokenExpiresAt,
        };
      })
    );

    const authById = new Map(
      userAuthRecords.map((record) => [record.userAuthId, record])
    );

    return accounts.map((account) => {
      const auth = authById.get(account.userAuthId);
      const tokenExpiresAt = auth?.tokenExpiresAt;

      return {
        connectedAccountId: account._id,
        userAuthId: account.userAuthId,
        platform: account.platform,
        platformAccountId: account.platformAccountId,
        accountName: account.accountName,
        accountType: account.accountType,
        syncEnabled: account.syncEnabled,
        syncStatus: account.syncStatus,
        discoveryStatus: account.discoveryStatus,
        backfillStatus: account.backfillStatus,
        lastCampaignSyncAt: account.lastCampaignSyncAt,
        lastLeadSyncAt: account.lastLeadSyncAt,
        nextCampaignSyncAt: account.nextCampaignSyncAt,
        nextLeadSyncAt: account.nextLeadSyncAt,
        lastSyncError: account.lastSyncError,
        syncErrorCount: account.syncErrorCount,
        oauthStatus: auth?.status,
        tokenExpiresAt,
        isTokenExpired:
          tokenExpiresAt !== undefined ? tokenExpiresAt <= Date.now() : undefined,
        updatedAt: account.updatedAt,
      };
    });
  },
});
