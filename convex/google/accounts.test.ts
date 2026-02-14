import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapGoogleAdsAccounts,
  mapGA4Properties,
  syncGoogleAccounts,
  buildGoogleAdsHeaders,
  parseAccessibleCustomersResponse,
  extractCustomerId,
  parseCustomerDetails,
  parseGA4AccountSummaries,
  fetchGoogleAdsAccounts,
  fetchGA4Properties,
} from "./accounts.ts";

describe("mapGoogleAdsAccounts", () => {
  it("maps accounts with accountType google_ads", () => {
    const result = mapGoogleAdsAccounts(
      "tenant123",
      "userAuth123",
      [
        { customerId: "111", name: "Acme Ads" },
        { customerId: "222", name: "Beta Ads" },
      ]
    );
    assert.equal(result.length, 2);
    assert.equal(result[0]!.accountType, "google_ads");
    assert.equal(result[1]!.accountType, "google_ads");
  });

  it("sets platform to google", () => {
    const result = mapGoogleAdsAccounts("tenant123", "userAuth123", [
      { customerId: "111", name: "Test" },
    ]);
    assert.equal(result[0]!.platform, "google");
  });

  it("sets syncEnabled to false", () => {
    const result = mapGoogleAdsAccounts("tenant123", "userAuth123", [
      { customerId: "111", name: "Test" },
    ]);
    assert.equal(result[0]!.syncEnabled, false);
  });

  it("uses customerId as platformAccountId", () => {
    const result = mapGoogleAdsAccounts("tenant123", "userAuth123", [
      { customerId: "999", name: "Test" },
    ]);
    assert.equal(result[0]!.platformAccountId, "999");
  });

  it("uses name as accountName", () => {
    const result = mapGoogleAdsAccounts("tenant123", "userAuth123", [
      { customerId: "111", name: "My Campaign" },
    ]);
    assert.equal(result[0]!.accountName, "My Campaign");
  });

  it("handles empty array", () => {
    const result = mapGoogleAdsAccounts("tenant123", "userAuth123", []);
    assert.equal(result.length, 0);
  });
});

describe("mapGA4Properties", () => {
  it("maps properties with accountType ga4", () => {
    const result = mapGA4Properties(
      "tenant123",
      "userAuth123",
      [{ propertyId: "123", displayName: "My Site", accountName: "Acme" }]
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]!.accountType, "ga4");
  });

  it("sets platform to google", () => {
    const result = mapGA4Properties("tenant123", "userAuth123", [
      { propertyId: "123", displayName: "Site", accountName: "Acme" },
    ]);
    assert.equal(result[0]!.platform, "google");
  });

  it("sets syncEnabled to false", () => {
    const result = mapGA4Properties("tenant123", "userAuth123", [
      { propertyId: "123", displayName: "Site", accountName: "Acme" },
    ]);
    assert.equal(result[0]!.syncEnabled, false);
  });

  it("uses propertyId as platformAccountId", () => {
    const result = mapGA4Properties("tenant123", "userAuth123", [
      { propertyId: "456", displayName: "Site", accountName: "Acme" },
    ]);
    assert.equal(result[0]!.platformAccountId, "456");
  });

  it("prefers displayName for accountName", () => {
    const result = mapGA4Properties("tenant123", "userAuth123", [
      { propertyId: "123", displayName: "My Site", accountName: "Acme" },
    ]);
    assert.equal(result[0]!.accountName, "My Site");
  });

  it("falls back to accountName when displayName is empty", () => {
    const result = mapGA4Properties("tenant123", "userAuth123", [
      { propertyId: "123", displayName: "", accountName: "Acme" },
    ]);
    assert.equal(result[0]!.accountName, "Acme");
  });

  it("handles empty array", () => {
    const result = mapGA4Properties("tenant123", "userAuth123", []);
    assert.equal(result.length, 0);
  });
});

describe("syncGoogleAccounts", () => {
  it("is exported as an action", () => {
    assert.ok(syncGoogleAccounts != null);
  });
});

describe("combined mapping", () => {
  it("produces correct combined records from both sources", () => {
    const ads = mapGoogleAdsAccounts("tenant1", "userAuth1", [
      { customerId: "a1", name: "Ad Account 1" },
    ]);
    const ga4 = mapGA4Properties("tenant1", "userAuth1", [
      { propertyId: "p1", displayName: "Property 1", accountName: "Acme" },
    ]);
    const all = [...ads, ...ga4];
    assert.equal(all.length, 2);
    assert.equal(all[0]!.accountType, "google_ads");
    assert.equal(all[1]!.accountType, "ga4");
    assert.equal(all[0]!.syncEnabled, false);
    assert.equal(all[1]!.syncEnabled, false);
    assert.equal(all[0]!.platform, "google");
    assert.equal(all[1]!.platform, "google");
  });

  it("all records have tenantId and userAuthId set", () => {
    const ads = mapGoogleAdsAccounts("tenantX", "userAuthX", [
      { customerId: "1", name: "A" },
    ]);
    const ga4 = mapGA4Properties("tenantX", "userAuthX", [
      { propertyId: "2", displayName: "B", accountName: "C" },
    ]);
    for (const r of [...ads, ...ga4]) {
      assert.equal(r.tenantId, "tenantX");
      assert.equal(r.userAuthId, "userAuthX");
    }
  });
});
