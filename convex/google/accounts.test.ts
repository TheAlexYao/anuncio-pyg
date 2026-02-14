import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGoogleAdsHeaders,
  parseAccessibleCustomersResponse,
  extractCustomerId,
  parseCustomerDetails,
} from "./accounts";

describe("buildGoogleAdsHeaders", () => {
  it("includes Authorization and developer-token", () => {
    const headers = buildGoogleAdsHeaders("tok123", "dev456");
    assert.equal(headers["Authorization"], "Bearer tok123");
    assert.equal(headers["developer-token"], "dev456");
    assert.equal(headers["Content-Type"], "application/json");
  });

  it("includes login-customer-id when provided", () => {
    const headers = buildGoogleAdsHeaders("tok", "dev", "manager123");
    assert.equal(headers["login-customer-id"], "manager123");
  });

  it("omits login-customer-id when not provided", () => {
    const headers = buildGoogleAdsHeaders("tok", "dev");
    assert.equal(headers["login-customer-id"], undefined);
  });
});

describe("parseAccessibleCustomersResponse", () => {
  it("returns resource names from valid response", () => {
    const result = parseAccessibleCustomersResponse({
      resourceNames: ["customers/111", "customers/222"],
    });
    assert.deepEqual(result, ["customers/111", "customers/222"]);
  });

  it("returns empty array for missing resourceNames", () => {
    assert.deepEqual(parseAccessibleCustomersResponse({}), []);
  });

  it("returns empty array for null input", () => {
    assert.deepEqual(parseAccessibleCustomersResponse(null), []);
  });

  it("returns empty array for non-array resourceNames", () => {
    assert.deepEqual(parseAccessibleCustomersResponse({ resourceNames: "bad" }), []);
  });
});

describe("extractCustomerId", () => {
  it("extracts ID from resource name", () => {
    assert.equal(extractCustomerId("customers/1234567890"), "1234567890");
  });

  it("handles plain string gracefully", () => {
    assert.equal(extractCustomerId("noslash"), "noslash");
  });
});

describe("parseCustomerDetails", () => {
  it("parses customer with descriptiveName", () => {
    const result = parseCustomerDetails({ id: "123", descriptiveName: "My Account" });
    assert.deepEqual(result, { customerId: "123", name: "My Account" });
  });

  it("handles missing descriptiveName", () => {
    const result = parseCustomerDetails({ id: "123" });
    assert.deepEqual(result, { customerId: "123", name: "" });
  });

  it("handles numeric id", () => {
    const result = parseCustomerDetails({ id: 456, descriptiveName: "Test" });
    assert.deepEqual(result, { customerId: "456", name: "Test" });
  });

  it("returns null for null input", () => {
    assert.equal(parseCustomerDetails(null), null);
  });

  it("returns null for non-object input", () => {
    assert.equal(parseCustomerDetails("string"), null);
  });
});

describe("fetchGoogleAdsAccounts export", () => {
  it("is exported as an object", async () => {
    const mod = await import("./accounts.js");
    assert.ok(mod.fetchGoogleAdsAccounts != null, "fetchGoogleAdsAccounts should be exported");
  });
});
