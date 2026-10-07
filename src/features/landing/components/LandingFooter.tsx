import classes from "./LandingFooter.module.css";
import type { AvailabilitySummary } from "../types";

export type LandingFooterProps = {
  contactHref?: string;
  showAvailability?: boolean;
  availability?: AvailabilitySummary | null;
};

export function LandingFooter({
  contactHref = "#intake",
  showAvailability = true,
  availability = null,
}: LandingFooterProps) {
  const year = new Date().getFullYear();
  const statusLine = availability
    ? `${availability.label}. ${availability.nextWindow}`
    : "Intake is open. Send a note and we will confirm timing.";

  return (
    <footer className={classes.footer}>
      <div className={classes.inner}>
        <div className={classes.brandBlock}>
          <p className={classes.brand} aria-label="oasis.dev">
            <span aria-hidden="true">
              oasis<span className={classes.dot}>.</span>dev
            </span>
          </p>
          <p className={classes.tagline}>
            Solo studio for small websites, tools, and automations. Clear scope,
            practical handoff, and you own the finished work.
          </p>
          <p className={classes.status}>
            <span className={classes.statusDot} aria-hidden="true" />
            {statusLine}
          </p>
        </div>

        <nav className={classes.nav} aria-label="Footer">
          <p className={classes.navTitle}>Explore</p>
          <a href="#services" className={classes.link}>
            Services
          </a>
          <a href="#process" className={classes.link}>
            Process
          </a>
          {showAvailability ? (
            <a href="#availability" className={classes.link}>
              Availability
            </a>
          ) : null}
          <a href="#top" className={classes.link}>
            Back to top
          </a>
        </nav>

        <div className={classes.contactBlock}>
          <p className={classes.navTitle}>Contact</p>
          <p className={classes.contactText}>
            Start with the short intake. We read every note and reply with plain next steps.
          </p>
          <a href={contactHref} className={classes.contactLink}>
            Start the intake
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <p className={classes.small}>
          © {year} Oasis.dev. Solo studio, one build at a time. Work is shown
          publicly only with client permission.
        </p>
      </div>
    </footer>
  );
}
