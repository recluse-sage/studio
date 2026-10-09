/* Landing types. No fake content. All optional lists default to empty. */

export type AvailabilityStatus = "open" | "limited" | "booked";

export type AvailabilitySummary = {
  status: AvailabilityStatus;
  label: string;
  nextWindow: string;
  note: string;
};

export type ServiceItem = {
  id: string;
  title: string;
  description: string;
  points: string[];
  linkHref: string;
  linkLabel: string;
};

export type ProcessStep = {
  id: string;
  index: string;
  title: string;
  description: string;
};

export type BusinessType =
  | "home-trades"
  | "food-hospitality"
  | "health-beauty"
  | "professional-services"
  | "neighborhood-retail"
  | "tool-automation"
  | "other";

export type ContactMethod = "phone" | "sms" | "whatsapp" | "email" | "tiktok" | "other";

export type BusinessTypeOption = { value: BusinessType; label: string };

export type ContactMethodOption = { value: ContactMethod; label: string };

export const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = [
  { value: "home-trades", label: "Home trades" },
  { value: "food-hospitality", label: "Food and hospitality" },
  { value: "health-beauty", label: "Health and beauty" },
  { value: "professional-services", label: "Professional services" },
  { value: "neighborhood-retail", label: "Neighborhood retail" },
  { value: "tool-automation", label: "Tool or automation" },
  { value: "other", label: "Other" },
];

export const CONTACT_METHOD_OPTIONS: ContactMethodOption[] = [
  { value: "phone", label: "Phone call" },
  { value: "sms", label: "Text message" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "tiktok", label: "TikTok" },
  { value: "other", label: "Other" },
];

export type IntakeFormValues = {
  businessName: string;
  businessType: BusinessType | "";
  taskDescription: string;
  frequency?: string;
  timeline?: string;
  budget?: string;
  contactMethod: ContactMethod;
  contactValue: string;
  honeypot?: string;
};

export type DisplaySettings = {
  proofVisible: boolean;
};

export type IntakeSubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type LandingPageProps = {
  availability: AvailabilitySummary | null;
  services: ServiceItem[];
  steps: ProcessStep[];
  intakeEndpoint?: string;
  turnstileSiteKey?: string;
};

/* Public proof. Only approved rows from GET /api/public/work-items. */

export type WorkItemKind = "proof" | "sample-concept";

export type WorkItem = {
  id: string;
  title: string;
  body: string | null;
  kind: WorkItemKind;
  relatedToolId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
