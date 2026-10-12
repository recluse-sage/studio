import { ArrowRight } from "@phosphor-icons/react";
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
        <StatusBadge tone={tone}>{availability.label}</StatusBadge>
        <div className={classes.text}>
          <h2 id="availability-title" className={classes.title}>
            One build at a time
          </h2>
          <p className={classes.window}>{availability.nextWindow}</p>
          <p className={classes.note}>{availability.note}</p>
        </div>
        <a href="#intake" className={classes.link}>
          <span>Save a spot with the intake</span>
          <ArrowRight weight="thin" aria-hidden="true" className={classes.icon} />
        </a>
      </div>
    </section>
  );
}
