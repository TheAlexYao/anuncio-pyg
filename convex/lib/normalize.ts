export type NormalizedStatus = "active" | "paused" | "deleted";

/**
 * Convert cost in micros into local currency units.
 */
export function costMicrosToLocal(micros: number): number {
  return safeNumber(micros) / 1_000_000;
}

/**
 * Normalize arbitrary date inputs into YYYY-MM-DD.
 */
export function parseDate(input: string): string {
  const value = safeString(input).trim();
  if (!value) return "";

  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/);
  if (isoMatch) {
    return formatDateParts(
      safeNumber(isoMatch[1]),
      safeNumber(isoMatch[2]),
      safeNumber(isoMatch[3])
    );
  }

  const slashMatch = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    return formatDateParts(
      safeNumber(slashMatch[1]),
      safeNumber(slashMatch[2]),
      safeNumber(slashMatch[3])
    );
  }

  const compactMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    return formatDateParts(
      safeNumber(compactMatch[1]),
      safeNumber(compactMatch[2]),
      safeNumber(compactMatch[3])
    );
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10);
}

/**
 * Parse string/number timestamps into Unix milliseconds.
 */
export function parseTimestamp(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return 0;
    return normalizeEpoch(input);
  }

  const value = safeString(input).trim();
  if (!value) return 0;

  const numericLike = /^-?\d+(\.\d+)?$/.test(value);
  if (numericLike) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return normalizeEpoch(numeric);
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalize platform-specific ad statuses into a shared status enum.
 */
export function normalizeStatus(platform: string, status: string): NormalizedStatus {
  const platformKey = safeString(platform).trim().toLowerCase();
  const statusKey = safeString(status).trim().toUpperCase();

  const platformMap: Record<string, Record<string, NormalizedStatus>> = {
    meta: {
      ACTIVE: "active",
      PAUSED: "paused",
      DELETED: "deleted",
      ARCHIVED: "deleted",
    },
    google: {
      ENABLED: "active",
      PAUSED: "paused",
      REMOVED: "deleted",
    },
    tiktok: {
      STATUS_ENABLE: "active",
      STATUS_DISABLE: "paused",
      STATUS_DELETE: "deleted",
    },
  };

  const mapped = platformMap[platformKey]?.[statusKey];
  if (mapped) return mapped;

  const fallbackKey = statusKey.toLowerCase();
  if (
    fallbackKey.includes("delete") ||
    fallbackKey.includes("remove") ||
    fallbackKey.includes("archive")
  ) {
    return "deleted";
  }
  if (fallbackKey.includes("pause") || fallbackKey.includes("disable")) {
    return "paused";
  }
  if (fallbackKey.includes("active") || fallbackKey.includes("enable")) {
    return "active";
  }
  return "paused";
}

/**
 * Parse numbers defensively from unknown input.
 */
export function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : fallback;
  }
  if (typeof val === "bigint") {
    const numeric = Number(val);
    return Number.isFinite(numeric) ? numeric : fallback;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    const normalized = trimmed.replace(/,/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof val === "boolean") {
    return val ? 1 : 0;
  }
  return fallback;
}

/**
 * Parse strings defensively from unknown input.
 */
export function safeString(val: unknown, fallback = ""): string {
  if (typeof val === "string") return val;
  if (val === null || val === undefined) return fallback;
  if (typeof val === "number") {
    return Number.isFinite(val) ? String(val) : fallback;
  }
  if (typeof val === "bigint" || typeof val === "boolean") {
    return String(val);
  }
  return fallback;
}

function normalizeEpoch(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0) return 0;
  // seconds -> milliseconds
  if (abs < 1e11) return Math.trunc(value * 1000);
  // nanoseconds -> milliseconds
  if (abs >= 1e18) return Math.trunc(value / 1_000_000);
  // microseconds -> milliseconds
  if (abs >= 1e15) return Math.trunc(value / 1_000);
  // assume milliseconds
  return Math.trunc(value);
}

function formatDateParts(year: number, month: number, day: number): string {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return "";
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return "";
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
