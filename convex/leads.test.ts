import { describe, it } from "node:test";
import assert from "node:assert/strict";

import * as leads from "./leads.js";

describe("convex/leads.ts exports", () => {
  it("exports upsertLead", () => {
    assert.ok(leads.upsertLead != null, "upsertLead should be exported");
  });

  it("exports createSyncLog", () => {
    assert.ok(leads.createSyncLog != null, "createSyncLog should be exported");
  });

  it("exports completeSyncLog", () => {
    assert.ok(
      leads.completeSyncLog != null,
      "completeSyncLog should be exported"
    );
  });

  it("exports exactly 3 mutations", () => {
    const exportedKeys = Object.keys(leads);
    assert.equal(exportedKeys.length, 3, "should export exactly 3 items");
    assert.ok(exportedKeys.includes("upsertLead"));
    assert.ok(exportedKeys.includes("createSyncLog"));
    assert.ok(exportedKeys.includes("completeSyncLog"));
  });
});

describe("upsertLead mutation", () => {
  it("is a Convex internal mutation registration", () => {
    assert.equal(typeof leads.upsertLead, "function");
  });
});

describe("createSyncLog mutation", () => {
  it("is a Convex internal mutation registration", () => {
    assert.equal(typeof leads.createSyncLog, "function");
  });
});

describe("completeSyncLog mutation", () => {
  it("is a Convex internal mutation registration", () => {
    assert.equal(typeof leads.completeSyncLog, "function");
  });
});
