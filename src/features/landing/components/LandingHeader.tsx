import { useEffect, useState } from "react";
import { Burger, Button } from "@mantine/core";
import { ArrowRight } from "@phosphor-icons/react";
import { ColorSchemeToggle } from "../../../components/ColorSchemeToggle/ColorSchemeToggle";
import classes from "./LandingHeader.module.css";

export type LandingHeaderProps = {
  intakeHref?: string;
  showAvailability?: boolean;
};

const NAV = [
  { href: "/#services", label: "Services" },
  { href: "/#tools", label: "Tools" },
  { href: "/#intake", label: "Intake" },
  { href: "/#process", label: "Process" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/know-how", label: "Know-how" },
];

export function LandingHeader({ intakeHref = "/#intake", showAvailability = true }: LandingHeaderProps) {
  const [open, setOpen] = useState(false);
  void showAvailability;
  const items = NAV;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  return (
    <header className={classes.header} data-open={open}>
      <div className={classes.inner}>
        <a href="#top" className={classes.brand} aria-label="Oasis home">
          <span className={classes.wordmark} aria-hidden="true">
            oasis<span className={classes.dot}>.</span>dev
          </span>
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
            <span>Start intake</span>
            <ArrowRight weight="thin" aria-hidden="true" className={classes.mobileCtaIcon} />
          </a>
        </nav>
      ) : null}
    </header>
  );
}
