import type { OasisEnv } from "./env.ts";
import { nowIso } from "./env.ts";

// All queries use D1 prepare plus bind. No string interpolation of values.
// Audit summaries never include intake message content or secrets.

export function newId(): string {
  const g = globalThis as unknown as {
    crypto?: { randomUUID?: () => string };
  };
  if (g.crypto && typeof g.crypto.randomUUID === "function") {
    return g.crypto.randomUUID();
  }
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12)
  );
}

export async function insertAudit(
  env: OasisEnv,
  input: {
    actor: string;
    action: string;
    entity: string;
    entityId?: string;
    summary?: string;
  },
): Promise<void> {
  const summary = (input.summary || "").slice(0, 500);
  try {
    await env.DB.prepare(
      "INSERT INTO audit_log (actor, action, entity, entity_id, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(
        input.actor.slice(0, 160),
        input.action.slice(0, 80),
        input.entity.slice(0, 40),
        (input.entityId || "").slice(0, 80) || null,
        summary || null,
        nowIso(),
      )
      .run();
  } catch {
    // Audit failure must not break the main admin action.
  }
}

export function parsePaging(url: URL): { limit: number; offset: number } {
  const rawLimit = Number(url.searchParams.get("limit") || "20");
  const rawOffset = Number(url.searchParams.get("offset") || "0");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(100, Math.max(1, Math.floor(rawLimit)))
    : 20;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;
  return { limit, offset };
}
