import type { BusinessType, ContactMethod } from "../shared/domain-types.ts";

export const BUSINESS_TYPES: readonly BusinessType[] = [
  "home-trades",
  "food-hospitality",
  "health-beauty",
  "professional-services",
  "neighborhood-retail",
  "tool-automation",
  "other",
];

export const CONTACT_METHODS: readonly ContactMethod[] = [
  "phone",
  "sms",
  "whatsapp",
  "email",
  "tiktok",
  "other",
];

export const INTAKE_STATUSES = [
  "new",
  "reviewed",
  "contacted",
  "scoped",
  "declined",
  "archived",
] as const;

export const OUTREACH_STATUSES = [
  "prospect",
  "messaged",
  "no_reply",
  "replied",
  "built",
  "archived",
] as const;

export const TOOL_STATUSES = ["draft", "active", "paused", "retired"] as const;
export const SHOWCASE_STATUSES = [
  "private",
  "pending",
  "approved",
  "denied",
] as const;
export const AVAILABILITY_STATUSES = [
  "open",
  "limited",
  "waitlist",
  "paused",
  "closed",
] as const;
export const PROOF_PERMISSIONS = ["pending", "approved", "denied"] as const;

export const PROOF_KINDS = [
  "proof",
  "sample-concept",
  "ops-note",
  "backup-drill",
] as const;

// Public intake allowlist. Any other key is treated as mass assignment.
export const INTAKE_ALLOWED_FIELDS = [
  "businessName",
  "businessType",
  "taskDescription",
  "frequency",
  "timeline",
  "budget",
  "contactMethod",
  "contactValue",
  "website",
  "turnstileToken",
] as const;

export interface ValidIntake {
  businessName: string;
  businessType: BusinessType;
  taskDescription: string;
  frequency: string | null;
  timeline: string | null;
  budget: string | null;
  contactMethod: ContactMethod;
  contactValue: string;
  turnstileToken: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function cleanStr(v: unknown, max: number): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0) return null;
  if (t.length > max) return null;
  return t;
}

function requiredStr(v: unknown, min: number, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length < min || t.length > max) return null;
  return t;
}

export function findUnknownFields(
  input: Record<string, unknown>,
  allowed: readonly string[],
): string[] {
  return Object.keys(input).filter((k) => !allowed.includes(k));
}

export function validateIntakeInput(raw: unknown): {
  ok: boolean;
  error?: string;
  data?: ValidIntake;
} {
  if (!isRecord(raw)) return { ok: false, error: "Invalid submission." };
  const unknownFields = findUnknownFields(raw, INTAKE_ALLOWED_FIELDS);
  // SECURITY: reject mass assignment such as status, source, or id.
  if (unknownFields.length > 0) return { ok: false, error: "Invalid submission." };

  const honeypot = raw.website;
  // SECURITY: honeypot must stay blank. Filled value means bot.
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return { ok: false, error: "Invalid submission." };
  }

  const businessName = requiredStr(raw.businessName, 2, 80);
  const taskDescription = requiredStr(raw.taskDescription, 10, 1000);
  const contactValue = requiredStr(raw.contactValue, 3, 160);
  const turnstileToken =
    typeof raw.turnstileToken === "string" && raw.turnstileToken.length > 0
      ? raw.turnstileToken
      : null;

  const businessType =
    typeof raw.businessType === "string" &&
    (BUSINESS_TYPES as readonly string[]).includes(raw.businessType)
      ? (raw.businessType as BusinessType)
      : null;
  const contactMethod =
    typeof raw.contactMethod === "string" &&
    (CONTACT_METHODS as readonly string[]).includes(raw.contactMethod)
      ? (raw.contactMethod as ContactMethod)
      : null;

  if (!businessName) return { ok: false, error: "Business name is required." };
  if (!businessType) return { ok: false, error: "Business type is invalid." };
  if (!taskDescription) {
    return { ok: false, error: "Please describe the task in a few words." };
  }
  if (!contactMethod) return { ok: false, error: "Contact method is invalid." };
  if (!contactValue) return { ok: false, error: "Contact value is required." };
  if (!turnstileToken) return { ok: false, error: "Verification is required." };

  if (
    contactMethod === "email" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)
  ) {
    return { ok: false, error: "Contact email looks invalid." };
  }

  const frequency = cleanStr(raw.frequency, 60);
  const timeline = cleanStr(raw.timeline, 60);
  const budget = cleanStr(raw.budget, 60);
  // cleanStr returns null for missing or blank, but also for overlong.
  // Distinguish overlong optional fields explicitly.
  for (const [key, val] of [
    ["frequency", raw.frequency],
    ["timeline", raw.timeline],
    ["budget", raw.budget],
  ] as const) {
    if (typeof val === "string" && val.trim().length > 60) {
      return { ok: false, error: "Optional field is too long." };
    }
    void key;
  }

  return {
    ok: true,
    data: {
      businessName,
      businessType,
      taskDescription,
      frequency,
      timeline,
      budget,
      contactMethod,
      contactValue,
      turnstileToken,
    },
  };
}

export const MANUAL_INTAKE_ALLOWED_FIELDS = [
  "businessName",
  "businessType",
  "taskDescription",
  "frequency",
  "timeline",
  "budget",
  "contactMethod",
  "contactValue",
] as const;

export interface ValidManualIntake {
  businessName: string;
  businessType: BusinessType;
  taskDescription: string;
  frequency: string | null;
  timeline: string | null;
  budget: string | null;
  contactMethod: ContactMethod;
  contactValue: string;
}

function optionalStr(
  v: unknown,
  max: number,
): { ok: true; value: string | null } | { ok: false } {
  if (v === undefined || v === null || v === "") return { ok: true, value: null };
  if (typeof v !== "string") return { ok: false };
  const t = v.trim();
  if (t.length === 0) return { ok: true, value: null };
  if (t.length > max) return { ok: false };
  return { ok: true, value: t };
}

export function validateManualIntakeInput(raw: unknown): {
  ok: boolean;
  error?: string;
  data?: ValidManualIntake;
} {
  if (!isRecord(raw)) return { ok: false, error: "Invalid intake data." };
  if (findUnknownFields(raw, MANUAL_INTAKE_ALLOWED_FIELDS).length > 0) {
    return { ok: false, error: "Invalid intake data." };
  }
  const businessName = requiredStr(raw.businessName, 2, 80);
  const taskDescription = requiredStr(raw.taskDescription, 10, 1000);
  const contactValue = requiredStr(raw.contactValue, 3, 160);
  const businessType =
    typeof raw.businessType === "string" &&
    (BUSINESS_TYPES as readonly string[]).includes(raw.businessType)
      ? (raw.businessType as BusinessType)
      : null;
  const contactMethod =
    typeof raw.contactMethod === "string" &&
    (CONTACT_METHODS as readonly string[]).includes(raw.contactMethod)
      ? (raw.contactMethod as ContactMethod)
      : null;
  if (!businessName) return { ok: false, error: "Business name is required." };
  if (!businessType) return { ok: false, error: "Business type is invalid." };
  if (!taskDescription) {
    return { ok: false, error: "Please describe the task in a few words." };
  }
  if (!contactMethod) return { ok: false, error: "Contact method is invalid." };
  if (!contactValue) return { ok: false, error: "Contact value is required." };
  if (
    contactMethod === "email" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)
  ) {
    return { ok: false, error: "Contact email looks invalid." };
  }
  for (const key of ["frequency", "timeline", "budget"] as const) {
    const v = (raw as Record<string, unknown>)[key];
    if (v !== undefined && v !== null && v !== "" && typeof v !== "string") {
      return { ok: false, error: "Optional field is invalid." };
    }
    if (typeof v === "string" && v.trim().length > 60) {
      return { ok: false, error: "Optional field is too long." };
    }
  }
  const frequency = cleanStr(raw.frequency, 60);
  const timeline = cleanStr(raw.timeline, 60);
  const budget = cleanStr(raw.budget, 60);
  return {
    ok: true,
    data: {
      businessName,
      businessType,
      taskDescription,
      frequency,
      timeline,
      budget,
      contactMethod,
      contactValue,
    },
  };
}

export function validateOutreachInput(raw: unknown): {
  ok: boolean;
  error?: string;
  data?: {
    businessName: string;
    contact: string | null;
    channel: string | null;
    status: string;
    notes: string | null;
    nextFollowUp: string | null;
    lastContactAt: string | null;
  };
} {
  if (!isRecord(raw)) return { ok: false, error: "Invalid outreach data." };
  const allowed = [
    "businessName",
    "contact",
    "channel",
    "status",
    "notes",
    "nextFollowUp",
    "lastContactAt",
  ];
  if (findUnknownFields(raw, allowed).length > 0) {
    return { ok: false, error: "Invalid outreach data." };
  }
  const businessName = requiredStr(raw.businessName, 2, 120);
  if (!businessName) return { ok: false, error: "Business name is required." };
  const status =
    raw.status === undefined
      ? "prospect"
      : typeof raw.status === "string" &&
          (OUTREACH_STATUSES as readonly string[]).includes(raw.status)
        ? raw.status
        : null;
  if (!status) return { ok: false, error: "Outreach status is invalid." };
  for (const [key, max] of [
    ["contact", 160],
    ["channel", 60],
  ] as const) {
    const v = (raw as Record<string, unknown>)[key];
    if (v !== undefined && v !== null && v !== "" && typeof v !== "string") {
      return { ok: false, error: "Invalid outreach data." };
    }
    if (typeof v === "string" && v.trim().length > max) {
      return { ok: false, error: "Invalid outreach data." };
    }
  }
  if (
    raw.notes !== undefined &&
    raw.notes !== null &&
    raw.notes !== "" &&
    typeof raw.notes !== "string"
  ) {
    return { ok: false, error: "Invalid outreach data." };
  }
  if (
    raw.nextFollowUp !== undefined &&
    raw.nextFollowUp !== null &&
    raw.nextFollowUp !== "" &&
    typeof raw.nextFollowUp !== "string"
  ) {
    return { ok: false, error: "Follow up date must be YYYY-MM-DD." };
  }
  if (
    raw.lastContactAt !== undefined &&
    raw.lastContactAt !== null &&
    raw.lastContactAt !== "" &&
    typeof raw.lastContactAt !== "string"
  ) {
    return { ok: false, error: "Last contact date is invalid." };
  }
  const contact = cleanStr(raw.contact, 160);
  const channel = cleanStr(raw.channel, 60);
  const notes =
    raw.notes === undefined || raw.notes === null || raw.notes === ""
      ? null
      : requiredStr(raw.notes, 1, 2000);
  if (raw.notes !== undefined && raw.notes !== null && raw.notes !== "" && !notes) {
    return { ok: false, error: "Notes are too long." };
  }
  const nextFollowUp = cleanStr(raw.nextFollowUp, 10);
  if (
    nextFollowUp !== null &&
    !/^\d{4}-\d{2}-\d{2}$/.test(nextFollowUp)
  ) {
    return { ok: false, error: "Follow up date must be YYYY-MM-DD." };
  }
  const lastContactAt = cleanStr(raw.lastContactAt, 32);
  if (
    lastContactAt !== null &&
    !/^\d{4}-\d{2}-\d{2}$/.test(lastContactAt) &&
    Number.isNaN(Date.parse(lastContactAt))
  ) {
    return { ok: false, error: "Last contact date is invalid." };
  }
  return {
    ok: true,
    data: {
      businessName,
      contact,
      channel,
      status,
      notes,
      nextFollowUp,
      lastContactAt,
    },
  };
}

export function validateToolInput(raw: unknown): {
  ok: boolean;
  error?: string;
  data?: {
    name: string;
    slug: string;
    description: string | null;
    status: string;
    isAvailable: number;
    availabilityNote: string | null;
    url: string | null;
    businessName: string | null;
    showcaseStatus: string;
  };
} {
  if (!isRecord(raw)) return { ok: false, error: "Invalid tool data." };
  const allowed = [
    "name",
    "slug",
    "description",
    "status",
    "isAvailable",
    "availabilityNote",
    "url",
    "businessName",
    "showcaseStatus",
  ];
  if (findUnknownFields(raw, allowed).length > 0) {
    return { ok: false, error: "Invalid tool data." };
  }
  const name = requiredStr(raw.name, 2, 80);
  const slug =
    typeof raw.slug === "string" && /^[a-z0-9-]{2,60}$/.test(raw.slug.trim())
      ? raw.slug.trim()
      : null;
  if (!name) return { ok: false, error: "Tool name is required." };
  if (!slug) return { ok: false, error: "Tool slug is invalid." };
  const status =
    raw.status === undefined
      ? "draft"
      : typeof raw.status === "string" &&
          (TOOL_STATUSES as readonly string[]).includes(raw.status)
        ? raw.status
        : null;
  if (!status) return { ok: false, error: "Tool status is invalid." };
  const showcaseStatus =
    raw.showcaseStatus === undefined
      ? "private"
      : typeof raw.showcaseStatus === "string" &&
          (SHOWCASE_STATUSES as readonly string[]).includes(raw.showcaseStatus)
        ? raw.showcaseStatus
        : null;
  if (!showcaseStatus) return { ok: false, error: "Showcase status is invalid." };
  const isAvailable =
    raw.isAvailable === undefined
      ? 1
      : raw.isAvailable === true || raw.isAvailable === 1
        ? 1
        : raw.isAvailable === false || raw.isAvailable === 0
          ? 0
          : -1;
  if (isAvailable === -1) return { ok: false, error: "Availability is invalid." };
  if (
    raw.description !== undefined &&
    raw.description !== null &&
    raw.description !== "" &&
    typeof raw.description !== "string"
  ) {
    return { ok: false, error: "Invalid tool data." };
  }
  if (
    raw.availabilityNote !== undefined &&
    raw.availabilityNote !== null &&
    raw.availabilityNote !== "" &&
    typeof raw.availabilityNote !== "string"
  ) {
    return { ok: false, error: "Invalid tool data." };
  }
  if (
    raw.url !== undefined &&
    raw.url !== null &&
    raw.url !== "" &&
    typeof raw.url !== "string"
  ) {
    return { ok: false, error: "Invalid tool data." };
  }
  if (
    raw.businessName !== undefined &&
    raw.businessName !== null &&
    raw.businessName !== "" &&
    typeof raw.businessName !== "string"
  ) {
    return { ok: false, error: "Business name is invalid." };
  }
  const description = cleanStr(raw.description, 2000);
  const availabilityNote = cleanStr(raw.availabilityNote, 240);
  const url = cleanStr(raw.url, 500);
  if (typeof raw.description === "string" && raw.description.trim().length > 2000) {
    return { ok: false, error: "Description is too long." };
  }
  if (
    typeof raw.availabilityNote === "string" &&
    raw.availabilityNote.trim().length > 240
  ) {
    return { ok: false, error: "Availability note is too long." };
  }
  if (url !== null && !/^https?:\/\/.+/.test(url)) {
    return { ok: false, error: "Tool URL must start with http." };
  }
  let businessName: string | null = null;
  if (raw.businessName !== undefined && raw.businessName !== null && raw.businessName !== "") {
    businessName = requiredStr(raw.businessName, 2, 80);
    if (!businessName) return { ok: false, error: "Business name is invalid." };
  }
  return {
    ok: true,
    data: {
      name,
      slug,
      description,
      status,
      isAvailable,
      availabilityNote,
      url,
      businessName,
      showcaseStatus,
    },
  };
}

export const AVAILABILITY_ALLOWED_FIELDS = [
  "status",
  "label",
  "nextWindow",
  "note",
  "activeBuildTitle",
  "activeBuildStage",
] as const;

export function validateAvailabilityInput(raw: unknown): {
  ok: boolean;
  error?: string;
  data?: {
    status: string;
    label: string | null;
    nextWindow: string | null;
    note: string | null;
    activeBuildTitle: string | null;
    activeBuildStage: string | null;
  };
} {
  if (!isRecord(raw)) return { ok: false, error: "Invalid availability data." };
  if (findUnknownFields(raw, AVAILABILITY_ALLOWED_FIELDS).length > 0) {
    return { ok: false, error: "Invalid availability data." };
  }
  const status =
    typeof raw.status === "string" &&
    (AVAILABILITY_STATUSES as readonly string[]).includes(raw.status)
      ? raw.status
      : null;
  if (!status) return { ok: false, error: "Availability status is invalid." };
  const labelParsed = optionalStr(raw.label, 80);
  const windowParsed = optionalStr(raw.nextWindow, 80);
  const noteParsed = optionalStr(raw.note, 500);
  const titleParsed = optionalStr(raw.activeBuildTitle, 120);
  const stageParsed = optionalStr(raw.activeBuildStage, 80);
  if (!labelParsed.ok) return { ok: false, error: "Label is invalid." };
  if (!windowParsed.ok) return { ok: false, error: "Next window is invalid." };
  if (!noteParsed.ok) return { ok: false, error: "Note is invalid." };
  if (!titleParsed.ok) return { ok: false, error: "Active build title is invalid." };
  if (!stageParsed.ok) return { ok: false, error: "Active build stage is invalid." };
  return {
    ok: true,
    data: {
      status,
      label: labelParsed.value,
      nextWindow: windowParsed.value,
      note: noteParsed.value,
      activeBuildTitle: titleParsed.value,
      activeBuildStage: stageParsed.value,
    },
  };
}

export function validateProofNoteInput(raw: unknown): {
  ok: boolean;
  error?: string;
  data?: {
    title: string;
    body: string | null;
    permissionStatus: string;
    relatedToolId: string | null;
    kind: string;
  };
} {
  if (!isRecord(raw)) return { ok: false, error: "Invalid note data." };
  const allowed = ["title", "body", "permissionStatus", "relatedToolId", "kind"];
  if (findUnknownFields(raw, allowed).length > 0) {
    return { ok: false, error: "Invalid note data." };
  }
  const title = requiredStr(raw.title, 3, 120);
  if (!title) return { ok: false, error: "Note title is required." };
  const body = cleanStr(raw.body, 4000);
  if (typeof raw.body === "string" && raw.body.trim().length > 4000) {
    return { ok: false, error: "Note body is too long." };
  }
  const permissionStatus =
    raw.permissionStatus === undefined
      ? "pending"
      : typeof raw.permissionStatus === "string" &&
          (PROOF_PERMISSIONS as readonly string[]).includes(raw.permissionStatus)
        ? raw.permissionStatus
        : null;
  if (!permissionStatus) return { ok: false, error: "Permission value is invalid." };
  const relatedToolId = cleanStr(raw.relatedToolId, 80);
  const kind =
    raw.kind === undefined || raw.kind === null || raw.kind === ""
      ? "ops-note"
      : typeof raw.kind === "string" &&
          (PROOF_KINDS as readonly string[]).includes(raw.kind)
        ? raw.kind
        : null;
  if (!kind) return { ok: false, error: "Kind value is invalid." };
  return { ok: true, data: { title, body, permissionStatus, relatedToolId, kind } };
}

export function validateProofNotePatch(raw: unknown): {
  ok: boolean;
  error?: string;
  data?: {
    permissionStatus?: string;
    kind?: string;
  };
} {
  if (!isRecord(raw)) return { ok: false, error: "Invalid update." };
  if (findUnknownFields(raw, ["permissionStatus", "kind"]).length > 0) {
    return { ok: false, error: "Invalid update." };
  }
  const out: { permissionStatus?: string; kind?: string } = {};
  if (raw.permissionStatus !== undefined) {
    if (
      typeof raw.permissionStatus !== "string" ||
      !(PROOF_PERMISSIONS as readonly string[]).includes(raw.permissionStatus)
    ) {
      return { ok: false, error: "Permission value is invalid." };
    }
    out.permissionStatus = raw.permissionStatus;
  }
  if (raw.kind !== undefined) {
    if (
      typeof raw.kind !== "string" ||
      !(PROOF_KINDS as readonly string[]).includes(raw.kind)
    ) {
      return { ok: false, error: "Kind value is invalid." };
    }
    out.kind = raw.kind;
  }
  if (out.permissionStatus === undefined && out.kind === undefined) {
    return { ok: false, error: "Nothing to update." };
  }
  return { ok: true, data: out };
}
