import { useEffect, useState } from "react";
import type { LinksFunction, MetaFunction } from "react-router";
import { useSearchParams } from "react-router";
import { RegistryShell } from "../../src/features/admin/components/RegistryShell";
import {
  RegistryConfigErrorCard,
  RegistryRow,
} from "../../src/features/admin/components/RegistryRow";
import { buildRegistrySeed } from "../../src/features/admin/registry/registry-seed";
import {
  APEX_POLL_CADENCE_MS,
  nextApexRecordAfterFetch,
} from "../../src/features/admin/registry/registry-adapter";
import { describeRegistryRows } from "../../src/features/admin/registry/registry-view";
import type { RegistryRecord } from "../../src/features/admin/registry/registry-record";
import type { DeniedStatus } from "../../src/features/admin/types";
import fixture from "../../src/features/admin/registry/apex-report.fixture.json";
import registryHref from "../../src/features/admin/registry/registry.css?url";

/* Parallel private registry on the new stack. Client rendered, never
   prerendered, never in sitemap. The Worker run_worker_first rule for
   /admin/* covers /admin/registry, so the same Cloudflare Access gate that
   protects the old admin protects this route. No new public route. */

export const meta: MetaFunction = () => {
  return [
    { title: "Registry: Oasis.dev" },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: registryHref },
];

/* Phase 1 capture aid, read from ?story=. Default apex wires the apex row
   through the fixture payload. Seed renders with no report. Offline fails
   every fetch after the first success to prove keep-last-known. */
export type RegistryStory = "apex" | "seed" | "offline";

function storyFromParams(params: URLSearchParams): RegistryStory {
  const raw = params.get("story");
  if (raw === "seed" || raw === "offline" || raw === "apex") return raw;
  return "apex";
}

/* Phase 1 fetcher. The apex story reads the live Access-gated dashboard
   API with same-origin credentials and no browser credential header. The
   fixture path stays for the seed and offline stories so captures and unit
   tests stay deterministic. */
function createPhase1Fetcher(story: RegistryStory): () => Promise<unknown> {
  let calls = 0;
  return async () => {
    calls += 1;
    if (story === "seed") return null;
    if (story === "offline") {
      if (calls > 1) {
        throw new Error("Apex reporter unreachable (offline story)");
      }
      return fixture;
    }
    let res: Response;
    try {
      res = await fetch("/api/admin/registry", {
        credentials: "same-origin",
      });
    } catch {
      throw new Error("Apex reporter unreachable (network)");
    }
    if (res.status === 401 || res.status === 403) {
      const denied = new Error(
        res.status === 403 ? "Access restricted." : "Sign in required.",
      ) as Error & { status: 401 | 403 };
      denied.status = res.status;
      throw denied;
    }
    if (!res.ok) {
      throw new Error("Apex reporter unreachable (status " + res.status + ")");
    }
    return (await res.json()) as unknown;
  };
}

function deniedFromError(error: unknown): DeniedStatus | null {
  if (error !== null && typeof error === "object" && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (status === 401 || status === 403) return status;
  }
  return null;
}

function failureReason(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "fetch failed";
}

export default function AdminRegistryRoute() {
  const [searchParams] = useSearchParams();
  const story = storyFromParams(searchParams);
  const [rows, setRows] = useState<RegistryRecord[] | null>(null);
  const [denied, setDenied] = useState<DeniedStatus | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    // Client only load. SSR never touches admin data.
    setRows(buildRegistrySeed());
    setDenied(null);
  }, []);

  useEffect(() => {
    // Apex poll. Refetch on mount, then every 15 minutes while open.
    // lastSuccessfulFetchAt moves only on successful parse, and servedAt
    // always comes from the payload claim. Forage, catalog, skill, and app
    // keep their Phase 1 unconnected or dots states. No new fetch for them.
    const fetchApexPayload = createPhase1Fetcher(story);
    let cancelled = false;
    async function refresh() {
      const fetchedAt = new Date().toISOString();
      try {
        const payload = await fetchApexPayload();
        if (cancelled) return;
        setRows((prev) =>
          prev === null
            ? prev
            : prev.map((row) =>
                row.id === "apex"
                  ? nextApexRecordAfterFetch(
                      row,
                      payload,
                      fetchedAt,
                      "fetch failed",
                    )
                  : row,
              ),
        );
      } catch (error) {
        if (cancelled) return;
        const deniedStatus = deniedFromError(error);
        if (deniedStatus !== null) {
          // Partial denial per spec 5.2. Suppress only the apex numbers by
          // resetting the apex row to its seed shape, and keep the other
          // static rows rendering with their saved details.
          setDenied(deniedStatus);
          setRows((prev) => {
            const seed = buildRegistrySeed();
            if (prev === null) return seed;
            const seedApex = seed.find((row) => row.id === "apex");
            if (!seedApex) return prev;
            return prev.map((row) => (row.id === "apex" ? seedApex : row));
          });
          return;
        }
        setRows((prev) =>
          prev === null
            ? prev
            : prev.map((row) =>
                row.id === "apex"
                  ? nextApexRecordAfterFetch(
                      row,
                      null,
                      fetchedAt,
                      failureReason(error),
                    )
                  : row,
              ),
        );
      }
    }
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, APEX_POLL_CADENCE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [story, retryNonce]);

  function handleRetry() {
    setRows(buildRegistrySeed());
    setDenied(null);
    setRetryNonce((nonce) => nonce + 1);
  }

  const view = rows === null ? null : describeRegistryRows(rows);

  return (
    <RegistryShell denied={denied} onRetry={handleRetry}>
      {view === null ? (
        <p className="registry-muted">Loading registry.</p>
      ) : view.configError ? (
        <RegistryConfigErrorCard />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {rows!.map((record) => (
            <RegistryRow key={record.id} record={record} />
          ))}
        </ul>
      )}
    </RegistryShell>
  );
}
