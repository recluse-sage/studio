import { StatusBadge } from "../../../components/StatusBadge/StatusBadge";
import type { AvailabilitySummary } from "../types";
import classes from "./AvailabilityStrip.module.css";

export type AvailabilityStripProps = {
  availability: AvailabilitySummary | null;
};

/** Honest build capacity. Driven by props so the owner can update it in admin. */
export function AvailabilityStrip({ availability }: AvailabilityStripProps) {
  if (!availability) return null;
  const tone = availability.status === "booked" ? "closed" : availability.status === "limited" ? "warning" : "open";
  return (
    <section id="availability" className={classes.section} aria-labelledby="availability-title">
      <div className={classes.inner}>
        <div className={classes.card}>
          <div className={classes.head}>
            <p className={classes.eyebrow}>Current availability</p>
            <h2 id="availability-title" className={classes.title}>
              One build at a time
            </h2>
          </div>
          <div className={classes.body}>
            <StatusBadge tone={tone}>{availability.label}</StatusBadge>
            <p className={classes.window}>{availability.nextWindow}</p>
            <p className={classes.note}>{availability.note}</p>
            <a href="#intake" className={classes.link}>
              Save a spot with the intake
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
