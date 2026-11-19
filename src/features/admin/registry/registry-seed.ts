import rawSeed from "./seed.json";
import {
  normalizeRegistryRecord,
  type RegistryRecord,
  type SourceState,
} from "./registry-record";

/* Fixed registry order per spec 2.1. The seed file order is not the
   contract; this list is. Upwork catalog sorts before the skill row. */

export const REGISTRY_ORDER = [
  "apex",
  "forage",
  "upwork-catalog",
  "designtaste-by-oasis",
  "shopify-app",
] as const;

function unconnectedSource(): SourceState {
  return {
    connectivity: "unconnected",
    freshness: "unknown",
    lastSuccessfulFetchAt: null,
    lastReportAt: null,
    reason: null,
  };
}

/* Map the static seed into RegistryRecord identity rows. Phase 1 defaults:
   lifecycle live except shopify-app planned, all sources unconnected,
   headlines empty (apex headlines arrive only via the adapter step). */
export function buildRegistrySeed(): RegistryRecord[] {
  const raw = Array.isArray(rawSeed) ? rawSeed : [];
  const byId = new Map(
    raw.map((entry) => {
      const row = normalizeRegistryRecord(entry);
      return [row.id, row] as const;
    }),
  );
  return REGISTRY_ORDER.map((id) => {
    const row =
      byId.get(id) ??
      normalizeRegistryRecord({ id, name: id, kind: "unknown" });
    return {
      ...row,
      id,
      lifecycle: id === "shopify-app" ? "planned" : "live",
      sources: { reporter: unconnectedSource() },
      headlines: [],
    } as RegistryRecord;
  });
}

export const REGISTRY_SEED: RegistryRecord[] = buildRegistrySeed();
