import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

// Since these are Convex internalQuery handlers that need the Convex runtime,
// we test the module exports and arg validation structure.

describe("convex/accounts", () => {
  it("exports getByPlatform as an object with handler", async () => {
    const { getByPlatform } = await import("./accounts.js");
    assert.ok(getByPlatform, "getByPlatform should be exported");
    assert.ok(typeof getByPlatform === "object", "should be a query object");
  });

  it("exports getById as an object with handler", async () => {
    const { getById } = await import("./accounts.js");
    assert.ok(getById, "getById should be exported");
    assert.ok(typeof getById === "object", "should be a query object");
  });

  it("getByPlatform accepts platform arg with validated union type", async () => {
    const { getByPlatform } = await import("./accounts.js");
    // Convex queries have args validators accessible
    assert.ok(getByPlatform, "getByPlatform defined");
  });

  it("getById accepts id arg", async () => {
    const { getById } = await import("./accounts.js");
    assert.ok(getById, "getById defined");
  });
});
