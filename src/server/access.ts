import type { OasisEnv } from "./env.ts";

// Cloudflare Access JWT gate. Every private /api/admin handler must call this.
// It checks the Cf-Access-Jwt-Assertion header against the team issuer and
// the application audience using the team JWKS. Browser checks, robots rules,
// or hidden links are never treated as authorization.
//
// Dependency assumption for integration: add "jose" (Worker compatible).
// Dynamic import keeps unit tests free of network and keeps this module
// loadable without the package until parent installs it.

export interface AccessResult {
  ok: boolean;
  sub?: string;
  error?: string;
  status?: number;
}

export function getAccessToken(request: Request): string | null {
  const raw = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!raw || raw.trim().length === 0) return null;
  return raw.trim();
}

function jwksUrl(teamDomain: string): string {
  const base = teamDomain.replace(/\/$/, "");
  return base + "/cdn-cgi/access/certs";
}

export async function verifyAccessJwt(
  request: Request,
  env: OasisEnv,
  overrides?: {
    jwtVerify?: (
      token: string,
      jwks: unknown,
      opts: { issuer: string; audience: string },
    ) => Promise<{ payload: { sub?: string } }>;
    makeJwks?: (url: string) => unknown;
  },
): Promise<AccessResult> {
  const token = getAccessToken(request);
  if (!token) return { ok: false, error: "Missing credentials.", status: 401 };
  const teamDomain = env.ACCESS_TEAM_DOMAIN;
  const audience = env.ACCESS_AUD;
  if (!teamDomain || !audience) {
    return { ok: false, error: "Access check is not configured.", status: 503 };
  }
  try {
    let jwtVerify = overrides?.jwtVerify;
    let jwks: unknown;
    if (!jwtVerify) {
      const jose = (await import("jose")) as unknown as {
        createRemoteJWKSet: (u: URL) => unknown;
        jwtVerify: (
          t: string,
          k: unknown,
          o: { issuer: string; audience: string },
        ) => Promise<{ payload: { sub?: string } }>;
      };
      jwks = overrides?.makeJwks
        ? overrides.makeJwks(jwksUrl(teamDomain))
        : jose.createRemoteJWKSet(new URL(jwksUrl(teamDomain)));
      jwtVerify = jose.jwtVerify;
    } else {
      jwks = overrides?.makeJwks
        ? overrides.makeJwks(jwksUrl(teamDomain))
        : {};
    }
    const verified = await jwtVerify(token, jwks, {
      issuer: teamDomain,
      audience,
    });
    const sub =
      typeof verified.payload.sub === "string" ? verified.payload.sub : "admin";
    return { ok: true, sub };
  } catch {
    return { ok: false, error: "Invalid credentials.", status: 401 };
  }
}

// Short actor label for audit_log. Keeps full JWT out of the database.
export function auditActor(sub: string | undefined): string {
  if (!sub) return "admin";
  if (sub.length <= 12) return "admin:" + sub;
  return "admin:" + sub.slice(-8);
}
