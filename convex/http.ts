import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Build a redirect URL to the frontend settings page.
 */
export function buildRedirectUrl(
  baseUrl: string,
  status: "success" | "error",
  message?: string
): string {
  const url = new URL(`${baseUrl}/settings/connections`);
  url.searchParams.set("status", status);
  if (message) {
    url.searchParams.set("message", message);
  }
  return url.toString();
}

/**
 * Parse the OAuth state parameter to extract userId.
 */
export function parseState(stateParam: string): { userId: string } {
  try {
    const parsed = JSON.parse(stateParam);
    if (typeof parsed.userId !== "string" || !parsed.userId) {
      throw new Error("Missing userId in state");
    }
    return { userId: parsed.userId };
  } catch {
    throw new Error("Invalid state parameter");
  }
}

http.route({
  path: "/auth/google/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // Missing code parameter
    if (!code) {
      const redirectUrl = buildRedirectUrl(
        frontendUrl,
        "error",
        "Missing authorization code"
      );
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl },
      });
    }

    // Missing or invalid state
    if (!state) {
      const redirectUrl = buildRedirectUrl(
        frontendUrl,
        "error",
        "Missing state parameter"
      );
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl },
      });
    }

    let userId: string;
    try {
      const parsed = parseState(state);
      userId = parsed.userId;
    } catch {
      const redirectUrl = buildRedirectUrl(
        frontendUrl,
        "error",
        "Invalid state parameter"
      );
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl },
      });
    }

    try {
      await ctx.runAction(
        (internal as any).google.exchangeCode.exchangeCodeForTokens,
        { code, userId }
      );

      const redirectUrl = buildRedirectUrl(frontendUrl, "success");
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Token exchange failed";
      const redirectUrl = buildRedirectUrl(frontendUrl, "error", message);
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl },
      });
    }
  }),
});

export default http;
