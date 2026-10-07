import { describe, it, expect } from "vitest";
import {
  getAccessToken,
  verifyAccessJwt,
} from "../../src/server/access.ts";
import { handleAdminOverview } from "../../src/server/handlers/admin.ts";

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

describe("Access gate", () => {
  it("returns null when the assertion header is missing", () => {
    expect(getAccessToken(req("/api/admin/overview"))).toBeNull();
  });

  it("rejects missing JWT before touching JWKS", async () => {
    const env = {
      DB: fakeDb,
      ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
      ACCESS_AUD: "aud-123",
    };
    const r = await verifyAccessJwt(req("/api/admin/overview"), env);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(401);
  });

  it("admin handler returns 401 without credentials", async () => {
    const env = {
      DB: fakeDb,
      ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
      ACCESS_AUD: "aud-123",
    };
    const res = await handleAdminOverview(req("/api/admin/overview"), env);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(typeof body.error).toBe("string");
  });

  it("admin handler does not expose stack traces", async () => {
    const env = {
      DB: fakeDb,
      ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
      ACCESS_AUD: "aud-123",
    };
    const res = await handleAdminOverview(req("/api/admin/overview"), env);
    const text = await res.text();
    expect(text).not.toContain("at ");
    expect(text).not.toContain("Error:");
  });

  it("accepts a valid JWT via injected verifier", async () => {
    const env = {
      DB: fakeDb,
      ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
      ACCESS_AUD: "aud-123",
    };
    const r = await verifyAccessJwt(
      req("/api/admin/overview", { "Cf-Access-Jwt-Assertion": "good-token" }),
      env,
      {
        jwtVerify: async () => ({ payload: { sub: "owner-1" } }),
        makeJwks: () => ({}),
      },
    );
    expect(r.ok).toBe(true);
    expect(r.sub).toBe("owner-1");
  });

  it("rejects malformed JWT via injected verifier", async () => {
    const env = {
      DB: fakeDb,
      ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com",
      ACCESS_AUD: "aud-123",
    };
    const r = await verifyAccessJwt(
      req("/api/admin/overview", { "Cf-Access-Jwt-Assertion": "bad-token" }),
      env,
      {
        jwtVerify: async () => {
          throw new Error("bad signature");
        },
        makeJwks: () => ({}),
      },
    );
    expect(r.ok).toBe(false);
    expect(r.status).toBe(401);
  });
});
