import { describe, it } from "node:test";
import assert from "node:assert/strict";

import * as accounts from "./accounts";

describe("convex/accounts.ts exports", () => {
  it("exports listConnectedAccounts", () => {
    assert.ok(accounts.listConnectedAccounts != null);
  });

  it("exports toggleAccountSync", () => {
    assert.ok(accounts.toggleAccountSync != null);
  });

  it("exports getConnectionStatus", () => {
    assert.ok(accounts.getConnectionStatus != null);
  });

  it("exports exactly three public functions", () => {
    const exportNames = Object.keys(accounts).sort();
    assert.deepEqual(exportNames, [
      "getConnectionStatus",
      "listConnectedAccounts",
      "toggleAccountSync",
    ]);
  });

  it("all exports are distinct", () => {
    assert.notEqual(accounts.listConnectedAccounts, accounts.toggleAccountSync);
    assert.notEqual(accounts.listConnectedAccounts, accounts.getConnectionStatus);
    assert.notEqual(accounts.toggleAccountSync, accounts.getConnectionStatus);
  });
});
