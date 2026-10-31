import { describe, expect, it } from "vitest";
import { PROPERTIES } from "../../src/features/admin/registry/properties";
import {
  applyApexReport,
  isApexReport,
  markReportDown,
  parseApexReport,
} from "../../src/features/admin/registry/reporter";
import fixture from "../../src/features/admin/registry/apex-report.fixture.json";

// Spike 2: the adapter is the hub-side half of the reporter contract.
// Fixture must stay byte-identical in shape to what apex/workers/reporter emits.

describe("apex reporter adapter", () => {
  it("accepts the committed fixture", () => {
    expect(isApexReport(fixture)).toBe(true);
    expect(parseApexReport(fixture)?.property).toBe("apex");
  });

  it("rejects non-reports without throwing", () => {
    for (const bad of [
      null,
      [],
      {},
      { property: "apex" },
      { property: "forage", counts: {}, lastDeployHash: null, servedAt: "x" },
      { ...fixture, counts: { ...fixture.counts, blogPosts: "16" } },
      { ...fixture, servedAt: 123 },
    ]) {
      expect(parseApexReport(bad)).toBeNull();
    }
  });

  it("maps a report onto pulse fields, keeping the rest of the record", () => {
    const apex = PROPERTIES.find((r) => r.id === "apex");
    expect(apex).toBeDefined();
    const report = parseApexReport(fixture);
    expect(report).not.toBeNull();
    const next = applyApexReport(apex!, report!);
    expect(next.health).toBe("up");
    expect(next.lastReportAt).toBe(fixture.servedAt);
    expect(next.metrics).toEqual({
      berryBlastTotal: 0,
      contactNotes: 0,
      blogPosts: 16,
    });
    // Registry identity untouched.
    expect(next.id).toBe("apex");
    expect(next.status).toBe("healthy");
  });

  it("marks down without losing last-known metrics", () => {
    const apex = PROPERTIES.find((r) => r.id === "apex");
    const report = parseApexReport(fixture);
    const live = applyApexReport(apex!, report!);
    const down = markReportDown(live);
    expect(down.health).toBe("down");
    expect(down.metrics).toEqual(live.metrics);
    expect(down.lastReportAt).toBe(live.lastReportAt);
  });

  it("seed stays never-reported for every property", () => {
    for (const row of PROPERTIES) {
      expect(row.lastReportAt).toBeNull();
      expect(row.health).toBe("unknown");
      expect(row.metrics).toEqual({});
    }
    expect(PROPERTIES.find((r) => r.id === "shopify-app")?.status).toBe(
      "planned",
    );
  });
});
