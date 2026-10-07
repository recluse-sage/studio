import type { ReactNode } from "react";
import { useState } from "react";
import { Badge, Burger, NavLink } from "@mantine/core";
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

  function go(view: AdminViewId) {
    onNavigate(view);
    setOpen(false);
  }

  return (
    <div className={classes.shell}>
      <a href="#admin-main" className={classes.skip}>
        Skip to admin content
      </a>
      <header className={classes.header}>
        <div className={classes.headerInner}>
          <Burger
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
        {open ? (
          <nav id="oasis-admin-nav" className={classes.mobileNav} aria-label="Admin">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={active === item.id ? "page" : undefined}
                className={classes.mobileLink}
                data-active={active === item.id ? "true" : "false"}
              >
                <span>{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 ? (
                  <span className={classes.mobileBadge}>{item.badge}</span>
                ) : null}
              </button>
            ))}
          </nav>
        ) : null}
      </header>

      <div className={classes.body}>
        <nav className={classes.sideNav} aria-label="Admin">
          <ul className={classes.navList}>
            {items.map((item) => (
              <li key={item.id}>
                <NavLink
                  label={item.label}
                  description={item.hint}
                  active={active === item.id}
                  onClick={() => go(item.id)}
                  aria-current={active === item.id ? "page" : undefined}
                  className={classes.navLink}
                  rightSection={
                    typeof item.badge === "number" && item.badge > 0 ? (
                      <Badge size="sm" variant="light" color="gray" aria-label={`${item.badge} needing attention`}>
                        {item.badge}
                      </Badge>
                    ) : undefined
                  }
                />
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
