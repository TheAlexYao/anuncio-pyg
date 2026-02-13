"use node";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { encrypt, decrypt } from "../lib/crypto";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/analytics.readonly",
];

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

export const generateAuthUrl = action({
  args: {
    state: v.string(),
  },
  handler: async (_ctx, args): Promise<string> => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("GOOGLE_CLIENT_ID environment variable is not set");
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!redirectUri) {
      throw new Error("GOOGLE_REDIRECT_URI environment variable is not set");
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state: args.state,
    });

    return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
  },
});

// --- Token Refresh ---

const TOKEN_EXPIRY_BUFFER_MS = 60_000; // 60 seconds

/**
 * Check if a token is expired or will expire within the buffer period.
 */
export function isTokenExpired(expiresAt: number, now: number = Date.now()): boolean {
  return now >= expiresAt - TOKEN_EXPIRY_BUFFER_MS;
}

/**
 * Build the POST body for a Google token refresh request.
 */
export function buildRefreshBody(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): URLSearchParams {
  return new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
}

/**
 * Parse the JSON response from Google's token endpoint.
 * Returns { access_token, expires_in } or throws.
 */
export function parseTokenResponse(data: unknown): {
  access_token: string;
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
    throw new Error(`Token refresh failed: ${errorMsg}`);
  }
  const d = data as Record<string, unknown>;
  return {
    access_token: d.access_token as string,
    expires_in: typeof d.expires_in === "number" ? d.expires_in : 3600,
  };
}

export const refreshAccessToken = internalAction({
  args: {
    userAuthId: v.id("user_auth"),
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

    const record = await ctx.runQuery(
      (internal as any).auth.tokens.getTokensById,
      { id: args.userAuthId }
    );

    if (!record) {
      throw new Error("user_auth record not found");
    }

    if (!record.encryptedRefreshToken) {
      throw new Error("No refresh token available for this record");
    }

    const refreshToken = decrypt(record.encryptedRefreshToken, encryptionKey);

    const body = buildRefreshBody(refreshToken, clientId, clientSecret);
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await response.json();
    const parsed = parseTokenResponse(data);

    const encryptedAccessToken = encrypt(parsed.access_token, encryptionKey);
    const tokenExpiresAt = Date.now() + parsed.expires_in * 1000;

    await ctx.runMutation(
      (internal as any).auth.tokens.updateTokens,
      {
        id: args.userAuthId,
        encryptedAccessToken,
        tokenExpiresAt,
      }
    );
  },
});

export const getValidAccessToken = internalAction({
  args: {
    userAuthId: v.id("user_auth"),
  },
  handler: async (ctx, args): Promise<string> => {
    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("TOKEN_ENCRYPTION_KEY environment variable is not set");
    }

    const record = await ctx.runQuery(
      (internal as any).auth.tokens.getTokensById,
      { id: args.userAuthId }
    );

    if (!record) {
      throw new Error("user_auth record not found");
    }

    if (isTokenExpired(record.tokenExpiresAt)) {
      // Refresh the token
      await ctx.runAction(
        (internal as any).google.oauth.refreshAccessToken,
        { userAuthId: args.userAuthId }
      );

      // Re-read the updated record
      const updated = await ctx.runQuery(
        (internal as any).auth.tokens.getTokensById,
        { id: args.userAuthId }
      );

      if (!updated) {
        throw new Error("user_auth record not found after refresh");
      }

      return decrypt(updated.encryptedAccessToken, encryptionKey);
    }

    return decrypt(record.encryptedAccessToken, encryptionKey);
  },
});

