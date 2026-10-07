import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Badge, Button, Card, Group, Select, Skeleton, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { SecureAccessState } from "../../../components/SecureAccessState/SecureAccessState";
import type { DeniedStatus, OutreachCreateInput, OutreachRecord, OutreachStatus } from "../types";
import { outreachNeedsReply } from "../types";
import classes from "./OutreachView.module.css";

export type OutreachViewProps = {
  items: OutreachRecord[];
  loading?: boolean;
  error?: string | null;
  denied?: DeniedStatus | null;
  onRetry?: () => void;
  showNeedsReplyOnly?: boolean;
  onToggleNeedsReply?: (value: boolean) => void;
  onCreate?: (input: OutreachCreateInput) => Promise<void> | void;
  creating?: boolean;
  createError?: string | null;
  onStatusChange?: (id: string, status: OutreachStatus) => Promise<void> | void;
};

const STATUS_OPTIONS = [
  { value: "prospect", label: "Prospect" },
  { value: "messaged", label: "Messaged" },
  { value: "no_reply", label: "No reply" },
  { value: "replied", label: "Replied" },
  { value: "built", label: "Built" },
  { value: "archived", label: "Archived" },
];

export function OutreachView({
  items,
  loading = false,
  error = null,
  denied = null,
  onRetry,
  showNeedsReplyOnly = false,
  onToggleNeedsReply,
  onCreate,
  creating = false,
  createError = null,
  onStatusChange,
}: OutreachViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    contact: "",
    channel: "",
    status: "prospect" as OutreachStatus,
    notes: "",
    nextFollowUp: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [createdOk, setCreatedOk] = useState(false);

  if (denied) return <SecureAccessState status={denied} onRetry={onRetry} />;
  if (loading) {
    return (
      <Stack gap="md" aria-label="Outreach loading">
        <Skeleton height={60} radius="md" />
        <Skeleton height={200} radius="md" />
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

  const visible = showNeedsReplyOnly ? items.filter((i) => i.needsReply ?? outreachNeedsReply(i.status)) : items;

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
    setCreatedOk(false);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreate) return;
    if (form.businessName.trim().length < 2) {
      setFormError("Add the business name.");
      document.getElementById("outreach-business")?.focus();
      return;
    }
    if (form.nextFollowUp.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(form.nextFollowUp.trim())) {
      setFormError("Follow up date must be YYYY-MM-DD.");
      document.getElementById("outreach-followup")?.focus();
      return;
    }
    setFormError(null);
    try {
      await onCreate({
        businessName: form.businessName.trim(),
        contact: form.contact.trim() ? form.contact.trim() : undefined,
        channel: form.channel.trim() ? form.channel.trim() : undefined,
        status: form.status,
        notes: form.notes.trim() ? form.notes.trim() : undefined,
        nextFollowUp: form.nextFollowUp.trim() ? form.nextFollowUp.trim() : undefined,
      });
      setForm({ businessName: "", contact: "", channel: "", status: "prospect", notes: "", nextFollowUp: "" });
      setCreatedOk(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save. Try again.");
    }
  }

  return (
    <Stack gap="md" className={classes.stack}>
      <div>
        <Title order={1} className={classes.pageTitle}>
          Outreach
        </Title>
        <Text className={classes.pageSub}>
          Businesses contacted directly. Only real entries appear here.
        </Text>
      </div>

      {onCreate ? (
        <Card withBorder radius="md" padding="md" className={classes.rowCard}>
          <Group justify="space-between" align="center" gap="sm">
            <Text fw={650}>Add business</Text>
            <Button variant="subtle" size="sm" onClick={() => setShowAdd((v) => !v)}>
              {showAdd ? "Hide form" : "Add business"}
            </Button>
          </Group>
          {showAdd ? (
            <form onSubmit={handleCreate}>
              <Stack gap="sm" mt="md">
                <TextInput
                  id="outreach-business"
                  label="Business name"
                  required
                  value={form.businessName}
                  onChange={(e) => setField("businessName", e.currentTarget.value)}
                  placeholder="Shop name"
                />
                <Group gap="sm" grow>
                  <TextInput
                    label="Contact"
                    value={form.contact}
                    onChange={(e) => setField("contact", e.currentTarget.value)}
                    placeholder="Phone, email, or handle"
                  />
                  <TextInput
                    label="Channel"
                    value={form.channel}
                    onChange={(e) => setField("channel", e.currentTarget.value)}
                    placeholder="Call, visit, message"
                  />
                </Group>
                <Group gap="sm" grow>
                  <Select
                    label="Status"
                    data={STATUS_OPTIONS}
                    value={form.status}
                    onChange={(v) => setField("status", ((v ?? "prospect") as OutreachStatus))}
                  />
                  <TextInput
                    id="outreach-followup"
                    label="Follow up, YYYY-MM-DD"
                    value={form.nextFollowUp}
                    onChange={(e) => setField("nextFollowUp", e.currentTarget.value)}
                    placeholder="2026-10-20"
                  />
                </Group>
                <Textarea
                  label="Note"
                  minRows={2}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.currentTarget.value)}
                  placeholder="What was said and what is next"
                />
                {formError ? (
                  <Alert color="red" variant="light" role="alert">
                    {formError}
                  </Alert>
                ) : null}
                {createError ? (
                  <Alert color="red" variant="light" role="alert">
                    {createError}
                  </Alert>
                ) : null}
                {createdOk ? (
                  <Alert color="green" variant="light" role="status">
                    Business saved.
                  </Alert>
                ) : null}
                <div>
                  <Button type="submit" loading={creating} size="sm">
                    Save business
                  </Button>
                </div>
                <Text size="xs">Needs reply is set when status is messaged or no reply.</Text>
              </Stack>
            </form>
          ) : null}
        </Card>
      ) : null}

      {onToggleNeedsReply ? (
        <Group gap="sm">
          <input
            id="outreach-needs-reply"
            type="checkbox"
            checked={showNeedsReplyOnly}
            onChange={(e) => onToggleNeedsReply(e.currentTarget.checked)}
            className={classes.checkbox}
          />
          <label htmlFor="outreach-needs-reply" className={classes.checkLabel}>
            Show only needing reply
          </label>
        </Group>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? "No outreach yet" : "No matches"}
          description={
            items.length === 0
              ? "Add the first business you contact so follow up stays in one place."
              : "Turn off the filter to see all outreach entries."
          }
        />
      ) : (
        <div className={classes.list}>
          {visible.map((row) => {
            const needsReply = row.needsReply ?? outreachNeedsReply(row.status);
            return (
            <Card key={row.id} withBorder radius="md" padding="md" className={classes.rowCard}>
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={650} className={classes.business}>
                    {row.businessName}
                  </Text>
                  <Text size="sm" className={classes.muted}>
                    {row.contact || "No contact yet"} · {row.channel || "No channel"} ·{" "}
                    {row.lastContactAt ? `last contact ${row.lastContactAt}` : "not contacted yet"}
                  </Text>
                  {row.nextFollowUp ? (
                    <Text size="sm" className={classes.muted}>
                      Follow up: {row.nextFollowUp}
                    </Text>
                  ) : null}
                </div>
                <Group gap="xs">
                  {needsReply ? (
                    <Badge color="yellow" variant="light">
                      Needs reply
                    </Badge>
                  ) : null}
                  <Badge variant="light" color="gray">
                    {row.status}
                  </Badge>
                </Group>
              </Group>
              {row.notes ? <Text mt="xs" size="sm" className={classes.note}>{row.notes}</Text> : null}
              {onStatusChange ? (
                <Group gap="xs" mt="sm">
                  <label htmlFor={`outreach-status-${row.id}`} className={classes.checkLabel}>
                    Status
                  </label>
                  <Select
                    id={`outreach-status-${row.id}`}
                    value={row.status}
                    onChange={(v) => {
                      if (v) onStatusChange(row.id, v as OutreachStatus);
                    }}
                    data={STATUS_OPTIONS}
                    size="sm"
                  />
                </Group>
              ) : null}
            </Card>
            );
          })}
        </div>
      )}
    </Stack>
  );
}
