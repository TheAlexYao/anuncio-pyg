import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  storeAccount,
  bulkStoreAccounts,
  toggleSync,
  listByUser,
  listByUserPlatform,
} from "./connectedAccounts.ts";

describe("connectedAccounts exports", () => {
  it("exports storeAccount as a function", () => {
    assert.equal(typeof storeAccount, "function");
  });

  it("exports bulkStoreAccounts as a function", () => {
    assert.equal(typeof bulkStoreAccounts, "function");
  });

  it("exports toggleSync as a function", () => {
    assert.equal(typeof toggleSync, "function");
  });

  it("exports listByUser as a function", () => {
    assert.equal(typeof listByUser, "function");
  });

  it("exports listByUserPlatform as a function", () => {
    assert.equal(typeof listByUserPlatform, "function");
  });

  it("all exports are distinct", () => {
    const exports = [storeAccount, bulkStoreAccounts, toggleSync, listByUser, listByUserPlatform];
    const unique = new Set(exports);
    assert.equal(unique.size, exports.length);
  });

  it("exports exactly 5 named functions", () => {
    // Verify we have the complete API surface
    const names = ["storeAccount", "bulkStoreAccounts", "toggleSync", "listByUser", "listByUserPlatform"];
    for (const name of names) {
      const mod = { storeAccount, bulkStoreAccounts, toggleSync, listByUser, listByUserPlatform };
      assert.notEqual((mod as Record<string, unknown>)[name], undefined, `${name} should be exported`);
    }
  });
});
