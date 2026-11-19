import {
  adminError,
  adminJson,
  nowIso,
  type OasisEnv,
} from "../env.ts";
import { verifyAccessJwt } from "../access.ts";

// GET /api/admin/registry. Access gate required. Server re-verifies the
// Cloudflare Access JWT first on every call. No page check substitutes.
// The browser sends same-origin credentials only. No new credential header,
// no HMAC token, and no secret travels in the browser.
//
// Phase 1 payload is fixture-backed and counts only: blog plus inbound
// totals with servedAt, no names, no emails, no messages. The upstream
// signed apex pull lands in a later phase. This handler proves the gate
// and the live parse plus apply path, not the upstream transport.

type VerifyOverrides = Parameters<typeof verifyAccessJwt>[2];

export async function handleAdminRegistry(
  request: Request,
  env: OasisEnv,
  overrides?: VerifyOverrides,
): Promise<Response> {
  const check = await verifyAccessJwt(request, env, overrides);
  if (!check.ok) {
    const status = check.status || 401;
    return adminError(
      check.error || "Not authorized.",
      status,
      status === 503 ? "not-configured" : "unauthorized",
    );
  }
  if (request.method !== "GET") return adminError("Method not allowed.", 405);
  return adminJson({
    property: "apex",
    counts: { berryBlastTotal: 0, contactNotes: 0, blogPosts: 16 },
    lastDeployHash: null,
    servedAt: nowIso(),
    fixture: true,
  });
}
