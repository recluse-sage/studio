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

/* Phase 1 fetcher. No metrics endpoint or Cloudflare fetch is added in this
   phase, so the committed fixture is the live-or-fixture payload and it runs
   through the same parse plus apply path as a live report would. */
function createPhase1Fetcher(story: RegistryStory): () => Promise<unknown> {
  let calls = 0;
  return async () => {
    calls += 1;
    if (story === "seed") return null;
    if (story === "offline" && calls > 1) {
      throw new Error("Apex reporter unreachable (offline story)");
    }
    return fixture;
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
          setDenied(deniedStatus);
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
