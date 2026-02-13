import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildFormRequestUrl,
  buildFormRequestHeaders,
  parseFormResponse,
  TIKTOK_LEADGEN_FORM_URL,
  type TikTokFormResponse,
} from "./tiktokLeads";

describe("buildFormRequestUrl", () => {
  it("includes advertiser_id, page, page_size", () => {
    const url = buildFormRequestUrl("123456", 1, 20);
    assert.ok(url.startsWith(TIKTOK_LEADGEN_FORM_URL));
    assert.ok(url.includes("advertiser_id=123456"));
    assert.ok(url.includes("page=1"));
    assert.ok(url.includes("page_size=20"));
  });

  it("handles different page numbers", () => {
    const url = buildFormRequestUrl("999", 3, 10);
    assert.ok(url.includes("page=3"));
    assert.ok(url.includes("page_size=10"));
  });
});

describe("buildFormRequestHeaders", () => {
  it("sets Access-Token header", () => {
    const headers = buildFormRequestHeaders("my-token");
    assert.equal(headers["Access-Token"], "my-token");
  });

  it("sets Content-Type", () => {
    const headers = buildFormRequestHeaders("tok");
    assert.equal(headers["Content-Type"], "application/json");
  });
});

describe("parseFormResponse", () => {
  it("parses successful response with forms", () => {
    const body: TikTokFormResponse = {
      code: 0,
      message: "OK",
      data: {
        page_info: { total_number: 2, page: 1, page_size: 20, total_page: 1 },
        form_list: [
          { form_id: "f1", form_name: "Form One", campaign_id: "c1", adgroup_id: "ag1", ad_id: "a1" },
          { form_id: "f2", form_name: "Form Two" },
        ],
      },
    };
    const result = parseFormResponse(body);
    assert.equal(result.forms.length, 2);
    assert.equal(result.forms[0]!.formId, "f1");
    assert.equal(result.forms[0]!.formName, "Form One");
    assert.equal(result.forms[0]!.campaignId, "c1");
    assert.equal(result.forms[0]!.adgroupId, "ag1");
    assert.equal(result.forms[0]!.adId, "a1");
    assert.equal(result.forms[1]!.formId, "f2");
    assert.equal(result.forms[1]!.campaignId, undefined);
    assert.equal(result.totalPages, 1);
    assert.equal(result.currentPage, 1);
  });

  it("throws on error response", () => {
    const body: TikTokFormResponse = { code: 40001, message: "Invalid access token" };
    assert.throws(() => parseFormResponse(body), /Invalid access token.*40001/);
  });

  it("handles empty form list", () => {
    const body: TikTokFormResponse = {
      code: 0,
      message: "OK",
      data: {
        page_info: { total_number: 0, page: 1, page_size: 20, total_page: 1 },
        form_list: [],
      },
    };
    const result = parseFormResponse(body);
    assert.equal(result.forms.length, 0);
    assert.equal(result.totalPages, 1);
  });

  it("handles missing data gracefully", () => {
    const body: TikTokFormResponse = { code: 0, message: "OK" };
    const result = parseFormResponse(body);
    assert.equal(result.forms.length, 0);
    assert.equal(result.totalPages, 1);
  });

  it("returns correct pagination info for multi-page", () => {
    const body: TikTokFormResponse = {
      code: 0,
      message: "OK",
      data: {
        page_info: { total_number: 45, page: 2, page_size: 20, total_page: 3 },
        form_list: [],
      },
    };
    const result = parseFormResponse(body);
    assert.equal(result.totalPages, 3);
    assert.equal(result.currentPage, 2);
  });

  it("maps form fields correctly without optional fields", () => {
    const body: TikTokFormResponse = {
      code: 0,
      message: "OK",
      data: {
        page_info: { total_number: 1, page: 1, page_size: 20, total_page: 1 },
        form_list: [{ form_id: "f99", form_name: "Minimal Form" }],
      },
    };
    const result = parseFormResponse(body);
    const form = result.forms[0]!;
    assert.equal(form.formId, "f99");
    assert.equal(form.formName, "Minimal Form");
    assert.equal(form.campaignId, undefined);
    assert.equal(form.adgroupId, undefined);
    assert.equal(form.adId, undefined);
  });
});

describe("upsertLeadForm export", () => {
  it("is exported from tiktokLeadsMutations", async () => {
    const mod = await import("./tiktokLeadsMutations");
    assert.ok(mod.upsertLeadForm != null, "upsertLeadForm should be exported");
  });
});

describe("fetchLeadForms export", () => {
  it("is exported from tiktokLeads", async () => {
    const mod = await import("./tiktokLeads");
    assert.ok(mod.fetchLeadForms != null, "fetchLeadForms should be exported");
  });
});
