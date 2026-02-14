import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("convex/schema", () => {
  it("exports a default schema", async () => {
    const schema = await import("../convex/schema.js");
    assert.ok(schema.default, "schema should have a default export");
  });

  it("schema has users table", async () => {
    const schema = await import("../convex/schema.js");
    const tables = schema.default.tables;
    assert.ok(tables.users, "schema should have users table");
  });

  it("schema has user_auth table", async () => {
    const schema = await import("../convex/schema.js");
    const tables = schema.default.tables;
    assert.ok(tables.user_auth, "schema should have user_auth table");
  });

  it("schema has connected_accounts table", async () => {
    const schema = await import("../convex/schema.js");
    const tables = schema.default.tables;
    assert.ok(tables.connected_accounts, "schema should have connected_accounts table");
  });

  it("user_auth has tenant-scoped indexes", async () => {
    const schema = await import("../convex/schema.js");
    const userAuth = schema.default.tables.user_auth;
    const indexes = userAuth.indexes;
    const indexNames = indexes.map((idx: { indexDescriptor: string }) => idx.indexDescriptor);
    assert.ok(indexNames.includes("by_tenant"), "should have by_tenant index");
    assert.ok(indexNames.includes("by_tenant_platform"), "should have by_tenant_platform index");
    assert.ok(
      indexNames.includes("by_tenant_brand_platform"),
      "should have by_tenant_brand_platform index"
    );
  });

  it("connected_accounts has tenant and user_auth scoped indexes", async () => {
    const schema = await import("../convex/schema.js");
    const connAccounts = schema.default.tables.connected_accounts;
    const indexes = connAccounts.indexes;
    const indexNames = indexes.map((idx: { indexDescriptor: string }) => idx.indexDescriptor);
    assert.ok(indexNames.includes("by_user_auth"), "should have by_user_auth index");
    assert.ok(indexNames.includes("by_user_auth_platform"), "should have by_user_auth_platform index");
    assert.ok(indexNames.includes("by_tenant"), "should have by_tenant index");
    assert.ok(indexNames.includes("by_tenant_platform"), "should have by_tenant_platform index");
    assert.ok(indexNames.includes("by_platform_account"), "should have by_platform_account index");
  });
});
