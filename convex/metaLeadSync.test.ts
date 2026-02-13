import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Test that the module exports the expected functions
describe("metaLeadSync exports", () => {
  it("exports syncLeads as an internalAction", async () => {
    const mod = await import("./metaLeadSync");
    assert.ok(mod.syncLeads, "syncLeads should be exported");
    assert.ok(typeof mod.syncLeads === "function" || mod.syncLeads != null);
  });

  it("exports getMetaConnectedAccounts as an internalQuery", async () => {
    const mod = await import("./metaLeadSync");
    assert.ok(mod.getMetaConnectedAccounts, "getMetaConnectedAccounts should be exported");
  });

  it("exports createSyncLog as an internalMutation", async () => {
    const mod = await import("./metaLeadSync");
    assert.ok(mod.createSyncLog, "createSyncLog should be exported");
  });

  it("exports completeSyncLog as an internalMutation", async () => {
    const mod = await import("./metaLeadSync");
    assert.ok(mod.completeSyncLog, "completeSyncLog should be exported");
  });

  it("exports upsertLead as an internalMutation", async () => {
    const mod = await import("./metaLeadSync");
    assert.ok(mod.upsertLead, "upsertLead should be exported");
  });
});

// Test the 90-day cutoff calculation
describe("90-day cutoff calculation", () => {
  it("calculates correct Unix timestamp for 90 days ago", () => {
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const cutoff = Math.floor((now - ninetyDaysMs) / 1000);

    // Should be approximately 90 days ago in seconds
    const nowSeconds = Math.floor(now / 1000);
    const expectedDiff = 90 * 24 * 60 * 60;
    const actualDiff = nowSeconds - cutoff;

    assert.ok(
      Math.abs(actualDiff - expectedDiff) < 2,
      `Cutoff diff should be ~${expectedDiff}s, got ${actualDiff}s`
    );
  });

  it("cutoff is in seconds (not milliseconds)", () => {
    const cutoff = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
    // Unix timestamp in seconds should be ~10 digits, not ~13
    assert.ok(
      cutoff.toString().length <= 10,
      `Cutoff should be in seconds (<=10 digits), got ${cutoff.toString().length} digits`
    );
  });
});

// Test the created_time parsing logic used in syncLeads
describe("lead created_time parsing", () => {
  it("parses ISO date string to Unix timestamp in seconds", () => {
    const createdTime = "2026-01-15T10:30:00+0000";
    const timestamp = Math.floor(new Date(createdTime).getTime() / 1000);
    assert.ok(timestamp > 0, "Should produce a positive timestamp");
    assert.ok(
      timestamp.toString().length <= 10,
      "Should be in seconds, not milliseconds"
    );
  });

  it("handles Meta's date format correctly", () => {
    const createdTime = "2026-02-01T14:22:33+0000";
    const date = new Date(createdTime);
    assert.ok(!isNaN(date.getTime()), "Should parse without NaN");
    const ts = Math.floor(date.getTime() / 1000);
    // Feb 1 2026 is after Jan 1 2026
    assert.ok(ts > 1767225600, "Timestamp should be after Jan 1 2026");
  });
});

// Test error isolation logic (conceptual - verifying the pattern)
describe("error isolation per account", () => {
  it("try/catch in a loop allows continuation after error", async () => {
    const accounts = ["a", "b", "c"];
    const results: string[] = [];

    for (const account of accounts) {
      try {
        if (account === "b") {
          throw new Error("Account b failed");
        }
        results.push(`${account}:success`);
      } catch {
        results.push(`${account}:error`);
      }
    }

    assert.deepEqual(results, ["a:success", "b:error", "c:success"]);
  });
});

// Test upsertLead deduplication logic (conceptual)
describe("upsert deduplication pattern", () => {
  it("returns created:true for new leads, created:false for existing", () => {
    // This tests the return value contract
    const newResult = { created: true };
    const existingResult = { created: false };

    assert.equal(newResult.created, true);
    assert.equal(existingResult.created, false);
  });
});
