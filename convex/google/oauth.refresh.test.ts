import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isTokenExpired,
  buildRefreshBody,
  parseTokenResponse,
} from "./oauth.ts";

describe("isTokenExpired", () => {
  it("should return true when token is already expired", () => {
    const now = 1000000;
    const expiresAt = 999000; // expired 1s ago
    assert.equal(isTokenExpired(expiresAt, now), true);
  });

  it("should return true when token expires within 60s buffer", () => {
    const now = 1000000;
    const expiresAt = now + 30_000; // expires in 30s, within buffer
    assert.equal(isTokenExpired(expiresAt, now), true);
  });

  it("should return true when token expires exactly at buffer boundary", () => {
    const now = 1000000;
    const expiresAt = now + 60_000; // exactly at boundary
    assert.equal(isTokenExpired(expiresAt, now), true);
  });

  it("should return false when token is valid beyond buffer", () => {
    const now = 1000000;
    const expiresAt = now + 120_000; // expires in 2min
    assert.equal(isTokenExpired(expiresAt, now), false);
  });

  it("should return false when token has plenty of time left", () => {
    const now = 1000000;
    const expiresAt = now + 3600_000; // 1 hour
    assert.equal(isTokenExpired(expiresAt, now), false);
  });
});

describe("buildRefreshBody", () => {
  it("should include grant_type=refresh_token", () => {
    const body = buildRefreshBody("rt_abc", "client123", "secret456");
    assert.equal(body.get("grant_type"), "refresh_token");
  });

  it("should include the refresh token", () => {
    const body = buildRefreshBody("rt_abc", "client123", "secret456");
    assert.equal(body.get("refresh_token"), "rt_abc");
  });

  it("should include client_id", () => {
    const body = buildRefreshBody("rt_abc", "client123", "secret456");
    assert.equal(body.get("client_id"), "client123");
  });

  it("should include client_secret", () => {
    const body = buildRefreshBody("rt_abc", "client123", "secret456");
    assert.equal(body.get("client_secret"), "secret456");
  });
});

describe("parseTokenResponse", () => {
  it("should parse a valid response", () => {
    const result = parseTokenResponse({
      access_token: "ya29.newtoken",
      expires_in: 3600,
      token_type: "Bearer",
    });
    assert.equal(result.access_token, "ya29.newtoken");
    assert.equal(result.expires_in, 3600);
  });

  it("should default expires_in to 3600 if missing", () => {
    const result = parseTokenResponse({
      access_token: "ya29.newtoken",
    });
    assert.equal(result.expires_in, 3600);
  });

  it("should throw on error response with error field", () => {
    assert.throws(
      () => parseTokenResponse({ error: "invalid_grant" }),
      /Token refresh failed: invalid_grant/
    );
  });

  it("should throw on null response", () => {
    assert.throws(
      () => parseTokenResponse(null),
      /Token refresh failed/
    );
  });

  it("should throw when access_token is not a string", () => {
    assert.throws(
      () => parseTokenResponse({ access_token: 123 }),
      /Token refresh failed/
    );
  });

  it("should throw on empty object", () => {
    assert.throws(
      () => parseTokenResponse({}),
      /Token refresh failed/
    );
  });
});

describe("Module exports", () => {
  it("should export refreshAccessToken", async () => {
    const mod = await import("./oauth.ts");
    assert.ok(mod.refreshAccessToken != null);
  });

  it("should export getValidAccessToken", async () => {
    const mod = await import("./oauth.ts");
    assert.ok(mod.getValidAccessToken != null);
  });

  it("should export isTokenExpired", async () => {
    const mod = await import("./oauth.ts");
    assert.ok(typeof mod.isTokenExpired === "function");
  });
});
