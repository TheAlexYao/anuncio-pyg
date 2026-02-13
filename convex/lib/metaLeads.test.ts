import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getPages,
  getLeadForms,
  getLeadsByForm,
  META_GRAPH_BASE,
  type MetaPage,
  type MetaLeadForm,
  type MetaLead,
} from "./metaLeads.ts";

// Mock fetch
let fetchCalls: Array<{ url: string }> = [];
let mockResponse: { ok: boolean; json: () => Promise<unknown> };

const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchCalls = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString();
    fetchCalls.push({ url });
    return mockResponse;
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockSuccess(data: unknown) {
  mockResponse = { ok: true, json: async () => ({ data }) };
}

function mockError(code: number, message: string) {
  mockResponse = {
    ok: false,
    json: async () => ({ error: { message, type: "OAuthException", code } }),
  };
}

describe("getPages", () => {
  it("calls correct endpoint", async () => {
    mockSuccess([{ id: "123", name: "My Page" }]);
    await getPages("tok");
    assert.equal(fetchCalls.length, 1);
    assert.ok(fetchCalls[0]!.url.includes(`${META_GRAPH_BASE}/me/accounts`));
    assert.ok(fetchCalls[0]!.url.includes("fields=id,name"));
  });

  it("includes access token", async () => {
    mockSuccess([]);
    await getPages("my-token");
    assert.ok(fetchCalls[0]!.url.includes("access_token=my-token"));
  });

  it("returns page data", async () => {
    const pages: MetaPage[] = [
      { id: "111", name: "Page A" },
      { id: "222", name: "Page B" },
    ];
    mockSuccess(pages);
    const result = await getPages("tok");
    assert.deepEqual(result, pages);
  });

  it("throws on Meta API error", async () => {
    mockError(190, "Invalid token");
    await assert.rejects(() => getPages("bad"), /Meta API error \(190\): Invalid token/);
  });
});

describe("getLeadForms", () => {
  it("calls correct endpoint with pageId", async () => {
    mockSuccess([]);
    await getLeadForms("tok", "page123");
    assert.ok(fetchCalls[0]!.url.includes(`${META_GRAPH_BASE}/page123/leadgen_forms`));
    assert.ok(fetchCalls[0]!.url.includes("fields=id,name,status"));
  });

  it("returns form data", async () => {
    const forms: MetaLeadForm[] = [
      { id: "f1", name: "Form 1", status: "ACTIVE" },
    ];
    mockSuccess(forms);
    const result = await getLeadForms("tok", "p1");
    assert.deepEqual(result, forms);
  });

  it("throws on error", async () => {
    mockError(100, "Unsupported get request");
    await assert.rejects(() => getLeadForms("tok", "bad"), /Meta API error/);
  });
});

describe("getLeadsByForm", () => {
  it("calls correct endpoint with formId", async () => {
    mockSuccess([]);
    await getLeadsByForm("tok", "form456");
    assert.ok(fetchCalls[0]!.url.includes(`${META_GRAPH_BASE}/form456/leads`));
    assert.ok(fetchCalls[0]!.url.includes("fields=id,created_time,field_data"));
  });

  it("includes since filter when provided", async () => {
    mockSuccess([]);
    await getLeadsByForm("tok", "form1", 1700000000);
    assert.ok(fetchCalls[0]!.url.includes("filtering="));
    assert.ok(fetchCalls[0]!.url.includes("1700000000"));
  });

  it("omits since filter when not provided", async () => {
    mockSuccess([]);
    await getLeadsByForm("tok", "form1");
    assert.ok(!fetchCalls[0]!.url.includes("filtering"));
  });

  it("returns lead data", async () => {
    const leads: MetaLead[] = [
      {
        id: "lead1",
        created_time: "2026-01-01T00:00:00+0000",
        field_data: [{ name: "email", values: ["test@test.com"] }],
      },
    ];
    mockSuccess(leads);
    const result = await getLeadsByForm("tok", "f1");
    assert.deepEqual(result, leads);
  });

  it("throws on error", async () => {
    mockError(2, "Service temporarily unavailable");
    await assert.rejects(() => getLeadsByForm("tok", "f1"), /Meta API error \(2\)/);
  });
});

describe("HTTP error without Meta error body", () => {
  it("throws generic error when response is not Meta error format", async () => {
    mockResponse = { ok: false, json: async () => ({ some: "other" }) };
    await assert.rejects(() => getPages("tok"), /Meta API request failed with status/);
  });
});

describe("module exports", () => {
  it("exports all expected functions and types", async () => {
    const mod = await import("./metaLeads.ts");
    assert.ok(typeof mod.getPages === "function");
    assert.ok(typeof mod.getLeadForms === "function");
    assert.ok(typeof mod.getLeadsByForm === "function");
    assert.ok(typeof mod.META_GRAPH_BASE === "string");
  });
});
