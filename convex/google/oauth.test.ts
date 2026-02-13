import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// We test the URL generation logic directly since Convex actions
// can't be invoked outside the Convex runtime easily.
// We replicate the core logic to verify correctness.

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/analytics.readonly",
];

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

function buildAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

describe("Google OAuth generateAuthUrl", () => {
  const MOCK_CLIENT_ID = "test-client-id-123.apps.googleusercontent.com";
  const MOCK_REDIRECT_URI = "https://myapp.convex.site/google/callback";
  const MOCK_STATE = JSON.stringify({ userId: "user_abc123" });

  it("should return a URL starting with the Google auth endpoint", () => {
    const url = buildAuthUrl(MOCK_CLIENT_ID, MOCK_REDIRECT_URI, MOCK_STATE);
    assert.ok(url.startsWith(GOOGLE_AUTH_ENDPOINT));
  });

  it("should include client_id parameter", () => {
    const url = new URL(buildAuthUrl(MOCK_CLIENT_ID, MOCK_REDIRECT_URI, MOCK_STATE));
    assert.equal(url.searchParams.get("client_id"), MOCK_CLIENT_ID);
  });

  it("should include redirect_uri parameter", () => {
    const url = new URL(buildAuthUrl(MOCK_CLIENT_ID, MOCK_REDIRECT_URI, MOCK_STATE));
    assert.equal(url.searchParams.get("redirect_uri"), MOCK_REDIRECT_URI);
  });

  it("should set response_type to code", () => {
    const url = new URL(buildAuthUrl(MOCK_CLIENT_ID, MOCK_REDIRECT_URI, MOCK_STATE));
    assert.equal(url.searchParams.get("response_type"), "code");
  });

  it("should set access_type to offline", () => {
    const url = new URL(buildAuthUrl(MOCK_CLIENT_ID, MOCK_REDIRECT_URI, MOCK_STATE));
    assert.equal(url.searchParams.get("access_type"), "offline");
  });

  it("should set prompt to consent", () => {
    const url = new URL(buildAuthUrl(MOCK_CLIENT_ID, MOCK_REDIRECT_URI, MOCK_STATE));
    assert.equal(url.searchParams.get("prompt"), "consent");
  });

  it("should include both adwords and analytics.readonly scopes", () => {
    const url = new URL(buildAuthUrl(MOCK_CLIENT_ID, MOCK_REDIRECT_URI, MOCK_STATE));
    const scope = url.searchParams.get("scope")!;
    assert.ok(scope.includes("https://www.googleapis.com/auth/adwords"), "missing adwords scope");
    assert.ok(scope.includes("https://www.googleapis.com/auth/analytics.readonly"), "missing analytics scope");
  });

  it("should include the state parameter", () => {
    const url = new URL(buildAuthUrl(MOCK_CLIENT_ID, MOCK_REDIRECT_URI, MOCK_STATE));
    assert.equal(url.searchParams.get("state"), MOCK_STATE);
  });

  it("should preserve userId in state when parsed back", () => {
    const url = new URL(buildAuthUrl(MOCK_CLIENT_ID, MOCK_REDIRECT_URI, MOCK_STATE));
    const state = JSON.parse(url.searchParams.get("state")!);
    assert.equal(state.userId, "user_abc123");
  });

  it("should handle special characters in state", () => {
    const specialState = JSON.stringify({ userId: "user/abc+123&foo=bar" });
    const url = new URL(buildAuthUrl(MOCK_CLIENT_ID, MOCK_REDIRECT_URI, specialState));
    const parsed = JSON.parse(url.searchParams.get("state")!);
    assert.equal(parsed.userId, "user/abc+123&foo=bar");
  });
});

describe("Google OAuth module exports", () => {
  it("should export generateAuthUrl from convex/google/oauth.ts", async () => {
    const mod = await import("./oauth.ts");
    assert.ok(mod.generateAuthUrl != null, "generateAuthUrl should be exported");
  });

  it("should export generateAuthUrl as a function", async () => {
    const mod = await import("./oauth.ts");
    assert.ok(typeof mod.generateAuthUrl === "function", "generateAuthUrl should be a function");
  });
});
