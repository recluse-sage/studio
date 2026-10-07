import { describe, it, expect, vi } from "vitest";
import {
  OUTREACH_STATUSES,
  validateOutreachInput,
} from "../../src/server/validation.ts";
import {
  handleAdminOutreach,
  handleAdminOverview,
} from "../../src/server/handlers/admin.ts";

vi.mock("../../src/server/access.ts", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/server/access.ts")>();
  return {
    ...actual,
    verifyAccessJwt: async (req: Request) => {
      const h = req.headers.get("Cf-Access-Jwt-Assertion");
      if (!h) return { ok: false, error: "Missing credentials.", status: 401 };
      if (h === "good-token") return { ok: true, sub: "owner-1" };
      return { ok: false, error: "Invalid credentials.", status: 401 };
    },
  };
});

describe("outreach lifecycle", () => {
  it("uses the CRM enum prospect, messaged, no_reply, replied, built, archived", () => {
    expect([...OUTREACH_STATUSES]).toEqual([
      "prospect",
      "messaged",
      "no_reply",
      "replied",
      "built",
      "archived",
    ]);
  });

  it("accepts new statuses and rejects the old generic pipeline", () => {
    for (const status of ["messaged", "no_reply", "replied", "built"]) {
      const r = validateOutreachInput({
        businessName: "Corner Shop",
        status,
      });
      expect(r.ok).toBe(true);
    }
    for (const status of ["contacted", "follow-up", "meeting", "won", "lost"]) {
      const r = validateOutreachInput({
        businessName: "Corner Shop",
        status,
      });
      expect(r.ok).toBe(false);
    }
  });

  it("rejects non-string contact instead of coercing", () => {
    expect(
      validateOutreachInput({ businessName: "Corner Shop", contact: 12345 }).ok,
    ).toBe(false);
    expect(
      validateOutreachInput({ businessName: "Corner Shop", channel: 99 }).ok,
    ).toBe(false);
  });

  it("GET items include needsReply only for messaged and no_reply", async () => {
    const rows = [
      {
        id: "a",
        business_name: "Shop A",
        contact: null,
        channel: null,
        status: "prospect",
        notes: null,
        next_follow_up: null,
        last_contact_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "b",
        business_name: "Shop B",
        contact: null,
        channel: null,
        status: "messaged",
        notes: null,
        next_follow_up: null,
        last_contact_at: "2026-02-01",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "c",
        business_name: "Shop C",
        contact: null,
        channel: null,
        status: "no_reply",
        notes: null,
        next_follow_up: null,
        last_contact_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-03T00:00:00.000Z",
      },
      {
        id: "d",
        business_name: "Shop D",
        contact: null,
        channel: null,
        status: "replied",
        notes: null,
        next_follow_up: null,
        last_contact_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-04T00:00:00.000Z",
      },
      {
        id: "e",
        business_name: "Shop E",
        contact: null,
        channel: null,
        status: "built",
        notes: null,
        next_follow_up: null,
        last_contact_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-05T00:00:00.000Z",
      },
    ];
    const db = {
      prepare(query: string) {
        return {
          bind(..._values: unknown[]) {
            return {
              first: async () => ({ n: rows.length }),
              all: async () => ({ results: rows }),
              run: async () => ({}),
            };
          },
        };
      },
    };
    const env = { DB: db } as never;
    const req = new Request("https://example.com/api/admin/outreach", {
      headers: { "Cf-Access-Jwt-Assertion": "good-token" },
    });
    const res = await handleAdminOutreach(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ status: string; needsReply: boolean }>;
      total: number;
      limit: number;
      offset: number;
    };
    expect(body.total).toBe(5);
    const byId = Object.fromEntries(
      body.items.map((i) => [i.status, i.needsReply]),
    );
    expect(byId["prospect"]).toBe(false);
    expect(byId["messaged"]).toBe(true);
    expect(byId["no_reply"]).toBe(true);
    expect(byId["replied"]).toBe(false);
    expect(byId["built"]).toBe(false);
  });

  it("PATCH rejects malformed non-string fields without coercion", async () => {
    const db = {
      prepare(_q: string) {
        return {
          bind(..._v: unknown[]) {
            return {
              first: async () => null,
              all: async () => ({ results: [] }),
              run: async () => ({}),
            };
          },
        };
      },
    };
    const env = { DB: db } as never;
    for (const payload of [
      { contact: 12345 },
      { channel: { name: "phone" } },
      { notes: 999 },
      { nextFollowUp: 20260101 },
      { lastContactAt: 123 },
      { status: "contacted" },
    ]) {
      const req = new Request("https://example.com/api/admin/outreach/abc", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "Cf-Access-Jwt-Assertion": "good-token",
        },
        body: JSON.stringify(payload),
      });
      const res = await handleAdminOutreach(req, env);
      expect(res.status).toBe(400);
    }
  });

  it("overview includes computed outreachNeedingReply", async () => {
    const db = {
      prepare(query: string) {
        return {
          bind(..._values: unknown[]) {
            return {
              first: async () => {
                if (query.includes("messaged")) return { n: 2 };
                if (query.includes("proof_notes")) return { n: 0 };
                return { v: 0, o: 0, c: 0, n: 0 };
              },
              all: async () => ({ results: [] }),
              run: async () => ({}),
            };
          },
        };
      },
    };
    const env = { DB: db } as never;
    const req = new Request("https://example.com/api/admin/overview", {
      headers: { "Cf-Access-Jwt-Assertion": "good-token" },
    });
    const res = await handleAdminOverview(req, env);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.outreachNeedingReply).toBe(2);
  });
});
