import { describe, expect, it } from "vitest";
import { buildRegistrySeed } from "../../src/features/admin/registry/registry-seed";
import { isRegistryConfigError } from "../../src/features/admin/registry/registry-record";
import {
  REGISTRY_COPY,
  describeRegistryRow,
  describeRegistryRows,
} from "../../src/features/admin/registry/registry-view";

describe("registry rows with per-field empty states", () => {
  it("renders seed-only rows with No report yet and no zero values", () => {
    const seed = buildRegistrySeed();
    const view = describeRegistryRows(seed);
    expect(view.configError).toBe(false);
    expect(view.rows.map((row) => row.id)).toEqual([
      "apex",
      "forage",
      "upwork-catalog",
      "designtaste-by-oasis",
      "shopify-app",
    ]);
    const apex = view.rows.find((row) => row.id === "apex")!;
    expect(apex.lastReportLine).toBe(REGISTRY_COPY.noReport);
    expect(apex.slots).toEqual([{ kind: "pending" }]);
    const serialized = JSON.stringify(view.rows);
    expect(serialized).toContain("No report yet");
    for (const row of view.rows) {
      for (const slot of row.slots) {
        if (slot.kind === "numbers") {
          for (const headline of slot.items) {
            expect(headline.value).not.toBe(0);
          }
        }
      }
    }
    expect(serialized).not.toMatch(/"value":0/);
  });

  it("shows dash for missing home link", () => {
    const seed = buildRegistrySeed();
    const byId = new Map(seed.map((row) => [row.id, describeRegistryRow(row)]));
    expect(byId.get("apex")?.homeUrl).toBe("https://selimabdulsalam.com");
    expect(byId.get("designtaste-by-oasis")?.homeUrl).toBeNull();
    expect(byId.get("upwork-catalog")?.homeUrl).toBeNull();
    expect(byId.get("shopify-app")?.homeUrl).toBeNull();
  });

  it("shows error card input for zero properties", () => {
    expect(describeRegistryRows([])).toEqual({ configError: true, rows: [] });
    expect(isRegistryConfigError([])).toBe(true);
  });

  it("keeps skill and app dots-only with empty headlines", () => {
    const seed = buildRegistrySeed();
    for (const id of ["designtaste-by-oasis", "shopify-app"]) {
      const record = seed.find((row) => row.id === id)!;
      expect(record.headlines).toEqual([]);
      const view = describeRegistryRow(record);
      expect(view.slots).toEqual([]);
      expect(view.dot).toBe("unknown");
      expect(view.lastReportLine).toBe(REGISTRY_COPY.noReport);
    }
  });
});
