import { Button, List, ThemeIcon } from "@mantine/core";
import { StatusBadge } from "../../../components/StatusBadge/StatusBadge";
import { SignalVisual } from "./SignalVisual";
import type { AvailabilitySummary } from "../types";
import classes from "./HeroSection.module.css";

export type HeroSectionProps = {
  availability: AvailabilitySummary | null;
};

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
            <p className={classes.kicker}>Solo studio. One build at a time.</p>
          )}
          <h1 id="hero-title" className={classes.title}>
            Small websites, tools, and automations for local businesses.
          </h1>
          <p className={classes.lede}>
            Oasis is a solo studio. One build at a time, with clear scope and a
            practical handoff. Tell us the task that repeats too often and we
            will suggest a useful next step.
          </p>
          <div className={classes.ctaRow}>
            <Button component="a" href="#intake" size="lg" className={classes.primary}>
              Start the intake
            </Button>
            <Button component="a" href="#services" size="lg" variant="outline" className={classes.secondary}>
              See services
            </Button>
          </div>
          <List className={classes.checks} spacing="xs" size="sm" withPadding={false}>
            <List.Item
              icon={
                <ThemeIcon size={22} radius="xl" className={classes.checkIcon}>
                  ✓
                </ThemeIcon>
              }
            >
              One point of contact from first note to launch
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon size={22} radius="xl" className={classes.checkIcon}>
                  ✓
                </ThemeIcon>
              }
            >
              Fixed scope in writing before any build starts
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon size={22} radius="xl" className={classes.checkIcon}>
                  ✓
                </ThemeIcon>
              }
            >
              Short form. Easy to fill on your phone.
            </List.Item>
          </List>
        </div>
      </div>
    </section>
  );
}
