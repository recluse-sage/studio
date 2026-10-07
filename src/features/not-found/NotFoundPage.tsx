import classes from "./NotFoundPage.module.css";

export type NotFoundPageProps = {
  homeHref?: string;
  intakeHref?: string;
};

/**
 * Branded 404 for Oasis.dev.
 * Mobile first, token based, no motion, no proof claims.
 * Parent route lane owns wiring.
 */
export function NotFoundPage({ homeHref = "/", intakeHref = "/#intake" }: NotFoundPageProps) {
  return (
    <div className={classes.page}>
      <a href="#not-found-main" className={classes.skip}>
        Skip to content
      </a>
      <main id="not-found-main" className={classes.main} aria-labelledby="not-found-title">
        <p className={classes.eyebrow}>Oasis.dev</p>
        <h1 id="not-found-title" className={classes.title}>
          That page is not here.
        </h1>
        <p className={classes.text}>
          The link may be old or mistyped. Start from home or send an intake and we will point you the right way.
        </p>
        <nav className={classes.actions} aria-label="Not found">
          <a href={homeHref} className={classes.primary}>
            Back to home
          </a>
          <a href={intakeHref} className={classes.secondary}>
            Start an intake
          </a>
        </nav>
      </main>
    </div>
  );
}
