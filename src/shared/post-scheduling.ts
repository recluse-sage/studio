// Shared post scheduling helper for Oasis.dev.
// Pure functions only. No fetch, no DOM, no secrets.
// Timezone rule: admin sends date plus time plus IANA zone, server converts
// to canonical UTC YYYY-MM-DDTHH:mm:ss.sssZ. DST is handled via Intl.
// Sitemap helpers derive origin from the request URL with an https guard.

export const POST_STATUSES = [
  "draft",
  "scheduled",
  "published",
  "unpublished",
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

// Public kind spelling matches the UI library: post is a short studio note,
// know-how with a hyphen is a practical guide. The database check also
// accepts knowhow without a hyphen as an input alias.
export const POST_KINDS = ["post", "know-how"] as const;

export type PostKind = (typeof POST_KINDS)[number];

export function normalizePostKind(value: unknown): PostKind | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v === "post") return "post";
  if (v === "know-how" || v === "knowhow") return "know-how";
  return null;
}

export function publicPostKind(row: Record<string, unknown>): PostKind {
  const raw = row.kind;
  if (typeof raw !== "string") return "post";
  const t = raw.trim();
  if (t === "know-how" || t === "knowhow") return "know-how";
  return "post";
}

export function sitemapPathForPost(slug: string, kind: string | null): string {
  if (kind === "know-how" || kind === "knowhow") return "/know-how/" + slug;
  return "/posts/" + slug;
}

export const POST_SLUG_PATTERN = /^[a-z0-9-]{2,60}$/;

export const CANONICAL_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function isCanonicalUtc(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!CANONICAL_UTC_PATTERN.test(value)) return false;
  const t = Date.parse(value);
  return !Number.isNaN(t);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap =
      (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function validTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(
      new Date(Date.UTC(2020, 0, 1)),
    );
    return true;
  } catch {
    return false;
  }
}

function wallToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): number | null {
  if (!validTimeZone(timeZone)) return null;
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    let parts: Intl.DateTimeFormatPart[];
    try {
      parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        hourCycle: "h23",
      }).formatToParts(new Date(utcMs));
    } catch {
      return null;
    }
    const get = (type: string): string | undefined =>
      parts.find((p) => p.type === type)?.value;
    const py = Number(get("year"));
    const pm = Number(get("month"));
    const pd = Number(get("day"));
    let ph = Number(get("hour"));
    if (ph === 24) ph = 0;
    const pmi = Number(get("minute"));
    const ps = Number(get("second"));
    if (
      [py, pm, pd, ph, pmi, ps].some((n) => !Number.isFinite(n))
    ) {
      return null;
    }
    const wallAsUtc = Date.UTC(py, pm - 1, pd, ph, pmi, ps);
    const intendedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const diff = intendedAsUtc - wallAsUtc;
    if (diff === 0) break;
    utcMs += diff;
  }
  return utcMs;
}

// Convert admin local date plus time plus IANA zone to canonical UTC.
// Date must be YYYY-MM-DD. Time must be HH:MM or HH:MM:SS. Zone must be IANA.
// Returns canonical UTC or null when input is invalid. Gap times on DST
// boundaries resolve forward to a valid instant and stay canonical.
export function zonedTimeToUtcIso(
  date: string,
  time: string,
  timeZone: string,
): string | null {
  if (typeof date !== "string" || typeof time !== "string") return null;
  if (typeof timeZone !== "string") return null;
  const d = date.trim();
  const t = time.trim();
  const z = timeZone.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(t)) return null;
  if (!z || z.length > 80) return null;
  if (!validTimeZone(z)) return null;
  const year = Number(d.slice(0, 4));
  const month = Number(d.slice(5, 7));
  const day = Number(d.slice(8, 10));
  const hour = Number(t.slice(0, 2));
  const minute = Number(t.slice(3, 5));
  const second = t.length > 5 ? Number(t.slice(6, 8)) : 0;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;
  const ms = wallToUtcMs(year, month, day, hour, minute, second, z);
  if (ms === null || !Number.isFinite(ms)) return null;
  const iso = new Date(ms).toISOString();
  return isCanonicalUtc(iso) ? iso : null;
}

// Resolve publish time from admin input. Local date plus time plus zone
// takes precedence when any local field is present. Otherwise publishAt
// must already be canonical UTC. Returns canonical string, null for none,
// or an error message string when invalid.
export function resolvePublishAt(input: {
  publishAt?: unknown;
  publishDate?: unknown;
  publishTime?: unknown;
  timeZone?: unknown;
}): { ok: true; value: string | null } | { ok: false; error: string } {
  const hasLocal =
    input.publishDate !== undefined ||
    input.publishTime !== undefined ||
    input.timeZone !== undefined;
  if (hasLocal) {
    const date =
      typeof input.publishDate === "string" ? input.publishDate.trim() : "";
    const zone =
      typeof input.timeZone === "string" ? input.timeZone.trim() : "";
    let time =
      typeof input.publishTime === "string" ? input.publishTime.trim() : "";
    if (!date) return { ok: false, error: "Publish date is required." };
    if (!zone) return { ok: false, error: "Time zone is required." };
    if (!time) time = "09:00";
    const iso = zonedTimeToUtcIso(date, time, zone);
    if (!iso) return { ok: false, error: "Publish time is invalid." };
    return { ok: true, value: iso };
  }
  if (
    input.publishAt === undefined ||
    input.publishAt === null ||
    input.publishAt === ""
  ) {
    return { ok: true, value: null };
  }
  if (typeof input.publishAt !== "string") {
    return { ok: false, error: "Publish time must be canonical UTC." };
  }
  const v = input.publishAt.trim();
  if (!isCanonicalUtc(v)) {
    return { ok: false, error: "Publish time must be canonical UTC." };
  }
  return { ok: true, value: v };
}

// Hostname guard for runtime sitemap. Allows valid hostnames and local
// preview hosts. Withholds placeholder hosts that must never appear in
// a sitemap. This is a syntax guard only, not auth.
export function isAllowedSitemapHostname(hostname: string): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h === "example.com" || h === "example.org") return false;
  if (h.length > 253) return false;
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(h)) return false;
  if (h.includes("..")) return false;
  return true;
}

// Derive the sitemap origin from the request URL. Forces https except for
// local preview hosts. Returns null when the host is not allowed.
export function sitemapOriginForRequest(requestUrl: string): string | null {
  try {
    const u = new URL(requestUrl);
    const host = u.hostname.toLowerCase();
    if (!isAllowedSitemapHostname(host)) return null;
    if (host === "localhost" || host === "127.0.0.1") return u.origin;
    const port = u.port && u.port !== "443" ? ":" + u.port : "";
    return "https://" + host + port;
  } catch {
    return null;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build runtime sitemap XML. Static paths plus published posts with lastmod.
// Post notes map to /posts/:slug and know-how guides map to /know-how/:slug.
export function buildSitemapXml(
  origin: string,
  posts: Array<{ slug: string; published_at?: string | null; publish_at?: string | null; kind?: string | null }>,
): string {
  const seen = new Set<string>();
  const urls: string[] = [];
  urls.push("  <url><loc>" + escapeXml(origin + "/") + "</loc></url>");
  seen.add("/");
  for (const p of posts) {
    if (typeof p.slug !== "string") continue;
    if (!POST_SLUG_PATTERN.test(p.slug)) continue;
    const key = sitemapPathForPost(p.slug, typeof p.kind === "string" ? p.kind : null);
    if (seen.has(key)) continue;
    seen.add(key);
    const raw =
      (typeof p.published_at === "string" && p.published_at) ||
      (typeof p.publish_at === "string" && p.publish_at) ||
      "";
    const lastmod = isCanonicalUtc(raw)
      ? "><lastmod>" + escapeXml(raw) + "</lastmod"
      : "";
    if (lastmod) {
      urls.push(
        "  <url><loc>" +
          escapeXml(origin + key) +
          "</loc" +
          lastmod +
          "></url>",
      );
    } else {
      urls.push("  <url><loc>" + escapeXml(origin + key) + "</loc></url>");
    }
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join("\n") +
    "\n</urlset>\n"
  );
}
