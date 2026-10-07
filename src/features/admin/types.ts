/* Admin types. All lists are empty by default. No seed data. */

export type AdminViewId =
  | "dashboard"
  | "intake"
  | "outreach"
  | "tools"
  | "availability"
  | "usage"
  | "notes"
  | "settings";

export type BusinessType =
  | "home-trades"
  | "food-hospitality"
  | "health-beauty"
  | "professional-services"
  | "neighborhood-retail"
  | "tool-automation"
  | "other";

export type ContactMethod = "phone" | "sms" | "whatsapp" | "email" | "tiktok" | "other";

export type IntakeStatus = "new" | "reviewed" | "contacted" | "scoped" | "declined" | "archived";

export type IntakeSource = "landing" | "offline-admin" | "admin-manual";

export type EmailNotificationState = "pending" | "sent" | "failed";

export type IntakeRecord = {
  id: string;
  businessName: string;
  businessType: BusinessType;
  taskDescription: string;
  frequency: string | null;
  timeline: string | null;
  budget: string | null;
  contactMethod: ContactMethod;
  contactValue: string;
  source: IntakeSource | string;
  status: IntakeStatus;
  emailNotification?: EmailNotificationState;
  createdAt: string;
  updatedAt: string;
};

export type AdminIntakeCreateInput = {
  businessName: string;
  businessType: BusinessType;
  taskDescription: string;
  frequency?: string;
  timeline?: string;
  budget?: string;
  contactMethod: ContactMethod;
  contactValue: string;
};

export type OutreachStatus =
  | "prospect"
  | "messaged"
  | "no_reply"
  | "replied"
  | "built"
  | "archived";

export function outreachNeedsReply(status: OutreachStatus): boolean {
  return status === "messaged" || status === "no_reply";
}

export type OutreachRecord = {
  id: string;
  businessName: string;
  contact: string | null;
  channel: string | null;
  status: OutreachStatus;
  notes: string | null;
  nextFollowUp: string | null;
  lastContactAt: string | null;
  needsReply: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type OutreachCreateInput = {
  businessName: string;
  contact?: string;
  channel?: string;
  status?: OutreachStatus;
  notes?: string;
  nextFollowUp?: string;
};

export type ToolStatus = "draft" | "active" | "paused" | "retired";

export type ShowcaseStatus = "private" | "pending" | "approved" | "denied";

export type ToolRecord = {
  id: string;
  businessName: string;
  name: string;
  slug: string;
  description: string | null;
  status: ToolStatus;
  isAvailable: boolean;
  availabilityNote: string | null;
  url: string | null;
  showcaseStatus: ShowcaseStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type ToolCreateInput = {
  businessName: string;
  name: string;
  slug: string;
  description?: string;
  status?: ToolStatus;
  isAvailable?: boolean;
  availabilityNote?: string;
  url?: string;
  showcaseStatus?: ShowcaseStatus;
};

export type ToolUpdateInput = Partial<ToolCreateInput>;

export type AvailabilityStatus = "open" | "limited" | "booked";

export type AvailabilityState = {
  status: AvailabilityStatus;
  label: string;
  nextWindow: string;
  note: string;
  activeBuildTitle: string;
  activeBuildStage: string;
};

/** Public shape. Never includes active build fields. */
export type PublicAvailability = {
  status: AvailabilityStatus;
  label: string;
  nextWindow: string;
  note: string;
};

export type UsageRow = {
  tool: string;
  date: string;
  views: number;
  offlineViews: number;
  contactClicks: number;
};

export type ProofNote = {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  permissionStatus?: "pending" | "approved" | "denied";
  relatedToolId?: string | null;
  updatedAt?: string;
};

export type AdminCounts = {
  newIntakes: number;
  outreachNeedingReply: number;
  activeBuilds: number;
};

export type AdminOverview = {
  newIntakes: number;
  outreachNeedingReply: number;
  activeBuilds: number;
  intakesByStatus?: Record<string, number>;
  outreachByStatus?: Record<string, number>;
  toolsByStatus?: Record<string, number>;
};

export type PagedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminLoadState = "idle" | "loading" | "ready" | "error" | "denied";

export type DeniedStatus = 401 | 403;
