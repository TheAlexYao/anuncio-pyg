"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { internal } from "./_generated/api";

// Crypto helpers
function encrypt(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(ciphertext: string, keyHex: string): string {
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Invalid ciphertext");
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/analytics.readonly",
];

// Generate Google OAuth URL
export const generateAuthUrl = action({
  args: { userId: v.id("users"), redirectUri: v.string() },
  handler: async (_ctx, args) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("GOOGLE_CLIENT_ID not set");

    const state = JSON.stringify({ userId: args.userId });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: args.redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },
});

// Exchange code for tokens
export const exchangeCodeForTokens = action({
  args: { code: v.string(), redirectUri: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!clientId || !clientSecret) throw new Error("Google credentials not set");
    if (!encryptionKey) throw new Error("ENCRYPTION_KEY not set");

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: args.code,
        grant_type: "authorization_code",
        redirect_uri: args.redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token exchange failed: ${err}`);
    }

    const tokenData = await tokenRes.json();

    // Encrypt tokens
    const encryptedAccess = encrypt(tokenData.access_token, encryptionKey);
    const encryptedRefresh = tokenData.refresh_token
      ? encrypt(tokenData.refresh_token, encryptionKey)
      : undefined;

    const expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

    // Store tokens
    await ctx.runMutation(internal.googleAuth.storeUserAuth, {
      userId: args.userId,
      encryptedAccessToken: encryptedAccess,
      encryptedRefreshToken: encryptedRefresh,
      tokenExpiresAt: expiresAt,
      scopes: GOOGLE_SCOPES,
    });

    return { success: true };
  },
});

// Refresh access token
export const refreshAccessToken = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!clientId || !clientSecret || !encryptionKey) {
      throw new Error("Missing credentials");
    }

    const auth = await ctx.runQuery(internal.googleAuth.getUserAuth, { userId: args.userId });
    if (!auth || !auth.encryptedRefreshToken) {
      throw new Error("No refresh token available");
    }

    const refreshToken = decrypt(auth.encryptedRefreshToken, encryptionKey);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token refresh failed: ${err}`);
    }

    const tokenData = await tokenRes.json();
    const encryptedAccess = encrypt(tokenData.access_token, encryptionKey);
    const expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

    await ctx.runMutation(internal.googleAuth.updateAccessToken, {
      userId: args.userId,
      encryptedAccessToken: encryptedAccess,
      tokenExpiresAt: expiresAt,
    });

    return { success: true };
  },
});

// Fetch Google Ads accounts
export const fetchAdsAccounts = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const mccCustomerId = process.env.GOOGLE_ADS_MCC_CUSTOMER_ID;

    if (!encryptionKey || !developerToken) {
      throw new Error("Missing credentials");
    }

    const auth = await ctx.runQuery(internal.googleAuth.getUserAuth, { userId: args.userId });
    if (!auth) throw new Error("No Google auth found");

    // Check if token expired, refresh if needed
    if (auth.tokenExpiresAt < Date.now() + 60000) {
      await ctx.runAction(internal.googleOAuth.refreshAccessToken, { userId: args.userId });
      // Re-fetch auth
      const newAuth = await ctx.runQuery(internal.googleAuth.getUserAuth, { userId: args.userId });
      if (!newAuth) throw new Error("Auth refresh failed");
    }

    const accessToken = decrypt(auth.encryptedAccessToken, encryptionKey);

    // List accessible customers
    const url = "https://googleads.googleapis.com/v18/customers:listAccessibleCustomers";
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": developerToken,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch accounts: ${err}`);
    }

    const data = await res.json();
    const customerIds = data.resourceNames?.map((r: string) => r.replace("customers/", "")) || [];

    // Get account details for each
    const accounts = [];
    for (const customerId of customerIds) {
      try {
        const detailRes = await fetch(
          `https://googleads.googleapis.com/v18/customers/${customerId}`,
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": developerToken,
              "login-customer-id": mccCustomerId || customerId,
            },
          }
        );
        if (detailRes.ok) {
          const detail = await detailRes.json();
          accounts.push({
            customerId,
            name: detail.descriptiveName || customerId,
            currencyCode: detail.currencyCode || "USD",
          });
        }
      } catch {
        // Skip accounts we can't access
      }
    }

    return accounts;
  },
});

// Save selected accounts
export const saveSelectedAccounts = action({
  args: {
    userId: v.id("users"),
    accounts: v.array(
      v.object({
        platformAccountId: v.string(),
        accountName: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const auth = await ctx.runQuery(internal.googleAuth.getUserAuth, { userId: args.userId });
    if (!auth) throw new Error("No Google auth found");

    await ctx.runMutation(internal.googleAuth.saveConnectedAccounts, {
      userId: args.userId,
      accounts: args.accounts,
      encryptedAccessToken: auth.encryptedAccessToken,
      encryptedRefreshToken: auth.encryptedRefreshToken,
      tokenExpiresAt: auth.tokenExpiresAt,
      scopes: auth.scopes,
    });

    return { success: true, count: args.accounts.length };
  },
});
