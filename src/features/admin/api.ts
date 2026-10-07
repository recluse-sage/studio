import type {
  AdminCounts,
  AdminIntakeCreateInput,
  AdminSystemPresence,
  AvailabilityState,
  IntakeRecord,
  OutreachCreateInput,
  OutreachRecord,
  OutreachStatus,
  PagedResponse,
  ProofNote,
  ToolCreateInput,
  ToolRecord,
  ToolUpdateInput,
  UsageRow,
} from "./types";
import { outreachNeedsReply } from "./types";

export const DEFAULT_ADMIN_API_BASE = "/api/admin";

export type AdminApiOptions = {
  base?: string;
  signal?: AbortSignal;
};

export type IntakeListParams = {
  status?: string;
  limit?: number;
  offset?: number;
} & AdminApiOptions;

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
  get denied(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

function baseUrl(options: AdminApiOptions): string {
  return options.base ?? DEFAULT_ADMIN_API_BASE;
}

async function requestJson<T>(path: string, options: AdminApiOptions & { init?: RequestInit }): Promise<T> {
  const url = `${baseUrl(options)}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      signal: options.signal,
      ...options.init,
    });
  } catch {
    throw new AdminApiError(0, "Could not reach the admin API. Check your connection and try again.");
  }

  if (res.status === 401) throw new AdminApiError(401, "Sign in required.");
  if (res.status === 403) throw new AdminApiError(403, "Access restricted.");
  if (res.status === 429) throw new AdminApiError(429, "Too many requests. Wait a bit and try again.");
  if (!res.ok) {
    let message = "The admin API returned an error.";
    try {
      const data = (await res.json()) as { error?: string };
      if (typeof data.error === "string" && data.error.trim().length > 0) message = data.error;
    } catch {
      /* keep default */
    }
    throw new AdminApiError(res.status, message);
  }

  return (await res.json()) as T;
}

function itemsOf<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

function pagedOf<T>(data: unknown): PagedResponse<T> {
  if (Array.isArray(data)) {
    return { items: data as T[], total: (data as T[]).length, limit: (data as T[]).length, offset: 0 };
  }
  if (data && typeof data === "object") {
    const raw = data as Partial<PagedResponse<T>>;
    if (Array.isArray(raw.items)) {
      return {
        items: raw.items,
        total: typeof raw.total === "number" ? raw.total : raw.items.length,
        limit: typeof raw.limit === "number" ? raw.limit : raw.items.length,
        offset: typeof raw.offset === "number" ? raw.offset : 0,
      };
    }
  }
  return { items: [], total: 0, limit: 0, offset: 0 };
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function normalizeIntake(raw: unknown): IntakeRecord {
  const r = raw as Record<string, unknown>;
  const businessType = (typeof r.businessType === "string" ? r.businessType : "other") as IntakeRecord["businessType"];
  const taskDescription =
    typeof r.taskDescription === "string"
      ? r.taskDescription
      : typeof r.task === "string"
        ? r.task
        : "";
  const contactMethod =
    typeof r.contactMethod === "string"
      ? (r.contactMethod as IntakeRecord["contactMethod"])
      : typeof r.replyChannel === "string" && r.replyChannel === "text"
        ? "sms"
        : (r.replyChannel as IntakeRecord["contactMethod"]) || "other";
  const contactValue =
    typeof r.contactValue === "string"
      ? r.contactValue
      : typeof r.contact === "string"
        ? r.contact
        : "";
  const frequency =
    typeof r.frequency === "string" ? r.frequency : r.frequency == null ? null : String(r.frequency);
  return {
    id: typeof r.id === "string" ? r.id : "",
    businessName: typeof r.businessName === "string" ? r.businessName : "",
    businessType,
    taskDescription,
    frequency,
    timeline: typeof r.timeline === "string" ? r.timeline : r.timeline == null ? null : String(r.timeline),
    budget: typeof r.budget === "string" ? r.budget : r.budget == null ? null : String(r.budget),
    contactMethod,
    contactValue,
    source: typeof r.source === "string" ? r.source : "landing",
    status: (typeof r.status === "string" ? r.status : "new") as IntakeRecord["status"],
    emailNotification:
      r.emailNotification === "sent" || r.emailNotification === "failed" || r.emailNotification === "pending"
        ? r.emailNotification
        : undefined,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
  };
}

function normalizeOutreach(raw: unknown): OutreachRecord {
  const r = raw as Record<string, unknown>;
  const status = (typeof r.status === "string" ? r.status : "prospect") as OutreachStatus;
  const notes =
    typeof r.notes === "string"
      ? r.notes
      : typeof (r as { note?: unknown }).note === "string"
        ? ((r as { note: string }).note as string)
        : null;
  const needsReply =
    typeof r.needsReply === "boolean" ? r.needsReply : outreachNeedsReply(status);
  return {
    id: typeof r.id === "string" ? r.id : "",
    businessName: typeof r.businessName === "string" ? r.businessName : "",
    contact: typeof r.contact === "string" ? r.contact : null,
    channel: typeof r.channel === "string" ? r.channel : null,
    status,
    notes,
    nextFollowUp: typeof r.nextFollowUp === "string" ? r.nextFollowUp : null,
    lastContactAt: typeof r.lastContactAt === "string" ? r.lastContactAt : null,
    needsReply,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined,
  };
}

function normalizeTool(raw: unknown): ToolRecord {
  const r = raw as Record<string, unknown>;
  return {
    id: typeof r.id === "string" ? r.id : "",
    businessName: typeof r.businessName === "string" ? r.businessName : "",
    name: typeof r.name === "string" ? r.name : "",
    slug: typeof r.slug === "string" ? r.slug : "",
    description: typeof r.description === "string" ? r.description : null,
    status:
      r.status === "active" || r.status === "paused" || r.status === "retired" || r.status === "draft"
        ? r.status
        : "draft",
    isAvailable: toBoolean(r.isAvailable, true),
    availabilityNote: typeof r.availabilityNote === "string" ? r.availabilityNote : null,
    url: typeof r.url === "string" ? r.url : null,
    showcaseStatus:
      r.showcaseStatus === "pending" ||
      r.showcaseStatus === "approved" ||
      r.showcaseStatus === "denied" ||
      r.showcaseStatus === "private"
        ? r.showcaseStatus
        : "private",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined,
  };
}

function normalizeUsage(raw: unknown): UsageRow {
  const r = raw as Record<string, unknown>;
  const tool =
    typeof r.tool === "string"
      ? r.tool
      : typeof r.toolKey === "string"
        ? r.toolKey
        : typeof r.toolId === "string"
          ? r.toolId
          : "";
  const date =
    typeof r.date === "string"
      ? r.date
      : typeof r.usageDate === "string"
        ? r.usageDate
        : "";
  return {
    tool,
    date,
    views: typeof r.views === "number" ? r.views : 0,
    offlineViews: typeof r.offlineViews === "number" ? r.offlineViews : 0,
    contactClicks: typeof r.contactClicks === "number" ? r.contactClicks : 0,
  };
}

/** GET /api/admin/overview. Server enforces Access. Never treats denied as empty. */
export async function fetchOverview(options: AdminApiOptions = {}): Promise<AdminCounts> {
  const data = await requestJson<unknown>("/overview", options);
  const raw = (data ?? {}) as {
    newIntakes?: unknown;
    outreachNeedingReply?: unknown;
    activeBuilds?: unknown;
    lastBackupDrillAt?: unknown;
    overdueFollowUps?: unknown;
    intakesByStatus?: Record<string, number>;
    outreachByStatus?: Record<string, number>;
    toolsByStatus?: Record<string, number>;
  };
  const lastBackupDrillAt =
    typeof raw.lastBackupDrillAt === "string" && raw.lastBackupDrillAt.trim().length > 0
      ? raw.lastBackupDrillAt
      : null;
  const overdueFollowUps =
    typeof raw.overdueFollowUps === "number" && Number.isFinite(raw.overdueFollowUps) && raw.overdueFollowUps > 0
      ? Math.floor(raw.overdueFollowUps)
      : 0;
  if (
    typeof raw.newIntakes === "number" &&
    typeof raw.outreachNeedingReply === "number" &&
    typeof raw.activeBuilds === "number"
  ) {
    return {
      newIntakes: raw.newIntakes,
      outreachNeedingReply: raw.outreachNeedingReply,
      activeBuilds: raw.activeBuilds,
      lastBackupDrillAt,
      overdueFollowUps,
    };
  }
  const intakesByStatus = raw.intakesByStatus ?? {};
  const outreachByStatus = raw.outreachByStatus ?? {};
  const toolsByStatus = raw.toolsByStatus ?? {};
  const newIntakes =
    typeof intakesByStatus.new === "number"
      ? intakesByStatus.new
      : Object.values(intakesByStatus).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
  const outreachNeedingReply =
    (typeof outreachByStatus.messaged === "number" ? outreachByStatus.messaged : 0) +
    (typeof outreachByStatus.no_reply === "number" ? outreachByStatus.no_reply : 0);
  const activeBuilds =
    typeof toolsByStatus.active === "number"
      ? toolsByStatus.active
      : Object.values(toolsByStatus).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
  return { newIntakes, outreachNeedingReply, activeBuilds, lastBackupDrillAt, overdueFollowUps };
}

/** GET /api/admin/system. Presence booleans only, never secret values. Server enforces Access. */
export async function fetchAdminSystem(options: AdminApiOptions = {}): Promise<AdminSystemPresence> {
  const data = await requestJson<unknown>("/system", options);
  const raw = (data ?? {}) as {
    d1Ok?: unknown;
    dbOk?: unknown;
    turnstileConfigured?: unknown;
    turnstileSecretSet?: unknown;
    accessConfigured?: unknown;
    accessVarsSet?: unknown;
  };
  return {
    d1Ok: toBoolean(raw.d1Ok ?? raw.dbOk, false),
    turnstileConfigured: toBoolean(raw.turnstileConfigured ?? raw.turnstileSecretSet, false),
    accessConfigured: toBoolean(raw.accessConfigured ?? raw.accessVarsSet, false),
  };
}

/** GET /api/admin/intakes?status=&limit=&offset=. Parses paged objects. */
export async function fetchIntakes(params: IntakeListParams = {}): Promise<IntakeRecord[]> {
  const { status, limit, offset, ...rest } = params;
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (typeof limit === "number") query.set("limit", String(limit));
  if (typeof offset === "number") query.set("offset", String(offset));
  const suffix = query.toString().length > 0 ? `/intakes?${query.toString()}` : "/intakes";
  const data = await requestJson<unknown>(suffix, rest);
  return itemsOf<unknown>(data).map(normalizeIntake);
}

/** GET /api/admin/intakes paged form for total counts. */
export async function fetchIntakesPaged(params: IntakeListParams = {}): Promise<PagedResponse<IntakeRecord>> {
  const { status, limit, offset, ...rest } = params;
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (typeof limit === "number") query.set("limit", String(limit));
  if (typeof offset === "number") query.set("offset", String(offset));
  const suffix = query.toString().length > 0 ? `/intakes?${query.toString()}` : "/intakes";
  const data = await requestJson<unknown>(suffix, rest);
  const paged = pagedOf<unknown>(data);
  return {
    items: paged.items.map(normalizeIntake),
    total: paged.total,
    limit: paged.limit,
    offset: paged.offset,
  };
}

/** POST /api/admin/intakes. Server tags source admin-manual. No Turnstile. */
export async function createAdminIntake(
  input: AdminIntakeCreateInput,
  options: AdminApiOptions = {},
): Promise<IntakeRecord> {
  const payload: Record<string, string> = {
    businessName: input.businessName.trim(),
    businessType: input.businessType,
    taskDescription: input.taskDescription.trim(),
    contactMethod: input.contactMethod,
    contactValue: input.contactValue.trim(),
  };
  if (input.frequency?.trim()) payload.frequency = input.frequency.trim();
  if (input.timeline?.trim()) payload.timeline = input.timeline.trim();
  if (input.budget?.trim()) payload.budget = input.budget.trim();
  const data = await requestJson<unknown>("/intakes", {
    ...options,
    init: { method: "POST", body: JSON.stringify(payload) },
  });
  return normalizeIntake(data);
}

/** GET /api/admin/outreach. Parses array or paged shape. */
export async function fetchOutreach(options: AdminApiOptions = {}): Promise<OutreachRecord[]> {
  const data = await requestJson<unknown>("/outreach", options);
  return itemsOf<unknown>(data).map(normalizeOutreach);
}

/** POST /api/admin/outreach. Owner logs a real prospect. No fake entries. */
export async function createOutreach(
  input: OutreachCreateInput,
  options: AdminApiOptions = {},
): Promise<OutreachRecord> {
  const payload: Record<string, string> = {
    businessName: input.businessName.trim(),
  };
  if (input.contact?.trim()) payload.contact = input.contact.trim();
  if (input.channel?.trim()) payload.channel = input.channel.trim();
  if (input.status) payload.status = input.status;
  if (input.notes?.trim()) payload.notes = input.notes.trim();
  if (input.nextFollowUp?.trim()) payload.nextFollowUp = input.nextFollowUp.trim();
  const data = await requestJson<unknown>("/outreach", {
    ...options,
    init: { method: "POST", body: JSON.stringify(payload) },
  });
  return normalizeOutreach(data);
}

/** PATCH /api/admin/outreach/:id. */
export async function updateOutreach(
  id: string,
  patch: Partial<OutreachCreateInput & { lastContactAt?: string }>,
  options: AdminApiOptions = {},
): Promise<OutreachRecord> {
  const data = await requestJson<unknown>(`/outreach/${encodeURIComponent(id)}`, {
    ...options,
    init: { method: "PATCH", body: JSON.stringify(patch) },
  });
  return normalizeOutreach(data);
}

/** GET /api/admin/tools. Owner registry. Empty safe. No public grid. */
export async function fetchTools(options: AdminApiOptions = {}): Promise<ToolRecord[]> {
  const data = await requestJson<unknown>("/tools", options);
  return itemsOf<unknown>(data).map(normalizeTool);
}

/** POST /api/admin/tools. */
export async function createTool(
  input: ToolCreateInput,
  options: AdminApiOptions = {},
): Promise<ToolRecord> {
  const payload: Record<string, unknown> = {
    businessName: input.businessName.trim(),
    name: input.name.trim(),
    slug: input.slug.trim(),
  };
  if (input.description?.trim()) payload.description = input.description.trim();
  if (input.status) payload.status = input.status;
  if (typeof input.isAvailable === "boolean") payload.isAvailable = input.isAvailable;
  if (input.availabilityNote?.trim()) payload.availabilityNote = input.availabilityNote.trim();
  if (input.url?.trim()) payload.url = input.url.trim();
  if (input.showcaseStatus) payload.showcaseStatus = input.showcaseStatus;
  const data = await requestJson<unknown>("/tools", {
    ...options,
    init: { method: "POST", body: JSON.stringify(payload) },
  });
  return normalizeTool(data);
}

/** PATCH /api/admin/tools/:id. */
export async function updateTool(
  id: string,
  patch: ToolUpdateInput,
  options: AdminApiOptions = {},
): Promise<ToolRecord> {
  const data = await requestJson<unknown>(`/tools/${encodeURIComponent(id)}`, {
    ...options,
    init: { method: "PATCH", body: JSON.stringify(patch) },
  });
  return normalizeTool(data);
}

function normalizeAvailability(data: unknown): AvailabilityState | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const envelope = data as { configured?: unknown; availability?: unknown };
  if ("availability" in envelope) {
    if (envelope.configured === false || !envelope.availability) return null;
    data = envelope.availability;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  const status = value.status;
  if (
    status !== "open" &&
    status !== "limited" &&
    status !== "booked" &&
    status !== "waitlist" &&
    status !== "paused" &&
    status !== "closed"
  ) {
    return null;
  }
  return {
    status,
    label: typeof value.label === "string" ? value.label : "",
    nextWindow: typeof value.nextWindow === "string" ? value.nextWindow : "",
    note: typeof value.note === "string" ? value.note : "",
    activeBuildTitle: typeof value.activeBuildTitle === "string" ? value.activeBuildTitle : "",
    activeBuildStage: typeof value.activeBuildStage === "string" ? value.activeBuildStage : "",
  };
}

/** GET /api/admin/availability. Owner only, includes active build fields. */
export async function fetchAvailability(options: AdminApiOptions = {}): Promise<AvailabilityState | null> {
  const data = await requestJson<unknown>("/availability", options);
  return normalizeAvailability(data);
}

/** PUT /api/admin/availability. */
export async function updateAvailability(
  value: AvailabilityState,
  options: AdminApiOptions = {},
): Promise<AvailabilityState> {
  const data = await requestJson<unknown>("/availability", {
    ...options,
    init: { method: "PUT", body: JSON.stringify(value) },
  });
  const availability = normalizeAvailability(data);
  if (!availability) throw new AdminApiError(500, "The availability response was incomplete.");
  return availability;
}

/** GET /api/admin/usage. Aggregate counters only, no personal data. Parses paged shape. */
export async function fetchUsage(options: AdminApiOptions = {}): Promise<UsageRow[]> {
  const data = await requestJson<unknown>("/usage", options);
  return itemsOf<unknown>(data).map(normalizeUsage);
}

/** GET /api/admin/proof-notes. Short proof and ops notes. Parses paged shape. */
export async function fetchProofNotes(options: AdminApiOptions = {}): Promise<ProofNote[]> {
  const data = await requestJson<unknown>("/proof-notes", options);
  return itemsOf<unknown>(data) as ProofNote[];
}

/** POST /api/admin/proof-notes. */
export function createProofNote(
  input: { title: string; body: string },
  options: AdminApiOptions = {},
): Promise<ProofNote> {
  return requestJson<ProofNote>("/proof-notes", {
    ...options,
    init: { method: "POST", body: JSON.stringify(input) },
  });
}

/** PATCH /api/admin/intakes/:id. Update intake status. */
export function updateIntakeStatus(
  id: string,
  status: IntakeRecord["status"],
  options: AdminApiOptions = {},
): Promise<IntakeRecord> {
  return requestJson<IntakeRecord>(`/intakes/${encodeURIComponent(id)}`, {
    ...options,
    init: { method: "PATCH", body: JSON.stringify({ status }) },
  });
}
