import { json, nowIso, safeError, type OasisEnv } from "../env.ts";
import { validateIntakeInput } from "../validation.ts";
import { verifyTurnstile } from "../turnstile.ts";
import { checkIntakeRateLimit } from "../ratelimit.ts";
import { sendOwnerNotification } from "../resend.ts";
import { newId } from "../db.ts";

// POST /api/intakes
// Public handler. Order: rate limit, validate, Turnstile, insert, then notify.
// Never stores IP or user agent. Source is set by server, not by client.
export async function handlePublicIntake(
  request: Request,
  env: OasisEnv,
): Promise<Response> {
  if (request.method !== "POST") {
    return safeError("Method not allowed.", 405, "method-not-allowed");
  }

  const limited = await checkIntakeRateLimit(request, env);
  if (!limited.allowed) {
    return safeError("Too many requests. Please try again later.", 429, "rate-limited");
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return safeError("Invalid submission.", 400, "bad-json");
  }

  const checked = validateIntakeInput(raw);
  if (!checked.ok || !checked.data) {
    return safeError(checked.error || "Invalid submission.", 400, "validation");
  }
  const data = checked.data;

  const turnstile = await verifyTurnstile(
    data.turnstileToken,
    env.TURNSTILE_SECRET_KEY,
  );
  if (!turnstile.ok) {
    if (turnstile.error === "not-configured") {
      return safeError("Form is not ready. Please try again later.", 503, "not-configured");
    }
    return safeError("Verification failed. Please try again.", 400, "turnstile");
  }

  // SECURITY: source is fixed server side for the public route.
  const source = "landing";
  const id = newId();
  const now = nowIso();

  try {
    await env.DB.prepare(
      "INSERT INTO intakes (id, business_name, business_type, task_description, timeline, budget, contact_method, contact_value, source, status, email_notification, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'pending', ?, ?)",
    )
      .bind(
        id,
        data.businessName,
        data.businessType,
        data.taskDescription,
        data.timeline,
        data.budget,
        data.contactMethod,
        data.contactValue,
        source,
        now,
        now,
      )
      .run();
  } catch {
    return safeError("Could not save. Please try again.", 500, "db-error");
  }

  // Notify after insert so the intake is preserved even if mail fails.
  const mail = await sendOwnerNotification(env, {
    intakeId: id,
    businessName: data.businessName,
    businessType: data.businessType,
    contactMethod: data.contactMethod,
  });

  let emailNotification: "sent" | "pending" | "failed" = "sent";
  let message = "Thanks, your request is saved. We will reply soon.";
  if (!mail.configured) {
    emailNotification = "pending";
    message = "Saved. Owner email is pending setup, but your request is kept.";
  } else if (!mail.sent) {
    emailNotification = "failed";
    message = "Saved, but owner email failed. Your request is kept and will be reviewed.";
  }

  try {
    await env.DB.prepare(
      "UPDATE intakes SET email_notification = ?, updated_at = ? WHERE id = ?",
    )
      .bind(emailNotification, nowIso(), id)
      .run();
  } catch {
    // Keep the honest accepted state even if the flag update fails.
  }

  return json(
    { id, saved: true, status: "new", emailNotification, message },
    201,
  );
}
