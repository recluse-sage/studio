import { parseApexReport, type ApexReport } from "./reporter";
import {
  withSourceState,
  type HeadlineNumber,
  type RegistryRecord,
} from "./registry-record";

/* Phase 1 adapter for the apex row. Reuses parseApexReport without changing
   its wire shape. Builds lifetime headlines only from validated counts, so
   any extra payload field never reaches the view model. */

export const APEX_SOURCE = "reporter";

/* Field names that must never reach the registry view. Counts only, no PII.
   parseApexReport already drops unknown fields; this strips them explicitly
   so the counts-only rule holds even before validation. */
const PII_FIELD_NAMES = new Set(["email", "name", "phone", "message"]);

export function stripPiiFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!PII_FIELD_NAMES.has(key)) out[key] = entry;
  }
  return out;
}

export function apexBlogPostsHeadline(
  counts: Pick<ApexReport["counts"], "blogPosts">,
  servedAt: string,
): HeadlineNumber {
  return {
    label: "Blog posts",
    value: counts.blogPosts,
    window: "lifetime",
    updatedAt: servedAt,
    source: APEX_SOURCE,
    tooltip: null,
  };
}

export function apexInboundHeadline(
  counts: Pick<ApexReport["counts"], "contactNotes" | "berryBlastTotal">,
  servedAt: string,
): HeadlineNumber {
  const total = counts.contactNotes + counts.berryBlastTotal;
  return {
    label: "Inbound notes",
    value: total,
    window: "lifetime",
    updatedAt: servedAt,
    source: APEX_SOURCE,
    tooltip: `${counts.contactNotes} contact notes plus ${counts.berryBlastTotal} Berry Blast orders`,
  };
}

/* Apply a validated apex report to a registry row. Sets lifetime headlines,
   marks the reporter source connected, and records lastSuccessfulFetchAt.
   Only count fields are copied; nothing else from the payload is kept. */
export function applyApexReportToRegistry(
  record: RegistryRecord,
  report: ApexReport,
): RegistryRecord {
  const headlines: [HeadlineNumber, HeadlineNumber] = [
    apexBlogPostsHeadline(report.counts, report.servedAt),
    apexInboundHeadline(report.counts, report.servedAt),
  ];
  return {
    ...record,
    health: "up",
    lastReportAt: report.servedAt,
    lastSuccessfulFetchAt: report.servedAt,
    sources: {
      ...record.sources,
      [APEX_SOURCE]: withSourceState(record.sources[APEX_SOURCE], {
        connectivity: "connected",
        freshness: "fresh",
        lastSuccessfulFetchAt: report.servedAt,
        lastReportAt: report.servedAt,
        reason: null,
      }),
    },
    headlines,
    metrics: {
      berryBlastTotal: report.counts.berryBlastTotal,
      contactNotes: report.counts.contactNotes,
      blogPosts: report.counts.blogPosts,
    },
  };
}

/* Parse unknown JSON and apply it to a registry row. Returns null when the
   payload is not a valid apex report. Never throws. */
export function applyApexPayloadToRegistry(
  record: RegistryRecord,
  json: unknown,
): RegistryRecord | null {
  const report = parseApexReport(stripPiiFields(json));
  if (!report) return null;
  return applyApexReportToRegistry(record, report);
}

/* Mark the apex row down after a failed fetch. Keeps last-known numbers and
   headlines. Down requires a prior success; without one the source stays
   unconnected and health stays unknown. */
export function markRegistryReportDown(
  record: RegistryRecord,
  reason: string,
): RegistryRecord {
  const hadPriorSuccess = record.lastSuccessfulFetchAt !== null;
  return {
    ...record,
    health: hadPriorSuccess ? "down" : record.health,
    sources: {
      ...record.sources,
      [APEX_SOURCE]: withSourceState(record.sources[APEX_SOURCE], {
        connectivity: "down",
        freshness: "stale",
        reason,
      }),
    },
  };
}
