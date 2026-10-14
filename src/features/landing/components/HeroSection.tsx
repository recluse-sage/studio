import { Button } from "@mantine/core";
import { Check } from "@phosphor-icons/react";
import { StatusBadge } from "../../../components/StatusBadge/StatusBadge";
import { SignalVisual } from "./SignalVisual";
import type { AvailabilitySummary } from "../types";
import classes from "./HeroSection.module.css";

export type HeroSectionProps = {
  availability: AvailabilitySummary | null;
};

const ASSURANCES = [
  "You talk with us from first note to launch",
  "Scope, timing, and cost in writing before we build",
  "Short form that is easy to fill on your phone",
];

export function HeroSection({ availability }: HeroSectionProps) {
  return (
    <section className={classes.hero} aria-labelledby="hero-title">
      <div className={classes.inner}>
        <div className={classes.visualWrap}>
          <SignalVisual />
        </div>

        <div className={classes.copy}>
          {availability ? (
            <StatusBadge tone={availability.status === "booked" ? "closed" : "open"}>
              {availability.label}
            </StatusBadge>
          ) : (
            <p className={classes.kicker}>Studio for small, medium, and enterprise business</p>
          )}
          <h1 id="hero-title" className={classes.title}>
            We solve problems by building tools, websites, and automations.
          </h1>
          <p className={classes.lede}>
            We are oasis.dev. We help small, medium, and enterprise teams with the
            work that repeats. Tell us the problem and we will suggest a useful
            next step.
          </p>
          <div className={classes.ctaRow}>
            <Button component="a" href="#intake" size="lg" className={classes.primary}>
              Start the intake
            </Button>
            <Button component="a" href="#services" size="lg" variant="outline" className={classes.secondary}>
              See services
            </Button>
          </div>
          <ul className={classes.checks}>
            {ASSURANCES.map((line) => (
              <li key={line} className={classes.checkRow}>
                <span className={classes.checkIcon} aria-hidden="true">
                  <Check weight="thin" focusable="false" />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
