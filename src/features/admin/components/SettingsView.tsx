import { useEffect, useState } from "react";
import { Alert, Anchor, Badge, Card, Group, List, Stack, Text, Title } from "@mantine/core";
import classes from "./SettingsView.module.css";

export type SettingsViewProps = {
  ownerEmail?: string;
  intakeEndpoint?: string;
  adminBase?: string;
  publicSiteUrl?: string;
};

function toOrigin(value: string): string | null {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Mirror of the build time check in vite.config.ts and
 * scripts/generate-sitemap.mjs. Only a clean https origin counts:
 * no credentials, no path beyond an optional slash, no query, no
 * fragment, and no placeholder host.
 */
function toValidSiteUrl(value: string): string | null {
  const raw = value.trim().replace(/\/$/, "");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }
    if (["localhost", "127.0.0.1", "example.com", "example.org"].includes(url.hostname)) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/** Read only display. Secrets are never shown here. Values cannot be changed from Admin. */
export function SettingsView({
  ownerEmail,
  intakeEndpoint = "/api/intakes",
  adminBase = "/api/admin",
  publicSiteUrl,
}: SettingsViewProps) {
  const configured = publicSiteUrl?.trim() ? publicSiteUrl.trim() : null;
  const validSiteUrl = configured ? toValidSiteUrl(configured) : null;
  const [currentOrigin, setCurrentOrigin] = useState<string | null>(null);

  useEffect(() => {
    setCurrentOrigin(window.location.origin);
  }, []);

  const configuredOrigin = validSiteUrl ? toOrigin(validSiteUrl) : null;
  const mismatch =
    configuredOrigin !== null &&
    currentOrigin !== null &&
    configuredOrigin !== currentOrigin.toLowerCase();
  const matches =
    configuredOrigin !== null &&
    currentOrigin !== null &&
    configuredOrigin === currentOrigin.toLowerCase();

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
        <Group justify="space-between" align="center" gap="sm">
          <Title order={2} className={classes.cardTitle}>
            Public site URL
          </Title>
          {validSiteUrl ? (
            <Badge variant="light" color="green">
              Configured
            </Badge>
          ) : configured ? (
            <Badge variant="light" color="red">
              Needs attention
            </Badge>
          ) : (
            <Badge variant="light" color="yellow">
              Not set
            </Badge>
          )}
        </Group>

        {validSiteUrl ? (
          <>
            <dl className={classes.dl}>
              <div className={classes.dlRow}>
                <dt>Configured public URL</dt>
                <dd>
                  <code className={classes.urlValue}>{validSiteUrl}</code>
                </dd>
              </div>
              {currentOrigin ? (
                <div className={classes.dlRow}>
                  <dt>You are viewing admin at</dt>
                  <dd>
                    <code className={classes.urlValue}>{currentOrigin}</code>
                  </dd>
                </div>
              ) : null}
            </dl>

            <Anchor
              href={validSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={classes.visitLink}
            >
              Open public site
            </Anchor>

            {mismatch ? (
              <Alert color="yellow" variant="light" role="alert" title="Different from this admin address" className={classes.alert}>
                The configured public URL is {validSiteUrl}. It is the canonical address
                for the public site. You are viewing the admin at {currentOrigin}, which
                may be a preview address.
              </Alert>
            ) : null}

            {matches ? (
              <Alert color="green" variant="light" role="status" title="Matches this address" className={classes.alert}>
                The configured URL matches the address you are on now.
              </Alert>
            ) : null}

            <Text size="sm" fw={650} className={classes.stepsTitle}>
              To change the public URL
            </Text>
            <List size="sm" spacing="xs" className={classes.list}>
              <List.Item>Go to Cloudflare Workers Builds for this site.</List.Item>
              <List.Item>Edit PUBLIC_SITE_URL under Build variables and secrets.</List.Item>
              <List.Item>Save, then rebuild and redeploy.</List.Item>
              <List.Item>This admin screen only shows the value. It cannot change it.</List.Item>
            </List>
          </>
        ) : configured ? (
          <>
            <dl className={classes.dl}>
              <div className={classes.dlRow}>
                <dt>Saved value</dt>
                <dd>
                  <code className={classes.urlValue}>{configured}</code>
                </dd>
              </div>
            </dl>

            <Alert color="red" variant="light" role="alert" title="Public site URL needs attention" className={classes.alert}>
              This value is not a valid public site address. It must be the site origin
              only, starting with https://, with no path, query, or extra text. Fix
              PUBLIC_SITE_URL in Cloudflare Workers Builds under Build variables and
              secrets, then rebuild and redeploy. The canonical link and sitemap stay
              disabled until then.
            </Alert>

            <Text size="sm" fw={650} className={classes.stepsTitle}>
              To fix the public URL
            </Text>
            <List size="sm" spacing="xs" className={classes.list}>
              <List.Item>Go to Cloudflare Workers Builds for this site.</List.Item>
              <List.Item>Edit PUBLIC_SITE_URL under Build variables and secrets.</List.Item>
              <List.Item>Save, then rebuild and redeploy.</List.Item>
              <List.Item>This admin screen only shows the value. It cannot change it.</List.Item>
            </List>
          </>
        ) : (
          <>
            <Text size="sm" className={classes.muted}>
              Public site URL is not set. The canonical link and sitemap stay disabled
              until PUBLIC_SITE_URL is configured. The site itself is still reachable
              at its served address.
            </Text>
            <Text size="sm" fw={650} className={classes.stepsTitle}>
              To set the public URL
            </Text>
            <List size="sm" spacing="xs" className={classes.list}>
              <List.Item>Go to Cloudflare Workers Builds for this site.</List.Item>
              <List.Item>Add PUBLIC_SITE_URL under Build variables and secrets.</List.Item>
              <List.Item>Save, then rebuild and redeploy.</List.Item>
              <List.Item>This admin screen only shows the value. It cannot set it.</List.Item>
            </List>
          </>
        )}
      </Card>

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
