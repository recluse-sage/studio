import {
  isRegistryConfigError,
  type HeadlineNumber,
  type RegistryRecord,
} from "./registry-record";
import { APEX_SOURCE } from "./registry-adapter";

/* Pure view model for the registry rows. No fetch, no UI framework. The row
   components render these slots, and the unit tests assert them, so exact
   spec copy lives here in one place. */

export const REGISTRY_COPY = {
  noReport: "No report yet",
  downNotice: "Reporter down, showing last known",
  notEntered: "Not entered yet",
  unconnected: "Unconnected",
  configErrorTitle: "Registry misconfigured",
  configErrorBody:
    "The registry seed must ship five properties in fixed order. This card shows instead of an empty page.",
} as const;

export type RegistryHeadlineSlot =
  | { kind: "numbers"; items: [HeadlineNumber, HeadlineNumber] }
  | { kind: "pending" }
  | { kind: "unconnected"; label: string; reason: string }
  | { kind: "manual"; label: string };

export type RegistryRowView = {
  id: string;
  name: string;
  kind: string;
  lifecycle: RegistryRecord["lifecycle"];
  notes: string;
  dot: "up" | "down" | "unknown";
  lastReportLine: string;
  downNotice: string | null;
  servedAt: string | null;
  lastSuccessfulFetchAt: string | null;
  homeUrl: string | null;
  slots: RegistryHeadlineSlot[];
};

function headlineSlotsFor(record: RegistryRecord): RegistryHeadlineSlot[] {
  if (record.id === "forage") {
    return [
      {
        kind: "unconnected",
        label: "Requests",
        reason: "Cloudflare zone feed not connected",
      },
      {
        kind: "unconnected",
        label: "Tool runs",
        reason: "Metrics endpoint not connected",
      },
    ];
  }
  if (record.id === "upwork-catalog") {
    return [
      { kind: "manual", label: "Profile views" },
      { kind: "manual", label: "Invites" },
    ];
  }
  if (record.id === "designtaste-by-oasis" || record.id === "shopify-app") {
    return [];
  }
  if (record.headlines.length === 2) {
    return [{ kind: "numbers", items: record.headlines }];
  }
  return [{ kind: "pending" }];
}

function lastReportLineFor(record: RegistryRecord): string {
  if (record.lastReportAt === null) return REGISTRY_COPY.noReport;
  const parts = [`Last report ${record.lastReportAt}`];
  const source = record.sources[APEX_SOURCE];
  if (source?.freshness === "fresh" || source?.freshness === "stale") {
    parts.push(source.freshness);
  }
  if (
    record.lastSuccessfulFetchAt !== null &&
    record.lastSuccessfulFetchAt !== record.lastReportAt
  ) {
    parts.push(`Fetched ${record.lastSuccessfulFetchAt}`);
  }
  return parts.join(" · ");
}

function downNoticeFor(record: RegistryRecord): string | null {
  if (record.health !== "down") return null;
  if (record.sources[APEX_SOURCE]?.lastSuccessfulFetchAt == null) return null;
  return REGISTRY_COPY.downNotice;
}

/* One record in, one row view out. Dots-only skill and app rows keep empty
   slots by design, and their notes carry the no-live-surface and not-built
   hints. A null homeUrl means the row renders a dash. */
export function describeRegistryRow(record: RegistryRecord): RegistryRowView {
  return {
    id: record.id,
    name: record.name,
    kind: record.kind,
    lifecycle: record.lifecycle,
    notes: record.notes,
    dot: record.health,
    lastReportLine: lastReportLineFor(record),
    downNotice: downNoticeFor(record),
    servedAt: record.lastReportAt,
    lastSuccessfulFetchAt: record.lastSuccessfulFetchAt,
    homeUrl: record.homeUrl,
    slots: headlineSlotsFor(record),
  };
}

export type RegistryRowsView = {
  configError: boolean;
  rows: RegistryRowView[];
};

/* A zero-length input is a config error, not an empty page. The route renders
   the config error card when configError is true. */
export function describeRegistryRows(
  records: RegistryRecord[],
): RegistryRowsView {
  if (isRegistryConfigError(records)) return { configError: true, rows: [] };
  return { configError: false, rows: records.map(describeRegistryRow) };
}
