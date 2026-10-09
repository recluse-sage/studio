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
          <List className={classes.checks} spacing="xs" size="sm" withPadding={false}>
            <List.Item
              icon={
                <ThemeIcon size={22} radius="xl" className={classes.checkIcon}>
                  ✓
                </ThemeIcon>
              }
            >
              You talk with us from first note to launch
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon size={22} radius="xl" className={classes.checkIcon}>
                  ✓
                </ThemeIcon>
              }
            >
              Scope, timing, and cost in writing before we build
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon size={22} radius="xl" className={classes.checkIcon}>
                  ✓
                </ThemeIcon>
              }
            >
              Short form that is easy to fill on your phone
            </List.Item>
          </List>
        </div>
      </div>
    </section>
  );
}
