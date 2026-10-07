import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Badge, Burger } from "@mantine/core";
import { ColorSchemeToggle } from "../../../components/ColorSchemeToggle/ColorSchemeToggle";
import type { AdminCounts, AdminViewId } from "../types";
import classes from "./AdminShell.module.css";

export type AdminShellProps = {
  active: AdminViewId;
  onNavigate: (view: AdminViewId) => void;
  counts?: AdminCounts;
  ownerEmail?: string;
  children: ReactNode;
};

type NavItem = {
  id: AdminViewId;
  label: string;
  hint: string;
  badge?: number;
};

export function AdminShell({ active, onNavigate, counts, ownerEmail, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement | null>(null);

  const items: NavItem[] = [
    { id: "dashboard", label: "Dashboard", hint: "Status and next actions" },
    { id: "intake", label: "Intake", hint: "Inbox from the landing form", badge: counts?.newIntakes },
    { id: "outreach", label: "Outreach", hint: "Businesses to contact", badge: counts?.outreachNeedingReply },
    { id: "tools", label: "Tools", hint: "Client tool registry" },
    { id: "availability", label: "Availability", hint: "Build slot and message" },
    { id: "usage", label: "Usage", hint: "Tool totals per day" },
    { id: "notes", label: "Proof Notes", hint: "Short build notes" },
    { id: "settings", label: "Settings", hint: "Access and inbox rules" },
  ];

  function focusMain() {
    requestAnimationFrame(() => {
      document.getElementById("admin-main")?.focus({ preventScroll: true });
    });
  }

  function go(view: AdminViewId) {
    if (view === active) {
      setOpen(false);
      return;
    }
    onNavigate(view);
    setOpen(false);
    focusMain();
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        burgerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open ]);

  return (
    <div className={classes.shell}>
      <a href="#admin-main" className={classes.skip}>
        Skip to admin content
      </a>

      <header className={classes.header}>
        <div className={classes.headerInner}>
          <Burger
            ref={burgerRef}
            opened={open}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close admin menu" : "Open admin menu"}
            aria-expanded={open}
            aria-controls="oasis-admin-nav"
            size="md"
            className={classes.burger}
          />
          <div className={classes.brandBlock}>
            <p className={classes.brand}>Oasis Admin</p>
            <p className={classes.sub}>Private. Owner only.</p>
          </div>
          <div className={classes.headerActions}>
            {ownerEmail ? (
              <span className={classes.owner} title={ownerEmail}>
                {ownerEmail}
              </span>
            ) : null}
            <ColorSchemeToggle labelLight="Switch admin to light theme" labelDark="Switch admin to dark theme" />
          </div>
        </div>

        <nav
          id="oasis-admin-nav"
          className={classes.mobileNav}
          aria-label="Admin"
          data-open={open ? "true" : "false"}
          hidden={!open}
        >
          <ul className={classes.mobileList}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(item.id)}
                  aria-current={active === item.id ? "page" : undefined}
                  className={classes.mobileLink}
                  data-active={active === item.id ? "true" : "false"}
                >
                  <span className={classes.mobileLabel}>
                    <span className={classes.mobileName}>{item.label}</span>
                    <span className={classes.mobileHint}>{item.hint}</span>
                  </span>
                  {typeof item.badge === "number" && item.badge > 0 ? (
                    <span className={classes.mobileBadge} aria-label={`${item.badge} needing attention`}>
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className={classes.body}>
        <nav className={classes.sideNav} aria-label="Admin">
          <div className={classes.sideBrand}>
            <p className={classes.sideTitle}>Oasis Admin</p>
            <p className={classes.sideSub}>Private. Owner only.</p>
          </div>
          <ul className={classes.navList}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(item.id)}
                  aria-current={active === item.id ? "page" : undefined}
                  className={classes.navButton}
                  data-active={active === item.id ? "true" : "false"}
                >
                  <span className={classes.navText}>
                    <span className={classes.navName}>{item.label}</span>
                    <span className={classes.navHint}>{item.hint}</span>
                  </span>
                  {typeof item.badge === "number" && item.badge > 0 ? (
                    <Badge
                      size="sm"
                      variant="light"
                      color="gray"
                      aria-label={`${item.badge} needing attention`}
                      className={classes.navBadge}
                    >
                      {item.badge}
                    </Badge>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <p className={classes.sideNote}>
            Protected by Cloudflare Access. Server checks every request.
          </p>
        </nav>

        <main id="admin-main" className={classes.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
