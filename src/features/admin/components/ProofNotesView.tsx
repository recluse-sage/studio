import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Card, Skeleton, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
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

      {notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          description="Saved notes will list here with dates. Nothing is prefilled."
        />
      ) : (
        <div className={classes.list}>
          {notes.map((note) => (
            <Card key={note.id} withBorder radius="md" padding="md" className={classes.noteCard}>
              <Text size="xs" className={classes.date}>
                {note.createdAt}
              </Text>
              {note.title ? <Text fw={650} className={classes.noteTitle}>{note.title}</Text> : null}
              <Text size="sm" className={classes.noteBody}>
                {note.body}
              </Text>
            </Card>
          ))}
        </div>
      )}
    </Stack>
  );
}
