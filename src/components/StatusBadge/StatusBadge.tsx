import classes from "./StatusBadge.module.css";

export type StatusTone = "open" | "neutral" | "busy" | "closed" | "success" | "warning";

export type StatusBadgeProps = {
  tone: StatusTone;
  children: string;
};

/** Small status pill. Tone maps to Oasis tokens, not Mantine colors. */
export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return (
    <span className={classes.badge} data-tone={tone}>
      <span className={classes.dot} aria-hidden="true" />
      {children}
    </span>
  );
}
