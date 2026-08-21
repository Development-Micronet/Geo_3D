import React, { useState } from "react";

/**
 * Presentational tooltip wrapper.
 * Appears on hover (for pointer devices) and on keyboard focus-visible (for accessibility).
 * Automatically dismisses on click/touch so tooltips do not hold or get stuck.
 */
export default function Tooltip({ label, children, side = "bottom", className = "" }) {
  const [suppressed, setSuppressed] = useState(false);

  if (!label) return children;

  const position =
    side === "right"
      ? "left-full top-1/2 -translate-y-1/2 ml-2"
      : side === "left"
      ? "right-full top-1/2 -translate-y-1/2 mr-2"
      : side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
      : "top-full left-1/2 -translate-x-1/2 mt-2";

  return (
    <span
      className={`group/tt relative inline-flex ${className}`}
      onPointerDown={() => setSuppressed(true)}
      onMouseLeave={() => setSuppressed(false)}
      onBlur={() => setSuppressed(false)}
    >
      {children}
      {!suppressed && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute ${position} z-[300] whitespace-nowrap rounded-md border border-line bg-surface-2/95 px-2 py-1 text-[10.5px] font-medium tracking-wide text-ink opacity-0 shadow-float backdrop-blur-sm transition-opacity duration-150 [@media(hover:hover)]:group-hover/tt:opacity-100 group-has-[:focus-visible]/tt:opacity-100 group-active/tt:opacity-0`}
        >
          {label}
        </span>
      )}
    </span>
  );
}

