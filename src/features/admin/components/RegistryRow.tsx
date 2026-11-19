import { Collapsible } from "@base-ui-components/react/collapsible";
import type { RegistryRecord } from "../registry/registry-record";
import {
  REGISTRY_COPY,
  describeRegistryRow,
} from "../registry/registry-view";
import { RegistryHeadlines } from "./RegistryHeadlines";

/* One property row. Status dot, kind badge, last report line, headline slots,
   home link or dash, notes, plus a collapsible with the 3.8 detail
   (lifecycle, connectivity, health, freshness). No Mantine import here. */

const DOT_CLASS: Record<RegistryRecord["health"], string> = {
  up: "registry-dot registry-dot-up",
  down: "registry-dot registry-dot-down",
  unknown: "registry-dot registry-dot-unknown",
};

export function RegistryRow({ record }: { record: RegistryRecord }) {
  const view = describeRegistryRow(record);
  const source = record.sources["reporter"];

  return (
    <li className="registry-card registry-row">
      <div className="flex flex-wrap items-center gap-2">
        <span className={DOT_CLASS[view.dot]} aria-hidden="true" />
        <span className="oasis-sr-only">
          {view.dot === "up"
            ? "Reporter up"
            : view.dot === "down"
              ? "Reporter down"
              : REGISTRY_COPY.noReport}
        </span>
        <span className="text-base font-semibold">{view.name}</span>
        <span className="registry-badge px-2 py-0.5 text-xs">
          {view.kind || "uncategorized"}
        </span>
        {view.lifecycle === "planned" ? (
          <span className="registry-badge px-2 py-0.5 text-xs">planned</span>
        ) : null}
      </div>

      <p className="registry-muted mt-2 text-sm">{view.lastReportLine}</p>

      {view.downNotice ? (
        <p role="status" className="registry-down mt-2 text-sm">
          {view.downNotice}
          {view.servedAt ? ` Last report ${view.servedAt}.` : ""}
          {view.lastSuccessfulFetchAt
            ? ` Last successful fetch ${view.lastSuccessfulFetchAt}.`
            : ""}
        </p>
      ) : null}

      <div className="mt-3">
        {view.slots.length === 0 ? (
          <p className="registry-muted text-sm">
            <span
              className="registry-dot registry-dot-unknown"
              aria-hidden="true"
            />{" "}
            <span
              className="registry-dot registry-dot-unknown"
              aria-hidden="true"
            />{" "}
            {view.notes}
          </p>
        ) : (
          <RegistryHeadlines slots={view.slots} />
        )}
      </div>

      <p className="mt-3 text-sm">
        {view.homeUrl ? (
          <a
            href={view.homeUrl}
            className="registry-accent underline"
            rel="noreferrer"
          >
            {view.homeUrl}
          </a>
        ) : (
          <>
            <span aria-hidden="true">-</span>{" "}
            <span className="oasis-sr-only">No home link</span>
          </>
        )}
      </p>

      {view.slots.length > 0 && view.notes ? (
        <p className="registry-muted mt-1 text-sm">{view.notes}</p>
      ) : null}

      <Collapsible.Root className="mt-3">
        <Collapsible.Trigger className="registry-detail-toggle">
          Report detail
        </Collapsible.Trigger>
        <Collapsible.Panel className="registry-detail-panel">
          <dl className="registry-muted text-sm">
            <div>
              <dt>Lifecycle</dt>
              <dd>{view.lifecycle}</dd>
            </div>
            <div>
              <dt>Connectivity</dt>
              <dd>{source?.connectivity ?? "unconnected"}</dd>
            </div>
            <div>
              <dt>Health</dt>
              <dd>{view.dot}</dd>
            </div>
            <div>
              <dt>Freshness</dt>
              <dd>{source?.freshness ?? "never"}</dd>
            </div>
          </dl>
        </Collapsible.Panel>
      </Collapsible.Root>
    </li>
  );
}

/* Zero properties is a config error, not an empty page. */
export function RegistryConfigErrorCard() {
  return (
    <div className="registry-card registry-error" role="alert">
      <h2>{REGISTRY_COPY.configErrorTitle}</h2>
      <p className="registry-muted">{REGISTRY_COPY.configErrorBody}</p>
    </div>
  );
}
