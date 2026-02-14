import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseGA4AccountSummaries } from "./accounts";

describe("parseGA4AccountSummaries", () => {
  it("parses a typical response with multiple accounts and properties", () => {
    const data = {
      accountSummaries: [
        {
          displayName: "Acme Corp",
          propertySummaries: [
            { property: "properties/111", displayName: "Main Site" },
            { property: "properties/222", displayName: "Blog" },
          ],
        },
        {
          displayName: "Beta Inc",
          propertySummaries: [
            { property: "properties/333", displayName: "App" },
          ],
        },
      ],
    };
    const result = parseGA4AccountSummaries(data);
    assert.deepEqual(result, [
      { propertyId: "111", displayName: "Main Site", accountName: "Acme Corp" },
      { propertyId: "222", displayName: "Blog", accountName: "Acme Corp" },
      { propertyId: "333", displayName: "App", accountName: "Beta Inc" },
    ]);
  });

  it("returns empty array for null input", () => {
    assert.deepEqual(parseGA4AccountSummaries(null), []);
  });

  it("returns empty array for empty object", () => {
    assert.deepEqual(parseGA4AccountSummaries({}), []);
  });

  it("returns empty array when accountSummaries is not an array", () => {
    assert.deepEqual(parseGA4AccountSummaries({ accountSummaries: "bad" }), []);
  });

  it("skips accounts with no propertySummaries", () => {
    const data = {
      accountSummaries: [{ displayName: "Empty Account" }],
    };
    assert.deepEqual(parseGA4AccountSummaries(data), []);
  });

  it("handles missing displayName on account", () => {
    const data = {
      accountSummaries: [
        {
          propertySummaries: [
            { property: "properties/999", displayName: "Site" },
          ],
        },
      ],
    };
    const result = parseGA4AccountSummaries(data);
    assert.deepEqual(result, [
      { propertyId: "999", displayName: "Site", accountName: "" },
    ]);
  });

  it("handles missing displayName on property", () => {
    const data = {
      accountSummaries: [
        {
          displayName: "Acme",
          propertySummaries: [{ property: "properties/100" }],
        },
      ],
    };
    const result = parseGA4AccountSummaries(data);
    assert.deepEqual(result, [
      { propertyId: "100", displayName: "", accountName: "Acme" },
    ]);
  });

  it("handles property without slash", () => {
    const data = {
      accountSummaries: [
        {
          displayName: "Test",
          propertySummaries: [{ property: "noslash", displayName: "X" }],
        },
      ],
    };
    const result = parseGA4AccountSummaries(data);
    assert.deepEqual(result, [
      { propertyId: "noslash", displayName: "X", accountName: "Test" },
    ]);
  });

  it("skips null entries in accountSummaries", () => {
    const data = { accountSummaries: [null, { displayName: "OK", propertySummaries: [{ property: "properties/1", displayName: "P" }] }] };
    assert.deepEqual(parseGA4AccountSummaries(data), [
      { propertyId: "1", displayName: "P", accountName: "OK" },
    ]);
  });

  it("skips null entries in propertySummaries", () => {
    const data = {
      accountSummaries: [
        { displayName: "A", propertySummaries: [null, { property: "properties/5", displayName: "Q" }] },
      ],
    };
    assert.deepEqual(parseGA4AccountSummaries(data), [
      { propertyId: "5", displayName: "Q", accountName: "A" },
    ]);
  });
});

describe("fetchGA4Properties export", () => {
  it("is exported from accounts module", async () => {
    const mod = await import("./accounts.js");
    assert.ok(mod.fetchGA4Properties != null, "fetchGA4Properties should be exported");
  });
});
