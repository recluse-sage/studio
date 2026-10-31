import { Anchor, Badge, Card, Group, Skeleton, Stack, Text, Title } from "@mantine/core";
import { SecureAccessState } from "../../../components/SecureAccessState/SecureAccessState";
import { PROPERTIES } from "../registry/properties";
import type { PropertyRecord } from "../registry/properties";
import type { DeniedStatus } from "../types";
import classes from "./PropertiesPanel.module.css";

export type PropertiesPanelProps = {
  items?: PropertyRecord[];
  denied?: DeniedStatus | null;
  onRetry?: () => void;
};

const STATUS_LABEL: Record<PropertyRecord["status"], string> = {
  healthy: "Healthy",
  planned: "Planned",
  unknown: "Unknown",
};

export function PropertiesPanel({ items = PROPERTIES, denied = null, onRetry }: PropertiesPanelProps) {
  if (denied) return <SecureAccessState status={denied} onRetry={onRetry} />;

  return (
    <Stack gap="md" className={classes.stack}>
      <div>
        <Title order={1} className={classes.pageTitle}>
          Properties
        </Title>
        <Text className={classes.pageSub}>
          Registry of every Oasis property. Static seed for now, live reporters arrive in later phases.
        </Text>
        <Text size="sm" className={classes.muted}>
          {items.length} {items.length === 1 ? "property" : "properties"} tracked. A grey row is not broken, it
          only means no reporter is wired yet.
        </Text>
      </div>

      {items.length === 0 ? (
        <Skeleton height={160} radius="md" aria-label="Properties loading" />
      ) : (
        <div className={classes.list}>
          {items.map((row) => (
            <Card key={row.id} withBorder radius="md" padding="md" className={classes.rowCard}>
              <Group justify="space-between" align="flex-start" gap="sm">
                <div>
                  <Group gap="xs" align="center">
                    <span className={classes.dot} data-status={row.status} aria-hidden="true" />
                    <Text fw={650} className={classes.name}>
                      {row.name}
                    </Text>
                    <Badge variant="light" color="gray" size="sm">
                      {row.kind}
                    </Badge>
                  </Group>
                  <Text size="sm" className={classes.muted}>
                    {row.id}
                  </Text>
                </div>
                <Badge
                  variant="light"
                  color={row.status === "healthy" ? "green" : row.status === "planned" ? "gray" : "yellow"}
                >
                  {STATUS_LABEL[row.status]}
                </Badge>
              </Group>
              <Group gap="xl" mt="xs" className={classes.meta}>
                <Text size="sm" className={classes.muted}>
                  Last report: <span className={classes.value}>{row.lastReport ?? "never"}</span>
                </Text>
                {row.links.home ? (
                  <Anchor href={row.links.home} target="_blank" rel="noreferrer" size="sm">
                    Open home
                  </Anchor>
                ) : (
                  <Text size="sm" className={classes.muted}>
                    Home: <span className={classes.value}>-</span>
                  </Text>
                )}
              </Group>
              {row.notes ? (
                <Text mt="xs" size="sm" className={classes.note}>
                  {row.notes}
                </Text>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </Stack>
  );
}
