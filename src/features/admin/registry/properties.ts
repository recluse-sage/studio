import rawSeed from "./seed.json";

/* Static registry for spike 1. No fetching, no live data.
   Live reporters arrive in later phases and replace lastReport per property. */

export type PropertyStatus = "healthy" | "planned" | "unknown";

/* Live pulse fields (spike 2). Populated by reporter adapters; absent until
   a property's first signed report lands. Never gate rendering on them. */
export type PropertyHealth = "up" | "down" | "unknown";

export type PropertyMetrics = Record<string, number | string>;

export type PropertyRecord = {
  id: string;
  name: string;
  kind: string;
  status: PropertyStatus;
  lastReport: string | null;
  lastReportAt: string | null;
  health: PropertyHealth;
  metrics: PropertyMetrics;
  links: { home: string | null };
  notes: string;
};

function isStatus(value: unknown): value is PropertyStatus {
  return value === "healthy" || value === "planned" || value === "unknown";
}

function isHealth(value: unknown): value is PropertyHealth {
  return value === "up" || value === "down" || value === "unknown";
}

function normalizeMetrics(value: unknown): PropertyMetrics {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: PropertyMetrics = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "number" && Number.isFinite(entry)) out[key] = entry;
    else if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

function normalize(entry: unknown): PropertyRecord {
  const r = (entry ?? {}) as Record<string, unknown>;
  const links = (r.links ?? {}) as Record<string, unknown>;
  const status = isStatus(r.status) ? r.status : "unknown";
  return {
    id: typeof r.id === "string" ? r.id : "",
    name: typeof r.name === "string" ? r.name : "",
    kind: typeof r.kind === "string" ? r.kind : "",
    status,
    lastReport: typeof r.lastReport === "string" ? r.lastReport : null,
    lastReportAt: typeof r.lastReportAt === "string" ? r.lastReportAt : null,
    health: isHealth(r.health) ? r.health : "unknown",
    metrics: normalizeMetrics(r.metrics),
    links: { home: typeof links.home === "string" ? links.home : null },
    notes: typeof r.notes === "string" ? r.notes : "",
  };
}

const seed = Array.isArray(rawSeed) ? rawSeed : [];

export const PROPERTIES: PropertyRecord[] = seed.map(normalize);
