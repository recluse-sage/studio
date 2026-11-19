/* RegistryRecord types per spec 3.1 plus 3.8. Pure types plus guards
   plus normalize. Never throws on unknown input. No fetch, no UI. */

export type PropertyLifecycle = "planned" | "live" | "retired";

export type PropertyStatus = "healthy" | "planned" | "unknown";

export type PropertyHealth = "up" | "down" | "unknown";

export type SourceConnectivity = "connected" | "down" | "unconnected";

export type SourceFreshness = "fresh" | "stale" | "never";

export type SourceState = {
  connectivity: SourceConnectivity;
  freshness: SourceFreshness;
  lastSuccessfulFetchAt: string | null;
  servedAt: string | null;
  reason: string | null;
};

export type HeadlineSource =
  | "reporter"
  | "cloudflare"
  | "manual"
  | "repo"
  | "metrics-endpoint"
  | "none";

export type HeadlineNumber = {
  label: string;
  value: number | null;
  window: string | null;
  updatedAt: string | null;
  source: HeadlineSource;
  tooltip: string | null;
};

export type RegistryRecord = {
  id: string;
  name: string;
  kind: string;
  lifecycle: PropertyLifecycle;
  status: PropertyStatus;
  health: PropertyHealth;
  sources: Record<string, SourceState>;
  lastReportAt: string | null;
  lastSuccessfulFetchAt: string | null;
  measuredAt: string | null;
  headlines: [HeadlineNumber, HeadlineNumber] | [];
  homeUrl: string | null;
  notes: string;
  metrics: Record<string, number | string>;
};

/* Same allowed values as properties.ts guards. Kept in sync by review. */

function isLifecycle(value: unknown): value is PropertyLifecycle {
  return value === "planned" || value === "live" || value === "retired";
}

function isStatus(value: unknown): value is PropertyStatus {
  return value === "healthy" || value === "planned" || value === "unknown";
}

function isHealth(value: unknown): value is PropertyHealth {
  return value === "up" || value === "down" || value === "unknown";
}

function isConnectivity(value: unknown): value is SourceConnectivity {
  return (
    value === "connected" || value === "down" || value === "unconnected"
  );
}

function isFreshness(value: unknown): value is SourceFreshness {
  return value === "fresh" || value === "stale" || value === "never";
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeMetrics(value: unknown): Record<string, number | string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number | string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "number" && Number.isFinite(entry)) out[key] = entry;
    else if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

function normalizeSourceState(value: unknown): SourceState {
  const r = (
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  ) as Record<string, unknown>;
  return {
    connectivity: isConnectivity(r.connectivity)
      ? r.connectivity
      : "unconnected",
    freshness: isFreshness(r.freshness) ? r.freshness : "never",
    lastSuccessfulFetchAt: asStringOrNull(r.lastSuccessfulFetchAt),
    servedAt: asStringOrNull(r.servedAt),
    reason: asStringOrNull(r.reason),
  };
}

function normalizeSources(value: unknown): Record<string, SourceState> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, SourceState> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = normalizeSourceState(entry);
  }
  return out;
}

const HEADLINE_SOURCES: readonly HeadlineSource[] = [
  "reporter",
  "cloudflare",
  "manual",
  "repo",
  "metrics-endpoint",
  "none",
];

function isHeadlineSource(value: unknown): value is HeadlineSource {
  return HEADLINE_SOURCES.includes(value as HeadlineSource);
}

function isHeadlineNumber(value: unknown): value is HeadlineNumber {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.label === "string" &&
    ((typeof r.value === "number" && Number.isFinite(r.value)) ||
      r.value === null) &&
    (typeof r.window === "string" || r.window === null) &&
    (typeof r.updatedAt === "string" || r.updatedAt === null) &&
    isHeadlineSource(r.source) &&
    (typeof r.tooltip === "string" || r.tooltip === null || r.tooltip === undefined)
  );
}

function normalizeHeadlines(
  value: unknown,
): [HeadlineNumber, HeadlineNumber] | [] {
  if (!Array.isArray(value)) return [];
  const kept = value.filter(isHeadlineNumber);
  if (kept.length < 2) return [];
  const [a, b] = kept;
  return [
    {
      label: a.label,
      value: a.value,
      window: a.window,
      updatedAt: a.updatedAt,
      source: a.source,
      tooltip: a.tooltip ?? null,
    },
    {
      label: b.label,
      value: b.value,
      window: b.window,
      updatedAt: b.updatedAt,
      source: b.source,
      tooltip: b.tooltip ?? null,
    },
  ];
}

function readHomeUrl(r: Record<string, unknown>): string | null {
  if (typeof r.homeUrl === "string") return r.homeUrl;
  const links = r.links;
  if (links && typeof links === "object" && !Array.isArray(links)) {
    const home = (links as Record<string, unknown>).home;
    if (typeof home === "string") return home;
  }
  return null;
}

/* Normalize unknown JSON into a RegistryRecord. Never throws. Unknown
   status and health fall back to unknown. Dots-only rows keep []. */
export function normalizeRegistryRecord(entry: unknown): RegistryRecord {
  const r = (
    entry && typeof entry === "object" && !Array.isArray(entry)
      ? (entry as Record<string, unknown>)
      : {}
  ) as Record<string, unknown>;
  const status = isStatus(r.status) ? r.status : "unknown";
  let lifecycle: PropertyLifecycle;
  if (isLifecycle(r.lifecycle)) {
    lifecycle = r.lifecycle;
  } else if (status === "planned") {
    lifecycle = "planned";
  } else {
    lifecycle = "live";
  }
  return {
    id: typeof r.id === "string" ? r.id : "",
    name: typeof r.name === "string" ? r.name : "",
    kind: typeof r.kind === "string" ? r.kind : "",
    lifecycle,
    status,
    health: isHealth(r.health) ? r.health : "unknown",
    sources: normalizeSources(r.sources),
    lastReportAt: asStringOrNull(r.lastReportAt ?? r.lastReport),
    lastSuccessfulFetchAt: asStringOrNull(r.lastSuccessfulFetchAt),
    measuredAt: asStringOrNull(r.measuredAt),
    headlines: normalizeHeadlines(r.headlines),
    homeUrl: readHomeUrl(r),
    notes: typeof r.notes === "string" ? r.notes : "",
    metrics: normalizeMetrics(r.metrics),
  };
}

/* Normalize a list input into RegistryRecord rows. Never throws. An empty
   result means the seed config is missing and the view must render the
   config error card instead of an empty page. */
export function normalizeRegistryRows(input: unknown): RegistryRecord[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeRegistryRecord);
}

/* True when the registry input carries zero properties. The view treats
   this as a config error, not as an empty page. */
export function isRegistryConfigError(rows: unknown): boolean {
  return !Array.isArray(rows) || rows.length === 0;
}

export function isRegistryRecord(value: unknown): value is RegistryRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const n = normalizeRegistryRecord(value);
    const r = value as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.name !== "string") return false;
    if (typeof r.kind !== "string") return false;
    if (n.headlines.length !== 0 && n.headlines.length !== 2) return false;
    for (const headline of n.headlines) {
      if (!isHeadlineNumber(headline)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/* Transition helper for connected vs down vs unconnected. Down requires a
   prior success timestamp, otherwise the source stays unconnected. This is
   the exact down vs unconnected discriminator: unconnected means never
   connected with null lastSuccessfulFetchAt. */
export function withSourceState(
  prev: SourceState | null | undefined,
  patch: Partial<SourceState> & { connectivity: SourceConnectivity },
): SourceState {
  const base: SourceState =
    prev ?? {
      connectivity: "unconnected",
      freshness: "never",
      lastSuccessfulFetchAt: null,
      servedAt: null,
      reason: null,
    };
  const merged: SourceState = {
    connectivity: patch.connectivity,
    freshness: patch.freshness ?? base.freshness,
    lastSuccessfulFetchAt:
      patch.lastSuccessfulFetchAt !== undefined
        ? patch.lastSuccessfulFetchAt
        : base.lastSuccessfulFetchAt,
    servedAt: patch.servedAt !== undefined ? patch.servedAt : base.servedAt,
    reason: patch.reason !== undefined ? patch.reason : base.reason,
  };
  if (merged.connectivity === "down" && merged.lastSuccessfulFetchAt === null) {
    merged.connectivity = "unconnected";
  }
  return merged;
}
