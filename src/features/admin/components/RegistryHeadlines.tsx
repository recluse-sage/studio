import type { RegistryHeadlineSlot } from "../registry/registry-view";
import { REGISTRY_COPY } from "../registry/registry-view";

/* Headline pair rendering for one registry row. Handles pending vs
   unconnected vs not-entered vs confirmed zero. Null values render as
   pending, never as zero. No Mantine import here. */

function NumberSlot({
  label,
  value,
  window,
  updatedAt,
  tooltip,
}: {
  label: string;
  value: number | null;
  window: string | null;
  updatedAt: string | null;
  tooltip: string | null;
}) {
  if (value === null) {
    return (
      <div className="registry-headline">
        <p className="registry-headline-label">{label}</p>
        <p className="registry-muted">{REGISTRY_COPY.noReport}</p>
      </div>
    );
  }
  return (
    <div className="registry-headline" title={tooltip ?? undefined}>
      <p className="registry-headline-label">{label}</p>
      <p className="registry-headline-value">{value}</p>
      {window ? <p className="registry-headline-window">{window}</p> : null}
      {updatedAt ? (
        <p className="registry-muted registry-headline-updated">
          Updated {updatedAt}
        </p>
      ) : null}
    </div>
  );
}

export function RegistryHeadlines({
  slots,
}: {
  slots: RegistryHeadlineSlot[];
}) {
  return (
    <div className="registry-headlines">
      {slots.map((slot, index) => {
        if (slot.kind === "numbers") {
          const [first, second] = slot.items;
          return (
            <div key={`numbers-${index}`} className="registry-headline-pair">
              <NumberSlot
                label={first.label}
                value={first.value}
                window={first.window}
                updatedAt={first.updatedAt}
                tooltip={first.tooltip}
              />
              <NumberSlot
                label={second.label}
                value={second.value}
                window={second.window}
                updatedAt={second.updatedAt}
                tooltip={second.tooltip}
              />
            </div>
          );
        }
        if (slot.kind === "pending") {
          return (
            <p key={`pending-${index}`} className="registry-muted">
              <span
                className="registry-dot registry-dot-unknown"
                aria-hidden="true"
              />{" "}
              {REGISTRY_COPY.noReport}
            </p>
          );
        }
        if (slot.kind === "unconnected") {
          return (
            <div key={`unconnected-${index}`} className="registry-headline">
              <p className="registry-headline-label">{slot.label}</p>
              <p>
                {REGISTRY_COPY.unconnected}{" "}
                <span className="registry-muted">{slot.reason}</span>
              </p>
            </div>
          );
        }
        return (
          <div key={`manual-${index}`} className="registry-headline">
            <p className="registry-headline-label">{slot.label}</p>
            <p className="registry-muted">{REGISTRY_COPY.notEntered}</p>
          </div>
        );
      })}
    </div>
  );
}
