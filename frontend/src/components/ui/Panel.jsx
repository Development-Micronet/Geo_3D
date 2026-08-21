import React from "react";
import { Minus, Plus, X } from "lucide-react";
import Tooltip from "./Tooltip.jsx";

/**
 * Glass panel shell for floating tool panels.
 * Purely presentational — children and handlers are supplied by callers.
 */
export function PanelShell({ children, className = "", ...rest }) {
  return (
    <div
      className={`pointer-events-auto w-[300px] max-w-[92vw] overflow-hidden rounded-xl border border-line bg-surface-2/85 text-ink shadow-panel backdrop-blur-xl ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Standard header: icon + title on the left, minimise/close on the right. */
export function PanelHeader({ icon: Icon, title, onClose, isMinimized, onToggleMinimize }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line bg-white/[0.03] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/12 text-accent ring-1 ring-accent/25">
            <Icon size={13} strokeWidth={2.2} />
          </span>
        )}
        <span className="truncate text-[11.5px] font-semibold uppercase tracking-[0.09em] text-ink">
          {title}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {onToggleMinimize && (
          <Tooltip label={isMinimized ? "Expand" : "Minimize"} side="left">
            <button
              type="button"
              onClick={onToggleMinimize}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-white/8 hover:text-ink"
            >
              {isMinimized ? <Plus size={13} /> : <Minus size={13} />}
            </button>
          </Tooltip>
        )}
        {onClose && (
          <Tooltip label="Close" side="left">
            <button
              type="button"
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-bad/15 hover:text-bad"
            >
              <X size={13} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/** Grouped control block inside a panel. */
export function ControlBox({ children, className = "" }) {
  return (
    <div className={`rounded-lg border border-line bg-black/25 p-2.5 ${className}`}>
      {children}
    </div>
  );
}

/** Small uppercase field label. */
export function FieldLabel({ children, className = "" }) {
  return (
    <span
      className={`text-[9.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted ${className}`}
    >
      {children}
    </span>
  );
}

/** Label + value row, used above sliders. */
export function LabelRow({ label, value }) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <FieldLabel>{label}</FieldLabel>
      <span className="tabular text-[11px] font-semibold text-accent">{value}</span>
    </div>
  );
}

/** Highlighted readout row for measurement results. */
export function ResultRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10.5px] font-medium text-ink-muted">{label}</span>
      <span className="tabular font-mono text-[11.5px] font-semibold text-accent">
        {value}
      </span>
    </div>
  );
}

/* ── Button recipes ───────────────────────────────────────── */

export const btnPrimary =
  "flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[11px] font-semibold text-surface-0 transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50";

export const btnDanger =
  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-[11px] font-semibold text-bad transition-colors hover:bg-bad/20";

export const btnGhost =
  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-ink transition-colors hover:bg-white/10";

export const selectField =
  "w-full cursor-pointer rounded-lg border border-line bg-surface-1 px-2.5 py-2 text-[11.5px] font-medium text-ink outline-none transition-colors hover:border-line-strong focus:border-accent";
