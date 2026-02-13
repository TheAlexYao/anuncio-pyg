"use node";

import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { decrypt } from "./lib/crypto";
import { getPages, getLeadForms, getLeadsByForm } from "./lib/metaLeads";
import type { Doc, Id } from "./_generated/dataModel";

// --- Internal Queries ---

export const getMetaConnectedAccounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("connectedAccounts")
      .filter((q) => q.eq(q.field("platform"), "meta"))
      .collect();
  },
});

// --- Internal Mutations ---

export const createSyncLog = internalMutation({
  args: {
    connectedAccountId: v.id("connectedAccounts"),
    startedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leadSyncLog", {
      connectedAccountId: args.connectedAccountId,
      status: "running",
      leadsFound: 0,
      leadsCreated: 0,
      startedAt: args.startedAt,
    });
  },
});

export const completeSyncLog = internalMutation({
  args: {
    logId: v.id("leadSyncLog"),
    status: v.union(v.literal("success"), v.literal("error")),
    leadsFound: v.number(),
    leadsCreated: v.number(),
    error: v.optional(v.string()),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.logId, {
      status: args.status,
      leadsFound: args.leadsFound,
      leadsCreated: args.leadsCreated,
      error: args.error,
      completedAt: args.completedAt,
    });
  },
});

export const upsertLead = internalMutation({
  args: {
    userId: v.id("users"),
    connectedAccountId: v.id("connectedAccounts"),
    platformLeadId: v.string(),
    formId: v.string(),
    formName: v.string(),
    pageName: v.string(),
    pageId: v.string(),
    fieldData: v.array(v.object({ name: v.string(), values: v.array(v.string()) })),
    createdAtPlatform: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await (ctx.db
      .query("leads") as any)
      .withIndex("by_platform_lead", (q: any) => q.eq("platformLeadId", args.platformLeadId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fieldData: args.fieldData,
        syncedAt: Date.now(),
      });
      return { created: false };
    }

    await ctx.db.insert("leads", {
      userId: args.userId,
      connectedAccountId: args.connectedAccountId,
      platformLeadId: args.platformLeadId,
      formId: args.formId,
      formName: args.formName,
      pageName: args.pageName,
      pageId: args.pageId,
      fieldData: args.fieldData,
      platform: "meta",
      createdAtPlatform: args.createdAtPlatform,
      syncedAt: Date.now(),
    });
    return { created: true };
  },
});

// --- Sync Action ---

export const syncLeads = internalAction({
  args: {},
  handler: async (ctx) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("ENCRYPTION_KEY environment variable is not set");
    }

    const accounts = await ctx.runQuery(
      (internal as any).metaLeadSync.getMetaConnectedAccounts
    );

    const results: Array<{ accountId: string; status: string; leadsFound: number; leadsCreated: number; error?: string }> = [];

    for (const account of accounts) {
      let leadsFound = 0;
      let leadsCreated = 0;

      const logId = await ctx.runMutation(
        (internal as any).metaLeadSync.createSyncLog,
        {
          connectedAccountId: account._id,
          startedAt: Date.now(),
        }
      );

      try {
        const accessToken = decrypt(account.encryptedAccessToken, encryptionKey);

        const ninetyDaysAgo = Math.floor(
          (Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000
        );

        const pages = await getPages(accessToken);

        for (const page of pages) {
          const forms = await getLeadForms(accessToken, page.id);

          for (const form of forms) {
            const leads = await getLeadsByForm(accessToken, form.id, ninetyDaysAgo);
            leadsFound += leads.length;

            for (const lead of leads) {
              const result = await ctx.runMutation(
                (internal as any).metaLeadSync.upsertLead,
                {
                  userId: account.userId,
                  connectedAccountId: account._id,
                  platformLeadId: lead.id,
                  formId: form.id,
                  formName: form.name,
                  pageName: page.name,
                  pageId: page.id,
                  fieldData: lead.field_data,
                  createdAtPlatform: Math.floor(
                    new Date(lead.created_time).getTime() / 1000
                  ),
                }
              );
              if (result.created) {
                leadsCreated++;
              }
            }
          }
        }

        await ctx.runMutation(
          (internal as any).metaLeadSync.completeSyncLog,
          {
            logId,
            status: "success" as const,
            leadsFound,
            leadsCreated,
            completedAt: Date.now(),
          }
        );

        results.push({
          accountId: account._id,
          status: "success",
          leadsFound,
          leadsCreated,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        await ctx.runMutation(
          (internal as any).metaLeadSync.completeSyncLog,
          {
            logId,
            status: "error" as const,
            leadsFound,
            leadsCreated,
            error: errorMsg,
            completedAt: Date.now(),
          }
        );

        results.push({
          accountId: account._id,
          status: "error",
          leadsFound,
          leadsCreated,
          error: errorMsg,
        });
      }
    }

    return results;
  },
});
