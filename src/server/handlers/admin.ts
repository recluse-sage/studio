import {
  adminError,
  adminJson,
  nowIso,
  publicError,
  publicJson,
  type OasisEnv,
} from "../env.ts";
import { auditActor, verifyAccessJwt } from "../access.ts";
import { insertAudit, newId, parsePaging } from "../db.ts";
import {
  INTAKE_STATUSES,
  OUTREACH_STATUSES,
  PROOF_KINDS,
  SHOWCASE_STATUSES,
  validateAvailabilityInput,
  validateDisplayInput,
  validateManualIntakeInput,
  validateOutreachInput,
  validateProofNoteInput,
  validateProofNotePatch,
  validateToolInput,
  findUnknownFields,
} from "../validation.ts";

// All private handlers verify Cloudflare Access JWT first.
// Never rely on page auth, robots headers, or hidden links.

async function requireAdmin(
  request: Request,
  env: OasisEnv,
): Promise<{ sub: string } | { denied: Response }> {
  const check = await verifyAccessJwt(request, env);
  if (!check.ok) {
    const status = check.status || 401;
    return {
      denied: adminError(
        check.error || "Not authorized.",
        status,
        status === 503 ? "not-configured" : "unauthorized",
      ),
    };
  }
  return { sub: check.sub || "admin" };
}

function rowToIntake(r: Record<string, unknown>): unknown {
  return {
    id: r.id,
    businessName: r.business_name,
    businessType: r.business_type,
    taskDescription: r.task_description,
    timeline: r.timeline ?? null,
    budget: r.budget ?? null,
    contactMethod: r.contact_method,
    contactValue: r.contact_value,
    source: r.source,
    status: r.status,
    emailNotification: r.email_notification,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function outreachNeedsReply(status: unknown): boolean {
  return status === "messaged" || status === "no_reply";
}

function rowToOutreach(r: Record<string, unknown>): unknown {
  return {
    id: r.id,
    businessName: r.business_name,
    contact: r.contact ?? null,
    channel: r.channel ?? null,
    status: r.status,
    notes: r.notes ?? null,
    nextFollowUp: r.next_follow_up ?? null,
    lastContactAt: r.last_contact_at ?? null,
    needsReply: outreachNeedsReply(r.status),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToTool(r: Record<string, unknown>): unknown {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description ?? null,
    status: r.status,
    isAvailable: r.is_available === 1,
    availabilityNote: r.availability_note ?? null,
    url: r.url ?? null,
    businessName: r.business_name ?? null,
    showcaseStatus: r.showcase_status ?? "private",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToAvailability(r: Record<string, unknown>): unknown {
  return {
    id: "primary",
    status: r.status,
    label: r.label ?? null,
    nextWindow: r.next_window ?? null,
    note: r.public_note ?? null,
    activeBuildTitle: r.active_build_title ?? null,
    activeBuildStage: r.active_build_stage ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToUsage(r: Record<string, unknown>): unknown {
  return {
    id: r.id,
    toolId: r.tool_id ?? null,
    toolKey: r.tool_key,
    usageDate: r.usage_date,
    views: r.views,
    offlineViews: r.offline_views,
    contactClicks: r.contact_clicks,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function proofKindOf(v: unknown): string {
  if (
    typeof v === "string" &&
    (PROOF_KINDS as readonly string[]).includes(v)
  ) {
    return v;
  }
  return "ops-note";
}

function rowToProof(r: Record<string, unknown>): unknown {
  return {
    id: r.id,
    title: r.title,
    body: r.body ?? null,
    permissionStatus: r.permission_status,
    relatedToolId: r.related_tool_id ?? null,
    kind: proofKindOf(r.kind),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToWorkItem(r: Record<string, unknown>): unknown {
  return {
    id: r.id,
    title: r.title,
    body: r.body ?? null,
    kind: proofKindOf(r.kind),
    relatedToolId: r.related_tool_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function idFromUrl(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 4) return null;
  const id = parts[3];
  if (!id || id.length > 80) return null;
  return id;
}

// GET /api/admin/overview
export async function handleAdminOverview(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  const gate = await requireAdmin(request, env);
  if ("denied" in gate) return gate.denied;
  if (request.method !== "GET") return adminError("Method not allowed.", 405);
  try {
    const intakeRows = await env.DB.prepare(
      "SELECT status, COUNT(*) AS n FROM intakes GROUP BY status",
    )
      .bind()
      .all<{ status: string; n: number }>();
    const outreachRows = await env.DB.prepare(
      "SELECT status, COUNT(*) AS n FROM outreach GROUP BY status",
    )
      .bind()
      .all<{ status: string; n: number }>();
    const toolRows = await env.DB.prepare(
      "SELECT status, COUNT(*) AS n FROM tools GROUP BY status",
    )
      .bind()
      .all<{ status: string; n: number }>();
    const usageRows = await env.DB.prepare(
      "SELECT COALESCE(SUM(views),0) AS v, COALESCE(SUM(offline_views),0) AS o, COALESCE(SUM(contact_clicks),0) AS c FROM usage_daily WHERE usage_date >= date('now','-6 days')",
    )
      .bind()
      .first<{ v: number; o: number; c: number }>();
    const pendingProof = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM proof_notes WHERE permission_status = 'pending'",
    )
      .bind()
      .first<{ n: number }>();
    const needingReply = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM outreach WHERE status IN ('messaged','no_reply')",
    )
      .bind()
      .first<{ n: number }>();
    let lastBackupDrillAt: string | null = null;
    try {
      const drill = await env.DB.prepare(
        "SELECT MAX(created_at) AS m FROM proof_notes WHERE kind = 'backup-drill'",
      )
        .bind()
        .first<{ m: string | null }>();
      lastBackupDrillAt =
        drill && typeof drill.m === "string" ? drill.m : null;
    } catch {
      lastBackupDrillAt = null;
    }
    let overdueFollowUps = 0;
    try {
      const overdue = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM outreach WHERE next_follow_up IS NOT NULL AND next_follow_up < date('now') AND status IN ('messaged','no_reply')",
      )
        .bind()
        .first<{ n: number }>();
      overdueFollowUps = Number(overdue?.n) || 0;
    } catch {
      overdueFollowUps = 0;
    }
    const toMap = (rows: { status: string; n: number }[]): Record<string, number> => {
      const m: Record<string, number> = {};
      for (const r of rows) m[r.status] = Number(r.n) || 0;
      return m;
    };
    let scheduledDue = 0;
    try {
      const due = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM posts WHERE status = 'scheduled' AND publish_at <= ?",
      )
        .bind(nowIso())
        .first<{ n: number }>();
      scheduledDue = Number(due?.n) || 0;
    } catch {
      scheduledDue = 0;
    }
    return adminJson({
      intakesByStatus: toMap(
        (intakeRows.results || []) as { status: string; n: number }[],
      ),
      outreachByStatus: toMap(
        (outreachRows.results || []) as { status: string; n: number }[],
      ),
      toolsByStatus: toMap(
        (toolRows.results || []) as { status: string; n: number }[],
      ),
      usageTotals7d: {
        views: Number(usageRows?.v) || 0,
        offlineViews: Number(usageRows?.o) || 0,
        contactClicks: Number(usageRows?.c) || 0,
      },
      pendingProofNotes: Number(pendingProof?.n) || 0,
      outreachNeedingReply: Number(needingReply?.n) || 0,
      lastBackupDrillAt,
      overdueFollowUps,
      scheduledDue,
    });
  } catch {
    return adminError("Could not load overview.", 500, "db-error");
  }
}

// GET, POST /api/admin/intakes and PATCH /api/admin/intakes/:id
// POST is owner manual entry. No Turnstile. Source is fixed to admin-manual.
export async function handleAdminIntakes(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  const gate = await requireAdmin(request, env);
  if ("denied" in gate) return gate.denied;
  const actor = auditActor(gate.sub);
  const url = new URL(request.url);

  if (request.method === "GET") {
    const status = url.searchParams.get("status");
    const { limit, offset } = parsePaging(url);
    try {
      let rows;
      let total = 0;
      if (status && (INTAKE_STATUSES as readonly string[]).includes(status)) {
        rows = await env.DB.prepare(
          "SELECT id, business_name, business_type, task_description, timeline, budget, contact_method, contact_value, source, status, email_notification, created_at, updated_at FROM intakes WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
        )
          .bind(status, limit, offset)
          .all();
        const t = await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM intakes WHERE status = ?",
        )
          .bind(status)
          .first<{ n: number }>();
        total = Number(t?.n) || 0;
      } else {
        rows = await env.DB.prepare(
          "SELECT id, business_name, business_type, task_description, timeline, budget, contact_method, contact_value, source, status, email_notification, created_at, updated_at FROM intakes ORDER BY created_at DESC LIMIT ? OFFSET ?",
        )
          .bind(limit, offset)
          .all();
        const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM intakes")
          .bind()
          .first<{ n: number }>();
        total = Number(t?.n) || 0;
      }
      return adminJson({
        items: (rows.results || []).map((r) => rowToIntake(r as Record<string, unknown>)),
        total,
        limit,
        offset,
      });
    } catch {
      return adminError("Could not list intakes.", 500, "db-error");
    }
  }

  if (request.method === "POST") {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid intake data.", 400, "bad-json");
    }
    const checked = validateManualIntakeInput(raw);
    if (!checked.ok || !checked.data) {
      return adminError(checked.error || "Invalid intake data.", 400, "validation");
    }
    const d = checked.data;
    const id = newId();
    const now = nowIso();
    try {
      await env.DB.prepare(
        "INSERT INTO intakes (id, business_name, business_type, task_description, timeline, budget, contact_method, contact_value, source, status, email_notification, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin-manual', 'new', 'pending', ?, ?)",
      )
        .bind(
          id,
          d.businessName,
          d.businessType,
          d.taskDescription,
          d.timeline,
          d.budget,
          d.contactMethod,
          d.contactValue,
          now,
          now,
        )
        .run();
      await insertAudit(env, {
        actor,
        action: "intake.create",
        entity: "intake",
        entityId: id,
        summary: "manual source admin-manual",
      });
      return adminJson(
        {
          id,
          saved: true,
          source: "admin-manual",
          status: "new",
          emailNotification: "pending",
        },
        201,
      );
    } catch {
      return adminError("Could not save intake.", 500, "db-error");
    }
  }

  if (request.method === "PATCH") {
    const id = idFromUrl(url);
    if (!id) return adminError("Missing intake id.", 400, "bad-id");
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid update.", 400, "bad-json");
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return adminError("Invalid update.", 400, "validation");
    }
    const rec = raw as Record<string, unknown>;
    // Explicit allowlist: only status may change from admin.
    if (findUnknownFields(rec, ["status"]).length > 0) {
      return adminError("Invalid update.", 400, "validation");
    }
    const next =
      typeof rec.status === "string" &&
      (INTAKE_STATUSES as readonly string[]).includes(rec.status)
        ? rec.status
        : null;
    if (!next) return adminError("Status is invalid.", 400, "validation");
    try {
      await env.DB.prepare(
        "UPDATE intakes SET status = ?, updated_at = ? WHERE id = ?",
      )
        .bind(next, nowIso(), id)
        .run();
      await insertAudit(env, {
        actor,
        action: "intake.update",
        entity: "intake",
        entityId: id,
        summary: "status -> " + next,
      });
      return adminJson({ id, status: next });
    } catch {
      return adminError("Could not update intake.", 500, "db-error");
    }
  }

  return adminError("Method not allowed.", 405);
}

// GET, POST /api/admin/outreach and PATCH /api/admin/outreach/:id
export async function handleAdminOutreach(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  const gate = await requireAdmin(request, env);
  if ("denied" in gate) return gate.denied;
  const actor = auditActor(gate.sub);
  const url = new URL(request.url);

  if (request.method === "GET") {
    const { limit, offset } = parsePaging(url);
    const status = url.searchParams.get("status");
    try {
      let rows;
      let total = 0;
      if (status) {
        if (!(OUTREACH_STATUSES as readonly string[]).includes(status)) {
          return adminError("Outreach status is invalid.", 400, "validation");
        }
        rows = await env.DB.prepare(
          "SELECT id, business_name, contact, channel, status, notes, next_follow_up, last_contact_at, created_at, updated_at FROM outreach WHERE status = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?",
        )
          .bind(status, limit, offset)
          .all();
        const t = await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM outreach WHERE status = ?",
        )
          .bind(status)
          .first<{ n: number }>();
        total = Number(t?.n) || 0;
      } else {
        rows = await env.DB.prepare(
          "SELECT id, business_name, contact, channel, status, notes, next_follow_up, last_contact_at, created_at, updated_at FROM outreach ORDER BY updated_at DESC LIMIT ? OFFSET ?",
        )
          .bind(limit, offset)
          .all();
        const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM outreach")
          .bind()
          .first<{ n: number }>();
        total = Number(t?.n) || 0;
      }
      return adminJson({
        items: (rows.results || []).map((r) => rowToOutreach(r as Record<string, unknown>)),
        total,
        limit,
        offset,
      });
    } catch {
      return adminError("Could not list outreach.", 500, "db-error");
    }
  }

  if (request.method === "POST") {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid outreach data.", 400, "bad-json");
    }
    const checked = validateOutreachInput(raw);
    if (!checked.ok || !checked.data) {
      return adminError(checked.error || "Invalid outreach data.", 400, "validation");
    }
    const d = checked.data;
    const id = newId();
    const now = nowIso();
    try {
      await env.DB.prepare(
        "INSERT INTO outreach (id, business_name, contact, channel, status, notes, next_follow_up, last_contact_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(id, d.businessName, d.contact, d.channel, d.status, d.notes, d.nextFollowUp, d.lastContactAt, now, now)
        .run();
      await insertAudit(env, {
        actor,
        action: "outreach.create",
        entity: "outreach",
        entityId: id,
        summary: "created status " + d.status,
      });
      return adminJson(
        { id, status: d.status, needsReply: outreachNeedsReply(d.status) },
        201,
      );
    } catch {
      return adminError("Could not create outreach.", 500, "db-error");
    }
  }

  if (request.method === "PATCH") {
    const id = idFromUrl(url);
    if (!id) return adminError("Missing outreach id.", 400, "bad-id");
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid outreach data.", 400, "bad-json");
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return adminError("Invalid outreach data.", 400, "validation");
    }
    const rec = raw as Record<string, unknown>;
    const allowed = ["businessName", "contact", "channel", "status", "notes", "nextFollowUp", "lastContactAt"];
    if (findUnknownFields(rec, allowed).length > 0) {
      return adminError("Invalid outreach data.", 400, "validation");
    }
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (rec.businessName !== undefined) {
      if (typeof rec.businessName !== "string" || rec.businessName.trim().length < 2 || rec.businessName.trim().length > 120) {
        return adminError("Business name is invalid.", 400, "validation");
      }
      sets.push("business_name = ?");
      vals.push(rec.businessName.trim());
    }
    if (rec.status !== undefined) {
      if (typeof rec.status !== "string" || !(OUTREACH_STATUSES as readonly string[]).includes(rec.status)) {
        return adminError("Outreach status is invalid.", 400, "validation");
      }
      sets.push("status = ?");
      vals.push(rec.status);
    }
    if (rec.contact !== undefined) {
      if (rec.contact !== null && rec.contact !== "" && typeof rec.contact !== "string") {
        return adminError("Contact value is invalid.", 400, "validation");
      }
      const t = rec.contact === null || rec.contact === "" ? null : (rec.contact as string).trim();
      if (t !== null && (t.length < 1 || t.length > 160)) {
        return adminError("Contact value is invalid.", 400, "validation");
      }
      const v = t === "" ? null : t;
      sets.push("contact = ?");
      vals.push(v);
    }
    if (rec.channel !== undefined) {
      if (rec.channel !== null && rec.channel !== "" && typeof rec.channel !== "string") {
        return adminError("Channel value is invalid.", 400, "validation");
      }
      const t = rec.channel === null || rec.channel === "" ? null : (rec.channel as string).trim();
      if (t !== null && (t.length < 1 || t.length > 60)) {
        return adminError("Channel value is invalid.", 400, "validation");
      }
      const v = t === "" ? null : t;
      sets.push("channel = ?");
      vals.push(v);
    }
    if (rec.notes !== undefined) {
      if (rec.notes !== null && rec.notes !== "" && typeof rec.notes !== "string") {
        return adminError("Notes are invalid.", 400, "validation");
      }
      const t = rec.notes === null || rec.notes === "" ? null : (rec.notes as string).trim();
      if (t !== null && (t.length < 1 || t.length > 2000)) {
        return adminError("Notes are too long.", 400, "validation");
      }
      sets.push("notes = ?");
      vals.push(t);
    }
    if (rec.nextFollowUp !== undefined) {
      if (rec.nextFollowUp !== null && rec.nextFollowUp !== "" && typeof rec.nextFollowUp !== "string") {
        return adminError("Follow up date must be YYYY-MM-DD.", 400, "validation");
      }
      const t = rec.nextFollowUp === null || rec.nextFollowUp === "" ? null : (rec.nextFollowUp as string).trim();
      if (t !== null && !/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        return adminError("Follow up date must be YYYY-MM-DD.", 400, "validation");
      }
      sets.push("next_follow_up = ?");
      vals.push(t);
    }
    if (rec.lastContactAt !== undefined) {
      if (rec.lastContactAt !== null && rec.lastContactAt !== "" && typeof rec.lastContactAt !== "string") {
        return adminError("Last contact date is invalid.", 400, "validation");
      }
      const t = rec.lastContactAt === null || rec.lastContactAt === "" ? null : (rec.lastContactAt as string).trim();
      if (t !== null && t.length > 32) {
        return adminError("Last contact date is invalid.", 400, "validation");
      }
      if (t !== null && !/^\d{4}-\d{2}-\d{2}$/.test(t) && Number.isNaN(Date.parse(t))) {
        return adminError("Last contact date is invalid.", 400, "validation");
      }
      sets.push("last_contact_at = ?");
      vals.push(t);
    }
    if (sets.length === 0) return adminError("Nothing to update.", 400, "validation");
    sets.push("updated_at = ?");
    vals.push(nowIso());
    vals.push(id);
    let nextStatus: string | undefined;
    if (typeof rec.status === "string") nextStatus = rec.status;
    try {
      await env.DB.prepare(
        "UPDATE outreach SET " + sets.join(", ") + " WHERE id = ?",
      )
        .bind(...vals)
        .run();
      await insertAudit(env, {
        actor,
        action: "outreach.update",
        entity: "outreach",
        entityId: id,
        summary: "fields " + sets.length,
      });
      if (nextStatus !== undefined) {
        return adminJson({ id, status: nextStatus, needsReply: outreachNeedsReply(nextStatus) });
      }
      return adminJson({ id });
    } catch {
      return adminError("Could not update outreach.", 500, "db-error");
    }
  }

  return adminError("Method not allowed.", 405);
}

// GET, POST /api/admin/tools and PATCH /api/admin/tools/:id
export async function handleAdminTools(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  const gate = await requireAdmin(request, env);
  if ("denied" in gate) return gate.denied;
  const actor = auditActor(gate.sub);
  const url = new URL(request.url);

  if (request.method === "GET") {
    const { limit, offset } = parsePaging(url);
    try {
      const rows = await env.DB.prepare(
        "SELECT id, name, slug, description, status, is_available, availability_note, url, business_name, showcase_status, created_at, updated_at FROM tools ORDER BY updated_at DESC LIMIT ? OFFSET ?",
      )
        .bind(limit, offset)
        .all();
      const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM tools")
        .bind()
        .first<{ n: number }>();
      return adminJson({
        items: (rows.results || []).map((r) => rowToTool(r as Record<string, unknown>)),
        total: Number(t?.n) || 0,
        limit,
        offset,
      });
    } catch {
      return adminError("Could not list tools.", 500, "db-error");
    }
  }

  if (request.method === "POST") {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid tool data.", 400, "bad-json");
    }
    const checked = validateToolInput(raw);
    if (!checked.ok || !checked.data) {
      return adminError(checked.error || "Invalid tool data.", 400, "validation");
    }
    const d = checked.data;
    const id = newId();
    const now = nowIso();
    try {
      await env.DB.prepare(
        "INSERT INTO tools (id, name, slug, description, status, is_available, availability_note, url, business_name, showcase_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(id, d.name, d.slug, d.description, d.status, d.isAvailable, d.availabilityNote, d.url, d.businessName, d.showcaseStatus, now, now)
        .run();
      await insertAudit(env, {
        actor,
        action: "tool.create",
        entity: "tool",
        entityId: id,
        summary: "slug " + d.slug + " status " + d.status,
      });
      return adminJson(
        {
          id,
          slug: d.slug,
          status: d.status,
          isAvailable: d.isAvailable === 1,
          businessName: d.businessName,
          showcaseStatus: d.showcaseStatus,
        },
        201,
      );
    } catch {
      return adminError("Could not create tool. Slug may exist.", 500, "db-error");
    }
  }

  if (request.method === "PATCH") {
    const id = idFromUrl(url);
    if (!id) return adminError("Missing tool id.", 400, "bad-id");
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid tool data.", 400, "bad-json");
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return adminError("Invalid tool data.", 400, "validation");
    }
    const rec = raw as Record<string, unknown>;
    const allowed = ["name", "slug", "description", "status", "isAvailable", "availabilityNote", "url", "businessName", "showcaseStatus"];
    if (findUnknownFields(rec, allowed).length > 0) {
      return adminError("Invalid tool data.", 400, "validation");
    }
    const sets: string[] = [];
    const vals: unknown[] = [];
    let nextBusinessName: string | null | undefined;
    let nextShowcase: string | undefined;
    if (rec.name !== undefined) {
      if (typeof rec.name !== "string" || rec.name.trim().length < 2 || rec.name.trim().length > 80) {
        return adminError("Tool name is invalid.", 400, "validation");
      }
      sets.push("name = ?");
      vals.push(rec.name.trim());
    }
    if (rec.slug !== undefined) {
      if (typeof rec.slug !== "string" || !/^[a-z0-9-]{2,60}$/.test(rec.slug.trim())) {
        return adminError("Tool slug is invalid.", 400, "validation");
      }
      sets.push("slug = ?");
      vals.push(rec.slug.trim());
    }
    if (rec.description !== undefined) {
      if (rec.description !== null && rec.description !== "" && typeof rec.description !== "string") {
        return adminError("Description is invalid.", 400, "validation");
      }
      const t = rec.description === null || rec.description === "" ? null : (rec.description as string).trim();
      if (t !== null && t.length > 2000) return adminError("Description is too long.", 400, "validation");
      sets.push("description = ?");
      vals.push(t);
    }
    if (rec.status !== undefined) {
      const list = ["draft", "active", "paused", "retired"];
      if (typeof rec.status !== "string" || !list.includes(rec.status)) {
        return adminError("Tool status is invalid.", 400, "validation");
      }
      sets.push("status = ?");
      vals.push(rec.status);
    }
    if (rec.isAvailable !== undefined) {
      const v =
        rec.isAvailable === true || rec.isAvailable === 1
          ? 1
          : rec.isAvailable === false || rec.isAvailable === 0
            ? 0
            : -1;
      if (v === -1) return adminError("Availability is invalid.", 400, "validation");
      sets.push("is_available = ?");
      vals.push(v);
    }
    if (rec.availabilityNote !== undefined) {
      if (rec.availabilityNote !== null && rec.availabilityNote !== "" && typeof rec.availabilityNote !== "string") {
        return adminError("Availability note is invalid.", 400, "validation");
      }
      const t = rec.availabilityNote === null || rec.availabilityNote === "" ? null : (rec.availabilityNote as string).trim();
      if (t !== null && t.length > 240) return adminError("Availability note is too long.", 400, "validation");
      sets.push("availability_note = ?");
      vals.push(t);
    }
    if (rec.url !== undefined) {
      if (rec.url !== null && rec.url !== "" && typeof rec.url !== "string") {
        return adminError("Tool URL is invalid.", 400, "validation");
      }
      const t = rec.url === null || rec.url === "" ? null : (rec.url as string).trim();
      if (t !== null && t.length > 500) return adminError("Tool URL is too long.", 400, "validation");
      if (t !== null && !/^https?:\/\/.+/.test(t)) {
        return adminError("Tool URL must start with http.", 400, "validation");
      }
      sets.push("url = ?");
      vals.push(t);
    }
    if (rec.businessName !== undefined) {
      if (rec.businessName !== null && rec.businessName !== "" && typeof rec.businessName !== "string") {
        return adminError("Business name is invalid.", 400, "validation");
      }
      const t = rec.businessName === null || rec.businessName === "" ? null : (rec.businessName as string).trim();
      if (t !== null && (t.length < 2 || t.length > 80)) {
        return adminError("Business name is invalid.", 400, "validation");
      }
      sets.push("business_name = ?");
      vals.push(t);
      nextBusinessName = t;
    }
    if (rec.showcaseStatus !== undefined) {
      if (typeof rec.showcaseStatus !== "string" || !(SHOWCASE_STATUSES as readonly string[]).includes(rec.showcaseStatus)) {
        return adminError("Showcase status is invalid.", 400, "validation");
      }
      sets.push("showcase_status = ?");
      vals.push(rec.showcaseStatus);
      nextShowcase = rec.showcaseStatus as string;
    }
    if (sets.length === 0) return adminError("Nothing to update.", 400, "validation");
    sets.push("updated_at = ?");
    vals.push(nowIso());
    vals.push(id);
    try {
      await env.DB.prepare("UPDATE tools SET " + sets.join(", ") + " WHERE id = ?")
        .bind(...vals)
        .run();
      await insertAudit(env, {
        actor,
        action: "tool.update",
        entity: "tool",
        entityId: id,
        summary: "fields " + sets.length,
      });
      let current: Record<string, unknown> | null = null;
      try {
        current = await env.DB.prepare(
          "SELECT business_name, showcase_status FROM tools WHERE id = ?",
        )
          .bind(id)
          .first<Record<string, unknown>>();
      } catch {
        current = null;
      }
      const out: Record<string, unknown> = { id };
      if (current && (current.business_name !== undefined || current.showcase_status !== undefined)) {
        out.businessName = current.business_name ?? nextBusinessName ?? null;
        out.showcaseStatus = current.showcase_status ?? nextShowcase ?? "private";
      } else {
        if (nextBusinessName !== undefined) out.businessName = nextBusinessName;
        if (nextShowcase !== undefined) out.showcaseStatus = nextShowcase;
        if (out.businessName === undefined || out.showcaseStatus === undefined) {
          try {
            const fallback = await env.DB.prepare(
              "SELECT business_name, showcase_status FROM tools WHERE id = ?",
            )
              .bind(id)
              .first<Record<string, unknown>>();
            if (fallback) {
              if (out.businessName === undefined) out.businessName = fallback.business_name ?? null;
              if (out.showcaseStatus === undefined) out.showcaseStatus = fallback.showcase_status ?? "private";
            }
          } catch {
            // Keep echo values only.
          }
        }
      }
      return adminJson(out);
    } catch {
      return adminError("Could not update tool.", 500, "db-error");
    }
  }

  return adminError("Method not allowed.", 405);
}

// GET /api/admin/usage (read only aggregates, no PII columns selected)
export async function handleAdminUsage(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  const gate = await requireAdmin(request, env);
  if ("denied" in gate) return gate.denied;
  if (request.method !== "GET") return adminError("Method not allowed.", 405);
  const url = new URL(request.url);
  const { limit, offset } = parsePaging(url);
  const rawKey = url.searchParams.get("toolKey");
  const toolKey =
    rawKey === null || rawKey === "" ? null : rawKey.trim().slice(0, 60);
  try {
    let rows;
    let total = 0;
    if (toolKey) {
      rows = await env.DB.prepare(
        "SELECT id, tool_id, tool_key, usage_date, views, offline_views, contact_clicks, created_at, updated_at FROM usage_daily WHERE tool_key = ? ORDER BY usage_date DESC LIMIT ? OFFSET ?",
      )
        .bind(toolKey, limit, offset)
        .all();
      const t = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM usage_daily WHERE tool_key = ?",
      )
        .bind(toolKey)
        .first<{ n: number }>();
      total = Number(t?.n) || 0;
    } else {
      rows = await env.DB.prepare(
        "SELECT id, tool_id, tool_key, usage_date, views, offline_views, contact_clicks, created_at, updated_at FROM usage_daily ORDER BY usage_date DESC LIMIT ? OFFSET ?",
      )
        .bind(limit, offset)
        .all();
      const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM usage_daily")
        .bind()
        .first<{ n: number }>();
      total = Number(t?.n) || 0;
    }
    return adminJson({
      items: (rows.results || []).map((r) => rowToUsage(r as Record<string, unknown>)),
      total,
      limit,
      offset,
    });
  } catch {
    return adminError("Could not load usage.", 500, "db-error");
  }
}

// GET, POST /api/admin/proof-notes and PATCH /api/admin/proof-notes/:id
export async function handleAdminProofNotes(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  const gate = await requireAdmin(request, env);
  if ("denied" in gate) return gate.denied;
  const actor = auditActor(gate.sub);
  const url = new URL(request.url);

  if (request.method === "GET") {
    const { limit, offset } = parsePaging(url);
    const rawPerm = url.searchParams.get("permission");
    const permission =
      rawPerm === null || rawPerm === "" ? null : rawPerm.trim().slice(0, 20);
    const rawKind = url.searchParams.get("kind");
    const kindFilter =
      rawKind === null || rawKind === "" ? null : rawKind.trim().slice(0, 20);
    if (
      kindFilter &&
      !(PROOF_KINDS as readonly string[]).includes(kindFilter)
    ) {
      return adminError("Kind value is invalid.", 400, "validation");
    }
    try {
      let rows;
      let total = 0;
      if (permission && kindFilter) {
        rows = await env.DB.prepare(
          "SELECT id, title, body, permission_status, related_tool_id, kind, created_at, updated_at FROM proof_notes WHERE permission_status = ? AND kind = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
        )
          .bind(permission, kindFilter, limit, offset)
          .all();
        const t = await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM proof_notes WHERE permission_status = ? AND kind = ?",
        )
          .bind(permission, kindFilter)
          .first<{ n: number }>();
        total = Number(t?.n) || 0;
      } else if (permission) {
        try {
          rows = await env.DB.prepare(
            "SELECT id, title, body, permission_status, related_tool_id, kind, created_at, updated_at FROM proof_notes WHERE permission_status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
          )
            .bind(permission, limit, offset)
            .all();
        } catch {
          rows = await env.DB.prepare(
            "SELECT id, title, body, permission_status, related_tool_id, created_at, updated_at FROM proof_notes WHERE permission_status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
          )
            .bind(permission, limit, offset)
            .all();
        }
        const t = await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM proof_notes WHERE permission_status = ?",
        )
          .bind(permission)
          .first<{ n: number }>();
        total = Number(t?.n) || 0;
      } else if (kindFilter) {
        rows = await env.DB.prepare(
          "SELECT id, title, body, permission_status, related_tool_id, kind, created_at, updated_at FROM proof_notes WHERE kind = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
        )
          .bind(kindFilter, limit, offset)
          .all();
        const t = await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM proof_notes WHERE kind = ?",
        )
          .bind(kindFilter)
          .first<{ n: number }>();
        total = Number(t?.n) || 0;
      } else {
        try {
          rows = await env.DB.prepare(
            "SELECT id, title, body, permission_status, related_tool_id, kind, created_at, updated_at FROM proof_notes ORDER BY created_at DESC LIMIT ? OFFSET ?",
          )
            .bind(limit, offset)
            .all();
        } catch {
          rows = await env.DB.prepare(
            "SELECT id, title, body, permission_status, related_tool_id, created_at, updated_at FROM proof_notes ORDER BY created_at DESC LIMIT ? OFFSET ?",
          )
            .bind(limit, offset)
            .all();
        }
        const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM proof_notes")
          .bind()
          .first<{ n: number }>();
        total = Number(t?.n) || 0;
      }
      return adminJson({
        items: (rows.results || []).map((r) => rowToProof(r as Record<string, unknown>)),
        total,
        limit,
        offset,
      });
    } catch {
      return adminError("Could not list notes.", 500, "db-error");
    }
  }

  if (request.method === "POST") {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid note data.", 400, "bad-json");
    }
    const checked = validateProofNoteInput(raw);
    if (!checked.ok || !checked.data) {
      return adminError(checked.error || "Invalid note data.", 400, "validation");
    }
    const d = checked.data;
    const id = newId();
    const now = nowIso();
    try {
      try {
        await env.DB.prepare(
          "INSERT INTO proof_notes (id, title, body, permission_status, related_tool_id, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(id, d.title, d.body, d.permissionStatus, d.relatedToolId, d.kind, now, now)
          .run();
      } catch {
        await env.DB.prepare(
          "INSERT INTO proof_notes (id, title, body, permission_status, related_tool_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(id, d.title, d.body, d.permissionStatus, d.relatedToolId, now, now)
          .run();
      }
      await insertAudit(env, {
        actor,
        action: "proof.create",
        entity: "proof_note",
        entityId: id,
        summary: "permission " + d.permissionStatus + " kind " + d.kind,
      });
      return adminJson({ id, kind: d.kind }, 201);
    } catch {
      return adminError("Could not create note.", 500, "db-error");
    }
  }

  if (request.method === "PATCH") {
    const id = idFromUrl(url);
    if (!id) return adminError("Missing note id.", 400, "bad-id");
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid update.", 400, "bad-json");
    }
    const checked = validateProofNotePatch(raw);
    if (!checked.ok || !checked.data) {
      return adminError(checked.error || "Invalid update.", 400, "validation");
    }
    const patch = checked.data;
    try {
      let current: Record<string, unknown> | null = null;
      try {
        current = await env.DB.prepare(
          "SELECT id, permission_status, kind FROM proof_notes WHERE id = ?",
        )
          .bind(id)
          .first<Record<string, unknown>>();
      } catch {
        current = await env.DB.prepare(
          "SELECT id, permission_status FROM proof_notes WHERE id = ?",
        )
          .bind(id)
          .first<Record<string, unknown>>();
      }
      if (!current) return adminError("Note not found.", 404, "not-found");
      const beforePerm =
        typeof current.permission_status === "string"
          ? current.permission_status
          : "pending";
      const beforeKind = proofKindOf(current.kind);
      const nextPerm = patch.permissionStatus ?? beforePerm;
      const nextKind = patch.kind ?? beforeKind;
      try {
        await env.DB.prepare(
          "UPDATE proof_notes SET permission_status = ?, kind = ?, updated_at = ? WHERE id = ?",
        )
          .bind(nextPerm, nextKind, nowIso(), id)
          .run();
      } catch {
        if (patch.kind !== undefined && patch.permissionStatus === undefined) {
          return adminError("Could not update note.", 500, "db-error");
        }
        await env.DB.prepare(
          "UPDATE proof_notes SET permission_status = ?, updated_at = ? WHERE id = ?",
        )
          .bind(nextPerm, nowIso(), id)
          .run();
      }
      await insertAudit(env, {
        actor,
        action: "proof.update",
        entity: "proof_note",
        entityId: id,
        summary:
          "permission " +
          beforePerm +
          " -> " +
          nextPerm +
          " kind " +
          beforeKind +
          " -> " +
          nextKind,
      });
      return adminJson({ id, permissionStatus: nextPerm, kind: nextKind });
    } catch {
      return adminError("Could not update note.", 500, "db-error");
    }
  }

  return adminError("Method not allowed.", 405);
}

// GET, PUT /api/admin/availability. Access gate required.
// GET returns {configured, availability}. PUT upserts the primary row.
export async function handleAdminAvailability(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  const gate = await requireAdmin(request, env);
  if ("denied" in gate) return gate.denied;
  const actor = auditActor(gate.sub);

  if (request.method === "GET") {
    try {
      const row = await env.DB.prepare(
        "SELECT id, status, label, next_window, public_note, active_build_title, active_build_stage, created_at, updated_at FROM site_availability WHERE id = 'primary'",
      )
        .bind()
        .first<Record<string, unknown>>();
      if (!row) {
        return adminJson({ configured: false, availability: null });
      }
      return adminJson({ configured: true, availability: rowToAvailability(row) });
    } catch {
      return adminError("Could not load availability.", 500, "db-error");
    }
  }

  if (request.method === "PUT") {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid availability data.", 400, "bad-json");
    }
    const checked = validateAvailabilityInput(raw);
    if (!checked.ok || !checked.data) {
      return adminError(
        checked.error || "Invalid availability data.",
        400,
        "validation",
      );
    }
    const d = checked.data;
    const now = nowIso();
    try {
      const existing = await env.DB.prepare(
        "SELECT created_at FROM site_availability WHERE id = 'primary'",
      )
        .bind()
        .first<{ created_at: string }>();
      const createdAt = existing?.created_at || now;
      await env.DB.prepare(
        "INSERT INTO site_availability (id, status, label, next_window, public_note, active_build_title, active_build_stage, created_at, updated_at) VALUES ('primary', ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, label = excluded.label, next_window = excluded.next_window, public_note = excluded.public_note, active_build_title = excluded.active_build_title, active_build_stage = excluded.active_build_stage, updated_at = excluded.updated_at",
      )
        .bind(
          d.status,
          d.label,
          d.nextWindow,
          d.note,
          d.activeBuildTitle,
          d.activeBuildStage,
          createdAt,
          now,
        )
        .run();
      await insertAudit(env, {
        actor,
        action: "availability.update",
        entity: "site_availability",
        entityId: "primary",
        summary: "status " + d.status,
      });
      const row = await env.DB.prepare(
        "SELECT id, status, label, next_window, public_note, active_build_title, active_build_stage, created_at, updated_at FROM site_availability WHERE id = 'primary'",
      )
        .bind()
        .first<Record<string, unknown>>();
      const availability = row
        ? rowToAvailability(row)
        : {
            id: "primary",
            status: d.status,
            label: d.label,
            nextWindow: d.nextWindow,
            note: d.note,
            activeBuildTitle: d.activeBuildTitle,
            activeBuildStage: d.activeBuildStage,
            createdAt,
            updatedAt: now,
          };
      return adminJson({ configured: true, availability });
    } catch {
      return adminError("Could not save availability.", 500, "db-error");
    }
  }

  return adminError("Method not allowed.", 405);
}

// GET /api/public/availability. No auth. Only public fields.
export async function handlePublicAvailability(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  if (request.method !== "GET") return publicError("Method not allowed.", 405);
  try {
    const row = await env.DB.prepare(
      "SELECT status, label, next_window, public_note FROM site_availability WHERE id = 'primary'",
    )
      .bind()
      .first<Record<string, unknown>>();
    if (!row) {
      return publicJson({
        configured: false,
        status: "not-configured",
        label: null,
        nextWindow: null,
        note: null,
      });
    }
    return publicJson({
      configured: true,
      status: row.status,
      label: row.label ?? null,
      nextWindow: row.next_window ?? null,
      note: row.public_note ?? null,
    });
  } catch {
    return publicError("Could not load availability.", 500, "db-error");
  }
}

// GET /api/admin/system. Presence booleans only, never secret values.
export async function handleAdminSystem(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  const gate = await requireAdmin(request, env);
  if ("denied" in gate) return gate.denied;
  if (request.method !== "GET") return adminError("Method not allowed.", 405);
  const accessVarsSet = Boolean(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD);
  const turnstileSecretSet = Boolean(env.TURNSTILE_SECRET_KEY);
  let dbOk = false;
  try {
    await env.DB.prepare("SELECT 1 AS ok").bind().first<{ ok: number }>();
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return adminJson({ accessVarsSet, turnstileSecretSet, dbOk });
}

// GET /api/public/work-items. Approved real proof plus labeled samples only.
// Filters to permission approved and kind proof or sample-concept. Every item
// carries kind so the UI can label samples and never present them as real proof.
export async function handlePublicWorkItems(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  if (request.method !== "GET") return publicError("Method not allowed.", 405);
  try {
    let rows: Record<string, unknown>[] = [];
    try {
      const res = await env.DB.prepare(
        "SELECT id, title, body, kind, related_tool_id, created_at, updated_at FROM proof_notes WHERE permission_status = 'approved' AND kind IN ('proof','sample-concept') ORDER BY created_at DESC LIMIT 100",
      )
        .bind()
        .all<Record<string, unknown>>();
      rows = (res.results || []) as Record<string, unknown>[];
    } catch {
      // Kind column missing on an old database. Return empty rather than
      // mislabeling rows. Migration 0002 adds the column.
      try {
        const fallback = await env.DB.prepare(
          "SELECT id, title, body, related_tool_id, created_at, updated_at FROM proof_notes WHERE permission_status = 'approved' ORDER BY created_at DESC LIMIT 100",
        )
          .bind()
          .all<Record<string, unknown>>();
        const fb = (fallback.results || []) as Record<string, unknown>[];
        // Without kind we cannot prove sample labeling, so stay empty.
        void fb;
        rows = [];
      } catch {
        rows = [];
      }
    }
    const items = rows.map((r) => rowToWorkItem(r));
    return publicJson({ items, total: items.length });
  } catch {
    return publicError("Could not load work items.", 500, "db-error");
  }
}

function displayVisibleOf(row: Record<string, unknown> | null): boolean {
  if (!row) return false;
  const v = row.proof_visible;
  return v === 1 || v === true || v === "1";
}

// GET, PUT /api/admin/display. Access gate required.
// Shape is always { proofVisible: boolean }. Proof stays hidden until the
// owner turns it on. PUT writes an audit row.
export async function handleAdminDisplay(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  const gate = await requireAdmin(request, env);
  if ("denied" in gate) return gate.denied;
  const actor = auditActor(gate.sub);

  if (request.method === "GET") {
    try {
      const row = await env.DB.prepare(
        "SELECT proof_visible FROM display_settings WHERE id = 'primary'",
      )
        .bind()
        .first<Record<string, unknown>>();
      return adminJson({ proofVisible: displayVisibleOf(row) });
    } catch {
      // Table missing before migration 0003. Default stays hidden.
      return adminJson({ proofVisible: false });
    }
  }

  if (request.method === "PUT") {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid display data.", 400, "bad-json");
    }
    const checked = validateDisplayInput(raw);
    if (!checked.ok || !checked.data) {
      return adminError(
        checked.error || "Invalid display data.",
        400,
        "validation",
      );
    }
    const now = nowIso();
    const visible = checked.data.proofVisible ? 1 : 0;
    try {
      const existing = await env.DB.prepare(
        "SELECT created_at FROM display_settings WHERE id = 'primary'",
      )
        .bind()
        .first<{ created_at: string }>();
      const createdAt = existing?.created_at || now;
      await env.DB.prepare(
        "INSERT INTO display_settings (id, proof_visible, created_at, updated_at) VALUES ('primary', ?, ?, ?) ON CONFLICT(id) DO UPDATE SET proof_visible = excluded.proof_visible, updated_at = excluded.updated_at",
      )
        .bind(visible, createdAt, now)
        .run();
      await insertAudit(env, {
        actor,
        action: "display.update",
        entity: "display_settings",
        entityId: "primary",
        summary: "proofVisible " + String(checked.data.proofVisible),
      });
      return adminJson({ proofVisible: checked.data.proofVisible });
    } catch {
      return adminError("Could not save display.", 500, "db-error");
    }
  }

  return adminError("Method not allowed.", 405);
}

// GET /api/public/display. No auth. Shape { proofVisible: boolean }.
// Public cache for 60 seconds via publicJson.
export async function handlePublicDisplay(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  if (request.method !== "GET") return publicError("Method not allowed.", 405);
  try {
    const row = await env.DB.prepare(
      "SELECT proof_visible FROM display_settings WHERE id = 'primary'",
    )
      .bind()
      .first<Record<string, unknown>>();
    return publicJson({ proofVisible: displayVisibleOf(row) });
  } catch {
    // Table missing before migration 0003. Default stays hidden.
    return publicJson({ proofVisible: false });
  }
}
