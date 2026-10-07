import { describe, it, expect, vi } from "vitest";
import { validateAvailabilityInput } from "../../src/server/validation.ts";
import {
  handleAdminAvailability,
  handlePublicAvailability,
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

function dbWithRow(row: Record<string, unknown> | null) {
  return {
    prepare(query: string) {
      return {
        bind(..._values: unknown[]) {
          return {
            first: async () => {
              if (query.includes("FROM site_availability")) return row;
              return null;
            },
            all: async () => ({ results: row ? [row] : [] }),
            run: async () => ({}),
          };
        },
      };
    },
  };
}

describe("studio availability", () => {
  it("admin GET requires Access", async () => {
    const env = { DB: dbWithRow(null) } as never;
    const req = new Request("https://example.com/api/admin/availability");
    const res = await handleAdminAvailability(req, env);
    expect(res.status).toBe(401);
  });

  it("admin GET returns empty state when no row exists", async () => {
    const env = { DB: dbWithRow(null) } as never;
    const req = new Request("https://example.com/api/admin/availability", {
      headers: { "Cf-Access-Jwt-Assertion": "good-token" },
    });
    const res = await handleAdminAvailability(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      configured: boolean;
      availability: unknown;
    };
    expect(body.configured).toBe(false);
    expect(body.availability).toBeNull();
  });

  it("public returns not-configured truthfully when no row exists", async () => {
    const env = { DB: dbWithRow(null) } as never;
    const req = new Request("https://example.com/api/public/availability");
    const res = await handlePublicAvailability(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.configured).toBe(false);
    expect(body.status).toBe("not-configured");
  });

  it("public response excludes private active build fields", async () => {
    const row = {
      id: "primary",
      status: "limited",
      label: "Taking 2 builds",
      next_window: "Next window in March",
      public_note: "Public note here",
      active_build_title: "Secret client build",
      active_build_stage: "In progress",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    };
    const env = { DB: dbWithRow(row) } as never;
    const req = new Request("https://example.com/api/public/availability");
    const res = await handlePublicAvailability(req, env);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.configured).toBe(true);
    expect(body.status).toBe("limited");
    expect(body.label).toBe("Taking 2 builds");
    expect(body.nextWindow).toBe("Next window in March");
    expect(body.note).toBe("Public note here");
    expect("activeBuildTitle" in body).toBe(false);
    expect("activeBuildStage" in body).toBe(false);
    expect(JSON.stringify(body)).not.toContain("Secret client build");
  });

  it("availability validator accepts public plus private fields", () => {
    const r = validateAvailabilityInput({
      status: "open",
      label: "Open now",
      nextWindow: "Next week",
      note: "Public note",
      activeBuildTitle: "Internal title",
      activeBuildStage: "Scoping",
    });
    expect(r.ok).toBe(true);
  });

  it("availability validator rejects unknown status and unknown fields", () => {
    expect(validateAvailabilityInput({ status: "super-busy" }).ok).toBe(false);
    expect(
      validateAvailabilityInput({ status: "open", isOpen: true }).ok,
    ).toBe(false);
  });
});
