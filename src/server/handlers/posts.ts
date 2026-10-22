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
  validatePostInput,
  validatePostPatch,
} from "../validation.ts";
import {
  buildSitemapXml,
  normalizePostKind,
  publicPostKind,
  sitemapOriginForRequest,
} from "../../shared/post-scheduling.ts";

// Posts scheduling backend. Admin manages drafts and schedules. Cron flips
// due scheduled rows to published. Public reads published rows only.
// Kind splits posts: post is a short studio note, know-how is a guide.
// Missing kind defaults to post. knowhow without a hyphen is an input alias.

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

function rowToPost(r: Record<string, unknown>): unknown {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    body: r.body ?? null,
    status: r.status,
    kind: publicPostKind(r),
    publishAt: r.publish_at ?? null,
    publishedAt: r.published_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToPublicPost(r: Record<string, unknown>): unknown {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    body: r.body ?? null,
    kind: publicPostKind(r),
    publishAt: r.publish_at ?? null,
    publishedAt: r.published_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function postIdFromUrl(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 4) return null;
  const id = parts[3];
  if (!id || id.length > 80) return null;
  return id;
}

function postSlugFromUrl(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 4) return null;
  const slug = decodeURIComponent(parts[3] || "");
  if (!slug || slug.length > 60) return null;
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  return slug;
}

function missingPostsTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || "");
  return msg.toLowerCase().includes("no such table");
}

function missingKindColumn(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || "");
  const m = msg.toLowerCase();
  return m.includes("no such column") && m.includes("kind");
}

function kindFilterOf(url: URL): { ok: true; value: string | null } | { ok: false; error: string } {
  const raw = url.searchParams.get("kind");
  if (raw === null || raw === "") return { ok: true, value: null };
  const k = normalizePostKind(raw);
  if (!k) return { ok: false, error: "Post kind is invalid." };
  return { ok: true, value: k };
}

function kindSqlValues(kind: string): string[] {
  if (kind === "know-how") return ["know-how", "knowhow"];
  return ["post"];
}

// GET, POST, PUT /api/admin/posts and GET, PATCH, PUT /api/admin/posts/:id
export async function handleAdminPosts(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  const gate = await requireAdmin(request, env);
  if ("denied" in gate) return gate.denied;
  const actor = auditActor(gate.sub);
  const url = new URL(request.url);
  const id = postIdFromUrl(url);
  const hasId = url.pathname.split("/").filter(Boolean).length >= 4;

  if (request.method === "GET" && !hasId) {
    const status = url.searchParams.get("status");
    const kindChecked = kindFilterOf(url);
    if (!kindChecked.ok) {
      return adminError(kindChecked.error, 400, "validation");
    }
    const kind = kindChecked.value;
    const { limit, offset } = parsePaging(url);
    if (status) {
      const allowed = ["draft", "scheduled", "published", "unpublished"];
      if (!allowed.includes(status)) {
        return adminError("Post status is invalid.", 400, "validation");
      }
    }
    const order =
      status === "scheduled"
        ? "ORDER BY publish_at ASC"
        : "ORDER BY updated_at DESC";
    const runList = async (withKind: boolean) => {
      const conds: string[] = [];
      const vals: unknown[] = [];
      if (status) {
        conds.push("status = ?");
        vals.push(status);
      }
      if (kind && withKind) {
        const kv = kindSqlValues(kind);
        if (kv.length === 1) {
          conds.push("kind = ?");
          vals.push(kv[0]);
        } else {
          conds.push("kind IN (?, ?)");
          vals.push(kv[0], kv[1]);
        }
      }
      const where = conds.length > 0 ? "WHERE " + conds.join(" AND ") + " " : "";
      const cols = withKind
        ? "id, slug, title, body, status, kind, publish_at, published_at, created_at, updated_at"
        : "id, slug, title, body, status, publish_at, published_at, created_at, updated_at";
      const rows = await env.DB.prepare(
        "SELECT " + cols + " FROM posts " + where + order + " LIMIT ? OFFSET ?",
      )
        .bind(...vals, limit, offset)
        .all();
      const t = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM posts " + where,
      )
        .bind(...vals)
        .first<{ n: number }>();
      return { rows, total: Number(t?.n) || 0 };
    };
    try {
      try {
        const { rows, total } = await runList(true);
        return adminJson({
          items: (rows.results || []).map((r) =>
            rowToPost(r as Record<string, unknown>),
          ),
          total,
          limit,
          offset,
        });
      } catch (err) {
        if (!missingKindColumn(err)) throw err;
        if (kind === "know-how") {
          return adminJson({ items: [], total: 0, limit, offset });
        }
        const { rows, total } = await runList(false);
        return adminJson({
          items: (rows.results || []).map((r) =>
            rowToPost(r as Record<string, unknown>),
          ),
          total,
          limit,
          offset,
        });
      }
    } catch (err) {
      if (missingPostsTable(err)) {
        const { limit, offset } = parsePaging(url);
        return adminJson({ items: [], total: 0, limit, offset });
      }
      return adminError("Could not list posts.", 500, "db-error");
    }
  }

  if (request.method === "GET" && hasId) {
    if (!id) return adminError("Missing post id.", 400, "bad-id");
    try {
      let row: Record<string, unknown> | null = null;
      try {
        row = await env.DB.prepare(
          "SELECT id, slug, title, body, status, kind, publish_at, published_at, created_at, updated_at FROM posts WHERE id = ?",
        )
          .bind(id)
          .first<Record<string, unknown>>();
      } catch (err) {
        if (!missingKindColumn(err)) throw err;
        row = await env.DB.prepare(
          "SELECT id, slug, title, body, status, publish_at, published_at, created_at, updated_at FROM posts WHERE id = ?",
        )
          .bind(id)
          .first<Record<string, unknown>>();
      }
      if (!row) return adminError("Post not found.", 404, "not-found");
      return adminJson(rowToPost(row));
    } catch (err) {
      if (missingPostsTable(err)) {
        return adminError("Post not found.", 404, "not-found");
      }
      return adminError("Could not load post.", 500, "db-error");
    }
  }

  if (request.method === "POST" && !hasId) {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid post data.", 400, "bad-json");
    }
    const checked = validatePostInput(raw);
    if (!checked.ok || !checked.data) {
      return adminError(checked.error || "Invalid post data.", 400, "validation");
    }
    const d = checked.data;
    const postId = newId();
    const now = nowIso();
    const publishedAt = d.status === "published" ? now : null;
    const insert = async (withKind: boolean) => {
      const cols = withKind
        ? "(id, slug, title, body, status, kind, publish_at, published_at, created_at, updated_at)"
        : "(id, slug, title, body, status, publish_at, published_at, created_at, updated_at)";
      const placeholders = withKind ? "?, ?, ?, ?, ?, ?, ?, ?, ?, ?" : "?, ?, ?, ?, ?, ?, ?, ?, ?";
      const vals = withKind
        ? [postId, d.slug, d.title, d.body, d.status, d.kind, d.publishAt, publishedAt, now, now]
        : [postId, d.slug, d.title, d.body, d.status, d.publishAt, publishedAt, now, now];
      await env.DB.prepare("INSERT INTO posts " + cols + " VALUES (" + placeholders + ")")
        .bind(...vals)
        .run();
    };
    try {
      try {
        await insert(true);
      } catch (err) {
        if (!missingKindColumn(err)) throw err;
        if (d.kind !== "post") {
          return adminError("Posts are not ready.", 500, "db-error");
        }
        await insert(false);
      }
      await insertAudit(env, {
        actor,
        action: "post.create",
        entity: "post",
        entityId: postId,
        summary: "slug " + d.slug + " status " + d.status + " kind " + d.kind,
      });
      return adminJson(
        {
          id: postId,
          slug: d.slug,
          status: d.status,
          kind: d.kind,
          publishAt: d.publishAt,
          publishedAt,
        },
        201,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "");
      if (msg.includes("UNIQUE")) {
        return adminError("Slug already exists.", 400, "validation");
      }
      if (missingPostsTable(err)) {
        return adminError("Posts are not ready.", 500, "db-error");
      }
      return adminError("Could not create post.", 500, "db-error");
    }
  }

  if (request.method === "PUT" && !hasId) {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid post data.", 400, "bad-json");
    }
    const checked = validatePostInput(raw);
    if (!checked.ok || !checked.data) {
      return adminError(checked.error || "Invalid post data.", 400, "validation");
    }
    const d = checked.data;
    const postId = newId();
    const now = nowIso();
    const publishedAt = d.status === "published" ? now : null;
    const insert = async (withKind: boolean) => {
      const cols = withKind
        ? "(id, slug, title, body, status, kind, publish_at, published_at, created_at, updated_at)"
        : "(id, slug, title, body, status, publish_at, published_at, created_at, updated_at)";
      const placeholders = withKind ? "?, ?, ?, ?, ?, ?, ?, ?, ?, ?" : "?, ?, ?, ?, ?, ?, ?, ?, ?";
      const vals = withKind
        ? [postId, d.slug, d.title, d.body, d.status, d.kind, d.publishAt, publishedAt, now, now]
        : [postId, d.slug, d.title, d.body, d.status, d.publishAt, publishedAt, now, now];
      await env.DB.prepare("INSERT INTO posts " + cols + " VALUES (" + placeholders + ")")
        .bind(...vals)
        .run();
    };
    try {
      try {
        await insert(true);
      } catch (err) {
        if (!missingKindColumn(err)) throw err;
        if (d.kind !== "post") {
          return adminError("Posts are not ready.", 500, "db-error");
        }
        await insert(false);
      }
      await insertAudit(env, {
        actor,
        action: "post.create",
        entity: "post",
        entityId: postId,
        summary: "slug " + d.slug + " status " + d.status + " kind " + d.kind,
      });
      return adminJson(
        {
          id: postId,
          slug: d.slug,
          status: d.status,
          kind: d.kind,
          publishAt: d.publishAt,
          publishedAt,
        },
        201,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "");
      if (msg.includes("UNIQUE")) {
        return adminError("Slug already exists.", 400, "validation");
      }
      if (missingPostsTable(err)) {
        return adminError("Posts are not ready.", 500, "db-error");
      }
      return adminError("Could not create post.", 500, "db-error");
    }
  }

  if ((request.method === "PATCH" || request.method === "PUT") && hasId) {
    if (!id) return adminError("Missing post id.", 400, "bad-id");
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return adminError("Invalid post data.", 400, "bad-json");
    }
    const checked = validatePostPatch(raw);
    if (!checked.ok || !checked.data) {
      return adminError(checked.error || "Invalid post data.", 400, "validation");
    }
    const patch = checked.data;
    try {
      let current: Record<string, unknown> | null = null;
      try {
        current = await env.DB.prepare(
          "SELECT id, slug, title, body, status, kind, publish_at, published_at, created_at, updated_at FROM posts WHERE id = ?",
        )
          .bind(id)
          .first<Record<string, unknown>>();
      } catch (err) {
        if (!missingKindColumn(err)) throw err;
        current = await env.DB.prepare(
          "SELECT id, slug, title, body, status, publish_at, published_at, created_at, updated_at FROM posts WHERE id = ?",
        )
          .bind(id)
          .first<Record<string, unknown>>();
      }
      if (!current) return adminError("Post not found.", 404, "not-found");
      const beforeStatus =
        typeof current.status === "string" ? current.status : "draft";
      const beforeKind = publicPostKind(current);
      const nextStatus = patch.status ?? beforeStatus;
      const nextKind = patch.kind ?? beforeKind;
      let nextPublishAt =
        typeof current.publish_at === "string" ? current.publish_at : null;
      if (patch.hasPublishFields) {
        nextPublishAt = patch.publishAt ?? null;
      }
      if (nextStatus === "scheduled" && !nextPublishAt) {
        return adminError("Schedule time is required.", 400, "validation");
      }
      let nextPublishedAt =
        typeof current.published_at === "string" ? current.published_at : null;
      const now = nowIso();
      if (nextStatus === "published" && beforeStatus !== "published") {
        nextPublishedAt = now;
      }
      if (nextStatus === "scheduled") {
        nextPublishedAt = null;
      }
      const runUpdate = async (withKind: boolean) => {
        const sets: string[] = [];
        const vals: unknown[] = [];
        if (patch.title !== undefined) {
          sets.push("title = ?");
          vals.push(patch.title);
        }
        if (patch.slug !== undefined) {
          sets.push("slug = ?");
          vals.push(patch.slug);
        }
        if (patch.body !== undefined) {
          sets.push("body = ?");
          vals.push(patch.body);
        }
        if (withKind && patch.kind !== undefined) {
          sets.push("kind = ?");
          vals.push(nextKind);
        }
        sets.push("status = ?");
        vals.push(nextStatus);
        sets.push("publish_at = ?");
        vals.push(nextPublishAt);
        sets.push("published_at = ?");
        vals.push(nextPublishedAt);
        sets.push("updated_at = ?");
        vals.push(now);
        vals.push(id);
        await env.DB.prepare(
          "UPDATE posts SET " + sets.join(", ") + " WHERE id = ?",
        )
          .bind(...vals)
          .run();
      };
      try {
        try {
          await runUpdate(true);
        } catch (err) {
          if (!missingKindColumn(err)) throw err;
          if (patch.kind !== undefined && patch.kind !== "post") {
            return adminError("Posts are not ready.", 500, "db-error");
          }
          await runUpdate(false);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err || "");
        if (msg.includes("UNIQUE")) {
          return adminError("Slug already exists.", 400, "validation");
        }
        throw err;
      }
      await insertAudit(env, {
        actor,
        action: "post.update",
        entity: "post",
        entityId: id,
        summary: "status " + beforeStatus + " -> " + nextStatus,
      });
      return adminJson({
        id,
        slug: patch.slug ?? current.slug,
        status: nextStatus,
        kind: nextKind,
        publishAt: nextPublishAt,
        publishedAt: nextPublishedAt,
      });
    } catch (err) {
      if (missingPostsTable(err)) {
        return adminError("Post not found.", 404, "not-found");
      }
      const msg = err instanceof Error ? err.message : String(err || "");
      if (msg.includes("Slug already exists")) {
        return adminError("Slug already exists.", 400, "validation");
      }
      return adminError("Could not update post.", 500, "db-error");
    }
  }

  return adminError("Method not allowed.", 405);
}

// GET /api/public/posts and GET /api/public/posts/:slug, published only.
// Public list accepts optional ?kind= to filter post or know-how guides.
export async function handlePublicPosts(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  if (request.method !== "GET") return publicError("Method not allowed.", 405);
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const hasSlug = parts.length >= 4;

  if (!hasSlug) {
    const kindChecked = kindFilterOf(url);
    if (!kindChecked.ok) {
      return publicError(kindChecked.error, 400, "validation");
    }
    const kind = kindChecked.value;
    const { limit, offset } = parsePaging(url);
    const runList = async (withKind: boolean) => {
      const conds = ["status = 'published'"];
      const vals: unknown[] = [];
      if (kind && withKind) {
        const kv = kindSqlValues(kind);
        if (kv.length === 1) {
          conds.push("kind = ?");
          vals.push(kv[0]);
        } else {
          conds.push("kind IN (?, ?)");
          vals.push(kv[0], kv[1]);
        }
      }
      const where = "WHERE " + conds.join(" AND ") + " ";
      const cols = withKind
        ? "id, slug, title, body, kind, publish_at, published_at, created_at, updated_at"
        : "id, slug, title, body, publish_at, published_at, created_at, updated_at";
      const rows = await env.DB.prepare(
        "SELECT " + cols + " FROM posts " + where + "ORDER BY published_at DESC LIMIT ? OFFSET ?",
      )
        .bind(...vals, limit, offset)
        .all();
      const t = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM posts " + where,
      )
        .bind(...vals)
        .first<{ n: number }>();
      return { rows, total: Number(t?.n) || 0 };
    };
    try {
      try {
        const { rows, total } = await runList(true);
        return publicJson({
          items: (rows.results || []).map((r) =>
            rowToPublicPost(r as Record<string, unknown>),
          ),
          total,
          limit,
          offset,
        });
      } catch (err) {
        if (!missingKindColumn(err)) throw err;
        if (kind === "know-how") {
          return publicJson({ items: [], total: 0, limit, offset });
        }
        const { rows, total } = await runList(false);
        return publicJson({
          items: (rows.results || []).map((r) =>
            rowToPublicPost(r as Record<string, unknown>),
          ),
          total,
          limit,
          offset,
        });
      }
    } catch (err) {
      if (missingPostsTable(err)) {
        const { limit, offset } = parsePaging(url);
        return publicJson({ items: [], total: 0, limit, offset });
      }
      return publicError("Could not load posts.", 500, "db-error");
    }
  }

  const slug = postSlugFromUrl(url);
  if (!slug) return publicError("Post not found.", 404, "not-found");
  const kindChecked = kindFilterOf(url);
  if (!kindChecked.ok) {
    return publicError(kindChecked.error, 400, "validation");
  }
  const kindFilter = kindChecked.value;
  try {
    let row: Record<string, unknown> | null = null;
    try {
      row = await env.DB.prepare(
        "SELECT id, slug, title, body, kind, publish_at, published_at, created_at, updated_at FROM posts WHERE slug = ? AND status = 'published'",
      )
        .bind(slug)
        .first<Record<string, unknown>>();
    } catch (err) {
      if (!missingKindColumn(err)) throw err;
      row = await env.DB.prepare(
        "SELECT id, slug, title, body, publish_at, published_at, created_at, updated_at FROM posts WHERE slug = ? AND status = 'published'",
      )
        .bind(slug)
        .first<Record<string, unknown>>();
    }
    if (!row) return publicError("Post not found.", 404, "not-found");
    if (kindFilter && publicPostKind(row) !== kindFilter) {
      return publicError("Post not found.", 404, "not-found");
    }
    return publicJson(rowToPublicPost(row));
  } catch (err) {
    if (missingPostsTable(err)) {
      return publicError("Post not found.", 404, "not-found");
    }
    return publicError("Could not load post.", 500, "db-error");
  }
}

// Runtime sitemap. Static paths plus published posts and know-how guides
// with lastmod. Origin comes from the request URL with an https and
// hostname guard.
export async function handleSitemap(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed.", {
      status: 405,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const origin = sitemapOriginForRequest(request.url);
  if (!origin) {
    return new Response("Not found.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  let posts: Array<{
    slug: string;
    kind?: string | null;
    published_at?: string | null;
    publish_at?: string | null;
  }> = [];
  try {
    try {
      const res = await env.DB.prepare(
        "SELECT slug, kind, published_at, publish_at FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 500",
      )
        .bind()
        .all<Record<string, unknown>>();
      posts = (res.results || [])
        .filter((r) => typeof r.slug === "string")
        .map((r) => ({
          slug: String(r.slug),
          kind: typeof r.kind === "string" ? r.kind : null,
          published_at:
            typeof r.published_at === "string" ? r.published_at : null,
          publish_at: typeof r.publish_at === "string" ? r.publish_at : null,
        }));
    } catch (err) {
      if (!missingKindColumn(err)) throw err;
      const res = await env.DB.prepare(
        "SELECT slug, published_at, publish_at FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 500",
      )
        .bind()
        .all<Record<string, unknown>>();
      posts = (res.results || [])
        .filter((r) => typeof r.slug === "string")
        .map((r) => ({
          slug: String(r.slug),
          kind: null,
          published_at:
            typeof r.published_at === "string" ? r.published_at : null,
          publish_at: typeof r.publish_at === "string" ? r.publish_at : null,
        }));
    }
  } catch {
    posts = [];
  }
  const xml = buildSitemapXml(origin, posts);
  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

// Hourly scheduled flip. Single predicate guarded UPDATE plus one audit row.
// Uses batch when available so flip and audit land together.
export async function runScheduledPublish(
  env: OasisEnv,
  now?: string,
): Promise<{ published: number }> {
  const at = now || nowIso();
  const auditSummary = ("scheduled publish run at " + at).slice(0, 500);
  try {
    const flip = env.DB.prepare(
      "UPDATE posts SET status = 'published', published_at = ? WHERE status = 'scheduled' AND publish_at <= ?",
    ).bind(at, at);
    const audit = env.DB.prepare(
      "INSERT INTO audit_log (actor, action, entity, entity_id, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind("cron", "post.publish", "post", null, auditSummary, at);
    if (typeof env.DB.batch === "function") {
      const results = await env.DB.batch([flip, audit] as unknown as never[]);
      let published = 0;
      try {
        const first = results?.[0] as unknown as {
          meta?: { changes?: number };
          changes?: number;
        } | null;
        if (first && first.meta && typeof first.meta.changes === "number") {
          published = first.meta.changes;
        } else if (first && typeof first.changes === "number") {
          published = first.changes;
        }
      } catch {
        published = 0;
      }
      return { published };
    }
    let published = 0;
    try {
      const r = (await (flip as unknown as { run(): Promise<unknown> }).run()) as {
        meta?: { changes?: number };
        changes?: number;
      } | null;
      if (r && r.meta && typeof r.meta.changes === "number") {
        published = r.meta.changes;
      } else if (r && typeof r.changes === "number") {
        published = r.changes;
      }
    } catch (err) {
      if (missingPostsTable(err)) return { published: 0 };
      throw err;
    }
    try {
      await (audit as unknown as { run(): Promise<unknown> }).run();
    } catch {
      // Audit failure must not fail the publish run.
    }
    return { published };
  } catch (err) {
    if (missingPostsTable(err)) return { published: 0 };
    return { published: 0 };
  }
}
