import { describe, expect, it } from "vitest";
import { handleAdminRegistry } from "../../src/server/handlers/registry.ts";
import { handleApiRequest } from "../../src/server/worker.ts";

function req(path: string, headers: Record<string, string> = {}): Request {
  return new Request("https://example.com" + path, { headers });
}

const fakeDb = {
  prepare() {
    return {
      bind() {
        return {
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({}),
        };
      },
    };
  },
};

function env() {
  return {
    DB: fakeDb,
    ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
    ACCESS_AUD: "aud-123",
  };
}

function goodOverrides() {
  return {
    jwtVerify: async () => ({ payload: { sub: "owner-1" } }),
    makeJwks: () => ({}),
  };
}

function throwingOverrides(message: string) {
  return {
    jwtVerify: async () => {
      throw new Error(message);
    },
    makeJwks: () => ({}),
  };
}

function bodyText(body: unknown): string {
  return JSON.stringify(body);
}

describe("admin registry access negatives", () => {
  it("denies registry API with no token", async () => {
    const res = await handleAdminRegistry(req("/api/admin/registry"), env());
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).not.toContain("blogPosts");
    expect(text).not.toContain("contactNotes");
    expect(text).not.toContain("berryBlastTotal");
    expect(text).not.toContain("owner-1");
    expect(text).not.toContain("/api/admin/registry");
  });

  it("denies invalid signature", async () => {
    const res = await handleAdminRegistry(
      req("/api/admin/registry", { "Cf-Access-Jwt-Assertion": "bad-token" }),
      env(),
      throwingOverrides("bad signature"),
    );
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).not.toContain("blogPosts");
    expect(text).not.toContain("bad signature");
  });

  it("denies expired token", async () => {
    const res = await handleAdminRegistry(
      req("/api/admin/registry", { "Cf-Access-Jwt-Assertion": "expired-token" }),
      env(),
      throwingOverrides("expired"),
    );
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).not.toContain("blogPosts");
    expect(text).not.toContain("expired");
  });

  it("denies wrong audience", async () => {
    const res = await handleAdminRegistry(
      req("/api/admin/registry", { "Cf-Access-Jwt-Assertion": "wrong-aud" }),
      env(),
      throwingOverrides("audience mismatch"),
    );
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).not.toContain("blogPosts");
    expect(text).not.toContain("audience");
  });

  it("denies direct origin bypass", async () => {
    const res = await handleAdminRegistry(
      req("/api/admin/registry", {
        Host: "origin.example.com",
        "X-Forwarded-Host": "origin.example.com",
        "CF-Connecting-IP": "203.0.113.7",
        Origin: "https://origin.example.com",
      }),
      env(),
    );
    expect(res.status).toBe(401);
    const body = bodyText(await res.json());
    expect(body).not.toContain("blogPosts");
    expect(body).not.toContain("203.0.113.7");
  });

  it("denies private file without JWT", async () => {
    const base = await handleAdminRegistry(req("/api/admin/registry"), env());
    const nested = await handleAdminRegistry(
      req("/api/admin/registry/apex.json"),
      env(),
    );
    expect(base.status).toBe(401);
    expect(nested.status).toBe(401);
    const baseText = await base.text();
    const nestedText = await nested.text();
    expect(baseText).toBe(nestedText);
    expect(nestedText).not.toContain("apex.json");
    expect(nestedText).not.toContain("blogPosts");
  });

  it("allows valid token", async () => {
    const res = await handleAdminRegistry(
      req("/api/admin/registry", { "Cf-Access-Jwt-Assertion": "good-token" }),
      env(),
      goodOverrides(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.property).toBe("apex");
    const counts = body.counts as Record<string, unknown>;
    expect(typeof counts.blogPosts).toBe("number");
    expect(typeof counts.contactNotes).toBe("number");
    expect(typeof counts.berryBlastTotal).toBe("number");
    const text = bodyText(body);
    expect(text).not.toContain("owner@example.com");
    expect(text).not.toContain("@");
    expect(text).not.toContain("phone");
    expect(text).not.toContain("message");
    const routed = await handleApiRequest(req("/api/admin/registry"), env());
    expect(routed).not.toBeNull();
    expect(routed!.status).toBe(401);
    const routedText = await routed!.text();
    expect(routedText).not.toContain("blogPosts");
  });
});
