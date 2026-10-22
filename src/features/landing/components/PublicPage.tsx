import type { ReactNode } from "react";
import { LandingHeader } from "./LandingHeader";
import { LandingFooter } from "./LandingFooter";
import classes from "./PublicPage.module.css";

export type PublicPageProps = {
  eyebrow: string;
  children: ReactNode;
};

export function PublicPage({ eyebrow, children }: PublicPageProps) {
  return (
    <div className={classes.page}>
      <a href="#main" className={classes.skip}>
        Skip to content
      </a>
      <LandingHeader showAvailability={false} />
      <main id="main" className={classes.main} aria-label={eyebrow}>
        <div className={classes.inner}>{children}</div>
      </main>
      <LandingFooter showAvailability={false} availability={null} />
    </div>
  );
}
