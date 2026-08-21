import React from "react";
import { Info, X } from "lucide-react";
import { PanelShell } from "./ui/Panel.jsx";

export default function IdentifyPanel({ attributes, onClose }) {
  if (!attributes) return null;

  const entries = Object.entries(attributes);

  return (
    <PanelShell className="w-[272px]">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-white/[0.03] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/12 text-accent ring-1 ring-accent/25">
            <Info size={13} strokeWidth={2.2} />
          </span>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.09em] text-ink">
            Feature attributes
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-bad/15 hover:text-bad"
        >
          <X size={13} />
        </button>
      </div>

      <div className="max-h-[40vh] overflow-y-auto p-2">
        {entries.length === 0 ? (
          <p className="px-1.5 py-3 text-center text-[11px] text-ink-faint">
            This feature carries no attributes.
          </p>
        ) : (
          <dl className="flex flex-col">
            {entries.map(([k, v]) => (
              <div
                key={k}
                className="flex items-start justify-between gap-3 border-b border-line/60 px-1.5 py-1.5 last:border-0"
              >
                <dt className="shrink-0 max-w-[45%] truncate text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint" title={k}>
                  {k}
                </dt>
                <dd className="tabular min-w-0 break-words text-right font-mono text-[11px] text-ink">
                  {String(v)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </PanelShell>
  );
}
