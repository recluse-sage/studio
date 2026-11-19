import { useEffect, useState } from "react";
import type { LinksFunction, MetaFunction } from "react-router";
import { RegistryShell } from "../../src/features/admin/components/RegistryShell";
import { buildRegistrySeed } from "../../src/features/admin/registry/registry-seed";
import type { RegistryRecord } from "../../src/features/admin/registry/registry-record";
import type { DeniedStatus } from "../../src/features/admin/types";
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

export default function AdminRegistryRoute() {
  const [rows, setRows] = useState<RegistryRecord[] | null>(null);
  const [denied, setDenied] = useState<DeniedStatus | null>(null);

  useEffect(() => {
    // Client only load. SSR never touches admin data.
    setRows(buildRegistrySeed());
    setDenied(null);
  }, []);

  function handleRetry() {
    setRows(buildRegistrySeed());
    setDenied(null);
  }

  return (
    <RegistryShell denied={denied} onRetry={handleRetry}>
      {rows === null ? (
        <p className="registry-muted">Loading registry.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id} className="registry-card px-4 py-3">
              <span className="font-medium">{row.name}</span>{" "}
              <span className="registry-badge px-2 py-0.5 text-xs">
                {row.kind || "uncategorized"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </RegistryShell>
  );
}
