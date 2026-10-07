// Shared guided home planner for Oasis.dev admin.
// Pure function of one facts snapshot to one step. Total order, no rotation.
// Same facts always return the same step. Lower tiers never outrank blockers.
//
// Tier 0 blockers in order: D1, Turnstile, Access, site URL.
// Tier 1: backup drill due when no drill note or drill older than 30 days.
// Tier 2 in order: new intakes, overdue follow ups, outreach needing reply,
// pending proof, availability not configured.
// Idle when all green.

export interface PlannerFacts {
  d1Ok: boolean;
  turnstileConfigured: boolean;
  accessConfigured: boolean;
  siteUrlConfigured: boolean;
  lastBackupDrillAt: string | null;
  newIntakes: number;
  overdueFollowUps: number;
  outreachNeedingReply: number;
  pendingProofNotes: number;
  availabilityConfigured: boolean;
  nowIso?: string;
}

export interface PlannerStep {
  key: string;
  tier: 0 | 1 | 2 | 3;
  title: string;
  detail: string;
  cta: string;
  view: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const BACKUP_DUE_MS = 30 * DAY_MS;

function nowMs(facts: PlannerFacts): number {
  if (facts.nowIso) {
    const t = Date.parse(facts.nowIso);
    if (!Number.isNaN(t)) return t;
  }
  return Date.now();
}

function backupDue(facts: PlannerFacts): boolean {
  if (!facts.lastBackupDrillAt) return true;
  const t = Date.parse(facts.lastBackupDrillAt);
  if (Number.isNaN(t)) return true;
  return nowMs(facts) - t >= BACKUP_DUE_MS;
}

function count(v: number): number {
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

export function getNextStep(facts: PlannerFacts): PlannerStep {
  // Tier 0 blockers. Fixed order.
  if (!facts.d1Ok) {
    return {
      key: "fix-d1",
      tier: 0,
      title: "Fix database connection",
      detail: "The admin cannot read D1. Check the DB binding before anything else.",
      cta: "Check system status",
      view: "system",
    };
  }
  if (!facts.turnstileConfigured) {
    return {
      key: "configure-turnstile",
      tier: 0,
      title: "Configure Turnstile",
      detail: "Spam checks are missing. Add the Turnstile secret before unpausing intake.",
      cta: "Open system status",
      view: "system",
    };
  }
  if (!facts.accessConfigured) {
    return {
      key: "configure-access",
      tier: 0,
      title: "Configure Access",
      detail: "Admin login checks are missing. Set the Access team domain and audience.",
      cta: "Open system status",
      view: "system",
    };
  }
  if (!facts.siteUrlConfigured) {
    return {
      key: "configure-site-url",
      tier: 0,
      title: "Set public site URL",
      detail: "The canonical URL is blank. Set it so sitemap and canonical tags stay honest.",
      cta: "Open system status",
      view: "system",
    };
  }

  // Tier 1 backup drill.
  if (backupDue(facts)) {
    return {
      key: "log-backup-drill",
      tier: 1,
      title: "Log a backup check",
      detail: "No restore test in the last 30 days. Log one dated backup drill note.",
      cta: "Open proof notes",
      view: "notes",
    };
  }

  // Tier 2 pipeline in fixed order.
  if (count(facts.newIntakes) > 0) {
    return {
      key: "read-intakes",
      tier: 2,
      title: "Read the newest intake",
      detail: "New intake notes are waiting. Start with the most recent and set a status.",
      cta: "Open intake inbox",
      view: "intake",
    };
  }
  if (count(facts.overdueFollowUps) > 0) {
    return {
      key: "clear-overdue-followups",
      tier: 2,
      title: "Clear overdue follow ups",
      detail: "Some follow ups are past their date. Send the next reply today.",
      cta: "Open follow up queue",
      view: "outreach",
    };
  }
  if (count(facts.outreachNeedingReply) > 0) {
    return {
      key: "follow-up-outreach",
      tier: 2,
      title: "Follow up on outreach",
      detail: "Conversations are waiting on a reply. Send the next follow up.",
      cta: "Open follow up queue",
      view: "outreach",
    };
  }
  if (count(facts.pendingProofNotes) > 0) {
    return {
      key: "review-proof",
      tier: 2,
      title: "Review pending proof",
      detail: "Proof notes need a permission decision. Approve or deny each one.",
      cta: "Open proof notes",
      view: "notes",
    };
  }
  if (!facts.availabilityConfigured) {
    return {
      key: "set-availability",
      tier: 2,
      title: "Set availability",
      detail: "No availability message yet. Add one so the landing page stays honest.",
      cta: "Set availability",
      view: "availability",
    };
  }

  return {
    key: "idle",
    tier: 3,
    title: "Pipeline is clear",
    detail: "Inbox is empty, outreach is caught up, and availability is set. Log the next backup check when it is due.",
    cta: "Open proof notes",
    view: "notes",
  };
}
