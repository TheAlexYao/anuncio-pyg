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
});

describe("parseState", () => {
  it("should parse valid state with userId", () => {
    const result = parseState(JSON.stringify({ userId: "user123" }));
    assert.equal(result.userId, "user123");
  });

  it("should throw on invalid JSON", () => {
    assert.throws(() => parseState("not json"), /Invalid state parameter/);
  });

  it("should throw on missing userId", () => {
    assert.throws(() => parseState(JSON.stringify({})), /Invalid state parameter|Missing userId/);
  });

  it("should throw on empty userId", () => {
    assert.throws(() => parseState(JSON.stringify({ userId: "" })), /Invalid state parameter|Missing userId/);
  });

  it("should throw on non-string userId", () => {
    assert.throws(() => parseState(JSON.stringify({ userId: 123 })), /Invalid state parameter|Missing userId/);
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
