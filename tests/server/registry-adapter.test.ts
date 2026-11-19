import { describe, expect, it } from "vitest";
import {
  APEX_SOURCE,
  apexBlogPostsHeadline,
  apexInboundHeadline,
  applyApexPayloadToRegistry,
  applyApexReportToRegistry,
  markRegistryReportDown,
  stripPiiFields,
} from "../../src/features/admin/registry/registry-adapter";
import { parseApexReport } from "../../src/features/admin/registry/reporter";
import { buildRegistrySeed } from "../../src/features/admin/registry/registry-seed";
import fixture from "../../src/features/admin/registry/apex-report.fixture.json";

describe("registry seed plus lifetime headlines", () => {
  it("maps seed to five rows in fixed order", () => {
    const rows = buildRegistrySeed();
    expect(rows.map((row) => row.id)).toEqual([
      "apex",
      "forage",
      "upwork-catalog",
      "designtaste-by-oasis",
      "shopify-app",
    ]);
    for (const row of rows) {
      expect(row.headlines).toEqual([]);
      expect(row.health).toBe("unknown");
      expect(row.sources[APEX_SOURCE]?.connectivity).toBe("unconnected");
      expect(row.sources[APEX_SOURCE]?.lastSuccessfulFetchAt).toBeNull();
    }
    expect(rows.map((row) => row.lifecycle)).toEqual([
      "live",
      "live",
      "live",
      "live",
      "planned",
    ]);
  });

  it("shows lifetime labels and split tooltip total", () => {
    const servedAt = "2026-10-31T21:03:32.584Z";
    const counts = { berryBlastTotal: 2, contactNotes: 5, blogPosts: 16 };
    const blog = apexBlogPostsHeadline(counts, servedAt);
    expect(blog).toMatchObject({
      label: "Blog posts",
      value: 16,
      window: "lifetime",
      updatedAt: servedAt,
      source: "reporter",
    });
    const inbound = apexInboundHeadline(counts, servedAt);
    expect(inbound.value).toBe(7);
    expect(inbound.window).toBe("lifetime");
    expect(inbound.tooltip).toBe("5 contact notes plus 2 Berry Blast orders");

    const rows = buildRegistrySeed();
    const apex = rows[0]!;
    const report = parseApexReport({
      property: "apex",
      counts,
      lastDeployHash: null,
      servedAt,
    });
    expect(report).not.toBeNull();
    const next = applyApexReportToRegistry(apex, report!);
    expect(next.headlines).toHaveLength(2);
    expect(next.health).toBe("up");
    expect(next.lastReportAt).toBe(servedAt);
    expect(next.lastSuccessfulFetchAt).toBe(servedAt);
    expect(next.sources[APEX_SOURCE]?.connectivity).toBe("connected");
  });

  it("keeps lifetime semantics on zero payload", () => {
    const servedAt = new Date().toISOString();
    const rows = buildRegistrySeed();
    const apex = rows.find((row) => row.id === "apex")!;
    const report = parseApexReport({
      property: "apex",
      counts: { berryBlastTotal: 0, contactNotes: 0, blogPosts: 0 },
      lastDeployHash: null,
      servedAt,
    });
    expect(report).not.toBeNull();
    const next = applyApexReportToRegistry(apex, report!);
    expect(next.headlines[0]).toMatchObject({
      value: 0,
      window: "lifetime",
      updatedAt: servedAt,
    });
    expect(next.headlines[1]).toMatchObject({
      value: 0,
      window: "lifetime",
      updatedAt: servedAt,
    });
    expect(next.health).toBe("up");
    expect(next.lastReportAt).toBe(servedAt);
    expect(next.lastSuccessfulFetchAt).toBe(servedAt);
    const serialized = JSON.stringify(next);
    expect(serialized).not.toContain("Not yet");
    expect(serialized).not.toContain("Unconnected");
  });

  it("drops PII-shaped fields and keeps counts only", () => {
    const rows = buildRegistrySeed();
    const apex = rows.find((row) => row.id === "apex")!;
    const dirty = {
      ...fixture,
      email: "owner@example.com",
      name: "Owner Name",
      phone: "+1-555-0100",
      message: "hello there",
    };
    expect(stripPiiFields(dirty)).toEqual({
      property: "apex",
      counts: dirty.counts,
      lastDeployHash: null,
      servedAt: fixture.servedAt,
    });
    const next = applyApexPayloadToRegistry(apex, dirty);
    expect(next).not.toBeNull();
    const serialized = JSON.stringify(next);
    expect(serialized).not.toContain("owner@example.com");
    expect(serialized).not.toContain("Owner Name");
    expect(serialized).not.toContain("+1-555-0100");
    expect(serialized).not.toContain("hello there");
    expect(next!.metrics).toEqual({
      berryBlastTotal: 0,
      contactNotes: 0,
      blogPosts: 16,
    });
    expect(markRegistryReportDown(next!, "fetch failed").health).toBe("down");
  });
});
