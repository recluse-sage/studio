import classes from "./LandingFooter.module.css";

export type LandingFooterProps = {
  contactHref?: string;
  showAvailability?: boolean;
};

export function LandingFooter({ contactHref = "#intake", showAvailability = true }: LandingFooterProps) {
  return (
    <footer className={classes.footer}>
      <div className={classes.inner}>
        <div className={classes.brandBlock}>
          <p className={classes.brand}>Oasis.dev</p>
          <p className={classes.tagline}>
            A solo studio for small websites, tools, and automations. One build at a time.
          </p>
        </div>
        <nav className={classes.nav} aria-label="Footer">
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
          <a href={contactHref} className={classes.link}>
            Start intake
          </a>
        </nav>
        <p className={classes.small}>
          New studio. Work proof will appear here only with client permission. No sample work is shown yet.
        </p>
      </div>
    </footer>
  );
}
