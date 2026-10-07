import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Card, Select, Skeleton, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { SecureAccessState } from "../../../components/SecureAccessState/SecureAccessState";
import type { AvailabilityState, DeniedStatus } from "../types";
import classes from "./AvailabilityView.module.css";

export type AvailabilityViewProps = {
  value: AvailabilityState | null;
  loading?: boolean;
  error?: string | null;
  denied?: DeniedStatus | null;
  saving?: boolean;
  saveError?: string | null;
  onSave?: (value: AvailabilityState) => Promise<void> | void;
  onRetry?: () => void;
};

export function AvailabilityView({
  value,
  loading = false,
  error = null,
  denied = null,
  saving = false,
  saveError = null,
  onSave,
  onRetry,
}: AvailabilityViewProps) {
  const [draft, setDraft] = useState<AvailabilityState | null>(null);
  const isUnconfigured = value == null;
  const blankDraft: AvailabilityState = {
    status: "open",
    label: "",
    nextWindow: "",
    note: "",
    activeBuildTitle: "",
    activeBuildStage: "",
  };
  const current = draft ?? value ?? blankDraft;

  function set<K extends keyof AvailabilityState>(key: K, val: AvailabilityState[K]) {
    const base = current;
    setDraft({ ...base, [key]: val });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onSave) return;
    try {
      await onSave(current);
      setDraft(null);
    } catch {
      /* keep draft so the owner does not lose input */
    }
  }

  if (denied) return <SecureAccessState status={denied} onRetry={onRetry} />;
  if (loading) {
    return (
      <Stack gap="md" aria-label="Availability loading">
        <Skeleton height={280} radius="md" />
      </Stack>
    );
  }

  return (
    <Stack gap="md" className={classes.stack}>
      <div>
        <Title order={1} className={classes.pageTitle}>
          Availability
        </Title>
        <Text className={classes.pageSub}>
          This text feeds the landing page. Keep it short and current.
        </Text>
      </div>

      {error ? (
        <Alert color="red" variant="light" role="alert">
          {error}{" "}
          {onRetry ? (
            <Button variant="subtle" size="xs" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </Alert>
      ) : null}

      <Card withBorder radius="lg" padding="lg" className={classes.card}>
        <form onSubmit={handleSubmit} className={classes.form}>
          {isUnconfigured ? (
            <Alert color="blue" variant="light" role="status">
              Not set yet. This stays off the public page until you save.
            </Alert>
          ) : null}
          <div className={classes.field}>
            <label htmlFor="avail-status" className={classes.label}>
              Status
            </label>
            <Select
              id="avail-status"
              value={current.status}
              onChange={(v) => v && set("status", v as AvailabilityState["status"])}
              data={[
                { value: "open", label: "Open for new work" },
                { value: "limited", label: "Limited, one slot left" },
                { value: "booked", label: "Booked, waitlist only" },
              ]}
            />
          </div>

          <div className={classes.field}>
            <label htmlFor="avail-label" className={classes.label}>
              Badge label
            </label>
            <TextInput
              id="avail-label"
              value={current.label}
              onChange={(e) => set("label", e.currentTarget.value)}
              placeholder="Now booking one build"
            />
          </div>

          <div className={classes.field}>
            <label htmlFor="avail-window" className={classes.label}>
              Next window
            </label>
            <TextInput
              id="avail-window"
              value={current.nextWindow}
              onChange={(e) => set("nextWindow", e.currentTarget.value)}
              placeholder="Next start: week of Oct 20"
            />
          </div>

          <div className={classes.field}>
            <label htmlFor="avail-note" className={classes.label}>
              Public note
            </label>
            <Textarea
              id="avail-note"
              value={current.note}
              onChange={(e) => set("note", e.currentTarget.value)}
              minRows={2}
              placeholder="One line about capacity and reply time"
            />
          </div>

          <div className={classes.row}>
            <div className={classes.field}>
              <label htmlFor="avail-build" className={classes.label}>
                Active build
              </label>
              <TextInput
                id="avail-build"
                value={current.activeBuildTitle}
                onChange={(e) => set("activeBuildTitle", e.currentTarget.value)}
                placeholder="Leave blank when no active build"
              />
            </div>
            <div className={classes.field}>
              <label htmlFor="avail-stage" className={classes.label}>
                Stage
              </label>
              <TextInput
                id="avail-stage"
                value={current.activeBuildStage}
                onChange={(e) => set("activeBuildStage", e.currentTarget.value)}
                placeholder="Scope, build, review, launch"
              />
            </div>
          </div>

          {saveError ? (
            <Alert color="red" variant="light" role="alert">
              {saveError}
            </Alert>
          ) : null}

          <div>
            <Button type="submit" loading={saving} disabled={!onSave}>
              Save availability
            </Button>
          </div>
        </form>
      </Card>
    </Stack>
  );
}
