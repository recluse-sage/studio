import type { OasisEnv } from "./env.ts";
import { safeError } from "./env.ts";
import { handlePublicIntake } from "./handlers/intakes.ts";
import {
  handleAdminAvailability,
  handleAdminDisplay,
  handleAdminIntakes,
  handleAdminOutreach,
  handleAdminOverview,
  handleAdminProofNotes,
  handleAdminSystem,
  handleAdminTools,
  handleAdminUsage,
  handlePublicAvailability,
  handlePublicDisplay,
  handlePublicWorkItems,
} from "./handlers/admin.ts";
import { handleAdminPosts, handlePublicPosts } from "./handlers/posts.ts";

// Single integration entry for the Worker entrypoint.
// Parent wires: import { handleApiRequest } from "../server/worker.ts"
// and calls it for paths starting with /api/. Returns null for other paths
// so the Worker can fall through to static assets.
// Parent supplies the real Env with DB, RATE_LIMITER, and secret bindings.
export async function handleApiRequest(
  request: Request,
  env: OasisEnv,
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/intakes") {
    return handlePublicIntake(request, env);
  }
  if (path === "/api/public/availability") {
    return handlePublicAvailability(request, env);
  }
  if (path === "/api/public/display") {
    return handlePublicDisplay(request, env);
  }
  if (path === "/api/public/work-items") {
    return handlePublicWorkItems(request, env);
  }
  if (path === "/api/public/posts" || path.startsWith("/api/public/posts/")) {
    return handlePublicPosts(request, env);
  }
  if (path === "/api/admin/posts" || path.startsWith("/api/admin/posts/")) {
    return handleAdminPosts(request, env);
  }
  if (path === "/api/admin/overview") {
    return handleAdminOverview(request, env);
  }
  if (path === "/api/admin/system") {
    return handleAdminSystem(request, env);
  }
  if (path.startsWith("/api/admin/availability")) {
    return handleAdminAvailability(request, env);
  }
  if (path === "/api/admin/display" || path.startsWith("/api/admin/display/")) {
    return handleAdminDisplay(request, env);
  }
  if (path.startsWith("/api/admin/intakes")) {
    return handleAdminIntakes(request, env);
  }
  if (path.startsWith("/api/admin/outreach")) {
    return handleAdminOutreach(request, env);
  }
  if (path.startsWith("/api/admin/tools")) {
    return handleAdminTools(request, env);
  }
  if (path.startsWith("/api/admin/usage")) {
    return handleAdminUsage(request, env);
  }
  if (path.startsWith("/api/admin/proof-notes")) {
    return handleAdminProofNotes(request, env);
  }
  if (path.startsWith("/api/")) {
    return safeError("Not found.", 404, "not-found");
  }
  return null;
}
