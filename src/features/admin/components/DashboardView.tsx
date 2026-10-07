import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Badge, Button, Card, Group, Skeleton, Stack, Text, Textarea, Title } from "@mantine/core";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { SecureAccessState } from "../../../components/SecureAccessState/SecureAccessState";
import { StatusBadge } from "../../../components/StatusBadge/StatusBadge";
import type { AdminCounts, AvailabilityState, DeniedStatus, IntakeRecord } from "../types";
import classes from "./DashboardView.module.css";

export type DashboardViewProps = {
  availability: AvailabilityState | null;
  counts: AdminCounts;
  recentIntakes: IntakeRecord[];
  loading?: boolean;
  error?: string | null;
  denied?: DeniedStatus | null;
  onRetry?: () => void;
  onSaveNote?: (body: string) => Promise<void> | void;
  onViewIntake?: () => void;
};

function toneFor(status: AvailabilityState["status"]): "open" | "warning" | "closed" {
  if (status === "booked") return "closed";
  if (status === "limited") return "warning";
  return "open";
}

export function DashboardView({
  availability,
  counts,
  recentIntakes,
  loading = false,
  error = null,
  denied = null,
  onRetry,
  onSaveNote,
  onViewIntake,
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
        <Skeleton height={120} radius="md" />
        <Skeleton height={90} radius="md" />
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

  return (
    <Stack gap="lg" className={classes.stack}>
      <div>
        <Title order={1} className={classes.pageTitle}>
          Dashboard
        </Title>
        <Text className={classes.pageSub}>Status, counts, and the next intake to read.</Text>
      </div>

      <Card withBorder radius="lg" padding="lg" className={classes.card}>
        <Group justify="space-between" align="flex-start" gap="sm">
          <div>
            <Text className={classes.eyebrow}>Availability</Text>
            {availability ? (
              <>
                <Group gap="xs" mt={6}>
                  <StatusBadge tone={toneFor(availability.status)}>{availability.label}</StatusBadge>
                </Group>
                <Text mt={8} fw={600} className={classes.nextWindow}>
                  {availability.nextWindow}
                </Text>
                <Text size="sm" className={classes.muted}>
                  {availability.note}
                </Text>
              </>
            ) : (
              <Text size="sm" className={classes.muted}>
                No availability message set yet. Add one in Availability so the landing page stays honest.
              </Text>
            )}
          </div>
        </Group>
        {availability?.activeBuildTitle ? (
          <Text size="sm" mt="sm" className={classes.muted}>
            Active build: {availability.activeBuildTitle}
            {availability.activeBuildStage ? ` (${availability.activeBuildStage})` : ""}
          </Text>
        ) : null}
      </Card>

      <div className={classes.countGrid} role="list" aria-label="Work counts">
        <Card withBorder radius="md" padding="md" className={classes.countCard} role="listitem">
          <Text className={classes.countNum}>{counts.newIntakes}</Text>
          <Text className={classes.countLabel}>New intakes</Text>
        </Card>
        <Card withBorder radius="md" padding="md" className={classes.countCard} role="listitem">
          <Text className={classes.countNum}>{counts.outreachNeedingReply}</Text>
          <Text className={classes.countLabel}>Outreach needing reply</Text>
        </Card>
        <Card withBorder radius="md" padding="md" className={classes.countCard} role="listitem">
          <Text className={classes.countNum}>{counts.activeBuilds}</Text>
          <Text className={classes.countLabel}>Active builds</Text>
        </Card>
      </div>

      <Card withBorder radius="lg" padding="lg" className={classes.card}>
        <Group justify="space-between" align="center" gap="sm">
          <Title order={2} className={classes.cardTitle}>
            Latest intakes
          </Title>
          {onViewIntake ? (
            <Button variant="subtle" size="sm" onClick={onViewIntake}>
              Open intake inbox
            </Button>
          ) : null}
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

      <Card withBorder radius="lg" padding="lg" className={classes.card}>
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
