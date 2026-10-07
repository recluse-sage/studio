import type { OasisEnv } from "./env.ts";

// Server side Resend call. Secrets stay in env and never enter responses.
export async function sendOwnerNotification(
  env: OasisEnv,
  input: { intakeId: string; businessName: string; businessType: string; contactMethod: string },
  fetchFn: typeof fetch = fetch,
): Promise<{ sent: boolean; configured: boolean }> {
  const apiKey = env.RESEND_API_KEY;
  const to = env.OWNER_EMAIL;
  const from = env.FROM_EMAIL;
  if (!apiKey || !to || !from) return { sent: false, configured: false };
  try {
    const res = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: "Bearer " + apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "New Oasis intake: " + input.businessName.slice(0, 60),
        text:
          "New intake " +
          input.intakeId +
          " from " +
          input.businessName +
          " (" +
          input.businessType +
          ") via " +
          input.contactMethod +
          ". Open admin inbox to review.",
      }),
    });
    if (!res.ok) return { sent: false, configured: true };
    return { sent: true, configured: true };
  } catch {
    return { sent: false, configured: true };
  }
}
