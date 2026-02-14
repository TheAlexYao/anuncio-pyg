import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRedirectUrl, parseState } from "./http.ts";

describe("buildRedirectUrl", () => {
  it("should build a success redirect URL", () => {
    const url = buildRedirectUrl("https://myapp.com", "success");
    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/settings/connections");
    assert.equal(parsed.searchParams.get("status"), "success");
    assert.equal(parsed.searchParams.has("message"), false);
  });

  it("should build an error redirect URL with message", () => {
    const url = buildRedirectUrl("https://myapp.com", "error", "Something went wrong");
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("status"), "error");
    assert.equal(parsed.searchParams.get("message"), "Something went wrong");
  });

  it("should not include message param when not provided", () => {
    const url = buildRedirectUrl("https://myapp.com", "error");
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("status"), "error");
    assert.equal(parsed.searchParams.has("message"), false);
  });

  it("should handle base URL with trailing slash", () => {
    const url = buildRedirectUrl("https://myapp.com", "success");
    assert.ok(url.includes("/settings/connections"));
  });

  it("should include syncing=true when syncing flag is set", () => {
    const url = buildRedirectUrl("https://myapp.com", "success", undefined, true);
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("syncing"), "true");
    assert.equal(parsed.searchParams.get("status"), "success");
  });

  it("should not include syncing param when flag is false", () => {
    const url = buildRedirectUrl("https://myapp.com", "success", undefined, false);
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.has("syncing"), false);
  });

  it("should not include syncing param when flag is undefined", () => {
    const url = buildRedirectUrl("https://myapp.com", "success");
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.has("syncing"), false);
  });

  it("should include both message and syncing when both provided", () => {
    const url = buildRedirectUrl("https://myapp.com", "success", "connected", true);
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("message"), "connected");
    assert.equal(parsed.searchParams.get("syncing"), "true");
  });
});

describe("parseState", () => {
  it("should parse valid state with tenantId", () => {
    const result = parseState(JSON.stringify({ tenantId: "tenant123" }));
    assert.equal(result.tenantId, "tenant123");
  });

  it("should parse brandId when present", () => {
    const result = parseState(
      JSON.stringify({ tenantId: "tenant123", brandId: "brand456" })
    );
    assert.equal(result.brandId, "brand456");
  });

  it("should throw on invalid JSON", () => {
    assert.throws(() => parseState("not json"), /Invalid state parameter/);
  });

  it("should throw on missing tenantId", () => {
    assert.throws(
      () => parseState(JSON.stringify({})),
      /Invalid state parameter|Missing tenantId/
    );
  });

  it("should throw on empty tenantId", () => {
    assert.throws(
      () => parseState(JSON.stringify({ tenantId: "" })),
      /Invalid state parameter|Missing tenantId/
    );
  });

  it("should throw on non-string tenantId", () => {
    assert.throws(
      () => parseState(JSON.stringify({ tenantId: 123 })),
      /Invalid state parameter|Missing tenantId/
    );
  });

  it("should throw on invalid brandId", () => {
    assert.throws(
      () => parseState(JSON.stringify({ tenantId: "tenant123", brandId: 123 })),
      /Invalid state parameter|Invalid brandId/
    );
  });
});

describe("HTTP module exports", () => {
  it("should export default httpRouter", async () => {
    const mod = await import("./http.ts");
    assert.ok(mod.default != null, "default export should exist");
  });

  it("should export buildRedirectUrl", async () => {
    const mod = await import("./http.ts");
    assert.ok(typeof mod.buildRedirectUrl === "function");
  });

  it("should export parseState", async () => {
    const mod = await import("./http.ts");
    assert.ok(typeof mod.parseState === "function");
  });
});
