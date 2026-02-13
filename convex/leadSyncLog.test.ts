import { describe, it } from "node:test";
import assert from "node:assert/strict";
import schema from "./schema.js";

describe("leadSyncLog schema", () => {
  const tables = schema.tables;

  it("should have leadSyncLog table defined", () => {
    assert.ok(tables.leadSyncLog != null, "leadSyncLog table should exist");
  });

  it("should have by_account index", () => {
    const indexes = tables.leadSyncLog.indexes;
    const byAccount = indexes.find(
      (i: { indexDescriptor: string }) => i.indexDescriptor === "by_account"
    );
    assert.ok(byAccount != null, "by_account index should exist");
  });

  it("should have by_status index", () => {
    const indexes = tables.leadSyncLog.indexes;
    const byStatus = indexes.find(
      (i: { indexDescriptor: string }) => i.indexDescriptor === "by_status"
    );
    assert.ok(byStatus != null, "by_status index should exist");
  });

  it("should have all required fields in validator", () => {
    const validator = JSON.stringify(tables.leadSyncLog.validator);
    const requiredFields = [
      "connectedAccountId",
      "status",
      "leadsFound",
      "leadsCreated",
      "error",
      "startedAt",
      "completedAt",
    ];
    for (const field of requiredFields) {
      assert.ok(
        validator.includes(field),
        `Field '${field}' should be in schema`
      );
    }
  });

  it("should have status as union of running/success/error", () => {
    const validator = JSON.stringify(tables.leadSyncLog.validator);
    assert.ok(validator.includes("running"), "status should include 'running'");
    assert.ok(validator.includes("success"), "status should include 'success'");
    assert.ok(validator.includes("error"), "status should include 'error'");
  });
});
