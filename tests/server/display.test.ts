import { describe, it, expect, vi } from "vitest";
import { validateDisplayInput } from "../../src/server/validation.ts";
import {
  handleAdminDisplay,
  handlePublicDisplay,
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

function displayDb(opts: {
  row?: Record<string, unknown> | null;
  capture?: { audits: unknown[][]; upserts: unknown[][] };
}) {
  const audits: unknown[][] = [];
  const upserts: unknown[][] = [];
  const store: { row: Record<string, unknown> | null } = {
    row: opts.row === undefined ? null : opts.row,
  };
  if (opts.capture) {
    opts.capture.audits = audits;
    opts.capture.upserts = upserts;
  }
  return {
    __store: store,
    __audits: audits,
    prepare(query: string) {
      return {
        bind(...values: unknown[]) {
          return {
            first: async () => {
              if (query.includes("FROM display_settings")) return store.row;
              if (query.includes("FROM audit_log")) return null;
              return null;
            },
            all: async () => ({ results: [] }),
            run: async () => {
              if (query.includes("INTO display_settings")) {
                upserts.push(values);
                const visible = values[0] as number;
                store.row = { proof_visible: visible };
              }
              if (query.includes("INTO audit_log")) {
                audits.push(values);
              }
              return {};
            },
          };
        },
      };
    },
  };
}

describe("display settings", () => {
  it("validator accepts boolean and rejects other shapes", () => {
    expect(validateDisplayInput({ proofVisible: true }).ok).toBe(true);
    expect(validateDisplayInput({ proofVisible: false }).ok).toBe(true);
    expect(validateDisplayInput({ proofVisible: 1 }).ok).toBe(false);
    expect(validateDisplayInput({ proofVisible: "yes" }).ok).toBe(false);
    expect(validateDisplayInput({}).ok).toBe(false);
    expect(validateDisplayInput({ proofVisible: true, extra: 1 }).ok).toBe(
      false,
    );
  });

  it("admin GET requires Access", async () => {
    const env = { DB: displayDb({}) } as never;
    const req = new Request("https://example.com/api/admin/display");
    const res = await handleAdminDisplay(req, env);
    expect(res.status).toBe(401);
  });

  it("admin GET defaults to hidden when no row exists", async () => {
    const env = { DB: displayDb({ row: null }) } as never;
    const req = new Request("https://example.com/api/admin/display", {
      headers: { "Cf-Access-Jwt-Assertion": "good-token" },
    });
    const res = await handleAdminDisplay(req, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ proofVisible: false });
  });

  it("public GET defaults to hidden with public cache", async () => {
    const env = { DB: displayDb({ row: null }) } as never;
    const req = new Request("https://example.com/api/public/display");
    const res = await handlePublicDisplay(req, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("public");
    expect(res.headers.get("Cache-Control")).toContain("max-age=60");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({ proofVisible: false });
  });

  it("toggle round trip writes an audit row", async () => {
    const db = displayDb({ row: null });
    const env = { DB: db } as never;
    const put = new Request("https://example.com/api/admin/display", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "Cf-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify({ proofVisible: true }),
    });
    const putRes = await handleAdminDisplay(put, env);
    expect(putRes.status).toBe(200);
    expect(await putRes.json()).toEqual({ proofVisible: true });

    const adminGet = new Request("https://example.com/api/admin/display", {
      headers: { "Cf-Access-Jwt-Assertion": "good-token" },
    });
    const adminBody = (await (
      await handleAdminDisplay(adminGet, env)
    ).json()) as Record<string, unknown>;
    expect(adminBody).toEqual({ proofVisible: true });

    const publicGet = new Request("https://example.com/api/public/display");
    const publicBody = (await (
      await handlePublicDisplay(publicGet, env)
    ).json()) as Record<string, unknown>;
    expect(publicBody).toEqual({ proofVisible: true });

    const auditValues = db.__audits.flat();
    expect(auditValues.join(" ")).toContain("display.update");

    const back = new Request("https://example.com/api/admin/display", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "Cf-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify({ proofVisible: false }),
    });
    const backRes = await handleAdminDisplay(back, env);
    expect(await backRes.json()).toEqual({ proofVisible: false });
  });

  it("admin PUT rejects non boolean", async () => {
    const env = { DB: displayDb({ row: null }) } as never;
    const req = new Request("https://example.com/api/admin/display", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "Cf-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify({ proofVisible: "yes" }),
    });
    const res = await handleAdminDisplay(req, env);
    expect(res.status).toBe(400);
  });
});
