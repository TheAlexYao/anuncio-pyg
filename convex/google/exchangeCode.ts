"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { encrypt } from "../lib/crypto";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/analytics.readonly",
];

/**
 * Build the POST body for exchanging an authorization code for tokens.
 */
export function buildExchangeBody(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): URLSearchParams {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
}

/**
 * Parse Google's token exchange response.
 */
export function parseExchangeResponse(data: unknown): {
  access_token: string;
  refresh_token: string;
  expires_in: number;
} {
  if (
    typeof data !== "object" ||
    data === null ||
    !("access_token" in data) ||
    typeof (data as Record<string, unknown>).access_token !== "string"
  ) {
    const errorMsg =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as Record<string, unknown>).error)
        : "Unknown error";
    throw new Error(`Token exchange failed: ${errorMsg}`);
  }
  const d = data as Record<string, unknown>;
  return {
    access_token: d.access_token as string,
    refresh_token: typeof d.refresh_token === "string" ? d.refresh_token : "",
    expires_in: typeof d.expires_in === "number" ? d.expires_in : 3600,
  };
}

export const exchangeCodeForTokens = internalAction({
  args: {
    code: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<void> => {
    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("TOKEN_ENCRYPTION_KEY environment variable is not set");
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("GOOGLE_CLIENT_ID environment variable is not set");
    }
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error("GOOGLE_CLIENT_SECRET environment variable is not set");
    }
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!redirectUri) {
      throw new Error("GOOGLE_REDIRECT_URI environment variable is not set");
    }

    const body = buildExchangeBody(args.code, clientId, clientSecret, redirectUri);
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await response.json();
    const parsed = parseExchangeResponse(data);

    const encryptedAccessToken = encrypt(parsed.access_token, encryptionKey);
    const encryptedRefreshToken = parsed.refresh_token
      ? encrypt(parsed.refresh_token, encryptionKey)
      : undefined;
    const tokenExpiresAt = Date.now() + parsed.expires_in * 1000;

    await ctx.runMutation(
      (internal as any).auth.tokens.storeTokens,
      {
        userId: args.userId,
        platform: "google" as const,
        encryptedAccessToken,
        encryptedRefreshToken: encryptedRefreshToken ?? "",
        tokenExpiresAt,
        scopes: GOOGLE_SCOPES,
      }
    );
  },
});
