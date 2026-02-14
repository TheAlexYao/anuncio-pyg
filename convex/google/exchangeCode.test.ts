import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildExchangeBody, parseExchangeResponse } from "./exchangeCode.ts";

describe("buildExchangeBody", () => {
  it("should set grant_type to authorization_code", () => {
    const body = buildExchangeBody("code123", "cid", "csecret", "https://example.com/cb");
    assert.equal(body.get("grant_type"), "authorization_code");
  });

  it("should include the authorization code", () => {
    const body = buildExchangeBody("code123", "cid", "csecret", "https://example.com/cb");
    assert.equal(body.get("code"), "code123");
  });

  it("should include client_id", () => {
    const body = buildExchangeBody("code123", "cid", "csecret", "https://example.com/cb");
    assert.equal(body.get("client_id"), "cid");
  });

  it("should include client_secret", () => {
    const body = buildExchangeBody("code123", "cid", "csecret", "https://example.com/cb");
    assert.equal(body.get("client_secret"), "csecret");
  });

  it("should include redirect_uri", () => {
    const body = buildExchangeBody("code123", "cid", "csecret", "https://example.com/cb");
    assert.equal(body.get("redirect_uri"), "https://example.com/cb");
  });
});

describe("parseExchangeResponse", () => {
  it("should parse a valid response with all fields", () => {
    const result = parseExchangeResponse({
      access_token: "ya29.abc",
      refresh_token: "1//rt_xyz",
      expires_in: 3600,
    });
    assert.equal(result.access_token, "ya29.abc");
    assert.equal(result.refresh_token, "1//rt_xyz");
    assert.equal(result.expires_in, 3600);
  });

  it("should default expires_in to 3600 if missing", () => {
    const result = parseExchangeResponse({
      access_token: "ya29.abc",
      refresh_token: "1//rt",
    });
    assert.equal(result.expires_in, 3600);
  });

  it("should default refresh_token to empty string if missing", () => {
    const result = parseExchangeResponse({
      access_token: "ya29.abc",
    });
    assert.equal(result.refresh_token, "");
  });

  it("should throw on error response", () => {
    assert.throws(
      () => parseExchangeResponse({ error: "invalid_grant" }),
      /Token exchange failed: invalid_grant/
    );
  });

  it("should throw on null", () => {
    assert.throws(
      () => parseExchangeResponse(null),
      /Token exchange failed/
    );
  });

  it("should throw on empty object", () => {
    assert.throws(
      () => parseExchangeResponse({}),
      /Token exchange failed/
    );
  });

  it("should throw when access_token is not a string", () => {
    assert.throws(
      () => parseExchangeResponse({ access_token: 42 }),
      /Token exchange failed/
    );
  });
});

describe("Module exports", () => {
  it("should export exchangeCodeForTokens", async () => {
    const mod = await import("./exchangeCode.ts");
    assert.ok(mod.exchangeCodeForTokens != null);
  });
});
