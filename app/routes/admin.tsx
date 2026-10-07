import { useCallback, useEffect, useState } from "react";
import { AdminDashboard } from "../../src/features/admin/AdminDashboard";
import {
  AdminApiError,
  createAdminIntake,
  createOutreach,
  createProofNote,
  createTool,
  fetchIntakesPaged,
  fetchOutreach,
  fetchOverview,
  fetchProofNotes,
  fetchTools,
  fetchUsage,
  updateAvailability,
  updateIntakeStatus,
  updateOutreach,
  updateTool,
  fetchAvailability,
} from "../../src/features/admin/api";
import type {
  AdminCounts,
  AdminIntakeCreateInput,
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
} from "../../src/features/admin/types";
import type { MetaFunction } from "react-router";

// Keep this import path in sync with the designer and backend lanes.
// Preferred admin entry: src/features/admin/AdminDashboard.tsx.
// All private fetches run client side only. SSR never loads admin data.
// Worker gates /admin and /api/admin/* with Access and adds noindex.

export const meta: MetaFunction = () => {
  return [
    { title: "Admin: Oasis.dev" },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

const EMPTY_COUNTS: AdminCounts = { newIntakes: 0, outreachNeedingReply: 0, activeBuilds: 0 };

function toDenied(error: unknown): DeniedStatus | null {
  if (error instanceof AdminApiError && error.denied) {
    return error.status === 403 ? 403 : 401;
  }
  return null;
}

export default function AdminRoute() {
  const [counts, setCounts] = useState<AdminCounts>(EMPTY_COUNTS);
  const [intakes, setIntakes] = useState<IntakeRecord[]>([]);
  const [outreach, setOutreach] = useState<OutreachRecord[]>([]);
  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [availability, setAvailability] = useState<AvailabilityState | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [proofNotes, setProofNotes] = useState<ProofNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState<DeniedStatus | null>(null);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [saveAvailabilityError, setSaveAvailabilityError] = useState<string | null>(null);
  const [creatingIntake, setCreatingIntake] = useState(false);
  const [createIntakeError, setCreateIntakeError] = useState<string | null>(null);
  const [creatingOutreach, setCreatingOutreach] = useState(false);
  const [createOutreachError, setCreateOutreachError] = useState<string | null>(null);
  const [creatingTool, setCreatingTool] = useState(false);
  const [createToolError, setCreateToolError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [saveNoteError, setSaveNoteError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(null);
    try {
      const [overview, intakesPaged, outreachRows, toolRows, usageRows, noteRows] = await Promise.all([
        fetchOverview(),
        fetchIntakesPaged({ limit: 50, offset: 0 }),
        fetchOutreach(),
        fetchTools(),
        fetchUsage(),
        fetchProofNotes(),
      ]);
      let availabilityValue: AvailabilityState | null = null;
      try {
        availabilityValue = await fetchAvailability();
      } catch (availabilityError) {
        const availabilityDenied = toDenied(availabilityError);
        if (availabilityDenied) throw availabilityError;
        if (availabilityError instanceof AdminApiError && availabilityError.status === 404) {
          availabilityValue = null;
        } else {
          availabilityValue = null;
        }
      }
      setCounts(overview);
      setIntakes(intakesPaged.items);
      setOutreach(outreachRows);
      setTools(toolRows);
      setAvailability(availabilityValue);
      setUsage(usageRows);
      setProofNotes(noteRows);
    } catch (loadError) {
      const deniedStatus = toDenied(loadError);
      if (deniedStatus) {
        setDenied(deniedStatus);
      } else if (loadError instanceof AdminApiError) {
        setError(loadError.message);
      } else {
        setError("Could not load admin data. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function handleCreateIntake(input: AdminIntakeCreateInput) {
    setCreatingIntake(true);
    setCreateIntakeError(null);
    try {
      await createAdminIntake(input);
      await loadAll();
    } catch (createError) {
      const deniedStatus = toDenied(createError);
      if (deniedStatus) setDenied(deniedStatus);
      else setCreateIntakeError(createError instanceof Error ? createError.message : "Could not create intake.");
    } finally {
      setCreatingIntake(false);
    }
  }

  async function handleIntakeStatusChange(id: string, status: IntakeStatus) {
    try {
      await updateIntakeStatus(id, status);
      await loadAll();
    } catch (statusError) {
      const deniedStatus = toDenied(statusError);
      if (deniedStatus) setDenied(deniedStatus);
      else setError(statusError instanceof Error ? statusError.message : "Could not update intake.");
    }
  }

  async function handleCreateOutreach(input: OutreachCreateInput) {
    setCreatingOutreach(true);
    setCreateOutreachError(null);
    try {
      await createOutreach(input);
      await loadAll();
    } catch (createError) {
      const deniedStatus = toDenied(createError);
      if (deniedStatus) setDenied(deniedStatus);
      else setCreateOutreachError(createError instanceof Error ? createError.message : "Could not create outreach.");
    } finally {
      setCreatingOutreach(false);
    }
  }

  async function handleOutreachStatusChange(id: string, status: OutreachStatus) {
    try {
      await updateOutreach(id, { status });
      await loadAll();
    } catch (statusError) {
      const deniedStatus = toDenied(statusError);
      if (deniedStatus) setDenied(deniedStatus);
      else setError(statusError instanceof Error ? statusError.message : "Could not update outreach.");
    }
  }

  async function handleCreateTool(input: ToolCreateInput) {
    setCreatingTool(true);
    setCreateToolError(null);
    try {
      await createTool(input);
      await loadAll();
    } catch (createError) {
      const deniedStatus = toDenied(createError);
      if (deniedStatus) setDenied(deniedStatus);
      else setCreateToolError(createError instanceof Error ? createError.message : "Could not create tool.");
    } finally {
      setCreatingTool(false);
    }
  }

  async function handleUpdateTool(id: string, patch: ToolUpdateInput) {
    try {
      await updateTool(id, patch);
      await loadAll();
    } catch (updateError) {
      const deniedStatus = toDenied(updateError);
      if (deniedStatus) setDenied(deniedStatus);
      else setError(updateError instanceof Error ? updateError.message : "Could not update tool.");
    }
  }

  async function handleSaveAvailability(value: AvailabilityState) {
    setSavingAvailability(true);
    setSaveAvailabilityError(null);
    try {
      const saved = await updateAvailability(value);
      setAvailability(saved);
      await loadAll();
    } catch (saveError) {
      const deniedStatus = toDenied(saveError);
      if (deniedStatus) setDenied(deniedStatus);
      else setSaveAvailabilityError(saveError instanceof Error ? saveError.message : "Could not save availability.");
    } finally {
      setSavingAvailability(false);
    }
  }

  async function handleSaveProofNote(input: { title: string; body: string }) {
    setSavingNote(true);
    setSaveNoteError(null);
    try {
      const title = input.title.trim().length > 0 ? input.title : "Quick note";
      await createProofNote({ title, body: input.body });
      await loadAll();
    } catch (saveError) {
      const deniedStatus = toDenied(saveError);
      if (deniedStatus) setDenied(deniedStatus);
      else setSaveNoteError(saveError instanceof Error ? saveError.message : "Could not save note.");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <AdminDashboard
      availability={availability}
      counts={counts}
      intakes={intakes}
      outreach={outreach}
      tools={tools}
      usage={usage}
      proofNotes={proofNotes}
      loading={loading}
      error={error}
      denied={denied}
      intakeEndpoint="/api/intakes"
      adminBase="/api/admin"
      onRetry={loadAll}
      onSaveAvailability={handleSaveAvailability}
      onIntakeStatusChange={handleIntakeStatusChange}
      onCreateIntake={handleCreateIntake}
      onCreateOutreach={handleCreateOutreach}
      onOutreachStatusChange={handleOutreachStatusChange}
      onCreateTool={handleCreateTool}
      onUpdateTool={handleUpdateTool}
      onSaveProofNote={handleSaveProofNote}
      savingAvailability={savingAvailability}
      saveAvailabilityError={saveAvailabilityError}
      creatingIntake={creatingIntake}
      createIntakeError={createIntakeError}
      creatingOutreach={creatingOutreach}
      createOutreachError={createOutreachError}
      creatingTool={creatingTool}
      createToolError={createToolError}
      savingNote={savingNote}
      saveNoteError={saveNoteError}
    />
  );
}
