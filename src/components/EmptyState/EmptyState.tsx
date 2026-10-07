import type { ReactNode } from "react";
import classes from "./EmptyState.module.css";

export type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
};

/** Calm empty state used in landing and admin lists. No fake data. */
export function EmptyState({ title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={classes.box} data-compact={compact ? "true" : "false"}>
      <p className={classes.title}>{title}</p>
      <p className={classes.description}>{description}</p>
      {action ? <div className={classes.action}>{action}</div> : null}
    </div>
  );
}
