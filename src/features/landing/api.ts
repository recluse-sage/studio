import type {
  AvailabilitySummary,
  BusinessType,
  ContactMethod,
  IntakeFormValues,
  PostItem,
  PostKind,
  WorkItem,
  WorkItemKind,
} from "./types";

export const DEFAULT_INTAKE_ENDPOINT = "/api/intakes";
export const DEFAULT_PUBLIC_AVAILABILITY_ENDPOINT = "/api/public/availability";
export const DEFAULT_PUBLIC_WORK_ITEMS_ENDPOINT = "/api/public/work-items";
export const DEFAULT_PUBLIC_DISPLAY_ENDPOINT = "/api/public/display";
export const DEFAULT_PUBLIC_POSTS_ENDPOINT = "/api/public/posts";
export const DEFAULT_ADMIN_DISPLAY_ENDPOINT = "/api/admin/display";

export type DisplaySettings = {
  proofVisible: boolean;
};

function normalizeDisplay(raw: unknown): DisplaySettings {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const nested = r.display && typeof r.display === "object" ? (r.display as Record<string, unknown>) : null;
    const value = r.proofVisible ?? nested?.proofVisible;
    if (value === true) return { proofVisible: true };
  }
  return { proofVisible: false };
}

/**
 * GET public display flags. Proof stays hidden until enabled.
 * Returns hidden on any failure. Never throws.
 */
export async function fetchPublicDisplay(
  endpoint: string = DEFAULT_PUBLIC_DISPLAY_ENDPOINT,
  signal?: AbortSignal,
): Promise<DisplaySettings> {
  try {
    const res = await fetch(endpoint, { signal });
    if (!res.ok) return { proofVisible: false };
    const raw = (await res.json()) as unknown;
    return normalizeDisplay(raw);
  } catch {
    return { proofVisible: false };
  }
}

/**
 * GET admin display flags. Returns null when the request fails.
 */
export async function fetchAdminDisplay(
  endpoint: string = DEFAULT_ADMIN_DISPLAY_ENDPOINT,
  signal?: AbortSignal,
): Promise<DisplaySettings | null> {
  try {
    const res = await fetch(endpoint, { signal });
    if (!res.ok) return null;
    const raw = (await res.json()) as unknown;
    return normalizeDisplay(raw);
  } catch {
    return null;
  }
}

export type UpdateDisplayResult = { ok: true; display: DisplaySettings } | { ok: false; message: string };

/**
 * PUT admin display flags. Shape is exactly { proofVisible: boolean }.
 */
export async function updateAdminDisplay(
  display: DisplaySettings,
  endpoint: string = DEFAULT_ADMIN_DISPLAY_ENDPOINT,
  signal?: AbortSignal,
): Promise<UpdateDisplayResult> {
  try {
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proofVisible: display.proofVisible }),
      signal,
    });
    if (res.ok) {
      try {
        const raw = (await res.json()) as unknown;
        return { ok: true, display: normalizeDisplay(raw) };
      } catch {
        return { ok: true, display };
      }
    }
    let message = "Could not save display settings. Try again.";
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      if (typeof data.error === "string" && data.error.trim()) message = data.error;
      else if (typeof data.message === "string" && data.message.trim()) message = data.message;
    } catch {
      /* keep fallback */
    }
    return { ok: false, message };
  } catch {
    return { ok: false, message: "Could not save display settings. Check your connection." };
  }
}

export type EmailNotificationState = "pending" | "sent" | "failed";

export type SubmitIntakeOptions = {
  /** Override for local preview or staged API. Defaults to /api/intakes. */
  endpoint?: string;
  /** Cloudflare Turnstile token. Required by the server. */
  turnstileToken?: string;
  signal?: AbortSignal;
};

export type SubmitIntakeResult =
  | { ok: true; id: string; message: string; emailNotification: EmailNotificationState; status: string }
  | { ok: false; message: string };

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    if (typeof data.error === "string" && data.error.trim().length > 0) return data.error;
    if (typeof data.message === "string" && data.message.trim().length > 0) return data.message;
  } catch {
    /* keep fallback */
  }
  return fallback;
}

/**
 * POST intake answers to the API.
 * Field names match the server allowlist exactly.
 * Validation and spam checks run on the server. This only sends the payload.
 */
export async function submitIntake(
  values: IntakeFormValues,
  options: SubmitIntakeOptions = {},
): Promise<SubmitIntakeResult> {
  const endpoint = options.endpoint ?? DEFAULT_INTAKE_ENDPOINT;
  const token = (options.turnstileToken ?? "").trim();

  if (!token) {
    return {
      ok: false,
      message: "Verification is missing. Complete the check below and try again.",
    };
  }

  const payload: Record<string, string> = {
    businessName: values.businessName.trim(),
    businessType: values.businessType as BusinessType,
    taskDescription: values.taskDescription.trim(),
    contactMethod: values.contactMethod as ContactMethod,
    contactValue: values.contactValue.trim(),
    website: values.honeypot ?? "",
    turnstileToken: token,
  };

  const frequency = (values.frequency ?? "").trim();
  if (frequency.length > 0) payload.frequency = frequency;

  const timeline = (values.timeline ?? "").trim();
  if (timeline.length > 0) payload.timeline = timeline;

  const budget = (values.budget ?? "").trim();
  if (budget.length > 0) payload.budget = budget;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options.signal,
    });

    if (res.status === 201 || res.ok) {
      try {
        const data = (await res.json()) as {
          id?: string;
          message?: string;
          status?: string;
          emailNotification?: EmailNotificationState;
        };
        return {
          ok: true,
          id: typeof data.id === "string" ? data.id : "",
          message:
            typeof data.message === "string" && data.message.trim().length > 0
              ? data.message
              : "Note saved. We read every intake and reply with plain next steps.",
          emailNotification: data.emailNotification ?? "pending",
          status: typeof data.status === "string" ? data.status : "new",
        };
      } catch {
        return {
          ok: true,
          id: "",
          message: "Note saved. We read every intake and reply with plain next steps.",
          emailNotification: "pending",
          status: "new",
        };
      }
    }

    if (res.status === 429) {
      return {
        ok: false,
        message: "Too many tries for now. Please wait a bit and send once more.",
      };
    }

    if (res.status >= 500) {
      return {
        ok: false,
        message: "The form could not send. Please try again in a moment.",
      };
    }

    const serverMessage = await readErrorMessage(
      res,
      "Something needs attention. Check the highlighted fields and try again.",
    );
    return { ok: false, message: serverMessage };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, message: "Send was cancelled." };
    }
    return {
      ok: false,
      message: "The form could not send. Check your connection and try again.",
    };
  }
}

/**
 * GET public work items. Returns approved real proof plus labeled samples.
 * Every item carries kind so the UI can badge samples honestly.
 * Returns an empty list when the request fails. Never invents proof.
 */
export async function fetchPublicWorkItems(
  endpoint: string = DEFAULT_PUBLIC_WORK_ITEMS_ENDPOINT,
  signal?: AbortSignal,
): Promise<{ items: WorkItem[]; total: number }> {
  const empty = { items: [], total: 0 };
  try {
    const res = await fetch(endpoint, { signal });
    if (!res.ok) return empty;
    const raw = (await res.json()) as {
      items?: Array<Record<string, unknown>>;
      total?: number;
    };
    if (!raw || !Array.isArray(raw.items)) return empty;
    const items: WorkItem[] = [];
    for (const r of raw.items) {
      if (!r || typeof r !== "object") continue;
      const kind: WorkItemKind =
        r.kind === "proof" || r.kind === "sample-concept" ? r.kind : "sample-concept";
      if (typeof r.id !== "string" || typeof r.title !== "string") continue;
      // Only the two public kinds may render. Anything else is skipped so it
      // can never appear as real proof or as an unlabeled sample.
      if (r.kind !== "proof" && r.kind !== "sample-concept") continue;
      items.push({
        id: r.id,
        title: r.title,
        body: typeof r.body === "string" ? r.body : null,
        kind,
        relatedToolId: typeof r.relatedToolId === "string" ? r.relatedToolId : null,
        createdAt: typeof r.createdAt === "string" ? r.createdAt : null,
        updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null,
      });
    }
    return { items, total: items.length };
  } catch {
    return empty;
  }
}
/**
 * GET public availability. Exposes only status, label, nextWindow, note.
 * Returns null when capacity is not configured or the request fails.
 * Never includes internal active build fields. Owner edits those in admin.
 */
export async function fetchPublicAvailability(
  endpoint: string = DEFAULT_PUBLIC_AVAILABILITY_ENDPOINT,
  signal?: AbortSignal,
): Promise<AvailabilitySummary | null> {
  try {
    const res = await fetch(endpoint, { signal });
    if (!res.ok) return null;
    const raw = (await res.json()) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return null;
    if (raw.configured === false) return null;
    const source =
      raw.availability && typeof raw.availability === "object"
        ? (raw.availability as Partial<AvailabilitySummary>)
        : (raw as Partial<AvailabilitySummary>);
    if (!source || typeof source.status !== "string") return null;
    if (source.status !== "open" && source.status !== "limited" && source.status !== "booked") return null;
    return {
      status: source.status,
      label: typeof source.label === "string" ? source.label : "",
      nextWindow: typeof source.nextWindow === "string" ? source.nextWindow : "",
      note: typeof source.note === "string" ? source.note : "",
    };
  } catch {
    return null;
  }
}

/**
 * GET public posts. Used by the blog index and the know-how library.
 * The endpoint is coming. Until it exists, this returns an empty list
 * and the UI shows an honest empty state. Never throws, never invents posts.
 */
export async function fetchPublicPosts(
  endpoint: string = DEFAULT_PUBLIC_POSTS_ENDPOINT,
  signal?: AbortSignal,
): Promise<{ items: PostItem[]; total: number }> {
  const empty = { items: [], total: 0 };
  try {
    const res = await fetch(endpoint, { signal });
    if (!res.ok) return empty;
    const raw = (await res.json()) as {
      items?: Array<Record<string, unknown>>;
      posts?: Array<Record<string, unknown>>;
      total?: number;
    };
    if (!raw || typeof raw !== "object") return empty;
    const list = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.posts) ? raw.posts : null;
    if (!list) return empty;
    const items: PostItem[] = [];
    for (const r of list) {
      if (!r || typeof r !== "object") continue;
      const id = typeof r.id === "string" ? r.id : typeof r.slug === "string" ? r.slug : null;
      const slug = typeof r.slug === "string" ? r.slug : typeof r.id === "string" ? r.id : null;
      const title = typeof r.title === "string" ? r.title : null;
      if (!id || !slug || !title) continue;
      const kindRaw = typeof r.kind === "string" ? r.kind : "post";
      const kind: PostKind = kindRaw === "know-how" ? "know-how" : "post";
      const minutesRaw = r.readingMinutes ?? r.reading_minutes ?? r.minsRead ?? null;
      const readingMinutes =
        typeof minutesRaw === "number" && Number.isFinite(minutesRaw) && minutesRaw > 0
          ? Math.round(minutesRaw)
          : null;
      items.push({
        id,
        slug,
        title,
        excerpt: typeof r.excerpt === "string" ? r.excerpt : typeof r.summary === "string" ? r.summary : null,
        body: typeof r.body === "string" ? r.body : typeof r.content === "string" ? r.content : null,
        kind,
        publishedAt:
          typeof r.publishedAt === "string"
            ? r.publishedAt
            : typeof r.published_at === "string"
              ? r.published_at
              : typeof r.createdAt === "string"
                ? r.createdAt
                : null,
        readingMinutes,
      });
    }
    return { items, total: items.length };
  } catch {
    return empty;
  }
}

function estimateReadingMinutes(text: string | null): number {
  if (!text) return 3;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 0) return 3;
  return Math.max(1, Math.round(words / 200));
}

export function readingMinutesFor(item: Pick<PostItem, "body" | "excerpt" | "readingMinutes">): number {
  if (typeof item.readingMinutes === "number" && item.readingMinutes > 0) return item.readingMinutes;
  return estimateReadingMinutes(item.body ?? item.excerpt);
}

export function formatPostDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return null;
  }
}
