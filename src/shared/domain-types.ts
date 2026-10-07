// Shared API and data contracts for Oasis.dev phase one.
// UI and server must use these field names. No secrets here.
// API field names use camelCase in JSON, snake_case in D1 rows.

export type BusinessType =
  | "home-trades"
  | "food-hospitality"
  | "health-beauty"
  | "professional-services"
  | "neighborhood-retail"
  | "tool-automation"
  | "other";

export type ContactMethod =
  | "phone"
  | "sms"
  | "whatsapp"
  | "email"
  | "tiktok"
  | "other";

export type IntakeStatus =
  | "new"
  | "reviewed"
  | "contacted"
  | "scoped"
  | "declined"
  | "archived";

// Server determined only. Clients must not send this.
export type IntakeSource = "landing" | "offline-admin" | "admin-manual";

export type EmailNotificationState = "pending" | "sent" | "failed";

export interface IntakeCreateRequest {
  businessName: string;
  businessType: BusinessType;
  taskDescription: string;
  frequency?: string;
  timeline?: string;
  budget?: string;
  contactMethod: ContactMethod;
  contactValue: string;
  // Honeypot. Must stay blank. Named website to catch bots.
  website?: string;
  turnstileToken: string;
}

export interface IntakePublicResponse {
  id: string;
  saved: true;
  status: IntakeStatus;
  emailNotification: EmailNotificationState;
  message: string;
}

export interface IntakeRecord {
  id: string;
  businessName: string;
  businessType: BusinessType;
  taskDescription: string;
  frequency: string | null;
  timeline: string | null;
  budget: string | null;
  contactMethod: ContactMethod;
  contactValue: string;
  source: IntakeSource;
  status: IntakeStatus;
  emailNotification: EmailNotificationState;
  createdAt: string;
  updatedAt: string;
}

export type OutreachStatus =
  | "prospect"
  | "messaged"
  | "no_reply"
  | "replied"
  | "built"
  | "archived";

export interface OutreachRecord {
  id: string;
  businessName: string;
  contact: string | null;
  channel: string | null;
  status: OutreachStatus;
  notes: string | null;
  nextFollowUp: string | null;
  lastContactAt: string | null;
  needsReply: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachCreateRequest {
  businessName: string;
  contact?: string;
  channel?: string;
  status?: OutreachStatus;
  notes?: string;
  nextFollowUp?: string;
  lastContactAt?: string;
}

export interface AdminManualIntakeRequest {
  businessName: string;
  businessType: BusinessType;
  taskDescription: string;
  frequency?: string;
  timeline?: string;
  budget?: string;
  contactMethod: ContactMethod;
  contactValue: string;
}

export interface AdminManualIntakeResponse {
  id: string;
  saved: true;
  source: IntakeSource;
  status: IntakeStatus;
  emailNotification: EmailNotificationState;
}

export type ToolStatus = "draft" | "active" | "paused" | "retired";

export type ShowcaseStatus = "private" | "pending" | "approved" | "denied";

export interface ToolRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ToolStatus;
  isAvailable: boolean;
  availabilityNote: string | null;
  url: string | null;
  businessName: string | null;
  showcaseStatus: ShowcaseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCreateRequest {
  name: string;
  slug: string;
  description?: string;
  status?: ToolStatus;
  isAvailable?: boolean;
  availabilityNote?: string;
  url?: string;
  businessName?: string;
  showcaseStatus?: ShowcaseStatus;
}

export type AvailabilityStatus =
  | "open"
  | "limited"
  | "waitlist"
  | "paused"
  | "closed";

export interface AvailabilityRecord {
  id: "primary";
  status: AvailabilityStatus;
  label: string | null;
  nextWindow: string | null;
  note: string | null;
  activeBuildTitle: string | null;
  activeBuildStage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityUpsertRequest {
  status: AvailabilityStatus;
  label?: string | null;
  nextWindow?: string | null;
  note?: string | null;
  activeBuildTitle?: string | null;
  activeBuildStage?: string | null;
}

export interface AvailabilityAdminResponse {
  configured: boolean;
  availability: AvailabilityRecord | null;
}

export interface AvailabilityPublicResponse {
  configured: boolean;
  status: string;
  label: string | null;
  nextWindow: string | null;
  note: string | null;
}

// Aggregate counters only. No IP, user agent, or identifiers.
export interface UsageDailyRecord {
  id: string;
  toolId: string | null;
  toolKey: string;
  usageDate: string;
  views: number;
  offlineViews: number;
  contactClicks: number;
  createdAt: string;
  updatedAt: string;
}

export type ProofPermission = "pending" | "approved" | "denied";

export type ProofKind = "proof" | "sample-concept" | "ops-note" | "backup-drill";

export interface ProofNoteRecord {
  id: string;
  title: string;
  body: string | null;
  permissionStatus: ProofPermission;
  relatedToolId: string | null;
  kind: ProofKind;
  createdAt: string;
  updatedAt: string;
}

export interface ProofNoteCreateRequest {
  title: string;
  body?: string;
  permissionStatus?: ProofPermission;
  relatedToolId?: string;
  kind?: ProofKind;
}

export interface ProofNoteUpdateRequest {
  permissionStatus?: ProofPermission;
  kind?: ProofKind;
}

export interface AdminOverviewResponse {
  intakesByStatus: Record<string, number>;
  outreachByStatus: Record<string, number>;
  toolsByStatus: Record<string, number>;
  usageTotals7d: { views: number; offlineViews: number; contactClicks: number };
  pendingProofNotes: number;
  outreachNeedingReply: number;
  lastBackupDrillAt: string | null;
  overdueFollowUps: number;
}

export interface AdminSystemResponse {
  accessVarsSet: boolean;
  turnstileSecretSet: boolean;
  dbOk: boolean;
}

export interface WorkItem {
  id: string;
  title: string;
  body: string | null;
  kind: ProofKind;
  relatedToolId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItemsResponse {
  items: WorkItem[];
  total: number;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
