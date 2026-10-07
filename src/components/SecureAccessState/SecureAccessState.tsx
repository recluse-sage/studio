import { Alert, Button, Stack, Text, Title } from "@mantine/core";
import classes from "./SecureAccessState.module.css";

export type SecureAccessStateProps = {
  status: 401 | 403;
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * Secure access notice for admin API denials.
 * This is UI feedback only. Real protection is Worker side validation.
 */
export function SecureAccessState({
  status,
  onRetry,
  retryLabel = "Try again",
}: SecureAccessStateProps) {
  const isForbidden = status === 403;
  return (
    <div className={classes.wrap} role="alert" aria-live="polite">
      <Stack gap="sm">
        <Title order={2} className={classes.title}>
          {isForbidden ? "Access restricted" : "Sign in required"}
        </Title>
        <Text className={classes.text}>
          {isForbidden
            ? "This admin area is limited to the studio owner. If you should have access, check your Cloudflare Access session and try again."
            : "Your session has expired or is missing. Sign in through Cloudflare Access to continue."}
        </Text>
        <Alert color="gray" variant="light" className={classes.note}>
          Admin checks run on the server. This screen does not grant access by itself.
        </Alert>
        {onRetry ? (
          <div>
            <Button variant="outline" onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        ) : null}
      </Stack>
    </div>
  );
}
