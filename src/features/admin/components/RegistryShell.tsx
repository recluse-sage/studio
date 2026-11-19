import { useCallback, useState } from "react";
import { Tabs } from "@base-ui-components/react/tabs";
import type { DeniedStatus } from "../types";

/* Registry shell on Base UI. View nav plus skip link plus theme toggle.
   Only the registry view is enabled in Phase 1. Forage, apex, and catalog
   stay disabled with their Phase 1 reason hints. No Mantine import here. */

export type RegistryTheme = "light" | "dark";

const THEME_STORAGE_KEY = "mantine-color-scheme";

function readTheme(): RegistryTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-mantine-color-scheme") ===
    "light"
    ? "light"
    : "dark";
}

function writeTheme(theme: RegistryTheme): void {
  try {
    document.documentElement.setAttribute("data-mantine-color-scheme", theme);
  } catch {
    return;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    return;
  }
}

export type RegistryShellProps = {
  denied?: DeniedStatus | null;
  onRetry?: () => void;
  children: React.ReactNode;
};

/* Plain denied notice with the same copy as SecureAccessState, written in
   plain elements so new registry views import no Mantine. Server checks own
   the real gate; this screen only explains the denial. */
function RegistryDeniedNotice({
  status,
  onRetry,
}: {
  status: DeniedStatus;
  onRetry?: () => void;
}) {
  const forbidden = status === 403;
  return (
    <div className="registry-denied" role="alert" aria-live="polite">
      <h2>{forbidden ? "Access restricted" : "Sign in required"}</h2>
      <p className="registry-muted">
        {forbidden
          ? "This admin area is limited to the studio owner. If you should have access, check your Cloudflare Access session and try again."
          : "Your session has expired or is missing. Sign in through Cloudflare Access to continue."}
      </p>
      <p className="registry-muted">
        Admin checks run on the server. This screen does not grant access by
        itself.
      </p>
      {onRetry ? (
        <button type="button" className="registry-retry" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

const DISABLED_VIEWS: ReadonlyArray<{
  id: string;
  label: string;
  hint: string;
}> = [
  { id: "forage", label: "Forage", hint: "Unconnected" },
  { id: "apex", label: "Apex", hint: "Unconnected" },
  { id: "catalog", label: "Catalog", hint: "Not entered yet" },
];

export function RegistryShell({
  denied = null,
  onRetry,
  children,
}: RegistryShellProps) {
  const [theme, setTheme] = useState<RegistryTheme>(() => readTheme());

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: RegistryTheme = prev === "dark" ? "light" : "dark";
      writeTheme(next);
      return next;
    });
  }, []);

  return (
    <div className="registry-scope min-h-screen">
      <a href="#registry-main" className="registry-skip">
        Skip to registry content
      </a>
      <Tabs.Root defaultValue="registry">
        <header className="mx-auto w-full max-w-5xl px-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="registry-muted font-mono text-xs uppercase tracking-wide">
                Owner admin
              </p>
              <h1 className="text-2xl font-semibold">Property registry</h1>
            </div>
            <button
              type="button"
              className="registry-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              aria-pressed={theme === "dark"}
            >
              {theme === "dark" ? "Light theme" : "Dark theme"}
            </button>
          </div>
          <Tabs.List
            aria-label="Admin views"
            className="mt-4 flex flex-wrap items-center gap-2"
          >
            <Tabs.Tab
              value="registry"
              aria-current="page"
              className="registry-nav-tab"
            >
              Registry
            </Tabs.Tab>
            {DISABLED_VIEWS.map((view) => (
              <span
                key={view.id}
                className="flex items-center gap-1.5"
                title={view.hint}
              >
                <Tabs.Tab
                  value={view.id}
                  disabled
                  aria-disabled="true"
                  className="registry-nav-tab"
                >
                  {view.label}
                </Tabs.Tab>
                <span className="registry-nav-hint">{view.hint}</span>
              </span>
            ))}
          </Tabs.List>
        </header>
        <main
          id="registry-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-4 pb-16"
        >
          <Tabs.Panel value="registry" className="mt-6">
            {denied ? (
              <RegistryDeniedNotice status={denied} onRetry={onRetry} />
            ) : (
              children
            )}
          </Tabs.Panel>
        </main>
      </Tabs.Root>
    </div>
  );
}
