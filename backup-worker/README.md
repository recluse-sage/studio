# Backup Worker (isolated)

Daily D1 export to a private R2 bucket, following the official D1 export to R2
polling pattern: POST an export job, poll the job status to a terminal state,
then verify objects landed under the dated prefix. A started job is never
treated as a finished backup.

## Isolation

- Own project `oasis-dev-backup`, own config `backup-worker/wrangler.jsonc`.
- No bindings, routes, or code shared with the app Worker (`workers/app.ts`).
- No public routes: `workers_dev` is off and every fetch returns 404 with
  `X-Robots-Tag: noindex, nofollow`. Only the daily cron triggers an export.
- Observability is on. Every run logs structured JSON: start, export job id,
  poll attempts, and completion with object count.

## Configure

Plain vars in `backup-worker/wrangler.jsonc`:

- `CLOUDFLARE_ACCOUNT_ID`: account that owns the D1 database.
- `D1_DATABASE_ID`: database to export.
- `BACKUP_R2_BUCKET`: must match the bound bucket `oasis-dev-backups`.
- `BACKUP_PREFIX`: key prefix, default `d1-exports`.

Secret (never in repo):

- `CLOUDFLARE_API_TOKEN` with D1 export plus R2 write scope for the backup
  bucket only. Set with
  `wrangler secret put CLOUDFLARE_API_TOKEN --config backup-worker/wrangler.jsonc`.

Without the token or any required var, the run fails closed: it logs
`backup misconfigured` and throws, so the failure shows in observability and
is never reported as success.

## Retention

- D1 Time Travel is always on: 7 day point in time recovery on Free, 30 day
  on Paid. It covers recent history only.
- R2 exports cover longer history. Set a 90 day expire lifecycle rule on the
  private `oasis-dev-backups` bucket so exports older than 90 days age out.

## Monthly restore drill (throwaway runbook)

Run once a month. It uses a throwaway database, never production.

1. Pick the latest dated prefix under `d1-exports/` in the private bucket.
2. Create a throwaway D1 database (example: `oasis-restore-drill-YYYY-MM`).
3. Import the export files into the throwaway database.
4. Verify row counts on outreach, tools, intakes, and usage tables match
   expectations and the app boots read only against it if needed.
5. Delete the throwaway database.
6. Log the date and result in admin notes.

## Verify locally

`npm run backup:verify` typechecks this Worker in isolation. Full checks
(typecheck, server tests, build, sitemap, wrangler dry run) run in CI with no
Cloudflare token and no deploy.
