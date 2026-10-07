import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Badge, Button, Card, Group, Skeleton, Stack, Text, Textarea, Title } from "@mantine/core";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { SecureAccessState } from "../../../components/SecureAccessState/SecureAccessState";
import { StatusBadge } from "../../../components/StatusBadge/StatusBadge";
import { getNextStep } from "../../../shared/planner";
import type { PlannerFacts } from "../../../shared/planner";
import type {
  AdminCounts,
  AdminViewId,
  AvailabilityState,
  DeniedStatus,
  IntakeRecord,
  OutreachRecord,
  ProofNote,
  ToolRecord,
} from "../types";
import classes from "./DashboardView.module.css";

export type DashboardViewProps = {
  availability: AvailabilityState | null;
  counts: AdminCounts;
  recentIntakes: IntakeRecord[];
  outreach?: OutreachRecord[];
  tools?: ToolRecord[];
  proofNotes?: ProofNote[];
  plannerFacts?: PlannerFacts;
  loading?: boolean;
  error?: string | null;
  denied?: DeniedStatus | null;
  onRetry?: () => void;
  onSaveNote?: (body: string) => Promise<void> | void;
  onViewIntake?: () => void;
  onNavigate?: (view: AdminViewId) => void;
};

function toneFor(status: AvailabilityState["status"]): "open" | "warning" | "closed" {
  if (status === "booked") return "closed";
  if (status === "limited") return "warning";
  return "open";
}

/** Shared planner views map to existing admin views. System status lives in Settings. */
function toAdminView(view: string): AdminViewId {
  if (
    view === "dashboard" ||
    view === "intake" ||
    view === "outreach" ||
    view === "tools" ||
    view === "availability" ||
    view === "usage" ||
    view === "notes" ||
    view === "settings"
  ) {
    return view;
  }
  return "settings";
}

export function DashboardView({
  availability,
  counts,
  recentIntakes,
  outreach = [],
  tools = [],
  plannerFacts,
  loading = false,
  error = null,
  denied = null,
  onRetry,
  onSaveNote,
  onViewIntake,
  onNavigate,
}: DashboardViewProps) {
  const [note, setNote] = useState("");
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (note.trim().length < 3 || !onSaveNote) return;
    setNoteState("saving");
    try {
      await onSaveNote(note.trim());
      setNote("");
      setNoteState("saved");
    } catch {
      setNoteState("error");
    }
  }

  if (denied) {
    return <SecureAccessState status={denied} onRetry={onRetry} />;
  }

  if (loading) {
    return (
      <Stack gap="md" aria-label="Dashboard loading">
        <Skeleton height={92} radius="md" />
        <div className={classes.skelGrid}>
          <Skeleton height={118} radius="md" />
          <Skeleton height={118} radius="md" />
          <Skeleton height={118} radius="md" />
          <Skeleton height={118} radius="md" />
        </div>
        <Skeleton height={220} radius="md" />
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert color="red" variant="light" role="alert">
        {error}{" "}
        {onRetry ? (
          <Button variant="subtle" size="xs" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </Alert>
    );
  }

  const backupDrillAt = counts.lastBackupDrillAt ?? null;
  const sharedStep = plannerFacts ? getNextStep(plannerFacts) : null;
  const stepView: AdminViewId = sharedStep ? toAdminView(sharedStep.view) : "settings";
  const outreachTotal = outreach.length;
  const activeTools = tools.filter((t) => t.status === "active").length;

  function go(view: AdminViewId) {
    if (onNavigate) onNavigate(view);
    else if (view === "intake" && onViewIntake) onViewIntake();
  }

  return (
    <Stack gap="lg" className={classes.stack}>
      <div className={classes.reveal}>
        <Text className={classes.eyebrow}>Guided home</Text>
        <Title order={1} className={classes.pageTitle}>
          Dashboard
        </Title>
        <Text className={classes.pageSub}>
          Pipeline health first, then the single next step. Counts come from live data. Empty means empty.
        </Text>
      </div>

      <section aria-label="Pipeline health" className={classes.reveal}>
        <div className={classes.scoreGrid}>
          <article className={classes.scoreCard} aria-label="Intakes">
            <Text className={classes.scoreEyebrow}>Intakes</Text>
            <Text className={classes.scoreValue} role="status">
              {counts.newIntakes}
            </Text>
            <Text className={classes.scoreLabel}>new notes to read</Text>
            {counts.newIntakes === 0 ? (
              <Text size="sm" className={classes.scoreHelper}>
                Inbox is empty. Share the landing intake link to collect the first note.
              </Text>
            ) : (
              <button type="button" className={classes.scoreLink} onClick={() => go("intake")}>
                Read newest first
              </button>
            )}
          </article>

          <article className={classes.scoreCard} aria-label="Outreach stage">
            <Text className={classes.scoreEyebrow}>Outreach</Text>
            <Text className={classes.scoreValue} role="status">
              {counts.outreachNeedingReply}
            </Text>
            <Text className={classes.scoreLabel}>waiting on a reply</Text>
            {counts.outreachNeedingReply === 0 ? (
              <Text size="sm" className={classes.scoreHelper}>
                {outreachTotal === 0
                  ? "No outreach yet. Add a real business you contact."
                  : "Follow up queue is clear. Nothing is overdue."}
              </Text>
            ) : (
              <button type="button" className={classes.scoreLink} onClick={() => go("outreach")}>
                Open follow up queue
              </button>
            )}
          </article>

          <article className={classes.scoreCard} aria-label="Availability">
            <Text className={classes.scoreEyebrow}>Availability</Text>
            {availability ? (
              <>
                <Group gap="xs" mt={6}>
                  <StatusBadge tone={toneFor(availability.status)}>{availability.label || availability.status}</StatusBadge>
                </Group>
                <Text size="sm" className={classes.scoreHelper}>
                  {availability.nextWindow || "Next window not set."}
                </Text>
                <button type="button" className={classes.scoreLink} onClick={() => go("availability")}>
                  Review message
                </button>
              </>
            ) : (
              <>
                <Text className={classes.scoreValue} role="status">
                  Not set
                </Text>
                <Text size="sm" className={classes.scoreHelper}>
                  No availability message yet. Add one so the landing page stays honest.
                </Text>
                <button type="button" className={classes.scoreLink} onClick={() => go("availability")}>
                  Set availability
                </button>
              </>
            )}
          </article>

          <article className={classes.scoreCard} aria-label="Backup drill">
            <Text className={classes.scoreEyebrow}>Backup drill</Text>
            {backupDrillAt ? (
              <>
                <Text className={classes.scoreValueSmall}>Logged</Text>
                <Text size="sm" className={classes.scoreHelper}>
                  Last check: {backupDrillAt}. Log each restore test with the date.
                </Text>
                <button type="button" className={classes.scoreLink} onClick={() => go("notes")}>
                  View in proof notes
                </button>
              </>
            ) : (
              <>
                <Text className={classes.scoreValueSmall}>Not logged</Text>
                <Text size="sm" className={classes.scoreHelper}>
                  No restore test logged yet. Nothing is assumed. Log one with the date.
                </Text>
                <button type="button" className={classes.scoreLink} onClick={() => go("notes")}>
                  Log a check
                </button>
              </>
            )}
          </article>
        </div>
        <Text size="xs" className={classes.activeHint}>
          {activeTools > 0
            ? `${activeTools} active tool${activeTools === 1 ? "" : "s"} registered. Details live in Tools.`
            : "No active tools registered yet. Details live in Tools."}
        </Text>
      </section>

      <section aria-label="Next step" className={classes.reveal}>
        <Card withBorder radius="lg" padding="lg" className={classes.plannerCard}>
          <Text className={classes.plannerEyebrow}>Next unblocked step</Text>
          {sharedStep ? (
            <>
              <Title order={2} className={classes.plannerTitle}>
                {sharedStep.title}
              </Title>
              <Text size="sm" className={classes.plannerDetail}>
                {sharedStep.detail}
              </Text>
              <div className={classes.plannerActions}>
                <Button
                  size="sm"
                  variant={sharedStep.key === "idle" ? "light" : "filled"}
                  onClick={() => go(stepView)}
                >
                  {sharedStep.cta}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Title order={2} className={classes.plannerTitle}>
                Next step is unavailable
              </Title>
              <Text size="sm" className={classes.plannerDetail}>
                System status has not loaded yet. Nothing is guessed. Try again to refresh the pipeline facts.
              </Text>
              {onRetry ? (
                <div className={classes.plannerActions}>
                  <Button size="sm" variant="light" onClick={onRetry}>
                    Try again
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </Card>
      </section>

      <Card withBorder radius="lg" padding="lg" className={`${classes.card} ${classes.reveal}`}>
        <Group justify="space-between" align="center" gap="sm">
          <Title order={2} className={classes.cardTitle}>
            Latest intakes
          </Title>
          <Button variant="subtle" size="sm" onClick={() => go("intake")}>
            Open intake inbox
          </Button>
        </Group>
        {recentIntakes.length === 0 ? (
          <div className={classes.emptyWrap}>
            <EmptyState
              title="No intakes yet"
              description="When someone sends the landing form, the newest notes will show here. Nothing is invented for preview."
            />
          </div>
        ) : (
          <div className={`oasis-scroll-x ${classes.tableWrap}`}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Task</th>
                  <th scope="col">Status</th>
                  <th scope="col">Received</th>
                </tr>
              </thead>
              <tbody>
                {recentIntakes.slice(0, 5).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className={classes.cellMain}>{row.businessName}</span>
                      <span className={classes.cellSub}>{row.contactValue}</span>
                    </td>
                    <td>
                      <span className={classes.cellClamp}>{row.taskDescription}</span>
                    </td>
                    <td>
                      <Badge variant="light" color="gray" size="sm">
                        {row.status}
                      </Badge>
                    </td>
                    <td className={classes.cellDate}>{row.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card withBorder radius="lg" padding="lg" className={`${classes.card} ${classes.reveal}`}>
        <Title order={2} className={classes.cardTitle}>
          Quick note
        </Title>
        <Text size="sm" className={classes.muted}>
          Capture one line after a call or site visit. It saves to Proof Notes.
        </Text>
        <form onSubmit={handleNoteSubmit} className={classes.noteForm}>
          <label htmlFor="dashboard-note" className={classes.noteLabel}>
            Note
          </label>
          <Textarea
            id="dashboard-note"
            placeholder="Example: Called bakery, asked for quote helper, follow up Thursday"
            value={note}
            onChange={(e) => {
              setNote(e.currentTarget.value);
              setNoteState("idle");
            }}
            minRows={2}
            aria-describedby="dashboard-note-help"
          />
          <Text id="dashboard-note-help" size="xs" className={classes.muted}>
            Keep it short. Names and facts only.
          </Text>
          {noteState === "saved" ? (
            <Alert color="green" variant="light" role="status">
              Note saved.
            </Alert>
          ) : null}
          {noteState === "error" ? (
            <Alert color="red" variant="light" role="alert">
              Note did not save. Try again.
            </Alert>
          ) : null}
          <div>
            <Button type="submit" loading={noteState === "saving"} disabled={!onSaveNote || note.trim().length < 3}>
              Save note
            </Button>
          </div>
        </form>
      </Card>
    </Stack>
  );
}
