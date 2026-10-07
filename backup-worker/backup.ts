// Oasis.dev isolated D1 backup Worker.
//
// Purpose: on a daily schedule, trigger an official D1 export to a private R2
// bucket, poll the export job to completion, then verify objects landed.
// Follows the official D1 export to R2 polling pattern: POST an export job,
// GET the job status until it is terminal, never treat a started job as done.
//
// Isolation: this Worker is its own project (see backup-worker/wrangler.jsonc,
// project `oasis-dev-backup`). It shares no bindings, routes, or code with the
// app Worker in `workers/app.ts`. The app Worker is untouched.
//
// Safety: no public routes. `workers_dev` is off in this Worker's config and
// the fetch handler below returns 404 for any request. Exports only ever run
// from the scheduled cron handler. Missing token or config fails closed: the
// run logs a structured error and throws so the failure is visible in
// observability. It never reports success without a verified export.

export interface BackupEnv {
  // Private R2 bucket binding that receives D1 exports. Required.
  BACKUP_BUCKET: R2Bucket;
  // Cloudflare account ID that owns the D1 database. Plain var. Required.
  CLOUDFLARE_ACCOUNT_ID?: string;
  // D1 database ID to export. Plain var. Required.
  D1_DATABASE_ID?: string;
  // R2 bucket name used in the export API output. Must match the bucket bound
  // as BACKUP_BUCKET. Plain var. Required.
  BACKUP_R2_BUCKET?: string;
  // Key prefix for exports inside the bucket. Plain var, optional.
  BACKUP_PREFIX?: string;
  // API token with D1 export and R2 write scope for the backup bucket only.
  // Secret via `wrangler secret put`. Required at runtime, never in repo.
  CLOUDFLARE_API_TOKEN?: string;
}

interface ExportJob {
  id: string;
  status: string;
  result_filename?: string | null;
  error?: string | null;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 30;

function missingConfig(env: BackupEnv): string[] {
  const missing: string[] = [];
  if (!env.CLOUDFLARE_API_TOKEN) missing.push("CLOUDFLARE_API_TOKEN");
  if (!env.CLOUDFLARE_ACCOUNT_ID) missing.push("CLOUDFLARE_ACCOUNT_ID");
  if (!env.D1_DATABASE_ID) missing.push("D1_DATABASE_ID");
  if (!env.BACKUP_R2_BUCKET) missing.push("BACKUP_R2_BUCKET");
  if (!env.BACKUP_BUCKET) missing.push("BACKUP_BUCKET binding");
  return missing;
}

function exportPrefix(env: BackupEnv, now: Date): string {
  const base = (env.BACKUP_PREFIX ?? "d1-exports").replace(/\/+$/, "");
  const day = now.toISOString().slice(0, 10);
  return `${base}/${day}/`;
}

function apiBase(env: BackupEnv): string {
  return (
    `https://api.cloudflare.com/client/v4/accounts/` +
    `${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${env.D1_DATABASE_ID}`
  );
}

function authHeaders(env: BackupEnv): Record<string, string> {
  return {
    authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
    "content-type": "application/json",
  };
}

async function startExport(env: BackupEnv, prefix: string): Promise<ExportJob> {
  const res = await fetch(`${apiBase(env)}/export`, {
    method: "POST",
    headers: authHeaders(env),
    body: JSON.stringify({
      output: { r2: { bucket: env.BACKUP_R2_BUCKET, prefix } },
    }),
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    result?: ExportJob;
    errors?: Array<{ message?: string }>;
  } | null;
  if (!res.ok || !body?.success || !body.result?.id) {
    const detail = body?.errors?.map((e) => e.message).join("; ") ?? `HTTP ${res.status}`;
    throw new Error(`backup export start failed: ${detail}`);
  }
  return body.result;
}

async function readJob(env: BackupEnv, jobId: string): Promise<ExportJob> {
  const res = await fetch(`${apiBase(env)}/export/${jobId}`, {
    headers: authHeaders(env),
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    result?: ExportJob;
    errors?: Array<{ message?: string }>;
  } | null;
  if (!res.ok || !body?.success || !body.result) {
    const detail = body?.errors?.map((e) => e.message).join("; ") ?? `HTTP ${res.status}`;
    throw new Error(`backup export poll failed: ${detail}`);
  }
  return body.result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCompletion(env: BackupEnv, jobId: string): Promise<ExportJob> {
  let job = await readJob(env, jobId);
  for (let attempt = 1; attempt <= MAX_POLLS; attempt += 1) {
    const status = job.status.toLowerCase();
    console.log(
      JSON.stringify({ msg: "backup poll", jobId, status, attempt, max: MAX_POLLS }),
    );
    if (status === "complete" || status === "completed" || status === "success") return job;
    if (status === "failed" || status === "error") {
      throw new Error(`backup export job failed: ${job.error ?? job.status}`);
    }
    if (attempt === MAX_POLLS) break;
    await sleep(POLL_INTERVAL_MS);
    job = await readJob(env, jobId);
  }
  throw new Error(`backup export job still running after ${MAX_POLLS} polls: ${jobId}`);
}

async function verifyObjects(env: BackupEnv, prefix: string): Promise<number> {
  const listed = await env.BACKUP_BUCKET.list({ prefix });
  const count = listed.objects.length;
  if (count === 0) {
    throw new Error(`backup verify failed: no objects under prefix ${prefix}`);
  }
  return count;
}

export async function runBackup(env: BackupEnv, now: Date = new Date()): Promise<void> {
  const missing = missingConfig(env);
  if (missing.length > 0) {
    // Fail closed: never report success without token and config.
    console.error(JSON.stringify({ msg: "backup misconfigured", missing }));
    throw new Error(`backup misconfigured, missing: ${missing.join(", ")}`);
  }
  const prefix = exportPrefix(env, now);
  console.log(JSON.stringify({ msg: "backup start", prefix }));
  const job = await startExport(env, prefix);
  console.log(JSON.stringify({ msg: "backup export started", jobId: job.id, prefix }));
  const done = await waitForCompletion(env, job.id);
  const count = await verifyObjects(env, prefix);
  console.log(
    JSON.stringify({
      msg: "backup complete",
      jobId: done.id,
      status: done.status,
      prefix,
      objects: count,
    }),
  );
}

function notFound(): Response {
  return new Response("Not found.", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  // Cron only. HTTP never triggers a backup.
  async scheduled(_controller: ScheduledController, env: BackupEnv): Promise<void> {
    await runBackup(env);
  },
  async fetch(): Promise<Response> {
    return notFound();
  },
} satisfies ExportedHandler<BackupEnv>;
