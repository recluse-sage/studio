// Turnstile server verification. Must run before any D1 insert for intakes.
export async function verifyTurnstile(
  token: string,
  secret: string | undefined,
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: boolean; error?: string }> {
  if (!secret) return { ok: false, error: "not-configured" };
  if (!token) return { ok: false, error: "missing-token" };
  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    const res = await fetchFn(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    if (!res.ok) return { ok: false, error: "verify-failed" };
    const data = (await res.json()) as { success?: boolean };
    if (data.success === true) return { ok: true };
    return { ok: false, error: "verify-failed" };
  } catch {
    return { ok: false, error: "verify-error" };
  }
}
