import { describe, it, expect, vi } from "vitest";
import { validateToolInput } from "../../src/server/validation.ts";
import { handleAdminTools } from "../../src/server/handlers/admin.ts";

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

describe("tool registry showcase fields", () => {
  it("accepts businessName and showcaseStatus allowlist", () => {
    const r = validateToolInput({
      name: "Quote helper",
      slug: "quote-helper",
      businessName: "Maple Bakery",
      showcaseStatus: "pending",
    });
    expect(r.ok).toBe(true);
    expect(r.data?.businessName).toBe("Maple Bakery");
    expect(r.data?.showcaseStatus).toBe("pending");
  });

  it("defaults showcaseStatus to private", () => {
    const r = validateToolInput({ name: "Quote helper", slug: "quote-helper" });
    expect(r.ok).toBe(true);
    expect(r.data?.showcaseStatus).toBe("private");
  });

  it("rejects invalid showcase status and unknown fields", () => {
    expect(
      validateToolInput({
        name: "Quote helper",
        slug: "quote-helper",
        showcaseStatus: "public",
      }).ok,
    ).toBe(false);
    expect(
      validateToolInput({
        name: "Quote helper",
        slug: "quote-helper",
        isPublic: true,
      }).ok,
    ).toBe(false);
  });

  it("rejects non-string businessName instead of coercing", () => {
    expect(
      validateToolInput({
        name: "Quote helper",
        slug: "quote-helper",
        businessName: 123,
      }).ok,
    ).toBe(false);
  });

  it("GET returns businessName, showcaseStatus, and isAvailable flag", async () => {
    const rows = [
      {
        id: "t1",
        name: "Quote helper",
        slug: "quote-helper",
        description: null,
        status: "active",
        is_available: 1,
        availability_note: null,
        url: null,
        business_name: "Maple Bakery",
        showcase_status: "approved",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "t2",
        name: "Offline form",
        slug: "offline-form",
        description: null,
        status: "draft",
        is_available: 0,
        availability_note: "Offline",
        url: null,
        business_name: null,
        showcase_status: "private",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    const db = {
      prepare(_q: string) {
        return {
          bind(..._v: unknown[]) {
            return {
              first: async () => ({ n: 2 }),
              all: async () => ({ results: rows }),
              run: async () => ({}),
            };
          },
        };
      },
    };
    const env = { DB: db } as never;
    const req = new Request("https://example.com/api/admin/tools", {
      headers: { "Cf-Access-Jwt-Assertion": "good-token" },
    });
    const res = await handleAdminTools(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{
        businessName: string | null;
        showcaseStatus: string;
        isAvailable: boolean;
      }>;
      total: number;
      limit: number;
      offset: number;
    };
    expect(body.total).toBe(2);
    expect(body.items[0].businessName).toBe("Maple Bakery");
    expect(body.items[0].showcaseStatus).toBe("approved");
    expect(body.items[0].isAvailable).toBe(true);
    expect(body.items[1].isAvailable).toBe(false);
    expect(body.items[1].showcaseStatus).toBe("private");
  });

  it("POST returns showcase fields and PATCH echoes updated showcase fields", async () => {
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
    const createReq = new Request("https://example.com/api/admin/tools", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Cf-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify({
        name: "Quote helper",
        slug: "quote-helper",
        businessName: "Maple Bakery",
        showcaseStatus: "pending",
      }),
    });
    const createRes = await handleAdminTools(createReq, env);
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as Record<string, unknown>;
    expect(created.businessName).toBe("Maple Bakery");
    expect(created.showcaseStatus).toBe("pending");

    const patchReq = new Request("https://example.com/api/admin/tools/t1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "Cf-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify({ showcaseStatus: "approved" }),
    });
    const patchRes = await handleAdminTools(patchReq, env);
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as Record<string, unknown>;
    expect(patched.showcaseStatus).toBe("approved");
  });
});
