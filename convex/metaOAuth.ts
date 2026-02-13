"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { encrypt, decrypt } from "./lib/crypto";

interface MetaTokenResponse {
  access_token: string;
  expires_in?: number;
}

interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  account_status: number;
}

interface MetaAdAccountsResponse {
  data: MetaAdAccount[];
}

// Generate Meta OAuth URL
export const generateAuthUrl = action({
  args: { userId: v.id("users"), redirectUri: v.string() },
  handler: async (_ctx, args) => {
    const appId = process.env.META_APP_ID;
    if (!appId) throw new Error("META_APP_ID not set");

    const state = JSON.stringify({ userId: args.userId });
    const scopes = ["ads_management", "ads_read", "business_management"];

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: args.redirectUri,
      scope: scopes.join(","),
      response_type: "code",
      state,
    });

    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  },
});

// Exchange code for tokens
export const exchangeCodeForTokens = action({
  args: { code: v.string(), redirectUri: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!appId || !appSecret) throw new Error("Meta credentials not set");
    if (!encryptionKey) throw new Error("ENCRYPTION_KEY not set");

    // Exchange code for short-lived token
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", args.redirectUri);
    tokenUrl.searchParams.set("code", args.code);

    const tokenRes = await fetch(tokenUrl.toString());
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token exchange failed: ${err}`);
    }
    const tokenData = (await tokenRes.json()) as MetaTokenResponse;

    // Exchange for long-lived token
    const longLivedUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", tokenData.access_token);

    const longLivedRes = await fetch(longLivedUrl.toString());
    if (!longLivedRes.ok) {
      const err = await longLivedRes.text();
      throw new Error(`Long-lived token exchange failed: ${err}`);
    }
    const longLivedData = (await longLivedRes.json()) as MetaTokenResponse;

    const encryptedToken = encrypt(longLivedData.access_token, encryptionKey);
    const expiresAt = Date.now() + (longLivedData.expires_in || 5184000) * 1000;

    await ctx.runMutation(internal.metaAuth.storeUserAuth, {
      userId: args.userId,
      encryptedAccessToken: encryptedToken,
      tokenExpiresAt: expiresAt,
      scopes: ["ads_management", "ads_read", "business_management"],
    });

    return { success: true };
  },
});

// Fetch ad accounts for user to select
export const fetchAdAccounts = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error("ENCRYPTION_KEY not set");

    const auth = await ctx.runQuery(internal.metaAuth.getUserAuth, { userId: args.userId });
    if (!auth) throw new Error("No Meta auth found for user");

    const accessToken = decrypt(auth.encryptedAccessToken, encryptionKey);

    const url = `https://graph.facebook.com/v21.0/me/adaccounts?fields=name,account_id,currency,account_status&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch ad accounts: ${err}`);
    }
    const data = (await res.json()) as MetaAdAccountsResponse;

    return data.data.map((acc) => ({
      id: acc.id,
      accountId: acc.account_id,
      name: acc.name,
      currency: acc.currency,
      status: acc.account_status,
    }));
  },
});

// Save selected ad accounts
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
    const auth = await ctx.runQuery(internal.metaAuth.getUserAuth, { userId: args.userId });
    if (!auth) throw new Error("No Meta auth found for user");

    await ctx.runMutation(internal.metaAuth.saveConnectedAccounts, {
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
