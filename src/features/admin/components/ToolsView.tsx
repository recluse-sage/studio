import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Badge, Button, Card, Group, Select, Skeleton, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { SecureAccessState } from "../../../components/SecureAccessState/SecureAccessState";
import type { DeniedStatus, ShowcaseStatus, ToolCreateInput, ToolRecord, ToolStatus, ToolUpdateInput } from "../types";
import classes from "./ToolsView.module.css";

export type ToolsViewProps = {
  tools: ToolRecord[];
  loading?: boolean;
  error?: string | null;
  denied?: DeniedStatus | null;
  onRetry?: () => void;
  onCreate?: (input: ToolCreateInput) => Promise<void> | void;
  creating?: boolean;
  createError?: string | null;
  onUpdate?: (id: string, patch: ToolUpdateInput) => Promise<void> | void;
};

const TOOL_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "retired", label: "Retired" },
];

const SHOWCASE_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "pending", label: "Pending permission" },
  { value: "approved", label: "Approved to show" },
  { value: "denied", label: "Do not show" },
];

const AVAILABILITY_OPTIONS = [
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function ToolsView({
  tools,
  loading = false,
  error = null,
  denied = null,
  onRetry,
  onCreate,
  creating = false,
  createError = null,
  onUpdate,
}: ToolsViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    name: "",
    slug: "",
    description: "",
    url: "",
    status: "draft" as ToolStatus,
    online: "online",
    availabilityNote: "",
    showcaseStatus: "private" as ShowcaseStatus,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [createdOk, setCreatedOk] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  if (denied) return <SecureAccessState status={denied} onRetry={onRetry} />;
  if (loading) {
    return (
      <Stack gap="md" aria-label="Tools loading">
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

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && prev.slug === slugify(prev.name)) {
        next.slug = slugify(String(value));
      }
      return next;
    });
    setFormError(null);
    setCreatedOk(false);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreate) return;
    if (form.businessName.trim().length < 2) {
      setFormError("Add the business name.");
      document.getElementById("tool-business")?.focus();
      return;
    }
    if (form.name.trim().length < 2) {
      setFormError("Add the tool name.");
      document.getElementById("tool-name")?.focus();
      return;
    }
    const slug = form.slug.trim() || slugify(form.name);
    if (!/^[a-z0-9-]{2,60}$/.test(slug)) {
      setFormError("Slug must be lowercase letters, numbers, or dashes.");
      document.getElementById("tool-slug")?.focus();
      return;
    }
    if (form.url.trim() && !/^https?:\/\/.+/.test(form.url.trim())) {
      setFormError("URL must start with http.");
      document.getElementById("tool-url")?.focus();
      return;
    }
    setFormError(null);
    try {
      await onCreate({
        businessName: form.businessName.trim(),
        name: form.name.trim(),
        slug,
        description: form.description.trim() ? form.description.trim() : undefined,
        url: form.url.trim() ? form.url.trim() : undefined,
        status: form.status,
        isAvailable: form.online === "online",
        availabilityNote: form.availabilityNote.trim() ? form.availabilityNote.trim() : undefined,
        showcaseStatus: form.showcaseStatus,
      });
      setForm({
        businessName: "",
        name: "",
        slug: "",
        description: "",
        url: "",
        status: "draft",
        online: "online",
        availabilityNote: "",
        showcaseStatus: "private",
      });
      setCreatedOk(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save. Try again.");
    }
  }

  async function handleEditSave(row: ToolRecord, patch: ToolUpdateInput) {
    if (!onUpdate) return;
    setEditError(null);
    setSavingId(row.id);
    try {
      await onUpdate(row.id, patch);
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Stack gap="md" className={classes.stack}>
      <div>
        <Title order={1} className={classes.pageTitle}>
          Tools
        </Title>
        <Text className={classes.pageSub}>
          Owner registry of client tools. This list stays private.
        </Text>
        <Text size="sm" className={classes.muted}>
          Publishing a business name, logo, or case study needs clear permission first. Keep showcase status private until the owner approves.
        </Text>
      </div>

      {onCreate ? (
        <Card withBorder radius="md" padding="md" className={classes.rowCard}>
          <Group justify="space-between" align="center" gap="sm">
            <Text fw={650}>Add tool</Text>
            <Button variant="subtle" size="sm" onClick={() => setShowAdd((v) => !v)}>
              {showAdd ? "Hide form" : "Add tool"}
            </Button>
          </Group>
          {showAdd ? (
            <form onSubmit={handleCreate}>
              <Stack gap="sm" mt="md">
                <Group gap="sm" grow>
                  <TextInput
                    id="tool-business"
                    label="Business name"
                    required
                    value={form.businessName}
                    onChange={(e) => setField("businessName", e.currentTarget.value)}
                    placeholder="Shop name"
                  />
                  <TextInput
                    id="tool-name"
                    label="Tool name"
                    required
                    value={form.name}
                    onChange={(e) => setField("name", e.currentTarget.value)}
                    placeholder="Quote helper"
                  />
                </Group>
                <Group gap="sm" grow>
                  <TextInput
                    id="tool-slug"
                    label="Slug"
                    required
                    value={form.slug}
                    onChange={(e) => setField("slug", e.currentTarget.value)}
                    placeholder="quote-helper"
                  />
                  <TextInput
                    id="tool-url"
                    label="URL, optional"
                    value={form.url}
                    onChange={(e) => setField("url", e.currentTarget.value)}
                    placeholder="https://"
                  />
                </Group>
                <Textarea
                  label="Short description, optional"
                  minRows={2}
                  value={form.description}
                  onChange={(e) => setField("description", e.currentTarget.value)}
                  placeholder="What the tool does in one line"
                />
                <Group gap="sm" grow>
                  <Select label="Status" data={TOOL_STATUS_OPTIONS} value={form.status} onChange={(v) => setField("status", ((v ?? "draft") as ToolStatus))} />
                  <Select label="Tool online state" data={AVAILABILITY_OPTIONS} value={form.online} onChange={(v) => setField("online", v ?? "online")} />
                </Group>
                <TextInput
                  label="Public availability note, optional"
                  value={form.availabilityNote}
                  onChange={(e) => setField("availabilityNote", e.currentTarget.value)}
                  placeholder="Open for new bookings"
                />
                <Select label="Showcase permission" data={SHOWCASE_OPTIONS} value={form.showcaseStatus} onChange={(v) => setField("showcaseStatus", ((v ?? "private") as ShowcaseStatus))} />
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
                    Tool saved.
                  </Alert>
                ) : null}
                <div>
                  <Button type="submit" loading={creating} size="sm">
                    Save tool
                  </Button>
                </div>
                <Text size="xs">Studio availability is separate. This only sets this tool online or offline.</Text>
              </Stack>
            </form>
          ) : null}
        </Card>
      ) : null}

      {tools.length === 0 ? (
        <EmptyState
          title="No tools yet"
          description="Add the first client tool to track status and availability. Nothing is shown publicly until permission is approved."
        />
      ) : (
        <div className={classes.list}>
          {tools.map((row) => (
            <Card key={row.id} withBorder radius="md" padding="md" className={classes.rowCard}>
              <Group justify="space-between" align="flex-start" gap="sm">
                <div>
                  <Text fw={650} className={classes.business}>
                    {row.name}
                  </Text>
                  <Text size="sm" className={classes.muted}>
                    {row.businessName} · {row.slug}
                    {row.url ? ` · ${row.url}` : ""}
                  </Text>
                </div>
                <Group gap="xs">
                  <Badge variant="light" color={row.isAvailable ? "green" : "gray"}>
                    {row.isAvailable ? "Online" : "Offline"}
                  </Badge>
                  <Badge variant="light" color="gray">
                    {row.status}
                  </Badge>
                  <Badge variant="light" color="gray">
                    {row.showcaseStatus}
                  </Badge>
                </Group>
              </Group>
              {row.description ? (
                <Text mt="xs" size="sm" className={classes.note}>
                  {row.description}
                </Text>
              ) : null}
              {row.availabilityNote ? (
                <Text size="sm" className={classes.muted}>
                  Note: {row.availabilityNote}
                </Text>
              ) : null}
              {onUpdate ? (
                <Group gap="xs" mt="sm">
                  <Button variant="subtle" size="xs" onClick={() => setEditingId(editingId === row.id ? null : row.id)}>
                    {editingId === row.id ? "Close edit" : "Edit"}
                  </Button>
                </Group>
              ) : null}
              {editingId === row.id && onUpdate ? (
                <ToolEditForm row={row} saving={savingId === row.id} error={editError} onSave={(patch) => handleEditSave(row, patch)} />
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </Stack>
  );
}

function ToolEditForm({
  row,
  saving,
  error,
  onSave,
}: {
  row: ToolRecord;
  saving: boolean;
  error: string | null;
  onSave: (patch: ToolUpdateInput) => void;
}) {
  const [status, setStatus] = useState<ToolStatus>(row.status);
  const [online, setOnline] = useState(row.isAvailable ? "online" : "offline");
  const [availabilityNote, setAvailabilityNote] = useState(row.availabilityNote ?? "");
  const [showcaseStatus, setShowcaseStatus] = useState<ShowcaseStatus>(row.showcaseStatus);
  const [url, setUrl] = useState(row.url ?? "");
  const [description, setDescription] = useState(row.description ?? "");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave({
      status,
      isAvailable: online === "online",
      availabilityNote: availabilityNote.trim() ? availabilityNote.trim() : undefined,
      showcaseStatus,
      url: url.trim() ? url.trim() : undefined,
      description: description.trim() ? description.trim() : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm" mt="md">
        <Group gap="sm" grow>
          <Select label="Status" data={TOOL_STATUS_OPTIONS} value={status} onChange={(v) => v && setStatus(v as ToolStatus)} />
          <Select label="Online state" data={AVAILABILITY_OPTIONS} value={online} onChange={(v) => v && setOnline(v)} />
        </Group>
        <TextInput label="URL" value={url} onChange={(e) => setUrl(e.currentTarget.value)} placeholder="https://" />
        <Textarea label="Short description" minRows={2} value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
        <TextInput label="Availability note" value={availabilityNote} onChange={(e) => setAvailabilityNote(e.currentTarget.value)} />
        <Select label="Showcase permission" data={SHOWCASE_OPTIONS} value={showcaseStatus} onChange={(v) => v && setShowcaseStatus(v as ShowcaseStatus)} />
        {error ? (
          <Alert color="red" variant="light" role="alert">
            {error}
          </Alert>
        ) : null}
        <div>
          <Button type="submit" size="sm" loading={saving}>
            Save changes
          </Button>
        </div>
      </Stack>
    </form>
  );
}
