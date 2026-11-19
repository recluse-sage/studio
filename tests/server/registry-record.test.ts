import { describe, expect, it } from "vitest";
import {
  isRegistryConfigError,
  isRegistryRecord,
  normalizeRegistryRecord,
  normalizeRegistryRows,
  withSourceState,
} from "../../src/features/admin/registry/registry-record";

describe("registry record normalize", () => {
  it("accepts a full registry record with two lifetime headlines", () => {
    const next = normalizeRegistryRecord({
      id: "apex",
      name: "Apex",
      kind: "marketing site",
      lifecycle: "live",
      status: "healthy",
      health: "up",
      sources: {
        reporter: {
          connectivity: "connected",
          freshness: "fresh",
          lastSuccessfulFetchAt: "2026-10-31T21:03:32.584Z",
          lastReportAt: "2026-10-31T21:03:32.584Z",
          reason: null,
        },
      },
      lastReportAt: "2026-10-31T21:03:32.584Z",
      lastSuccessfulFetchAt: "2026-10-31T21:03:32.584Z",
      measuredAt: null,
      headlines: [
        {
          label: "Blog posts",
          value: 16,
          window: "lifetime",
          updatedAt: "2026-10-31T21:03:32.584Z",
          source: "reporter",
          tooltip: null,
        },
        {
          label: "Inbound notes",
          value: 3,
          window: "lifetime",
          updatedAt: "2026-10-31T21:03:32.584Z",
          source: "reporter",
          tooltip: "2 contact notes plus 1 Berry Blast order",
        },
      ],
      homeUrl: "https://selimabdulsalam.com",
      notes: "Marketing site plus checkout.",
      metrics: { blogPosts: 16 },
    });
    expect(isRegistryRecord(next)).toBe(true);
    expect(next.headlines).toHaveLength(2);
    expect(next.headlines[0]?.window).toBe("lifetime");
    expect(next.headlines[1]?.value).toBe(3);
    expect(next.homeUrl).toBe("https://selimabdulsalam.com");
    expect(next.sources["reporter"]?.connectivity).toBe("connected");
  });

  it("defaults unknown status and health to unknown without throwing", () => {
    let next;
    expect(() => {
      next = normalizeRegistryRecord({
        id: "apex",
        name: "Apex",
        kind: "marketing site",
        status: "bogus",
        health: "weird",
      });
    }).not.toThrow();
    expect(next!.status).toBe("unknown");
    expect(next!.health).toBe("unknown");
  });

  it("drops non-finite metrics and keeps strings", () => {
    const next = normalizeRegistryRecord({
      id: "apex",
      name: "Apex",
      kind: "marketing site",
      metrics: {
        blogPosts: 16,
        broken: Number.NaN,
        huge: Number.POSITIVE_INFINITY,
        label: "sixteen",
        count: 42,
      },
    });
    expect(next.metrics).toEqual({ blogPosts: 16, label: "sixteen", count: 42 });
  });

  it("maps missing home to null homeUrl", () => {
    expect(
      normalizeRegistryRecord({ id: "a", name: "A", kind: "skill" }).homeUrl,
    ).toBeNull();
    expect(
      normalizeRegistryRecord({
        id: "a",
        name: "A",
        kind: "skill",
        links: { home: null },
      }).homeUrl,
    ).toBeNull();
    expect(
      normalizeRegistryRecord({
        id: "a",
        name: "A",
        kind: "skill",
        links: { home: "https://example.com" },
      }).homeUrl,
    ).toBe("https://example.com");
  });

  it("keeps empty headlines array for dots-only skill and app", () => {
    const skill = normalizeRegistryRecord({
      id: "designtaste-by-oasis",
      name: "designtaste by Oasis",
      kind: "skill",
    });
    expect(skill.headlines).toEqual([]);
    const app = normalizeRegistryRecord({
      id: "shopify-app",
      name: "Shopify app",
      kind: "app",
      lifecycle: "planned",
      status: "planned",
    });
    expect(app.headlines).toEqual([]);
    expect(app.lifecycle).toBe("planned");
  });

  it("rejects zero-properties input as config error input", () => {
    expect(isRegistryConfigError([])).toBe(true);
    expect(isRegistryConfigError(null)).toBe(true);
    expect(isRegistryConfigError(normalizeRegistryRows([]))).toBe(true);
    expect(
      isRegistryConfigError(
        normalizeRegistryRows([
          { id: "apex", name: "Apex", kind: "marketing site" },
        ]),
      ),
    ).toBe(false);
  });

  it("keeps down vs unconnected discriminator in withSourceState", () => {
    const fresh = withSourceState(null, { connectivity: "connected" });
    expect(fresh.connectivity).toBe("connected");
    const downWithoutPrior = withSourceState(null, { connectivity: "down" });
    expect(downWithoutPrior.connectivity).toBe("unconnected");
    const downWithPrior = withSourceState(
      {
        connectivity: "connected",
        freshness: "fresh",
        lastSuccessfulFetchAt: "2026-10-31T21:03:32.584Z",
        lastReportAt: "2026-10-31T21:03:32.584Z",
        reason: null,
      },
      { connectivity: "down", reason: "fetch failed" },
    );
    expect(downWithPrior.connectivity).toBe("down");
    expect(downWithPrior.lastSuccessfulFetchAt).toBe(
      "2026-10-31T21:03:32.584Z",
    );
  });
});
