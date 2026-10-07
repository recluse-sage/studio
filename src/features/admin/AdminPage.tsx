import { useState } from "react";
import { AdminShell } from "./components/AdminShell";
import { DashboardView } from "./components/DashboardView";
import { IntakeView } from "./components/IntakeView";
import { OutreachView } from "./components/OutreachView";
import { ToolsView } from "./components/ToolsView";
import { AvailabilityView } from "./components/AvailabilityView";
import { UsageView } from "./components/UsageView";
import { ProofNotesView } from "./components/ProofNotesView";
import { SettingsView } from "./components/SettingsView";
import type { PlannerFacts } from "../../shared/planner";
import type {
  AdminCounts,
  AdminIntakeCreateInput,
  AdminSystemPresence,
  AdminViewId,
  AvailabilityState,
  DeniedStatus,
  IntakeRecord,
  IntakeStatus,
  OutreachCreateInput,
  OutreachRecord,
  OutreachStatus,
  ProofNote,
  ToolCreateInput,
  ToolRecord,
  ToolUpdateInput,
  UsageRow,
} from "./types";

export type AdminPageProps = {
  initialView?: AdminViewId;
  availability: AvailabilityState | null;
  counts: AdminCounts;
  intakes: IntakeRecord[];
  outreach: OutreachRecord[];
  tools?: ToolRecord[];
  usage: UsageRow[];
  proofNotes: ProofNote[];
  system?: AdminSystemPresence | null;
  loading?: boolean;
  error?: string | null;
  denied?: DeniedStatus | null;
  ownerEmail?: string;
  intakeEndpoint?: string;
  adminBase?: string;
  publicSiteUrl?: string;
  onRetry?: () => void;
  onSaveAvailability?: (value: AvailabilityState) => Promise<void> | void;
  onIntakeStatusChange?: (id: string, status: IntakeStatus) => Promise<void> | void;
  onCreateIntake?: (input: AdminIntakeCreateInput) => Promise<void> | void;
  onCreateOutreach?: (input: OutreachCreateInput) => Promise<void> | void;
  onOutreachStatusChange?: (id: string, status: OutreachStatus) => Promise<void> | void;
  onCreateTool?: (input: ToolCreateInput) => Promise<void> | void;
  onUpdateTool?: (id: string, patch: ToolUpdateInput) => Promise<void> | void;
  onSaveProofNote?: (input: { title: string; body: string }) => Promise<void> | void;
  savingAvailability?: boolean;
  saveAvailabilityError?: string | null;
  creatingIntake?: boolean;
  createIntakeError?: string | null;
  creatingOutreach?: boolean;
  createOutreachError?: string | null;
  creatingTool?: boolean;
  createToolError?: string | null;
  savingNote?: boolean;
  saveNoteError?: string | null;
};

/**
 * Private admin composition.
 * Pure props in, no fetching inside, so the parent can wire real API calls.
 * Security comes from the Worker and Cloudflare Access, never from this shell.
 */
export function AdminPage({
  initialView = "dashboard",
  availability,
  counts,
  intakes,
  outreach,
  tools = [],
  usage,
  proofNotes,
  system = null,
  loading = false,
  error = null,
  denied = null,
  ownerEmail,
  intakeEndpoint,
  adminBase,
  publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL,
  onRetry,
  onSaveAvailability,
  onIntakeStatusChange,
  onCreateIntake,
  onCreateOutreach,
  onOutreachStatusChange,
  onCreateTool,
  onUpdateTool,
  onSaveProofNote,
  savingAvailability = false,
  saveAvailabilityError = null,
  creatingIntake = false,
  createIntakeError = null,
  creatingOutreach = false,
  createOutreachError = null,
  creatingTool = false,
  createToolError = null,
  savingNote = false,
  saveNoteError = null,
}: AdminPageProps) {
  const [view, setView] = useState<AdminViewId>(initialView);
  const [intakeFilter, setIntakeFilter] = useState<IntakeStatus | "all">("all");
  const [needsReplyOnly, setNeedsReplyOnly] = useState(false);

  async function handleDashboardNote(body: string) {
    if (onSaveProofNote) {
      await onSaveProofNote({ title: "", body });
    }
  }

  const siteUrlConfigured = (publicSiteUrl ?? "").trim().length > 0;
  const plannerFacts: PlannerFacts | undefined = system
    ? {
        d1Ok: system.d1Ok,
        turnstileConfigured: system.turnstileConfigured,
        accessConfigured: system.accessConfigured,
        siteUrlConfigured,
        lastBackupDrillAt: counts.lastBackupDrillAt ?? null,
        newIntakes: counts.newIntakes,
        overdueFollowUps: counts.overdueFollowUps ?? 0,
        outreachNeedingReply: counts.outreachNeedingReply,
        pendingProofNotes: proofNotes.filter((note) => note.permissionStatus === "pending").length,
        availabilityConfigured: availability !== null,
      }
    : undefined;

  return (
    <AdminShell active={view} onNavigate={setView} counts={counts} ownerEmail={ownerEmail}>
      {view === "dashboard" ? (
        <DashboardView
          availability={availability}
          counts={counts}
          recentIntakes={intakes}
          outreach={outreach}
          tools={tools}
          proofNotes={proofNotes}
          plannerFacts={plannerFacts}
          loading={loading}
          error={error}
          denied={denied}
          onRetry={onRetry}
          onSaveNote={onSaveProofNote ? handleDashboardNote : undefined}
          onViewIntake={() => setView("intake")}
          onNavigate={setView}
        />
      ) : null}

      {view === "intake" ? (
        <IntakeView
          intakes={intakes}
          loading={loading}
          error={error}
          denied={denied}
          filter={intakeFilter}
          onFilterChange={setIntakeFilter}
          onStatusChange={onIntakeStatusChange}
          onCreateIntake={onCreateIntake}
          creating={creatingIntake}
          createError={createIntakeError}
          onRetry={onRetry}
        />
      ) : null}

      {view === "outreach" ? (
        <OutreachView
          items={outreach}
          loading={loading}
          error={error}
          denied={denied}
          onRetry={onRetry}
          showNeedsReplyOnly={needsReplyOnly}
          onToggleNeedsReply={setNeedsReplyOnly}
          onCreate={onCreateOutreach}
          creating={creatingOutreach}
          createError={createOutreachError}
          onStatusChange={onOutreachStatusChange}
        />
      ) : null}

      {view === "tools" ? (
        <ToolsView
          tools={tools}
          loading={loading}
          error={error}
          denied={denied}
          onRetry={onRetry}
          onCreate={onCreateTool}
          creating={creatingTool}
          createError={createToolError}
          onUpdate={onUpdateTool}
        />
      ) : null}

      {view === "availability" ? (
        <AvailabilityView
          value={availability}
          loading={loading}
          error={error}
          denied={denied}
          saving={savingAvailability}
          saveError={saveAvailabilityError}
          onSave={onSaveAvailability}
          onRetry={onRetry}
        />
      ) : null}

      {view === "usage" ? (
        <UsageView rows={usage} loading={loading} error={error} denied={denied} onRetry={onRetry} />
      ) : null}

      {view === "notes" ? (
        <ProofNotesView
          notes={proofNotes}
          loading={loading}
          error={error}
          denied={denied}
          saving={savingNote}
          saveError={saveNoteError}
          onCreate={onSaveProofNote}
          onRetry={onRetry}
        />
      ) : null}

      {view === "settings" ? (
        <SettingsView
          ownerEmail={ownerEmail}
          intakeEndpoint={intakeEndpoint}
          adminBase={adminBase}
          publicSiteUrl={publicSiteUrl}
        />
      ) : null}
    </AdminShell>
  );
}
