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

export const fetchGoogleAdsAccounts = internalAction({
  args: {
    userAuthId: v.id("user_auth"),
  },
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
