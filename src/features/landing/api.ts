import type {
  AvailabilitySummary,
  BusinessType,
  ContactMethod,
  IntakeFormValues,
} from "./types";

export const DEFAULT_INTAKE_ENDPOINT = "/api/intakes";
export const DEFAULT_PUBLIC_AVAILABILITY_ENDPOINT = "/api/public/availability";

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
