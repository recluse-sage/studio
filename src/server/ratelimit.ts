import type { OasisEnv } from "./env.ts";

// SECURITY: public intake must be rate limited by the injected binding.
// Binding name is RATE_LIMITER. The key uses the connecting IP for limiting
// only and is never written to D1.
export async function checkIntakeRateLimit(
  request: Request,
  env: OasisEnv,
): Promise<{ allowed: boolean }> {
  const limiter = env.RATE_LIMITER;
  if (!limiter) return { allowed: true };
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";
  const key = "intake:" + ip.slice(0, 64);
  try {
    const result = await limiter.limit({ key });
    return { allowed: result.success };
  } catch {
    // Fail open for limiter errors so a binding outage does not block legit mail.
    // Turnstile and validation still apply.
    return { allowed: true };
  }
}
