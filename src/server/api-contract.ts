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
// Private (Access JWT required): all /api/admin/* need Cf-Access-Jwt-Assertion and return private no-store.
// GET /api/admin/overview -> 200 AdminOverviewResponse with outreachNeedingReply, lastBackupDrillAt, overdueFollowUps.
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
// All list APIs return {items, total, limit, offset}.
// Errors are always {error, code?} with no stack traces.

export const API_ROUTES = {
  publicIntake: "POST /api/intakes",
  publicAvailability: "GET /api/public/availability",
  publicWorkItems: "GET /api/public/work-items",
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
} as const;
