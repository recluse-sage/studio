import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Badge, Button, Card, Group, Skeleton, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { SecureAccessState } from "../../../components/SecureAccessState/SecureAccessState";
import type { DeniedStatus, ProofNote } from "../types";
import classes from "./ProofNotesView.module.css";

export type ProofNotesViewProps = {
  notes: ProofNote[];
  loading?: boolean;
  error?: string | null;
  denied?: DeniedStatus | null;
  saving?: boolean;
  saveError?: string | null;
  onCreate?: (input: { title: string; body: string }) => Promise<void> | void;
  onRetry?: () => void;
};

const SAMPLE_CONCEPTS = [
  {
    id: "sample-quote-helper",
    title: "Sample concept: one line quote helper",
    body: "Draft idea for a shop that gets repeat quote calls. Shows task, frequency, and a contact tap. Replace every detail with real facts before use.",
  },
  {
    id: "sample-visit-note",
    title: "Sample concept: visit follow up note",
    body: "Draft follow up message after a shop visit. Use as a starting point only. Do not publish without clear permission.",
  },
];

function permissionLabel(note: ProofNote): { text: string; color: string } {
  if (note.permissionStatus === "approved") return { text: "Approved to show", color: "green" };
  if (note.permissionStatus === "pending") return { text: "Pending permission", color: "yellow" };
  if (note.permissionStatus === "denied") return { text: "Do not show", color: "red" };
  return { text: "Private", color: "gray" };
}

export function ProofNotesView({
  notes,
  loading = false,
  error = null,
  denied = null,
  saving = false,
  saveError = null,
  onCreate,
  onRetry,
}: ProofNotesViewProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (body.trim().length < 3) {
      setFieldError("Write a short note before saving.");
      document.getElementById("proof-note-body")?.focus();
      return;
    }
    setFieldError(null);
    if (onCreate) {
      await onCreate({ title: title.trim(), body: body.trim() });
      setTitle("");
      setBody("");
    }
  }

  if (denied) return <SecureAccessState status={denied} onRetry={onRetry} />;
  if (loading) {
    return (
      <Stack gap="md" aria-label="Notes loading">
        <Skeleton height={140} radius="md" />
        <Skeleton height={160} radius="md" />
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

  const approved = notes.filter((n) => n.permissionStatus === "approved");
  const waiting = notes.filter((n) => n.permissionStatus === "pending");

  return (
    <Stack gap="md" className={classes.stack}>
      <div>
        <Title order={1} className={classes.pageTitle}>
          Proof Notes
        </Title>
        <Text className={classes.pageSub}>
          Short dated notes for backup checks, launches, and lessons. Facts only.
        </Text>
      </div>

      <Card withBorder radius="lg" padding="lg" className={classes.card}>
        <Title order={2} className={classes.cardTitle}>
          Content studio
        </Title>
        <Text size="sm" className={classes.muted}>
          Samples are drafts only and are always labeled Sample. Real reviews appear only with a permission flag.
        </Text>

        <Text size="sm" fw={650} className={classes.sectionLabel}>
          Sample concepts
        </Text>
        <div className={classes.sampleGrid}>
          {SAMPLE_CONCEPTS.map((sample) => (
            <div key={sample.id} className={classes.sampleCard}>
              <Group gap="xs" align="center">
                <Badge variant="light" color="yellow" size="sm">
                  Sample
                </Badge>
                <Text size="xs" className={classes.sampleFlag}>
                  Draft only
                </Text>
              </Group>
              <Text fw={650} size="sm" className={classes.noteTitle}>
                {sample.title}
              </Text>
              <Text size="sm" className={classes.noteBody}>
                {sample.body}
              </Text>
              <Text size="xs" className={classes.sampleNote}>
                Do not publish without permission. Replace with real details.
              </Text>
            </div>
          ))}
        </div>

        <Group justify="space-between" align="center" gap="sm" mt="md">
          <Text size="sm" fw={650} className={classes.sectionLabel}>
            Real reviews
          </Text>
          <Text size="xs" className={classes.muted} aria-live="polite">
            {approved.length === 0
              ? "No approved reviews yet"
              : `${approved.length} approved${waiting.length > 0 ? `, ${waiting.length} waiting` : ""}`}
          </Text>
        </Group>
        {approved.length === 0 ? (
          <div className={classes.studioEmpty}>
            <EmptyState
              title="No approved reviews yet"
              description="Real reviews appear here only after permission is approved. Samples above are drafts only and are never shown as real."
            />
          </div>
        ) : (
          <div className={classes.list}>
            {approved.map((note) => {
              const perm = permissionLabel(note);
              return (
                <div key={note.id} className={classes.reviewCard}>
                  <Group gap="xs">
                    <Badge variant="light" color={perm.color} size="sm">
                      {perm.text}
                    </Badge>
                    {note.relatedToolId ? (
                      <Text size="xs" className={classes.date}>
                        Tool: {note.relatedToolId}
                      </Text>
                    ) : null}
                  </Group>
                  <Text size="xs" className={classes.date}>
                    {note.createdAt}
                  </Text>
                  {note.title ? (
                    <Text fw={650} size="sm" className={classes.noteTitle}>
                      {note.title}
                    </Text>
                  ) : null}
                  <Text size="sm" className={classes.noteBody}>
                    {note.body}
                  </Text>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card withBorder radius="lg" padding="lg" className={classes.card}>
        <Title order={2} className={classes.cardTitle}>
          Add a note
        </Title>
        <form onSubmit={handleSubmit} className={classes.form}>
          <div className={classes.field}>
            <label htmlFor="proof-note-title" className={classes.label}>
              Title, optional
            </label>
            <TextInput
              id="proof-note-title"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              placeholder="Launch note, backup check, visit note"
            />
          </div>
          <div className={classes.field}>
            <label htmlFor="proof-note-body" className={classes.label}>
              Note
            </label>
            <Textarea
              id="proof-note-body"
              required
              minRows={3}
              value={body}
              onChange={(e) => setBody(e.currentTarget.value)}
              placeholder="What happened, when, and what is next"
              error={fieldError}
              aria-invalid={Boolean(fieldError)}
            />
          </div>
          {saveError ? (
            <Alert color="red" variant="light" role="alert">
              {saveError}
            </Alert>
          ) : null}
          <div>
            <Button type="submit" loading={saving} disabled={!onCreate}>
              Save note
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <Title order={2} className={classes.listTitle}>
          All notes
        </Title>
        <Text size="sm" className={classes.muted}>
          Every saved note with its permission flag. Private by default.
        </Text>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          description="Saved notes will list here with dates. Nothing is prefilled."
        />
      ) : (
        <div className={classes.list}>
          {notes.map((note) => {
            const perm = permissionLabel(note);
            return (
              <Card key={note.id} withBorder radius="md" padding="md" className={classes.noteCard}>
                <Group gap="xs">
                  <Text size="xs" className={classes.date}>
                    {note.createdAt}
                  </Text>
                  <Badge variant="light" color={perm.color} size="sm">
                    {perm.text}
                  </Badge>
                </Group>
                {note.title ? <Text fw={650} className={classes.noteTitle}>{note.title}</Text> : null}
                <Text size="sm" className={classes.noteBody}>
                  {note.body}
                </Text>
              </Card>
            );
          })}
        </div>
      )}
    </Stack>
  );
}
