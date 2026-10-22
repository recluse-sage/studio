import { createRequestHandler } from "react-router";
import { handleApiRequest } from "../src/server/worker.ts";
import { handleSitemap, runScheduledPublish } from "../src/server/handlers/posts.ts";
import { verifyAccessJwt } from "../src/server/access.ts";
import type { OasisEnv } from "../src/server/env.ts";

// Worker env aligns with backend lane. Do not rename these names.
// Backend owns: DB, RATE_LIMITER, ACCESS_TEAM_DOMAIN, ACCESS_AUD,
// TURNSTILE_SECRET_KEY, RESEND_API_KEY, OWNER_EMAIL, FROM_EMAIL.
// Worker adds: ASSETS (Static Assets binding).
// PUBLIC_SITE_URL is build-time only (see vite.config.ts and
// scripts/generate-sitemap.mjs). The Worker never reads it at runtime.
export interface Env extends OasisEnv {
  ASSETS: Fetcher;
}

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: { env: Env; ctx: ExecutionContext };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname === "/admin/" || pathname.startsWith("/admin/");
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function blandForbidden(): Response {
  // Intentionally bland. No reason details, no stack, no hint about config.
  return new Response("Forbidden", {
    status: 403,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}

function withNoIndex(res: Response): Response {
  // Private admin HTML must never be indexed. Clone headers and add the tag.
  const headers = new Headers(res.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Runtime sitemap: static paths plus published posts with lastmod.
    // Origin comes from the request URL with https and host guard.
    if (pathname === "/sitemap.xml") {
      return handleSitemap(request, env as OasisEnv);
    }

    // Private APIs: never return an asset fallback. Always return the API response,
    // including JSON 404s for unknown /api/* paths.
    if (isApiPath(pathname)) {
      const apiRes = await handleApiRequest(request, env as OasisEnv);
      if (apiRes) return apiRes;
      return new Response(JSON.stringify({ error: "Not found.", code: "not-found" }), {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    // Private admin shell: verify Cloudflare Access before serving anything.
    // Reads Cf-Access-Jwt-Assertion, checks issuer TEAM_DOMAIN and audience ACCESS_AUD
    // against JWKS at /cdn-cgi/access/certs via jose (see src/server/access.ts).
    // Missing or invalid auth returns a bland 403. Client state, robots, and
    // obscurity are never treated as authorization.
    if (isAdminPath(pathname)) {
      const check = await verifyAccessJwt(request, env as OasisEnv);
      if (!check.ok) return blandForbidden();
      const res = await requestHandler(request, {
        cloudflare: { env, ctx },
      });
      return withNoIndex(res);
    }

    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
  async scheduled(_event, env, _ctx) {
    await runScheduledPublish(env as OasisEnv);
  },
} satisfies ExportedHandler<Env>;
