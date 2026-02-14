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
  message?: string,
  syncing?: boolean
): string {
  const url = new URL(`${baseUrl}/settings/connections`);
  url.searchParams.set("status", status);
  if (message) {
    url.searchParams.set("message", message);
  }
  if (syncing) {
    url.searchParams.set("syncing", "true");
  }
  return url.toString();
}

/**
 * Parse the OAuth state parameter to extract tenant context.
 */
export function parseState(stateParam: string): {
  tenantId: string;
  brandId?: string;
} {
  try {
    const parsed = JSON.parse(stateParam);
    if (typeof parsed.tenantId !== "string" || !parsed.tenantId) {
      throw new Error("Missing tenantId in state");
    }
    if (
      "brandId" in parsed &&
      (typeof parsed.brandId !== "string" || !parsed.brandId)
    ) {
      throw new Error("Invalid brandId in state");
    }
    return { tenantId: parsed.tenantId, brandId: parsed.brandId };
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

    let tenantId: string;
    let brandId: string | undefined;
    try {
      const parsed = parseState(state);
      tenantId = parsed.tenantId;
      brandId = parsed.brandId;
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
      const userAuthId = await ctx.runAction(
        (internal as any).google.exchangeCode.exchangeCodeForTokens,
        { code, tenantId, brandId }
      );

      // Schedule account sync in the background (don't block the redirect)
      await ctx.scheduler.runAfter(
        0,
        (internal as any).google.accounts.syncGoogleAccounts,
        { tenantId, brandId, userAuthId }
      );

      const redirectUrl = buildRedirectUrl(frontendUrl, "success", undefined, true);
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
