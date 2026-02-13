"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createDecipheriv } from "crypto";

function decrypt(ciphertext: string, keyHex: string): string {
  const parts = ciphertext.split(":");
  const ivHex = parts[0];
  const tagHex = parts[1];
  const encryptedHex = parts[2];
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Invalid ciphertext");
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

// --- Pure helpers (exported for testing) ---

export const TIKTOK_LEADGEN_FORM_URL = "https://business-api.tiktok.com/open_api/v1.3/leadgen/form/get/";

export function buildFormRequestUrl(advertiserId: string, page: number, pageSize: number): string {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    page: String(page),
    page_size: String(pageSize),
  });
  return `${TIKTOK_LEADGEN_FORM_URL}?${params.toString()}`;
}

export function buildFormRequestHeaders(accessToken: string): Record<string, string> {
  return {
    "Access-Token": accessToken,
    "Content-Type": "application/json",
  };
}

export interface TikTokFormResponse {
  code: number;
  message: string;
  data?: {
    page_info?: {
      total_number: number;
      page: number;
      page_size: number;
      total_page: number;
    };
    form_list?: Array<{
      form_id: string;
      form_name: string;
      campaign_id?: string;
      adgroup_id?: string;
      ad_id?: string;
    }>;
  };
}

export function parseFormResponse(body: TikTokFormResponse): {
  forms: Array<{
    formId: string;
    formName: string;
    campaignId?: string;
    adgroupId?: string;
    adId?: string;
  }>;
  totalPages: number;
  currentPage: number;
} {
  if (body.code !== 0) {
    throw new Error(`TikTok API error: ${body.message} (code ${body.code})`);
  }

  const forms = (body.data?.form_list ?? []).map((f) => ({
    formId: f.form_id,
    formName: f.form_name,
    campaignId: f.campaign_id ?? undefined,
    adgroupId: f.adgroup_id ?? undefined,
    adId: f.ad_id ?? undefined,
  }));

  return {
    forms,
    totalPages: body.data?.page_info?.total_page ?? 1,
    currentPage: body.data?.page_info?.page ?? 1,
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Internal action ---

export const fetchLeadForms = internalAction({
  args: {
    accountId: v.id("connected_accounts"),
  },
  handler: async (ctx, args) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error("ENCRYPTION_KEY not set");

    // Get the connected account to find advertiserId and token
    const account = await ctx.runQuery(internal.queries.getConnectedAccount, {
      accountId: args.accountId,
    });
    if (!account) throw new Error("Connected account not found");

    const accessToken = decrypt(account.encryptedAccessToken, encryptionKey);
    const advertiserId = account.platformAccountId;

    const pageSize = 20;
    let page = 1;
    let totalPages = 1;
    let totalForms = 0;

    do {
      const url = buildFormRequestUrl(advertiserId, page, pageSize);
      const headers = buildFormRequestHeaders(accessToken);

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`TikTok API HTTP error: ${res.status} ${res.statusText}`);
      }

      const body = (await res.json()) as TikTokFormResponse;
      const parsed = parseFormResponse(body);
      totalPages = parsed.totalPages;

      for (const form of parsed.forms) {
        await ctx.runMutation(internal.tiktokLeadsMutations.upsertLeadForm, {
          accountId: args.accountId,
          advertiserId,
          formId: form.formId,
          formName: form.formName,
          campaignId: form.campaignId,
          adgroupId: form.adgroupId,
          adId: form.adId,
        });
        totalForms++;
      }

      page++;

      // Rate limit: 100ms delay between paginated requests
      if (page <= totalPages) {
        await delay(100);
      }
    } while (page <= totalPages);

    return { success: true, totalForms };
  },
});
