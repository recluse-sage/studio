import { Alert, Button, Card, Skeleton, Stack, Text, Title } from "@mantine/core";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { SecureAccessState } from "../../../components/SecureAccessState/SecureAccessState";
import type { DeniedStatus, UsageRow } from "../types";
import classes from "./UsageView.module.css";

export type UsageViewProps = {
  rows: UsageRow[];
  loading?: boolean;
  error?: string | null;
  denied?: DeniedStatus | null;
  onRetry?: () => void;
};

export function UsageView({ rows, loading = false, error = null, denied = null, onRetry }: UsageViewProps) {
  if (denied) return <SecureAccessState status={denied} onRetry={onRetry} />;
  if (loading) {
    return (
      <Stack gap="md" aria-label="Usage loading">
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

  return (
    <Stack gap="md" className={classes.stack}>
      <div>
        <Title order={1} className={classes.pageTitle}>
          Usage
        </Title>
        <Text className={classes.pageSub}>
          Aggregate totals per tool per day. No personal data is stored here.
        </Text>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No usage yet"
          description="Totals appear once a client tool records views or contact taps. Nothing is shown until real events exist."
        />
      ) : (
        <Card withBorder radius="lg" padding="0" className={classes.card}>
          <div className="oasis-scroll-x">
            <table className={classes.table}>
              <thead>
                <tr>
                  <th scope="col">Tool</th>
                  <th scope="col">Date</th>
                  <th scope="col">Views</th>
                  <th scope="col">Offline views</th>
                  <th scope="col">Contact taps</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.tool}-${row.date}-${index}`}>
                    <td className={classes.tool}>{row.tool}</td>
                    <td className={classes.date}>{row.date}</td>
                    <td>{row.views}</td>
                    <td>{row.offlineViews}</td>
                    <td>{row.contactClicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Stack>
  );
}
