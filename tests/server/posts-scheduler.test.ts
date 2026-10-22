import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  validatePostInput,
  validatePostPatch,
} from "../../src/server/validation.ts";
import {
  handleAdminPosts,
  handlePublicPosts,
  handleSitemap,
  runScheduledPublish,
} from "../../src/server/handlers/posts.ts";
import { handleAdminOverview } from "../../src/server/handlers/admin.ts";
import {
  zonedTimeToUtcIso,
  isCanonicalUtc,
  sitemapOriginForRequest,
} from "../../src/shared/post-scheduling.ts";

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

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

type PostRow = {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  status: string;
  kind: string | null;
  publish_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const LIST_STATUSES = ["draft", "scheduled", "published", "unpublished"];

function rowPublicKind(row: PostRow): string {
  if (row.kind === "know-how" || row.kind === "knowhow") return "know-how";
  return "post";
}

function queryKindFilter(query: string, vals: unknown[]): string[] | null {
  if (!query.includes("kind = ?") && !query.includes("kind IN (?, ?)")) return null;
  const set = new Set<string>();
  for (const v of vals) {
    if (v === "post") set.add("post");
    if (v === "know-how" || v === "knowhow") set.add("know-how");
  }
  return [...set];
}

function rowMatchesList(row: PostRow, query: string, vals: unknown[]): boolean {
  if (query.includes("status = 'published'") && row.status !== "published") return false;
  if (query.includes("status = ?")) {
    const sv = vals.find(
      (v) => typeof v === "string" && (LIST_STATUSES as string[]).includes(v as string),
    );
    if (typeof sv === "string" && row.status !== sv) return false;
  }
  const kf = queryKindFilter(query, vals);
  if (kf && !kf.includes(rowPublicKind(row))) return false;
  return true;
}

function makeSchedulerDb(initial: PostRow[]) {
  const posts: PostRow[] = initial.map((p) => ({ ...p }));
  const audits: Array<{ vals: unknown[] }> = [];
  const db = {
    posts,
    audits,
    prepare(query: string) {
      return {
        bind(...vals: unknown[]) {
          return {
            first: async () => {
              if (query.includes("FROM posts") && query.includes("WHERE id = ?")) {
                const id = vals[0];
                return posts.find((p) => p.id === id) || null;
              }
              if (query.includes("FROM posts") && query.includes("WHERE slug = ?")) {
                const slug = vals[0];
                return posts.find((p) => p.slug === slug && p.status === "published") || null;
              }
              if (query.includes("FROM posts") && query.includes("COUNT(*)")) {
                return { n: posts.filter((p) => rowMatchesList(p, query, vals)).length };
              }
              if (query.includes("FROM posts") && query.includes("COUNT")) {
                return { n: posts.filter((p) => rowMatchesList(p, query, vals)).length };
              }
              return null;
            },
            all: async () => {
              if (query.includes("FROM posts")) {
                return { results: posts.filter((p) => rowMatchesList(p, query, vals)) };
              }
              return { results: [] };
            },
            run: async () => {
              if (
                query.includes("UPDATE posts") &&
                query.includes("status = 'published'") &&
                query.includes("status = 'scheduled'")
              ) {
                const publishedAt = vals[0] as string;
                const at = vals[1] as string;
                let changes = 0;
                for (const p of posts) {
                  if (p.status === "scheduled" && (p.publish_at || "") <= at) {
                    p.status = "published";
                    p.published_at = publishedAt;
                    p.updated_at = publishedAt;
                    changes += 1;
                  }
                }
                return { meta: { changes } };
              }
              if (query.includes("INSERT INTO posts")) {
                const list = vals as Array<string | null>;
                let id: string;
                let slug: string;
                let title: string;
                let body: string | null;
                let status: string;
                let kind: string | null;
                let publish_at: string | null;
                let published_at: string | null;
                let created_at: string;
                let updated_at: string;
                if (list.length === 10) {
                  [id, slug, title, body, status, kind, publish_at, published_at, created_at, updated_at] =
                    list as unknown as [string, string, string, string | null, string, string, string | null, string | null, string, string];
                } else {
                  [id, slug, title, body, status, publish_at, published_at, created_at, updated_at] =
                    list as unknown as [string, string, string, string | null, string, string | null, string | null, string, string];
                  kind = "post";
                }
                if (posts.some((p) => p.slug === slug)) {
                  throw new Error("UNIQUE constraint failed: posts.slug");
                }
                posts.push({
                  id: String(id),
                  slug: String(slug),
                  title: String(title),
                  body: (body as string | null) ?? null,
                  status: String(status),
                  kind: (kind as string | null) ?? "post",
                  publish_at: (publish_at as string | null) ?? null,
                  published_at: (published_at as string | null) ?? null,
                  created_at: String(created_at),
                  updated_at: String(updated_at),
                });
                return {};
              }
              if (query.includes("INSERT INTO audit_log")) {
                audits.push({ vals: [...vals] });
                return {};
              }
              if (query.startsWith("UPDATE posts SET")) {
                const id = vals[vals.length - 1] as string;
                const row = posts.find((p) => p.id === id);
                if (!row) return {};
                if (query.includes("UNIQUE")) throw new Error("UNIQUE");
                return {};
              }
              return {};
            },
          };
        },
      };
    },
    async batch(stmts: Array<{ run(): Promise<unknown> }>) {
      const out: unknown[] = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
  };
  return db;
}

function missingTableDb() {
  return {
    prepare(_q: string) {
      return {
        bind(..._v: unknown[]) {
          return {
            first: async () => {
              throw new Error("no such table: posts");
            },
            all: async () => {
              throw new Error("no such table: posts");
            },
            run: async () => {
              throw new Error("no such table: posts");
            },
          };
        },
      };
    },
    async batch(stmts: Array<{ run(): Promise<unknown> }>) {
      const out: unknown[] = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
  };
}

describe("posts migration", () => {
  it("adds posts table with status index and canonical checks", () => {
    const sql = read("migrations/0004_posts.sql");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS posts");
    expect(sql).toContain("idx_posts_status_publish");
    expect(sql).toContain("draft");
    expect(sql).toContain("scheduled");
    expect(sql).toContain("published");
    expect(sql).toContain("unpublished");
    expect(sql).toContain("GLOB");
    expect(sql).toContain("publish_at");
    expect(sql).toContain("published_at");
    expect(sql).toContain("slug");
  });
});

describe("post validation", () => {
  it("accepts canonical UTC publishAt", () => {
    const r = validatePostInput({
      title: "Launch notes",
      slug: "launch-notes",
      status: "scheduled",
      publishAt: "2026-10-20T13:00:00.000Z",
    });
    expect(r.ok).toBe(true);
    expect(r.data?.publishAt).toBe("2026-10-20T13:00:00.000Z");
  });

  it("rejects non canonical publish time and bad slug", () => {
    expect(
      validatePostInput({
        title: "Launch notes",
        slug: "launch-notes",
        status: "scheduled",
        publishAt: "2026-10-20 13:00",
      }).ok,
    ).toBe(false);
    expect(
      validatePostInput({
        title: "Launch notes",
        slug: "Bad Slug!",
        status: "draft",
      }).ok,
    ).toBe(false);
    expect(
      validatePostInput({
        title: "Hi",
        slug: "ok-slug",
        status: "draft",
      }).ok,
    ).toBe(false);
    expect(
      validatePostInput({
        title: "Launch notes",
        slug: "ok-slug",
        status: "live",
      }).ok,
    ).toBe(false);
  });

  it("requires schedule time for scheduled status", () => {
    expect(
      validatePostInput({ title: "Launch notes", slug: "ok-slug", status: "scheduled" }).ok,
    ).toBe(false);
  });

  it("converts date plus time plus zone to canonical UTC", () => {
    const r = validatePostInput({
      title: "Launch notes",
      slug: "launch-notes",
      status: "scheduled",
      publishDate: "2026-07-01",
      publishTime: "09:00",
      timeZone: "America/New_York",
    });
    expect(r.ok).toBe(true);
    expect(r.data?.publishAt).toBe("2026-07-01T13:00:00.000Z");
  });

  it("patch rejects unknown fields and empty update", () => {
    expect(validatePostPatch({ unknown: true }).ok).toBe(false);
    expect(validatePostPatch({}).ok).toBe(false);
  });
});

describe("timezone DST boundary", () => {
  it("applies EDT in summer and EST in winter", () => {
    const summer = zonedTimeToUtcIso("2026-07-01", "09:00", "America/New_York");
    const winter = zonedTimeToUtcIso("2026-01-15", "09:00", "America/New_York");
    expect(summer).toBe("2026-07-01T13:00:00.000Z");
    expect(winter).toBe("2026-01-15T14:00:00.000Z");
    expect(isCanonicalUtc(summer)).toBe(true);
    expect(isCanonicalUtc(winter)).toBe(true);
  });

  it("keeps gap times on DST start canonical", () => {
    const gap = zonedTimeToUtcIso("2026-03-08", "02:30", "America/New_York");
    expect(gap).not.toBeNull();
    expect(isCanonicalUtc(gap)).toBe(true);
  });

  it("rejects invalid zone and date", () => {
    expect(zonedTimeToUtcIso("2026-07-01", "09:00", "Mars/Olympus")).toBeNull();
    expect(zonedTimeToUtcIso("2026-02-30", "09:00", "America/New_York")).toBeNull();
    expect(zonedTimeToUtcIso("2026-07-01", "25:00", "America/New_York")).toBeNull();
  });
});

describe("scheduled flip", () => {
  it("publishes due rows once and stays idempotent", async () => {
    const db = makeSchedulerDb([
      {
        id: "p1",
        slug: "due-post",
        title: "Due",
        body: null,
        status: "scheduled",
        kind: "post",
        publish_at: "2026-10-20T12:00:00.000Z",
        published_at: null,
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-19T00:00:00.000Z",
      },
      {
        id: "p2",
        slug: "future-post",
        title: "Future",
        body: null,
        status: "scheduled",
        kind: "post",
        publish_at: "2026-10-22T12:00:00.000Z",
        published_at: null,
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-19T00:00:00.000Z",
      },
    ]);
    const env = { DB: db } as never;
    const first = await runScheduledPublish(env, "2026-10-21T00:00:00.000Z");
    expect(first.published).toBe(1);
    expect(db.posts.find((p) => p.id === "p1")?.status).toBe("published");
    expect(db.posts.find((p) => p.id === "p1")?.published_at).toBe("2026-10-21T00:00:00.000Z");
    expect(db.posts.find((p) => p.id === "p2")?.status).toBe("scheduled");
    expect(db.audits.length).toBe(1);
    expect(String(db.audits[0].vals[0])).toBe("cron");
    const second = await runScheduledPublish(env, "2026-10-21T00:00:00.000Z");
    expect(second.published).toBe(0);
    expect(db.posts.find((p) => p.id === "p1")?.published_at).toBe("2026-10-21T00:00:00.000Z");
  });

  it("double publish race keeps one winner via predicate", async () => {
    const db = makeSchedulerDb([
      {
        id: "r1",
        slug: "race-post",
        title: "Race",
        body: null,
        status: "scheduled",
        kind: "post",
        publish_at: "2026-10-20T12:00:00.000Z",
        published_at: null,
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-19T00:00:00.000Z",
      },
    ]);
    const env = { DB: db } as never;
    const at = "2026-10-21T00:00:00.000Z";
    const [a, b] = await Promise.all([runScheduledPublish(env, at), runScheduledPublish(env, at)]);
    expect(a.published + b.published).toBeLessThanOrEqual(2);
    const row = db.posts.find((p) => p.id === "r1");
    expect(row?.status).toBe("published");
    const third = await runScheduledPublish(env, at);
    expect(third.published).toBe(0);
  });

  it("tolerates missing posts table", async () => {
    const env = { DB: missingTableDb() } as never;
    const res = await runScheduledPublish(env, "2026-10-21T00:00:00.000Z");
    expect(res.published).toBe(0);
  });
});

describe("posts APIs", () => {
  it("admin create with local time stores canonical UTC", async () => {
    const db = makeSchedulerDb([]);
    const env = { DB: db } as never;
    const req = new Request("https://example.com/api/admin/posts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Cf-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify({
        title: "Launch notes",
        slug: "launch-notes",
        status: "scheduled",
        publishDate: "2026-07-01",
        publishTime: "09:00",
        timeZone: "America/New_York",
      }),
    });
    const res = await handleAdminPosts(req, env);
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.publishAt).toBe("2026-07-01T13:00:00.000Z");
  });

  it("admin PATCH transitions draft to scheduled to published with audit", async () => {
    const db = makeSchedulerDb([
      {
        id: "t1",
        slug: "draft-post",
        title: "Draft",
        body: null,
        status: "draft",
        kind: "post",
        publish_at: null,
        published_at: null,
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-19T00:00:00.000Z",
      },
    ]);
    const realPrepare = db.prepare.bind(db);
    const queries: string[] = [];
    const wrapped = {
      ...db,
      prepare(q: string) {
        queries.push(q);
        const stmt = realPrepare(q);
        return {
          bind(...vals: unknown[]) {
            const bound = stmt.bind(...vals);
            const origRun = bound.run.bind(bound);
            const origFirst = bound.first.bind(bound);
            return {
              first: origFirst,
              all: bound.all.bind(bound),
              run: async () => {
                if (q.startsWith("UPDATE posts SET")) {
                  const id = vals[vals.length - 1] as string;
                  const row = db.posts.find((p) => p.id === id);
                  if (row) {
                    if (q.includes("title = ?") || q.includes("slug = ?")) {
                      // Keep mock simple for status flow.
                    }
                    const statusIdx = q.split(",").findIndex((s) => s.includes("status = ?"));
                    void statusIdx;
                    // Handler sends status, publish_at, published_at in order after optional fields.
                    // Extract by position from the end: updated_at, published_at, publish_at, status.
                    const nowVal = vals[vals.length - 2] as string;
                    const publishedVal = vals[vals.length - 3] as string | null;
                    const publishVal = vals[vals.length - 4] as string | null;
                    const statusVal = vals[vals.length - 5] as string;
                    row.status = statusVal;
                    row.publish_at = publishVal;
                    row.published_at = publishedVal;
                    row.updated_at = nowVal;
                  }
                  return {};
                }
                return origRun();
              },
            };
          },
        };
      },
      batch: db.batch.bind(db),
    };
    const env = { DB: wrapped } as never;
    const toScheduled = new Request("https://example.com/api/admin/posts/t1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "Cf-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify({
        status: "scheduled",
        publishAt: "2026-10-20T12:00:00.000Z",
      }),
    });
    const r1 = await handleAdminPosts(toScheduled, env);
    expect(r1.status).toBe(200);
    expect(db.posts[0].status).toBe("scheduled");
    const toPublished = new Request("https://example.com/api/admin/posts/t1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "Cf-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify({ status: "published" }),
    });
    const r2 = await handleAdminPosts(toPublished, env);
    expect(r2.status).toBe(200);
    expect(db.posts[0].status).toBe("published");
    expect(db.posts[0].published_at).not.toBeNull();
  });

  it("public list and slug return published only", async () => {
    const db = makeSchedulerDb([
      {
        id: "pub1",
        slug: "live-post",
        title: "Live",
        body: "Hello",
        status: "published",
        kind: "post",
        publish_at: "2026-10-20T12:00:00.000Z",
        published_at: "2026-10-20T12:00:01.000Z",
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-20T12:00:01.000Z",
      },
      {
        id: "draft1",
        slug: "draft-post",
        title: "Draft",
        body: null,
        status: "draft",
        kind: "post",
        publish_at: null,
        published_at: null,
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-19T00:00:00.000Z",
      },
    ]);
    const env = { DB: db } as never;
    const list = await handlePublicPosts(new Request("https://example.com/api/public/posts"), env);
    expect(list.status).toBe(200);
    expect(list.headers.get("Cache-Control")).toContain("public");
    const listBody = (await list.json()) as { items: Array<{ slug: string }>; total: number };
    expect(listBody.total).toBe(1);
    expect(listBody.items[0].slug).toBe("live-post");
    const single = await handlePublicPosts(
      new Request("https://example.com/api/public/posts/live-post"),
      env,
    );
    expect(single.status).toBe(200);
    const missing = await handlePublicPosts(
      new Request("https://example.com/api/public/posts/draft-post"),
      env,
    );
    expect(missing.status).toBe(404);
  });

  it("restore tolerance returns empty not crash", async () => {
    const env = { DB: missingTableDb() } as never;
    const adminReq = new Request("https://example.com/api/admin/posts", {
      headers: { "Cf-Access-Jwt-Assertion": "good-token" },
    });
    const adminRes = await handleAdminPosts(adminReq, env);
    expect(adminRes.status).toBe(200);
    const adminBody = (await adminRes.json()) as { items: unknown[]; total: number };
    expect(adminBody.items).toEqual([]);
    expect(adminBody.total).toBe(0);
    const pubRes = await handlePublicPosts(new Request("https://example.com/api/public/posts"), env);
    expect(pubRes.status).toBe(200);
    const siteRes = await handleSitemap(new Request("https://oasis.test/sitemap.xml"), env);
    expect(siteRes.status).toBe(200);
    const xml = await siteRes.text();
    expect(xml).toContain("<loc>https://oasis.test/</loc>");
  });
});

describe("overview scheduled due", () => {
  it("includes scheduledDue count", async () => {
    const db = {
      prepare(query: string) {
        return {
          bind(..._vals: unknown[]) {
            return {
              first: async () => {
                if (query.includes("FROM posts")) return { n: 2 };
                if (query.includes("messaged")) return { n: 0 };
                if (query.includes("proof_notes")) return { n: 0 };
                return { v: 0, o: 0, c: 0, n: 0 };
              },
              all: async () => ({ results: [] }),
              run: async () => ({}),
            };
          },
        };
      },
    };
    const env = { DB: db } as never;
    const req = new Request("https://example.com/api/admin/overview", {
      headers: { "Cf-Access-Jwt-Assertion": "good-token" },
    });
    const res = await handleAdminOverview(req, env);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.scheduledDue).toBe(2);
  });
});

describe("runtime sitemap", () => {
  it("serves static plus published with lastmod and max-age 300", async () => {
    const db = makeSchedulerDb([
      {
        id: "s1",
        slug: "live-post",
        title: "Live",
        body: null,
        status: "published",
        kind: "post",
        publish_at: "2026-10-20T12:00:00.000Z",
        published_at: "2026-10-20T12:00:01.000Z",
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-20T12:00:01.000Z",
      },
      {
        id: "s2",
        slug: "draft-post",
        title: "Draft",
        body: null,
        status: "draft",
        kind: "post",
        publish_at: null,
        published_at: null,
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-19T00:00:00.000Z",
      },
    ]);
    const env = { DB: db } as never;
    const res = await handleSitemap(new Request("https://oasis.test/sitemap.xml"), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(res.headers.get("Cache-Control")).toContain("max-age=300");
    const xml = await res.text();
    expect(xml).toContain("<loc>https://oasis.test/</loc>");
    expect(xml).toContain("<loc>https://oasis.test/posts/live-post</loc>");
    expect(xml).toContain("2026-10-20T12:00:01.000Z");
    expect(xml).not.toContain("draft-post");
  });

  it("withholds placeholder hosts and derives origin from request", async () => {
    const db = makeSchedulerDb([]);
    const env = { DB: db } as never;
    expect(sitemapOriginForRequest("https://oasis.test/sitemap.xml")).toBe("https://oasis.test");
    const blocked = await handleSitemap(new Request("https://example.com/sitemap.xml"), env);
    expect(blocked.status).toBe(404);
  });
});

describe("posts kind split", () => {
  it("adds kind column with post default and knowhow plus index", () => {
    const sql = read("migrations/0005_posts_kind.sql");
    expect(sql).toContain("ALTER TABLE posts ADD COLUMN kind");
    expect(sql).toContain("DEFAULT 'post'");
    expect(sql).toContain("knowhow");
    expect(sql).toContain("idx_posts_kind_status");
  });

  it("defaults kind to post and accepts know-how plus alias", () => {
    const d = validatePostInput({
      title: "Launch notes",
      slug: "launch-notes",
      status: "draft",
    });
    expect(d.ok).toBe(true);
    expect(d.data?.kind).toBe("post");
    const g = validatePostInput({
      title: "Fix a leak",
      slug: "fix-a-leak",
      status: "draft",
      kind: "know-how",
    });
    expect(g.ok).toBe(true);
    expect(g.data?.kind).toBe("know-how");
    const alias = validatePostInput({
      title: "Fix a leak",
      slug: "fix-a-leak",
      status: "draft",
      kind: "knowhow",
    });
    expect(alias.ok).toBe(true);
    expect(alias.data?.kind).toBe("know-how");
    expect(
      validatePostInput({ title: "Launch notes", slug: "ok-slug", kind: "essay" }).ok,
    ).toBe(false);
  });

  it("patch accepts kind change and rejects bad kind", () => {
    const r = validatePostPatch({ kind: "know-how" });
    expect(r.ok).toBe(true);
    expect(r.data?.kind).toBe("know-how");
    expect(validatePostPatch({ kind: "video" }).ok).toBe(false);
  });

  it("admin create stores kind and filters list by kind", async () => {
    const db = makeSchedulerDb([]);
    const env = { DB: db } as never;
    const create = new Request("https://example.com/api/admin/posts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Cf-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify({
        title: "Fix a leak",
        slug: "fix-a-leak",
        status: "draft",
        kind: "know-how",
      }),
    });
    const created = await handleAdminPosts(create, env);
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as Record<string, unknown>;
    expect(createdBody.kind).toBe("know-how");
    const listAll = await handleAdminPosts(
      new Request("https://example.com/api/admin/posts", {
        headers: { "Cf-Access-Jwt-Assertion": "good-token" },
      }),
      env,
    );
    const allBody = (await listAll.json()) as { items: Array<{ kind: string }>; total: number };
    expect(allBody.total).toBe(1);
    expect(allBody.items[0].kind).toBe("know-how");
    const listGuides = await handleAdminPosts(
      new Request("https://example.com/api/admin/posts?kind=know-how", {
        headers: { "Cf-Access-Jwt-Assertion": "good-token" },
      }),
      env,
    );
    const guidesBody = (await listGuides.json()) as { total: number };
    expect(guidesBody.total).toBe(1);
    const listNotes = await handleAdminPosts(
      new Request("https://example.com/api/admin/posts?kind=post", {
        headers: { "Cf-Access-Jwt-Assertion": "good-token" },
      }),
      env,
    );
    const notesBody = (await listNotes.json()) as { total: number };
    expect(notesBody.total).toBe(0);
    const badKind = await handleAdminPosts(
      new Request("https://example.com/api/admin/posts?kind=video", {
        headers: { "Cf-Access-Jwt-Assertion": "good-token" },
      }),
      env,
    );
    expect(badKind.status).toBe(400);
  });

  it("public list filters by kind and slug enforces kind", async () => {
    const db = makeSchedulerDb([
      {
        id: "n1",
        slug: "studio-note",
        title: "Note",
        body: null,
        status: "published",
        kind: "post",
        publish_at: "2026-10-20T12:00:00.000Z",
        published_at: "2026-10-20T12:00:01.000Z",
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-20T12:00:01.000Z",
      },
      {
        id: "g1",
        slug: "fix-a-leak",
        title: "Guide",
        body: null,
        status: "published",
        kind: "know-how",
        publish_at: "2026-10-20T12:00:00.000Z",
        published_at: "2026-10-20T12:00:02.000Z",
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-20T12:00:02.000Z",
      },
    ]);
    const env = { DB: db } as never;
    const all = await handlePublicPosts(new Request("https://example.com/api/public/posts"), env);
    const allBody = (await all.json()) as { items: Array<{ slug: string; kind: string }>; total: number };
    expect(allBody.total).toBe(2);
    const guides = await handlePublicPosts(
      new Request("https://example.com/api/public/posts?kind=know-how"),
      env,
    );
    const guidesBody = (await guides.json()) as { items: Array<{ slug: string; kind: string }>; total: number };
    expect(guidesBody.total).toBe(1);
    expect(guidesBody.items[0].slug).toBe("fix-a-leak");
    expect(guidesBody.items[0].kind).toBe("know-how");
    const alias = await handlePublicPosts(
      new Request("https://example.com/api/public/posts?kind=knowhow"),
      env,
    );
    const aliasBody = (await alias.json()) as { total: number };
    expect(aliasBody.total).toBe(1);
    const notes = await handlePublicPosts(
      new Request("https://example.com/api/public/posts?kind=post"),
      env,
    );
    const notesBody = (await notes.json()) as { items: Array<{ slug: string }>; total: number };
    expect(notesBody.total).toBe(1);
    expect(notesBody.items[0].slug).toBe("studio-note");
    const bad = await handlePublicPosts(
      new Request("https://example.com/api/public/posts?kind=video"),
      env,
    );
    expect(bad.status).toBe(400);
    const single = await handlePublicPosts(
      new Request("https://example.com/api/public/posts/fix-a-leak"),
      env,
    );
    expect(single.status).toBe(200);
    const singleBody = (await single.json()) as Record<string, unknown>;
    expect(singleBody.kind).toBe("know-how");
    const match = await handlePublicPosts(
      new Request("https://example.com/api/public/posts/fix-a-leak?kind=know-how"),
      env,
    );
    expect(match.status).toBe(200);
    const mismatch = await handlePublicPosts(
      new Request("https://example.com/api/public/posts/fix-a-leak?kind=post"),
      env,
    );
    expect(mismatch.status).toBe(404);
  });

  it("sitemap includes both post and know-how URLs", async () => {
    const db = makeSchedulerDb([
      {
        id: "n1",
        slug: "studio-note",
        title: "Note",
        body: null,
        status: "published",
        kind: "post",
        publish_at: "2026-10-20T12:00:00.000Z",
        published_at: "2026-10-20T12:00:01.000Z",
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-20T12:00:01.000Z",
      },
      {
        id: "g1",
        slug: "fix-a-leak",
        title: "Guide",
        body: null,
        status: "published",
        kind: "know-how",
        publish_at: "2026-10-20T12:00:00.000Z",
        published_at: "2026-10-20T12:00:02.000Z",
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-20T12:00:02.000Z",
      },
    ]);
    const env = { DB: db } as never;
    const res = await handleSitemap(new Request("https://oasis.test/sitemap.xml"), env);
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("<loc>https://oasis.test/posts/studio-note</loc>");
    expect(xml).toContain("<loc>https://oasis.test/know-how/fix-a-leak</loc>");
  });

  it("missing kind defaults to post on read", async () => {
    const db = makeSchedulerDb([
      {
        id: "legacy",
        slug: "legacy-note",
        title: "Legacy",
        body: null,
        status: "published",
        kind: null,
        publish_at: "2026-10-20T12:00:00.000Z",
        published_at: "2026-10-20T12:00:01.000Z",
        created_at: "2026-10-19T00:00:00.000Z",
        updated_at: "2026-10-20T12:00:01.000Z",
      },
    ]);
    const env = { DB: db } as never;
    const single = await handlePublicPosts(
      new Request("https://example.com/api/public/posts/legacy-note"),
      env,
    );
    expect(single.status).toBe(200);
    const body = (await single.json()) as Record<string, unknown>;
    expect(body.kind).toBe("post");
  });

  it("tolerates a database without the kind column", async () => {
    const published = {
      id: "legacy",
      slug: "legacy-note",
      title: "Legacy",
      body: null,
      publish_at: "2026-10-20T12:00:00.000Z",
      published_at: "2026-10-20T12:00:01.000Z",
      created_at: "2026-10-19T00:00:00.000Z",
      updated_at: "2026-10-19T00:00:00.000Z",
    };
    const db = {
      prepare(query: string) {
        const needsKind = query.includes("kind");
        return {
          bind(..._vals: unknown[]) {
            return {
              first: async () => {
                if (needsKind) throw new Error("no such column: kind");
                if (query.includes("WHERE slug")) return published;
                if (query.includes("COUNT")) return { n: 1 };
                return null;
              },
              all: async () => {
                if (needsKind) throw new Error("no such column: kind");
                return { results: [published] };
              },
              run: async () => {
                if (needsKind) throw new Error("no such column: kind");
                return {};
              },
            };
          },
        };
      },
    };
    const env = { DB: db } as never;
    const list = await handlePublicPosts(new Request("https://example.com/api/public/posts"), env);
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { items: Array<{ kind: string }>; total: number };
    expect(listBody.total).toBe(1);
    expect(listBody.items[0].kind).toBe("post");
    const guides = await handlePublicPosts(
      new Request("https://example.com/api/public/posts?kind=know-how"),
      env,
    );
    expect(guides.status).toBe(200);
    const guidesBody = (await guides.json()) as { total: number };
    expect(guidesBody.total).toBe(0);
    const site = await handleSitemap(new Request("https://oasis.test/sitemap.xml"), env);
    expect(site.status).toBe(200);
    const xml = await site.text();
    expect(xml).toContain("<loc>https://oasis.test/posts/legacy-note</loc>");
  });
});
