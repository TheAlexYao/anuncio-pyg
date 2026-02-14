"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const GOOGLE_ADS_API_VERSION = "v18";
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

/**
 * Build headers for Google Ads API requests.
 */
export function buildGoogleAdsHeaders(
  accessToken: string,
  developerToken: string,
  loginCustomerId?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };
  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }
  return headers;
}

/**
 * Parse the listAccessibleCustomers response.
 * Returns array of customer resource names like "customers/1234567890".
 */
export function parseAccessibleCustomersResponse(data: unknown): string[] {
  if (
    typeof data !== "object" ||
    data === null ||
    !("resourceNames" in data) ||
    !Array.isArray((data as Record<string, unknown>).resourceNames)
  ) {
    return [];
  }
  return (data as Record<string, unknown>).resourceNames as string[];
}

/**
 * Extract customer ID from a resource name like "customers/1234567890".
 */
export function extractCustomerId(resourceName: string): string {
  const parts = resourceName.split("/");
  return parts[1] ?? resourceName;
}

/**
 * Parse customer details response to get descriptive name.
 */
export function parseCustomerDetails(data: unknown): { customerId: string; name: string } | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  const id = typeof d.id === "string" ? d.id : String(d.id ?? "");
  const name = typeof d.descriptiveName === "string" ? d.descriptiveName : "";
  return { customerId: id, name };
}

const GA4_ADMIN_BASE_URL = "https://analyticsadmin.googleapis.com/v1beta";

/**
 * Parse GA4 accountSummaries response into a flat array of properties.
 */
export function parseGA4AccountSummaries(
  data: unknown
): { propertyId: string; displayName: string; accountName: string }[] {
  if (typeof data !== "object" || data === null) return [];
  const d = data as Record<string, unknown>;
  const summaries = Array.isArray(d.accountSummaries) ? d.accountSummaries : [];
  const results: { propertyId: string; displayName: string; accountName: string }[] = [];

  for (const summary of summaries) {
    if (typeof summary !== "object" || summary === null) continue;
    const s = summary as Record<string, unknown>;
    const accountName = typeof s.displayName === "string" ? s.displayName : "";
    const propertySummaries = Array.isArray(s.propertySummaries) ? s.propertySummaries : [];

    for (const prop of propertySummaries) {
      if (typeof prop !== "object" || prop === null) continue;
      const p = prop as Record<string, unknown>;
      // property field is like "properties/12345"
      const propertyResource = typeof p.property === "string" ? p.property : "";
      const propertyId = propertyResource.includes("/")
        ? propertyResource.split("/")[1] ?? propertyResource
        : propertyResource;
      const displayName = typeof p.displayName === "string" ? p.displayName : "";
      results.push({ propertyId, displayName, accountName });
    }
  }

  return results;
}

export const fetchGA4Properties = internalAction({
  args: {
    userAuthId: v.id("user_auth"),
  },
  returns: v.array(v.object({ propertyId: v.string(), displayName: v.string(), accountName: v.string() })),
  handler: async (
    ctx,
    args
  ): Promise<{ propertyId: string; displayName: string; accountName: string }[]> => {
    const accessToken: string = await ctx.runAction(
      (internal as any).google.oauth.getValidAccessToken,
      { userAuthId: args.userAuthId }
    );

    const url = `${GA4_ADMIN_BASE_URL}/accountSummaries`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GA4 accountSummaries failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return parseGA4AccountSummaries(data);
  },
});

export const fetchGoogleAdsAccounts = internalAction({
  args: {
    userAuthId: v.id("user_auth"),
  },
  returns: v.array(v.object({ customerId: v.string(), name: v.string() })),
  handler: async (ctx, args): Promise<{ customerId: string; name: string }[]> => {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!developerToken) {
      throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN environment variable is not set");
    }
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

    // Get a valid access token (handles refresh if needed)
    const accessToken: string = await ctx.runAction(
      (internal as any).google.oauth.getValidAccessToken,
      { userAuthId: args.userAuthId }
    );

    const headers = buildGoogleAdsHeaders(accessToken, developerToken, loginCustomerId);

    // Step 1: List accessible customers
    const listUrl = `${GOOGLE_ADS_BASE_URL}/customers:listAccessibleCustomers`;
    const listResponse = await fetch(listUrl, { method: "GET", headers });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      throw new Error(`listAccessibleCustomers failed (${listResponse.status}): ${errorText}`);
    }

    const listData = await listResponse.json();
    const resourceNames = parseAccessibleCustomersResponse(listData);

    // Step 2: Fetch details for each customer
    const accounts: { customerId: string; name: string }[] = [];

    for (const resourceName of resourceNames) {
      const customerId = extractCustomerId(resourceName);
      const detailUrl = `${GOOGLE_ADS_BASE_URL}/customers/${customerId}`;
      const detailResponse = await fetch(detailUrl, { method: "GET", headers });

      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        const parsed = parseCustomerDetails(detailData);
        if (parsed) {
          accounts.push(parsed);
        }
      } else {
        // If we can't get details, include with ID only
        accounts.push({ customerId, name: "" });
      }
    }

    return accounts;
  },
});

/**
 * Map Google Ads accounts to connected_accounts records.
 */
export function mapGoogleAdsAccounts(
  tenantId: string,
  userAuthId: string,
  accounts: { customerId: string; name: string }[],
  brandId?: string
): {
  tenantId: string;
  brandId?: string;
  userAuthId: string;
  platform: "google";
  platformAccountId: string;
  accountName: string;
  accountType: string;
  syncEnabled: boolean;
}[] {
  return accounts.map((a) => ({
    tenantId,
    brandId,
    userAuthId,
    platform: "google" as const,
    platformAccountId: a.customerId,
    accountName: a.name,
    accountType: "google_ads",
    syncEnabled: false,
  }));
}

/**
 * Map GA4 properties to connected_accounts records.
 */
export function mapGA4Properties(
  tenantId: string,
  userAuthId: string,
  properties: { propertyId: string; displayName: string; accountName: string }[],
  brandId?: string
): {
  tenantId: string;
  brandId?: string;
  userAuthId: string;
  platform: "google";
  platformAccountId: string;
  accountName: string;
  accountType: string;
  syncEnabled: boolean;
}[] {
  return properties.map((p) => ({
    tenantId,
    brandId,
    userAuthId,
    platform: "google" as const,
    platformAccountId: p.propertyId,
    accountName: p.displayName || p.accountName,
    accountType: "ga4",
    syncEnabled: false,
  }));
}

/**
 * Composite action: fetch both Google Ads and GA4 accounts after OAuth,
 * then store them all as connected_accounts.
 */
export const syncGoogleAccounts = internalAction({
  args: {
    tenantId: v.id("tenants"),
    brandId: v.optional(v.id("brands")),
    userAuthId: v.id("user_auth"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch both account types in parallel
    const [adsAccounts, ga4Properties] = await Promise.all([
      ctx.runAction(internal.google.accounts.fetchGoogleAdsAccounts, {
        userAuthId: args.userAuthId,
      }),
      ctx.runAction(internal.google.accounts.fetchGA4Properties, {
        userAuthId: args.userAuthId,
      }),
    ]);

    // Map to connected_accounts records
    const adsRecords = mapGoogleAdsAccounts(
      args.tenantId,
      args.userAuthId,
      adsAccounts,
      args.brandId
    );
    const ga4Records = mapGA4Properties(
      args.tenantId,
      args.userAuthId,
      ga4Properties,
      args.brandId
    );
    const allRecords = [...adsRecords, ...ga4Records];

    if (allRecords.length === 0) {
      return;
    }

    // Store all accounts
    await ctx.runMutation(
      (internal as any).auth.connectedAccounts.bulkStoreAccounts,
      { accounts: allRecords }
    );
  },
});
