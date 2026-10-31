import rawSeed from "./seed.json";

/* Static registry for spike 1. No fetching, no live data.
   Live reporters arrive in later phases and replace lastReport per property. */

export type PropertyStatus = "healthy" | "planned" | "unknown";

export type PropertyRecord = {
  id: string;
  name: string;
  kind: string;
  status: PropertyStatus;
  lastReport: string | null;
  links: { home: string | null };
  notes: string;
};

function isStatus(value: unknown): value is PropertyStatus {
  return value === "healthy" || value === "planned" || value === "unknown";
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
    links: { home: typeof links.home === "string" ? links.home : null },
    notes: typeof r.notes === "string" ? r.notes : "",
  };
}

const seed = Array.isArray(rawSeed) ? rawSeed : [];

export const PROPERTIES: PropertyRecord[] = seed.map(normalize);
