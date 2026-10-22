import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import classes from "./LandingFooter.module.css";
import type { AvailabilitySummary } from "../types";

export type LandingFooterProps = {
  contactHref?: string;
  showAvailability?: boolean;
  availability?: AvailabilitySummary | null;
};

export function LandingFooter({
  contactHref = "/#intake",
  showAvailability = true,
  availability = null,
}: LandingFooterProps) {
  void showAvailability;
  const year = new Date().getFullYear();
  const showStatus = availability != null;

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
            We are oasis.dev, a studio solving problems for small, medium, and
            enterprise business by building tools, websites, and automations.
          </p>
          {showStatus && availability ? (
            <p className={classes.status}>
              <span className={classes.statusDot} aria-hidden="true" />
              {availability.label}. {availability.nextWindow}
            </p>
          ) : null}
        </div>

        <nav className={classes.nav} aria-label="Footer">
          <p className={classes.navTitle}>Explore</p>
          <a href="/#services" className={classes.link}>
            Services
          </a>
          <a href="/#tools" className={classes.link}>
            Tools
          </a>
          <a href="/#intake" className={classes.link}>
            Intake
          </a>
          <a href="/#process" className={classes.link}>
            Process
          </a>
          <a href="/#faq" className={classes.link}>
            FAQ
          </a>
          <a href="/blog" className={classes.link}>
            Blog
          </a>
          <a href="/know-how" className={classes.link}>
            Know-how
          </a>
          <a href="#top" className={classes.link}>
            Back to top
          </a>
        </nav>

        <div className={classes.contactBlock}>
          <p className={classes.navTitle}>Contact</p>
          <p className={classes.contactText}>
            Start with the short intake. We read every note and reply with plain next steps.
          </p>
          <a href={contactHref} className={classes.contactButton}>
            <span>Start the intake</span>
            <ArrowRight weight="thin" aria-hidden="true" className={classes.contactIcon} />
          </a>
        </div>

        <div className={classes.bottom}>
          <p className={classes.small}>
            © {year} Oasis.dev. Work is shown publicly only with client permission.
          </p>
          <a
            href="https://oasis.dev"
            className={classes.builtBy}
            aria-label="Built by Oasis, visit oasis.dev"
          >
            <span>Built by Oasis</span>
            <ArrowUpRight weight="thin" aria-hidden="true" className={classes.builtIcon} />
          </a>
        </div>
      </div>
    </footer>
  );
}
