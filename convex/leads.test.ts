import { describe, it } from "node:test";
import assert from "node:assert/strict";
import schema from "./schema.ts";

const leadsTable = schema.tables.leads;

describe("leads table schema", () => {
  it("leads table exists in schema", () => {
    assert.ok(leadsTable != null, "leads table should exist");
  });

  it("has by_platform_lead index for deduplication", () => {
    const indexes = leadsTable.indexes;
    const idx = indexes.find((i: any) => i.indexDescriptor === "by_platform_lead");
    assert.ok(idx != null, "by_platform_lead index should exist");
  });

  it("has by_user index", () => {
    const indexes = leadsTable.indexes;
    const idx = indexes.find((i: any) => i.indexDescriptor === "by_user");
    assert.ok(idx != null, "by_user index should exist");
  });

  it("has by_user_form index", () => {
    const indexes = leadsTable.indexes;
    const idx = indexes.find((i: any) => i.indexDescriptor === "by_user_form");
    assert.ok(idx != null, "by_user_form index should exist");
  });

  it("has by_synced_at index", () => {
    const indexes = leadsTable.indexes;
    const idx = indexes.find((i: any) => i.indexDescriptor === "by_synced_at");
    assert.ok(idx != null, "by_synced_at index should exist");
  });

  it("has all 4 indexes", () => {
    assert.equal(leadsTable.indexes.length, 4);
  });

  it("schema exports leads alongside other tables", () => {
    assert.ok(schema.tables.connectedAccounts != null);
    assert.ok(schema.tables.campaigns_daily != null);
    assert.ok(schema.tables.leads != null);
  });
});
