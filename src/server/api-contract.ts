// Phase-one API contract for UI integration.
// Public: POST /api/intakes -> 201 IntakePublicResponse, 400, 429, 503.
// Intake fields: businessName, businessType, taskDescription, timeline, budget,
// contactMethod, contactValue, website honeypot, turnstileToken. Frequency was
// removed. Quiz goal folds into taskDescription via quizToIntakePrefill and
// buildTaskDescriptionFromQuiz in src/shared/quiz.ts. Budget is plain text and
// accepts Free plus dollar ranges or naira ranges for Nigeria. Country for the
// currency rule stays client side and is never stored, so no new column.
// Turnstile stays fail closed.
// Public: GET /api/public/availability -> 200 AvailabilityPublicResponse, public max-age 60.
// Public: GET /api/public/display -> 200 { proofVisible: boolean }, public max-age 60. Proof hidden by default.
// Public: GET /api/public/work-items -> 200 WorkItemsResponse with approved proof plus labeled samples only, kind on every item, public max-age 60.
// Public: GET /api/public/posts?kind=&limit=&offset= -> 200 PagedResponse published posts only, kind filters post or know-how, public max-age 60.
// Public: GET /api/public/posts/:slug -> 200 published post only with kind, optional ?kind= must match, public max-age 60.
// Scheduler: posts use draft, scheduled, published, unpublished plus kind post or know-how. Admin sends
// date plus time plus IANA zone, server stores canonical UTC publish_at.
// Hourly cron flips due scheduled rows to published with one audit row.
// Runtime GET /sitemap.xml serves static paths plus published posts and
// know-how guides with lastmod, public max-age 300, origin from request URL with host guard.
// Private (Access JWT required): all /api/admin/* need Cf-Access-Jwt-Assertion and return private no-store.
// GET /api/admin/overview -> 200 AdminOverviewResponse with outreachNeedingReply, lastBackupDrillAt, overdueFollowUps, scheduledDue.
// GET /api/admin/system -> 200 AdminSystemResponse with presence booleans only, never secret values.
// GET /api/admin/intakes?status=&limit=&offset= -> 200 PagedResponse IntakeRecord.
// POST /api/admin/intakes manual entry, source admin-manual, no Turnstile.
// PATCH /api/admin/intakes/:id {status} -> 200 {id, status}.
// GET, POST /api/admin/outreach and PATCH /api/admin/outreach/:id.
// Outreach statuses: prospect, messaged, no_reply, replied, built, archived.
// Outreach items include needsReply and lastContactAt.
// GET, POST /api/admin/tools and PATCH /api/admin/tools/:id.
// Tools include businessName, showcaseStatus, and isAvailable flag.
// GET, PUT /api/admin/availability -> 200 AvailabilityAdminResponse.
// GET, PUT /api/admin/display -> 200 { proofVisible: boolean }, private no-store, audit display.update.
// GET /api/admin/usage?toolKey=&limit=&offset= -> 200 PagedResponse aggregates only.
// GET, POST /api/admin/proof-notes -> 200 PagedResponse with kind on every item. POST accepts optional kind, default ops-note.
// PATCH /api/admin/proof-notes/:id permission transitions only, writes proof.update audit with before and after.
// Proof kinds: proof, sample-concept, ops-note, backup-drill.
// GET /api/admin/posts?status=&kind=&limit=&offset= -> 200 PagedResponse admin posts.
// POST, PUT /api/admin/posts create with slug, title, body, status, kind, publishAt or date plus time plus zone.
// PATCH, PUT /api/admin/posts/:id update including status and kind transitions, audit post.update.
// All list APIs return {items, total, limit, offset}.
// Errors are always {error, code?} with no stack traces.

export const API_ROUTES = {
  publicIntake: "POST /api/intakes",
  publicAvailability: "GET /api/public/availability",
  publicWorkItems: "GET /api/public/work-items",
  publicPosts: "GET /api/public/posts",
  publicPost: "GET /api/public/posts/:slug",
  overview: "GET /api/admin/overview",
  system: "GET /api/admin/system",
  intakesList: "GET /api/admin/intakes",
  intakeManualCreate: "POST /api/admin/intakes",
  intakeUpdate: "PATCH /api/admin/intakes/:id",
  outreachList: "GET /api/admin/outreach",
  outreachCreate: "POST /api/admin/outreach",
  outreachUpdate: "PATCH /api/admin/outreach/:id",
  toolsList: "GET /api/admin/tools",
  toolCreate: "POST /api/admin/tools",
  toolUpdate: "PATCH /api/admin/tools/:id",
  availabilityRead: "GET /api/admin/availability",
  availabilityUpdate: "PUT /api/admin/availability",
  displayRead: "GET /api/admin/display",
  displayUpdate: "PUT /api/admin/display",
  publicDisplay: "GET /api/public/display",
  usageRead: "GET /api/admin/usage",
  proofList: "GET /api/admin/proof-notes",
  proofCreate: "POST /api/admin/proof-notes",
  proofUpdate: "PATCH /api/admin/proof-notes/:id",
  postsList: "GET /api/admin/posts",
  postCreate: "POST /api/admin/posts",
  postCreatePut: "PUT /api/admin/posts",
  postUpdate: "PATCH /api/admin/posts/:id",
  sitemap: "GET /sitemap.xml",
} as const;
