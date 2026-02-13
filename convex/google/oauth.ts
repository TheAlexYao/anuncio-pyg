"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

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
