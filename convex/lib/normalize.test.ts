import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  costMicrosToLocal,
  normalizeStatus,
  parseDate,
  parseTimestamp,
  safeNumber,
  safeString,
} from "./normalize.ts";

describe("costMicrosToLocal", () => {
  it("converts micros to local currency units", () => {
    assert.equal(costMicrosToLocal(2_500_000), 2.5);
  });
});

describe("parseDate", () => {
  it("keeps canonical YYYY-MM-DD values", () => {
    assert.equal(parseDate("2026-02-14"), "2026-02-14");
  });

  it("normalizes ISO timestamps", () => {
    assert.equal(parseDate("2026-02-14T10:22:33Z"), "2026-02-14");
  });

  it("normalizes slash and compact formats", () => {
    assert.equal(parseDate("2026/2/3"), "2026-02-03");
    assert.equal(parseDate("20260203"), "2026-02-03");
  });

  it("returns empty string for invalid dates", () => {
    assert.equal(parseDate("not-a-date"), "");
    assert.equal(parseDate("2026-02-31"), "");
  });
});

describe("parseTimestamp", () => {
  it("parses seconds into milliseconds", () => {
    assert.equal(parseTimestamp(1_700_000_000), 1_700_000_000_000);
  });

  it("preserves millisecond epoch values", () => {
    assert.equal(parseTimestamp(1_700_000_000_123), 1_700_000_000_123);
  });

  it("parses ISO strings", () => {
    assert.equal(parseTimestamp("2026-02-14T00:00:00Z"), Date.parse("2026-02-14T00:00:00Z"));
  });

  it("returns 0 for invalid values", () => {
    assert.equal(parseTimestamp("invalid"), 0);
  });
});

describe("normalizeStatus", () => {
  it("maps Meta statuses", () => {
    assert.equal(normalizeStatus("meta", "ACTIVE"), "active");
    assert.equal(normalizeStatus("meta", "PAUSED"), "paused");
    assert.equal(normalizeStatus("meta", "ARCHIVED"), "deleted");
  });

  it("maps Google and TikTok statuses", () => {
    assert.equal(normalizeStatus("google", "ENABLED"), "active");
    assert.equal(normalizeStatus("google", "REMOVED"), "deleted");
    assert.equal(normalizeStatus("tiktok", "STATUS_DISABLE"), "paused");
  });

  it("falls back by keyword matching", () => {
    assert.equal(normalizeStatus("unknown", "disable_now"), "paused");
    assert.equal(normalizeStatus("unknown", "is_deleted"), "deleted");
    assert.equal(normalizeStatus("unknown", "active_state"), "active");
  });
});

describe("safeNumber", () => {
  it("parses numbers from strings and primitives", () => {
    assert.equal(safeNumber("1,234.56"), 1234.56);
    assert.equal(safeNumber(true), 1);
  });

  it("returns fallback for invalid values", () => {
    assert.equal(safeNumber("oops", 9), 9);
    assert.equal(safeNumber(undefined, 3), 3);
  });
});

describe("safeString", () => {
  it("parses strings from primitives", () => {
    assert.equal(safeString(42), "42");
    assert.equal(safeString(false), "false");
  });

  it("returns fallback for non-stringable objects", () => {
    assert.equal(safeString({ a: 1 }, "fallback"), "fallback");
    assert.equal(safeString(undefined, "fallback"), "fallback");
  });
});
