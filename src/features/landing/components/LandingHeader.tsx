import { useState } from "react";
import { Burger, Button } from "@mantine/core";
import { ColorSchemeToggle } from "../../../components/ColorSchemeToggle/ColorSchemeToggle";
import classes from "./LandingHeader.module.css";

export type LandingHeaderProps = {
  intakeHref?: string;
  showAvailability?: boolean;
};

const NAV = [
  { href: "#services", label: "Services" },
  { href: "#process", label: "Process" },
  { href: "#availability", label: "Availability" },
  { href: "#intake", label: "Contact" },
];

export function LandingHeader({ intakeHref = "#intake", showAvailability = true }: LandingHeaderProps) {
  const [open, setOpen] = useState(false);
  const items = showAvailability ? NAV : NAV.filter((item) => item.href !== "#availability");

  return (
    <header className={classes.header}>
      <div className={classes.inner}>
        <a href="#top" className={classes.brand} aria-label="Oasis home">
          <span className={classes.mark} aria-hidden="true">
            O
          </span>
          <span className={classes.brandText}>Oasis.dev</span>
        </a>

        <nav className={classes.desktopNav} aria-label="Primary">
          {items.map((item) => (
            <a key={item.href} href={item.href} className={classes.link}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={classes.actions}>
          <ColorSchemeToggle />
          <Button
            component="a"
            href={intakeHref}
            size="md"
            className={classes.cta}
          >
            Start intake
          </Button>
          <Burger
            opened={open}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="oasis-mobile-nav"
            className={classes.burger}
            size="md"
          />
        </div>
      </div>

      {open ? (
        <nav
          id="oasis-mobile-nav"
          className={classes.mobileNav}
          aria-label="Mobile"
        >
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={classes.mobileLink}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a
            href={intakeHref}
            className={classes.mobileCta}
            onClick={() => setOpen(false)}
          >
            Start intake
          </a>
        </nav>
      ) : null}
    </header>
  );
}
