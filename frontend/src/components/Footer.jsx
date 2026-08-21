import React, { useState, useEffect } from "react";

/**
 * Coordinate format converters
 */
function formatDD(val, isLat) {
  if (val === null || val === undefined || isNaN(val)) return "--";
  const num = Number(val);
  const dir = isLat ? (num >= 0 ? "N" : "S") : (num >= 0 ? "E" : "W");
  return `${Math.abs(num).toFixed(6)}° ${dir}`;
}

function formatElevation(meters) {
  if (meters === null || meters === undefined || isNaN(meters)) return "--";
  const num = Number(meters);
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(1)} m`;
}

export default function Footer({ coords: propCoords }) {
  const [internalCoords, setInternalCoords] = useState(null);

  // Subscribe to live cursor coordinates and retain the last recorded coordinates
  useEffect(() => {
    if (propCoords !== undefined) return;

    function handleCursorMove(event) {
      if (event.detail && event.detail.lat !== undefined && event.detail.lat !== null && !isNaN(event.detail.lat)) {
        setInternalCoords(event.detail);
      }
    }

    function handleHoldCoords(event) {
      if (event.detail && event.detail.lat !== undefined && event.detail.lat !== null && !isNaN(event.detail.lat)) {
        setInternalCoords(event.detail);
      }
    }

    window.addEventListener("geo3d:cursor-coordinates", handleCursorMove);
    window.addEventListener("geo3d:hold-coordinates", handleHoldCoords);
    return () => {
      window.removeEventListener("geo3d:cursor-coordinates", handleCursorMove);
      window.removeEventListener("geo3d:hold-coordinates", handleHoldCoords);
    };
  }, [propCoords]);

  const activeCoords = propCoords !== undefined ? propCoords : internalCoords;

  const isTracking = Boolean(
    activeCoords &&
      activeCoords.lat !== null &&
      activeCoords.lat !== undefined &&
      !isNaN(activeCoords.lat)
  );

  const latStr = isTracking ? formatDD(activeCoords.lat, true) : "--";
  const lonStr = isTracking ? formatDD(activeCoords.lon, false) : "--";
  const elevStr = isTracking ? formatElevation(activeCoords.elevation) : "--";

  return (
    <div
      className="
        pointer-events-auto
        absolute
        bottom-4
        left-1/2
        -translate-x-1/2
        z-[160]
        flex
        select-none
        items-center
        gap-2.5
        rounded-xl
        border
        border-line
        bg-surface-2/90
        px-3
        py-1.5
        text-[11px]
        text-ink
        shadow-float
        backdrop-blur-xl
        transition-all
        duration-150
      "
      aria-label="Map Coordinates and Elevation"
    >
      {/* ── Coordinates Pill Group ── */}
      <div className="flex items-center gap-2 font-mono text-[11px]">
        {/* Latitude */}
        <div className="flex items-center gap-1">
          <span className="rounded bg-surface-4 px-1 py-px text-[9px] font-bold tracking-wider text-accent">
            LAT
          </span>
          <span
            className={`tabular font-medium transition-colors ${
              isTracking ? "text-ink" : "text-ink-faint"
            }`}
          >
            {latStr}
          </span>
        </div>

        <span className="h-3 w-px bg-line shrink-0" />

        {/* Longitude */}
        <div className="flex items-center gap-1">
          <span className="rounded bg-surface-4 px-1 py-px text-[9px] font-bold tracking-wider text-accent">
            LON
          </span>
          <span
            className={`tabular font-medium transition-colors ${
              isTracking ? "text-ink" : "text-ink-faint"
            }`}
          >
            {lonStr}
          </span>
        </div>

        <span className="h-3 w-px bg-line shrink-0" />

        {/* Elevation */}
        <div className="flex items-center gap-1">
          <span className="rounded bg-surface-4 px-1 py-px text-[9px] font-bold tracking-wider text-ok">
            EVL
          </span>
          <span
            className={`tabular font-medium transition-colors ${
              isTracking ? "text-ok" : "text-ink-faint"
            }`}
          >
            {elevStr}
          </span>
        </div>
      </div>
    </div>
  );
}

