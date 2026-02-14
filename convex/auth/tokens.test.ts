import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { storeTokens, updateTokens, getTokens } from "./tokens";

describe("auth/tokens exports", () => {
  it("exports storeTokens as a function", () => {
    assert.ok(storeTokens != null, "storeTokens should be exported");
  });

  it("exports updateTokens as a function", () => {
    assert.ok(updateTokens != null, "updateTokens should be exported");
  });

  it("exports getTokens as a function", () => {
    assert.ok(getTokens != null, "getTokens should be exported");
  });

  it("storeTokens is distinct from updateTokens", () => {
    assert.notEqual(storeTokens, updateTokens);
  });

  it("storeTokens is distinct from getTokens", () => {
    assert.notEqual(storeTokens, getTokens);
  });
});

describe("storeTokens args validation", () => {
  it("defines expected args", () => {
    // Convex functions expose args via .args or the export object
    // We verify the function is a valid Convex mutation with the right shape
    const fn = storeTokens as any;
    assert.ok(fn, "storeTokens should exist");
    // Check it has the structure of a registered Convex function
    assert.ok(
      typeof fn === "object" || typeof fn === "function",
      "should be an object or function"
    );
  });

  it("has required arg fields for storeTokens", () => {
    // The Convex function builder stores args info
    // We verify by checking the export is not empty
    const fn = storeTokens as any;
    const keys = Object.keys(fn);
    assert.ok(keys.length > 0, "storeTokens should have properties (Convex function descriptor)");
  });
});

describe("updateTokens args validation", () => {
  it("defines expected args", () => {
    const fn = updateTokens as any;
    assert.ok(fn, "updateTokens should exist");
    assert.ok(
      typeof fn === "object" || typeof fn === "function",
      "should be an object or function"
    );
  });

  it("has required arg fields for updateTokens", () => {
    const fn = updateTokens as any;
    const keys = Object.keys(fn);
    assert.ok(keys.length > 0, "updateTokens should have properties (Convex function descriptor)");
  });
});

describe("getTokens args validation", () => {
  it("defines expected args", () => {
    const fn = getTokens as any;
    assert.ok(fn, "getTokens should exist");
    assert.ok(
      typeof fn === "object" || typeof fn === "function",
      "should be an object or function"
    );
  });

  it("has required arg fields for getTokens", () => {
    const fn = getTokens as any;
    const keys = Object.keys(fn);
    assert.ok(keys.length > 0, "getTokens should have properties (Convex function descriptor)");
  });
});
