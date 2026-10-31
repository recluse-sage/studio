import type { PropertyMetrics, PropertyRecord } from "./properties";

/* Adapter: apex reporter payload -> PropertyRecord pulse fields.
   Single source of truth for the wire shape; the fixture JSON next to this
   file mirrors byte-for-byte what apex/workers/reporter returns.
   Pure + total: unknown JSON in, new record out. Never throws. */

export type ApexReportCounts = {
  berryBlastTotal: number;
  contactNotes: number;
  blogPosts: number;
};

/* EXACT shape emitted by apex/workers/reporter buildReport(). If the worker
   changes a key, update this type AND the fixture AND isApexReport together. */
export type ApexReport = {
  property: "apex";
  counts: ApexReportCounts;
  lastDeployHash: string | null;
  servedAt: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCounts(value: unknown): value is ApexReportCounts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as Record<string, unknown>;
  return (
    isFiniteNumber(c.berryBlastTotal) &&
    isFiniteNumber(c.contactNotes) &&
    isFiniteNumber(c.blogPosts)
  );
}

export function isApexReport(value: unknown): value is ApexReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    r.property === "apex" &&
    isCounts(r.counts) &&
    (typeof r.lastDeployHash === "string" || r.lastDeployHash === null) &&
    typeof r.servedAt === "string"
  );
}

/** Parse unknown JSON into a validated ApexReport, or null when it is not one. */
export function parseApexReport(json: unknown): ApexReport | null {
  return isApexReport(json) ? json : null;
}

/** Map a validated report onto a registry record's pulse fields. */
export function applyApexReport(
  record: PropertyRecord,
  report: ApexReport,
): PropertyRecord {
  const metrics: PropertyMetrics = {
    berryBlastTotal: report.counts.berryBlastTotal,
    contactNotes: report.counts.contactNotes,
    blogPosts: report.counts.blogPosts,
  };
  if (typeof report.lastDeployHash === "string" && report.lastDeployHash) {
    metrics.lastDeployHash = report.lastDeployHash;
  }
  return {
    ...record,
    lastReportAt: report.servedAt,
    health: "up",
    metrics,
  };
}

/** Mark a record down (fetch failed, bad signature, stale). Keeps last-known metrics. */
export function markReportDown(record: PropertyRecord): PropertyRecord {
  return { ...record, health: "down" };
}
