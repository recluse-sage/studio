// Worker environment for Oasis.dev API.
// Binding name for Cloudflare Rate Limiting is RATE_LIMITER.
// Parent integration will supply real Worker D1 types. DB is typed as any here
// to stay compatible until the Worker entry adds its own Env declaration.

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

// Minimal D1 surface used by handlers. Real D1Database satisfies this.
export interface D1Like {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
  };
  batch?(statements: unknown[]): Promise<unknown[]>;
}

export interface OasisEnv {
  DB: D1Like;
  RATE_LIMITER?: RateLimitBinding;
  RESEND_API_KEY?: string;
  OWNER_EMAIL?: string;
  FROM_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function safeError(message: string, status = 400, code?: string): Response {
  // SECURITY: never include stack traces or secrets in API errors.
  return json(code ? { error: message, code } : { error: message }, status);
}

// Shared cache helpers. Admin JSON is always private no-store.
// Public JSON is cacheable for 60 seconds. Use these helpers so cache
// behavior stays consistent across handlers.

export function adminJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

export function adminError(message: string, status = 400, code?: string): Response {
  // SECURITY: never include stack traces or secrets in API errors.
  return adminJson(code ? { error: message, code } : { error: message }, status);
}

export function publicJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}

export function publicError(message: string, status = 400, code?: string): Response {
  return publicJson(code ? { error: message, code } : { error: message }, status);
}

export function nowIso(): string {
  return new Date().toISOString();
}
