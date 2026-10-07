import { Card, List, Stack, Text, Title } from "@mantine/core";
import classes from "./SettingsView.module.css";

export type SettingsViewProps = {
  ownerEmail?: string;
  intakeEndpoint?: string;
  adminBase?: string;
};

/** Read only guidance. Secrets are never shown here. */
export function SettingsView({
  ownerEmail,
  intakeEndpoint = "/api/intakes",
  adminBase = "/api/admin",
}: SettingsViewProps) {
  return (
    <Stack gap="md" className={classes.stack}>
      <div>
        <Title order={1} className={classes.pageTitle}>
          Settings
        </Title>
        <Text className={classes.pageSub}>
          How access, inbox, and backups work. Changes happen in Cloudflare, not in this screen.
        </Text>
      </div>

      <Card withBorder radius="lg" padding="lg" className={classes.card}>
        <Title order={2} className={classes.cardTitle}>
          Access
        </Title>
        <List size="sm" spacing="xs" className={classes.list}>
          <List.Item>Admin routes are guarded by Cloudflare Access.</List.Item>
          <List.Item>
            {ownerEmail ? `Owner account: ${ownerEmail}. ` : "Owner account only. "}
            Every admin API call is checked on the server.
          </List.Item>
          <List.Item>This screen never grants access by itself.</List.Item>
        </List>
      </Card>

      <Card withBorder radius="lg" padding="lg" className={classes.card}>
        <Title order={2} className={classes.cardTitle}>
          Endpoints
        </Title>
        <dl className={classes.dl}>
          <div className={classes.dlRow}>
            <dt>Public intake</dt>
            <dd><code>{intakeEndpoint}</code></dd>
          </div>
          <div className={classes.dlRow}>
            <dt>Admin API</dt>
            <dd><code>{adminBase}</code></dd>
          </div>
        </dl>
        <Text size="sm" className={classes.muted}>
          Spam is handled with Turnstile, a hidden field, few fields, and rate limits on the server.
        </Text>
      </Card>

      <Card withBorder radius="lg" padding="lg" className={classes.card}>
        <Title order={2} className={classes.cardTitle}>
          Backups
        </Title>
        <Text size="sm" className={classes.muted}>
          Code history lives in GitHub. Database safety comes from D1 backups plus
          scheduled exports. Log each restore test in Proof Notes with the date.
        </Text>
      </Card>
    </Stack>
  );
}
