import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Badge, Button, Card, Group, Select, Skeleton, Stack, Text, TextInput, Textarea, Title } from "@mantine/core";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { SecureAccessState } from "../../../components/SecureAccessState/SecureAccessState";
import type {
  AdminIntakeCreateInput,
  BusinessType,
  ContactMethod,
  DeniedStatus,
  IntakeRecord,
  IntakeStatus,
} from "../types";
import classes from "./IntakeView.module.css";

export type IntakeViewProps = {
  intakes: IntakeRecord[];
  loading?: boolean;
  error?: string | null;
  denied?: DeniedStatus | null;
  filter?: IntakeStatus | "all";
  onFilterChange?: (value: IntakeStatus | "all") => void;
  onStatusChange?: (id: string, status: IntakeStatus) => Promise<void> | void;
  onCreateIntake?: (input: AdminIntakeCreateInput) => Promise<void> | void;
  creating?: boolean;
  createError?: string | null;
  onRetry?: () => void;
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "contacted", label: "Contacted" },
  { value: "scoped", label: "Scoped" },
  { value: "declined", label: "Declined" },
  { value: "archived", label: "Archived" },
];

const BUSINESS_TYPE_OPTIONS = [
  { value: "home-trades", label: "Home trades" },
  { value: "food-hospitality", label: "Food and hospitality" },
  { value: "health-beauty", label: "Health and beauty" },
  { value: "professional-services", label: "Professional services" },
  { value: "neighborhood-retail", label: "Neighborhood retail" },
  { value: "tool-automation", label: "Tool or automation" },
  { value: "other", label: "Other" },
];

const CONTACT_METHOD_OPTIONS = [
  { value: "phone", label: "Phone call" },
  { value: "sms", label: "Text message" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "tiktok", label: "TikTok" },
  { value: "other", label: "Other" },
];

export function IntakeView({
  intakes,
  loading = false,
  error = null,
  denied = null,
  filter = "all",
  onFilterChange,
  onStatusChange,
  onCreateIntake,
  creating = false,
  createError = null,
  onRetry,
}: IntakeViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    businessType: "" as BusinessType | "",
    taskDescription: "",
    frequency: "",
    contactMethod: "sms" as ContactMethod,
    contactValue: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [createdOk, setCreatedOk] = useState(false);

  if (denied) return <SecureAccessState status={denied} onRetry={onRetry} />;

  if (loading) {
    return (
      <Stack gap="md" aria-label="Intake loading">
        <Skeleton height={60} radius="md" />
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

  const visible = filter === "all" ? intakes : intakes.filter((row) => row.status === filter);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
    setCreatedOk(false);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreateIntake) return;
    if (form.businessName.trim().length < 2) {
      setFormError("Add the business name.");
      document.getElementById("admin-intake-business")?.focus();
      return;
    }
    if (!form.businessType) {
      setFormError("Choose the business type.");
      document.getElementById("admin-intake-type")?.focus();
      return;
    }
    if (form.taskDescription.trim().length < 10) {
      setFormError("Describe the task in at least 10 characters.");
      document.getElementById("admin-intake-task")?.focus();
      return;
    }
    if (form.contactValue.trim().length < 3) {
      setFormError("Add a contact value.");
      document.getElementById("admin-intake-contact")?.focus();
      return;
    }
    setFormError(null);
    try {
      await onCreateIntake({
        businessName: form.businessName.trim(),
        businessType: form.businessType as BusinessType,
        taskDescription: form.taskDescription.trim(),
        frequency: form.frequency.trim() ? form.frequency.trim() : undefined,
        contactMethod: form.contactMethod,
        contactValue: form.contactValue.trim(),
      });
      setForm({
        businessName: "",
        businessType: "",
        taskDescription: "",
        frequency: "",
        contactMethod: "sms",
        contactValue: "",
      });
      setCreatedOk(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save. Try again.");
    }
  }

  return (
    <Stack gap="md" className={classes.stack}>
      <div>
        <Title order={1} className={classes.pageTitle}>
          Intake
        </Title>
        <Text className={classes.pageSub}>
          Notes from the landing form. Newest first. No sample entries.
        </Text>
      </div>

      {onCreateIntake ? (
        <Card withBorder radius="md" padding="md" className={classes.rowCard}>
          <Group justify="space-between" align="center" gap="sm">
            <Text fw={650}>Add intake on a business behalf</Text>
            <Button variant="subtle" size="sm" onClick={() => setShowAdd((v) => !v)}>
              {showAdd ? "Hide form" : "Add intake"}
            </Button>
          </Group>
          {showAdd ? (
            <form onSubmit={handleCreate}>
              <Stack gap="sm" mt="md">
                <TextInput
                  id="admin-intake-business"
                  label="Business name"
                  required
                  value={form.businessName}
                  onChange={(e) => setField("businessName", e.currentTarget.value)}
                  placeholder="Shop name"
                />
                <Select
                  id="admin-intake-type"
                  label="Business type"
                  required
                  data={BUSINESS_TYPE_OPTIONS}
                  value={form.businessType || null}
                  onChange={(v) => setField("businessType", ((v ?? "") as BusinessType | ""))}
                  placeholder="Choose type"
                />
                <Textarea
                  id="admin-intake-task"
                  label="Task description"
                  required
                  minRows={2}
                  value={form.taskDescription}
                  onChange={(e) => setField("taskDescription", e.currentTarget.value)}
                  placeholder="What repeats and hurts most, at least 10 characters"
                />
                <TextInput
                  id="admin-intake-frequency"
                  label="Frequency, optional"
                  value={form.frequency}
                  onChange={(e) => setField("frequency", e.currentTarget.value)}
                  placeholder="Daily, weekly"
                />
                <Group gap="sm" align="end" grow>
                  <Select
                    label="Contact method"
                    data={CONTACT_METHOD_OPTIONS}
                    value={form.contactMethod}
                    onChange={(v) => setField("contactMethod", ((v ?? "sms") as ContactMethod))}
                  />
                  <TextInput
                    id="admin-intake-contact"
                    label="Contact value"
                    required
                    value={form.contactValue}
                    onChange={(e) => setField("contactValue", e.currentTarget.value)}
                    placeholder="Phone, email, or handle"
                  />
                </Group>
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
                    Intake saved.
                  </Alert>
                ) : null}
                <div>
                  <Button type="submit" loading={creating} size="sm">
                    Save intake
                  </Button>
                </div>
                <Text size="xs">Source is set by the server. No Turnstile needed here.</Text>
              </Stack>
            </form>
          ) : null}
        </Card>
      ) : null}

      <Group gap="sm" align="end">
        <div className={classes.filterField}>
          <label htmlFor="intake-filter" className={classes.label}>
            Show
          </label>
          <Select
            id="intake-filter"
            value={filter}
            onChange={(v) => onFilterChange?.((v as IntakeStatus | "all") ?? "all")}
            data={[{ value: "all", label: "All" }, ...STATUS_OPTIONS]}
          />
        </div>
        <Text size="sm" className={classes.count} aria-live="polite">
          {visible.length} shown
        </Text>
      </Group>

      {visible.length === 0 ? (
        <EmptyState
          title={intakes.length === 0 ? "Inbox is empty" : "Nothing matches this filter"}
          description={
            intakes.length === 0
              ? "Share the landing intake link to collect the first note. Admin can also add one on a business behalf."
              : "Try a different status filter to see more notes."
          }
        />
      ) : (
        <div className={classes.list}>
          {visible.map((row) => (
            <Card key={row.id} withBorder radius="md" padding="md" className={classes.rowCard}>
              <Group justify="space-between" align="flex-start" gap="sm">
                <div className={classes.rowMain}>
                  <Text fw={650} className={classes.business}>
                    {row.businessName}
                  </Text>
                  <Text size="sm" className={classes.muted}>
                    {row.businessType} · {row.contactValue} by {row.contactMethod} · {row.createdAt}
                  </Text>
                </div>
                <Badge variant="light" color="gray">
                  {row.status}
                </Badge>
              </Group>
              <Text mt="xs" className={classes.task}>
                {row.taskDescription}
              </Text>
              <Text size="sm" className={classes.muted}>
                {row.frequency ? `Often: ${row.frequency} · ` : ""}Source: {row.source}
              </Text>
              {onStatusChange ? (
                <Group gap="xs" mt="sm">
                  <label htmlFor={`intake-status-${row.id}`} className={classes.statusLabel}>
                    Status
                  </label>
                  <Select
                    id={`intake-status-${row.id}`}
                    value={row.status}
                    onChange={(v) => {
                      if (v) onStatusChange(row.id, v as IntakeStatus);
                    }}
                    data={STATUS_OPTIONS}
                    size="sm"
                  />
                </Group>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </Stack>
  );
}
