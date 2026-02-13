"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { encrypt, decrypt } from "./lib/crypto";

interface GoogleTokenResponse {
  access_token: string;
  expires_in?: number;
}

export const refreshAccessToken = internalAction({
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

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
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
