import { describe, it, expect, vi } from "vitest";
import {
  handleAdminUsage,
  handleAdminProofNotes,
  handleAdminTools,
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

function pagedDb(items: unknown[], total: number) {
  return {
    prepare(_q: string) {
      return {
        bind(..._v: unknown[]) {
          return {
            first: async () => ({ n: total }),
            all: async () => ({ results: items }),
            run: async () => ({}),
          };
        },
      };
    },
  };
}

describe("padded list contracts", () => {
  it("tools list returns items, total, limit, offset", async () => {
    const env = { DB: pagedDb([], 0) } as never;
    const req = new Request(
      "https://example.com/api/admin/tools?limit=20&offset=0",
      { headers: { "Cf-Access-Jwt-Assertion": "good-token" } },
    );
    const res = await handleAdminTools(req, env);
    const body = (await res.json()) as Record<string, unknown>;
    expect("items" in body).toBe(true);
    expect("total" in body).toBe(true);
    expect("limit" in body).toBe(true);
    expect("offset" in body).toBe(true);
  });

  it("usage list returns true total, not page length", async () => {
    const items = [
      {
        id: "u1",
        tool_id: null,
        tool_key: "landing",
        usage_date: "2026-10-01",
        views: 3,
        offline_views: 1,
        contact_clicks: 0,
        created_at: "2026-10-01T00:00:00.000Z",
        updated_at: "2026-10-01T00:00:00.000Z",
      },
    ];
    const env = { DB: pagedDb(items, 42) } as never;
    const req = new Request("https://example.com/api/admin/usage", {
      headers: { "Cf-Access-Jwt-Assertion": "good-token" },
    });
    const res = await handleAdminUsage(req, env);
    const body = (await res.json()) as {
      items: unknown[];
      total: number;
      limit: number;
      offset: number;
    };
    expect(body.items.length).toBe(1);
    expect(body.total).toBe(42);
    expect(typeof body.limit).toBe("number");
    expect(typeof body.offset).toBe("number");
  });

  it("proof notes list returns true total with padded shape", async () => {
    const items = [
      {
        id: "p1",
        title: "Note one",
        body: null,
        permission_status: "pending",
        related_tool_id: null,
        created_at: "2026-10-01T00:00:00.000Z",
        updated_at: "2026-10-01T00:00:00.000Z",
      },
    ];
    const env = { DB: pagedDb(items, 7) } as never;
    const req = new Request("https://example.com/api/admin/proof-notes", {
      headers: { "Cf-Access-Jwt-Assertion": "good-token" },
    });
    const res = await handleAdminProofNotes(req, env);
    const body = (await res.json()) as {
      items: unknown[];
      total: number;
      limit: number;
      offset: number;
    };
    expect(body.items.length).toBe(1);
    expect(body.total).toBe(7);
  });
});
