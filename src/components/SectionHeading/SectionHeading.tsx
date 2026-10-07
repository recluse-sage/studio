import type { ReactNode } from "react";
import classes from "./SectionHeading.module.css";

export type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "start" | "center";
  id?: string;
  children?: ReactNode;
};

/**
 * Consistent section intro for Oasis landing and admin.
 * Eyebrow is a short label, title is the H2, description is one calm line.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "start",
  id,
  children,
}: SectionHeadingProps) {
  return (
    <div
      className={classes.wrap}
      data-align={align}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <p className={classes.eyebrow}>{eyebrow}</p>
      <h2 id={id ? `${id}-title` : undefined} className={classes.title}>
        {title}
      </h2>
      {description ? <p className={classes.description}>{description}</p> : null}
      {children ? <div className={classes.extra}>{children}</div> : null}
    </div>
  );
}
