import { describe, it, expect, vi } from "vitest";
import {
  validateManualIntakeInput,
  MANUAL_INTAKE_ALLOWED_FIELDS,
} from "../../src/server/validation.ts";
import { handleAdminIntakes } from "../../src/server/handlers/admin.ts";

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

const baseManual = {
  businessName: "Maple Bakery",
  businessType: "food-hospitality",
  taskDescription: "Weekly cake orders pile up in chat and need a simple form.",
  contactMethod: "phone",
  contactValue: "555-0100",
};

function makeDb(capture: { queries: string[] }) {
  return {
    prepare(query: string) {
      capture.queries.push(query);
      return {
        bind(..._values: unknown[]) {
          return {
            first: async () => null,
            all: async () => ({ results: [] }),
            run: async () => ({}),
          };
        },
      };
    },
  };
}

describe("admin manual intake", () => {
  it("allowlist excludes website, turnstileToken, source, and status", () => {
    expect(MANUAL_INTAKE_ALLOWED_FIELDS).toContain("businessName");
    expect(MANUAL_INTAKE_ALLOWED_FIELDS).not.toContain("website");
    expect(MANUAL_INTAKE_ALLOWED_FIELDS).not.toContain("turnstileToken");
    expect(MANUAL_INTAKE_ALLOWED_FIELDS).not.toContain("source");
    expect(MANUAL_INTAKE_ALLOWED_FIELDS).not.toContain("status");
  });

  it("accepts a valid manual payload without Turnstile", () => {
    const r = validateManualIntakeInput({ ...baseManual });
    expect(r.ok).toBe(true);
  });

  it("rejects website, turnstileToken, source, and status", () => {
    for (const payload of [
      { ...baseManual, website: "http://spam.example" },
      { ...baseManual, turnstileToken: "tok" },
      { ...baseManual, source: "landing" },
      { ...baseManual, status: "new" },
    ]) {
      expect(validateManualIntakeInput(payload).ok).toBe(false);
    }
  });

  it("rejects short task and invalid contact method", () => {
    expect(
      validateManualIntakeInput({ ...baseManual, taskDescription: "short" }).ok,
    ).toBe(false);
    expect(
      validateManualIntakeInput({ ...baseManual, contactMethod: "pager" }).ok,
    ).toBe(false);
  });

  it("requires valid Access, returns 401 without credentials", async () => {
    const capture = { queries: [] as string[] };
    const env = { DB: makeDb(capture) } as never;
    const req = new Request("https://example.com/api/admin/intakes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseManual),
    });
    const res = await handleAdminIntakes(req, env);
    expect(res.status).toBe(401);
  });

  it("creates with source admin-manual and pending notification", async () => {
    const queries: string[] = [];
    let boundValues: unknown[][] = [];
    const db = {
      prepare(query: string) {
        queries.push(query);
        return {
          bind(...values: unknown[]) {
            boundValues.push(values);
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
    const req = new Request("https://example.com/api/admin/intakes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Cf-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify(baseManual),
    });
    const res = await handleAdminIntakes(req, env);
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.source).toBe("admin-manual");
    expect(body.status).toBe("new");
    expect(body.emailNotification).toBe("pending");
    const insert = queries.find((q) => q.startsWith("INSERT INTO intakes"));
    expect(insert).toContain("admin-manual");
  });
});
