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

/* Reporter poll cadence per spec 2.1: 15 minutes. Fresh means the reporter
   claim is inside cadence of the fetch; stale means past cadence with the
   age shown via the two timestamps. */
export const APEX_POLL_CADENCE_MS = 15 * 60 * 1000;

function freshnessForReport(
  servedAt: string,
  fetchedAt: string,
): "fresh" | "stale" {
  const servedMs = Date.parse(servedAt);
  const fetchedMs = Date.parse(fetchedAt);
  if (!Number.isFinite(servedMs) || !Number.isFinite(fetchedMs)) return "fresh";
  return fetchedMs - servedMs <= APEX_POLL_CADENCE_MS ? "fresh" : "stale";
}

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
   marks the reporter source connected, and records served vs fetched times.
   fetchedAt is when this dashboard fetched the payload; null falls back to
   the reporter servedAt claim. Freshness is derived from the claim age
   against the 15-minute cadence, so a fresh fetch of an old servedAt
   renders stale with both times shown, per spec 3.8. Only count fields
   are copied; nothing else from the payload is kept. */
export function applyApexReportToRegistry(
  record: RegistryRecord,
  report: ApexReport,
  fetchedAt?: string | null,
): RegistryRecord {
  const fetched = fetchedAt ?? report.servedAt;
  const headlines: [HeadlineNumber, HeadlineNumber] = [
    apexBlogPostsHeadline(report.counts, report.servedAt),
    apexInboundHeadline(report.counts, report.servedAt),
  ];
  return {
    ...record,
    health: "up",
    lastReportAt: report.servedAt,
    lastSuccessfulFetchAt: fetched,
    sources: {
      ...record.sources,
      [APEX_SOURCE]: withSourceState(record.sources[APEX_SOURCE], {
        connectivity: "connected",
        freshness: freshnessForReport(report.servedAt, fetched),
        lastSuccessfulFetchAt: fetched,
        servedAt: report.servedAt,
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
  fetchedAt?: string | null,
): RegistryRecord | null {
  const report = parseApexReport(stripPiiFields(json));
  if (!report) return null;
  return applyApexReportToRegistry(record, report, fetchedAt);
}

/* Mark the apex row down after a failed fetch. Keeps last-known numbers and
   headlines. Down requires a prior success on the reporter source itself;
   without one the source stays unconnected and health stays as it was. */
export function markRegistryReportDown(
  record: RegistryRecord,
  reason: string,
): RegistryRecord {
  const hadPriorSuccess =
    record.sources[APEX_SOURCE]?.lastSuccessfulFetchAt != null;
  return {
    ...record,
    health: hadPriorSuccess ? "down" : record.health,
    sources: {
      ...record.sources,
      [APEX_SOURCE]: withSourceState(record.sources[APEX_SOURCE], {
        connectivity: "down",
        ...(hadPriorSuccess ? { freshness: "stale" as const } : {}),
        reason,
      }),
    },
  };
}
