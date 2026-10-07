// Phase-one API contract for UI integration.
// Public: POST /api/intakes -> 201 IntakePublicResponse, 400, 429, 503.
// Public: GET /api/public/availability -> 200 AvailabilityPublicResponse.
// Private (Access JWT required): all /api/admin/* need Cf-Access-Jwt-Assertion.
// GET /api/admin/overview -> 200 AdminOverviewResponse with outreachNeedingReply.
// GET /api/admin/intakes?status=&limit=&offset= -> 200 PagedResponse IntakeRecord.
// POST /api/admin/intakes manual entry, source admin-manual, no Turnstile.
// PATCH /api/admin/intakes/:id {status} -> 200 {id, status}.
// GET, POST /api/admin/outreach and PATCH /api/admin/outreach/:id.
// Outreach statuses: prospect, messaged, no_reply, replied, built, archived.
// Outreach items include needsReply and lastContactAt.
// GET, POST /api/admin/tools and PATCH /api/admin/tools/:id.
// Tools include businessName, showcaseStatus, and isAvailable flag.
// GET, PUT /api/admin/availability -> 200 AvailabilityAdminResponse.
// GET /api/admin/usage?toolKey=&limit=&offset= -> 200 PagedResponse aggregates only.
// GET, POST /api/admin/proof-notes -> 200 PagedResponse.
// All list APIs return {items, total, limit, offset}.
// Errors are always {error, code?} with no stack traces.

export const API_ROUTES = {
  publicIntake: "POST /api/intakes",
  publicAvailability: "GET /api/public/availability",
  overview: "GET /api/admin/overview",
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
  usageRead: "GET /api/admin/usage",
  proofList: "GET /api/admin/proof-notes",
  proofCreate: "POST /api/admin/proof-notes",
} as const;
