import React, { useState, useEffect } from "react";
import {
  Check,
  Circle,
  Copy,
  Download,
  Hexagon,
  MapPin,
  Minus,
  PenTool,
  Plane,
  Plus,
  Slash,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { PanelShell, FieldLabel } from "./ui/Panel.jsx";
import Tooltip from "./ui/Tooltip.jsx";

/** Compact metric tile used in the results grid. */
function Metric({ label, value, full = false, mono = false }) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-lg border border-line/60 bg-white/[0.03] p-2 min-w-0 ${
        full ? "col-span-2" : ""
      }`}
    >
      <FieldLabel className="truncate">{label}</FieldLabel>
      <span
        className={`tabular text-[11.5px] font-semibold text-ink leading-snug break-words ${
          mono ? "font-mono text-[10.5px] text-accent break-all" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/** Robust clipboard copy helper supporting secure context and fallback */
async function copyToClipboard(text) {
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("navigator.clipboard failed, attempting fallback:", err);
    }
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback clipboard copy failed:", err);
    return false;
  }
}

/** Format comprehensive AOI data text for clipboard */
function formatAoiText(aoiData) {
  if (!aoiData) return "";
  const lines = [];

  const title = aoiData.type || "Area of Interest (AOI)";
  lines.push(`=== ${title} ===`);

  if (aoiData.pointsList && aoiData.pointsList.length > 0) {
    lines.push(`Marked Points (${aoiData.pointsList.length}):`);
    aoiData.pointsList.forEach((p) => {
      lines.push(
        `  Point ${p.id}: Lon ${p.lon}, Lat ${p.lat}${p.elevation !== undefined ? `, Elev ${p.elevation}m` : ""}`
      );
    });
  }

  if (aoiData.areaKm2) {
    lines.push(`Area: ${aoiData.areaKm2} km²${aoiData.areaAcres ? ` (${aoiData.areaAcres} acres)` : ""}`);
  }
  if (aoiData.lengthKm) {
    lines.push(`Length: ${aoiData.lengthKm} km`);
  }
  if (aoiData.perimeterKm) {
    lines.push(`Perimeter: ${aoiData.perimeterKm} km`);
  }
  if (aoiData.radiusKm) {
    lines.push(`Radius: ${aoiData.radiusKm} km`);
  }
  if (aoiData.elevation !== undefined && aoiData.elevation !== null && !aoiData.pointsList) {
    lines.push(`Elevation: ${aoiData.elevation} m`);
  }
  if (aoiData.center && !aoiData.pointsList) {
    lines.push(`Centroid: [${aoiData.center[0]}, ${aoiData.center[1]}]`);
  }
  if (aoiData.bbox) {
    lines.push(`Bounding Box [W, S, E, N]: [${aoiData.bbox.join(", ")}]`);
  }
  if (aoiData.coordinates && !aoiData.pointsList && Array.isArray(aoiData.coordinates)) {
    lines.push(`Coordinates:`);
    aoiData.coordinates.forEach((c, idx) => {
      if (Array.isArray(c)) {
        lines.push(`  Point ${idx + 1}: [${c.join(", ")}]`);
      } else {
        lines.push(`  Point ${idx + 1}: ${c}`);
      }
    });
  }

  return lines.join("\n");
}

export default function AoiPanel({
  onStartDrawing,
  onStopDrawing,
  onFinishDrawing,
  onClearAoi,
  onRemovePoint,
  onFlyToAoi,
  onExportGeoJson,
  aoiData,
  isDrawing,
  onClose,
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null); // null by default so drawing doesn't start automatically
  const [copied, setCopied] = useState(false);
  const strokeColor = "#f59e0b";
  const fillOpacity = 0.25;

  // Cleanup drawing state on unmount
  useEffect(() => {
    return () => {
      onStopDrawing?.();
    };
  }, [onStopDrawing]);

  function handleModeChange(mode) {
    if (selectedMode === mode) {
      // Toggle off if already selected
      setSelectedMode(null);
      onStopDrawing?.();
    } else {
      setSelectedMode(mode);
      if (onStartDrawing) {
        onStartDrawing(mode, { strokeColor, fillOpacity });
      }
    }
  }

  function handleClearAll() {
    setSelectedMode(null);
    onStopDrawing?.();
    onClearAoi?.();
  }

  async function handleCopyData() {
    if (!aoiData) return;
    const textToCopy = formatAoiText(aoiData);
    if (!textToCopy) return;

    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const modes = [
    { id: "bbox", label: "Bounding Box", icon: Square, desc: "Click 2 opposite corners on the map" },
    { id: "point", label: "Multi-Point", icon: MapPin, desc: "Click on the globe to mark points" },
    { id: "line", label: "Line String", icon: Slash, desc: "Click vertices, double-click to finish" },
    { id: "polygon", label: "Polygon", icon: Hexagon, desc: "Click vertices, double-click to close" },
    { id: "circle", label: "Circle Area", icon: Circle, desc: "Click center point, then drag/click radius" },
  ];

  return (
    <PanelShell className="flex max-h-[calc(100vh-80px)] w-[340px] max-w-[92vw] flex-col overflow-hidden shadow-2xl">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-white/[0.03] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/12 text-accent ring-1 ring-accent/25">
            <PenTool size={13} strokeWidth={2.2} />
          </span>
          <span className="truncate text-[11.5px] font-semibold uppercase tracking-[0.09em] text-ink">
            AOI &amp; Spatial Draw
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Tooltip label={isMinimized ? "Expand" : "Minimize"} side="left">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-white/8 hover:text-ink"
            >
              {isMinimized ? <Plus size={13} /> : <Minus size={13} />}
            </button>
          </Tooltip>
          <Tooltip label="Close" side="left">
            <button
              type="button"
              onClick={() => {
                onStopDrawing?.();
                onClose?.();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-bad/15 hover:text-bad"
            >
              <X size={13} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={`min-h-0 flex-1 space-y-2.5 overflow-y-auto overflow-x-hidden p-3 overscroll-contain ${isMinimized ? "hidden" : "block"}`}>
        {/* ── Mode selector ── */}
        <div className="grid grid-cols-2 gap-1.5">
          {modes.map((m, idx) => {
            const Icon = m.icon;
            const isActive = selectedMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeChange(m.id)}
                title={m.desc}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-all ${
                  isActive
                    ? "bg-accent/15 text-accent ring-1 ring-accent/40 shadow-sm"
                    : "border border-line bg-white/[0.03] text-ink-muted hover:border-line-strong hover:bg-white/8 hover:text-ink"
                } ${idx === modes.length - 1 ? "col-span-2" : ""}`}
              >
                <Icon size={13} strokeWidth={2} className="shrink-0" />
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Drawing actions ── */}
        <div className="flex gap-2">
          {(selectedMode === "polygon" || selectedMode === "line") && isDrawing && (
            <button
              type="button"
              onClick={onFinishDrawing}
              title="Complete current polyline / polygon"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ok px-3 py-2 text-[11px] font-semibold text-surface-0 transition-colors hover:bg-emerald-300 active:scale-[0.98]"
            >
              <Check size={13} strokeWidth={2.4} />
              <span>Finish drawing</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleClearAll}
            title="Clear all drawings / points"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-[11px] font-semibold text-bad transition-colors hover:bg-bad/20 active:scale-[0.98]"
          >
            <Trash2 size={13} />
            <span>Clear all</span>
          </button>
        </div>

        {/* ── Results ── */}
        {aoiData && (
          <div className="rounded-lg border border-accent/25 bg-accent/[0.06] p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-bold uppercase tracking-wider text-accent">
                {aoiData.type || "Geometry details"}
              </span>
              <span className="tabular shrink-0 rounded border border-accent/30 bg-accent/12 px-1.5 py-px font-mono text-[9.5px] font-semibold text-accent">
                {aoiData.pointCount ? `${aoiData.pointCount} pts` : "Active"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {/* Multi-point list */}
              {aoiData.pointsList && aoiData.pointsList.length > 0 && (
                <div className="col-span-2">
                  <FieldLabel className="mb-1.5 block">
                    Marked points ({aoiData.pointsList.length})
                  </FieldLabel>
                  <div className="flex max-h-32 flex-col gap-1 overflow-y-auto pr-0.5">
                    {aoiData.pointsList.map((pt, idx) => (
                      <div
                        key={pt.id}
                        className="flex items-center gap-2 rounded-md bg-white/[0.05] px-2 py-1"
                      >
                        <span className="tabular shrink-0 font-mono text-[10px] font-bold text-accent">
                          #{pt.id}
                        </span>
                        <span className="tabular min-w-0 flex-1 truncate font-mono text-[10px] text-ink">
                         {pt.lat}, {pt.lon}
                        </span>
                        <span className="tabular shrink-0 font-mono text-[9.5px] text-ink-faint">
                          {pt.elevation}m
                        </span>
                        {onRemovePoint && (
                          <button
                            type="button"
                            onClick={() => onRemovePoint(idx)}
                            title={`Delete point ${pt.id}`}
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-ink-faint transition-colors hover:bg-bad/15 hover:text-bad"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aoiData.areaKm2 && <Metric label="Area" value={`${aoiData.areaKm2} km²`} />}
              {aoiData.areaAcres && <Metric label="Acres" value={`${aoiData.areaAcres} ac`} />}
              {aoiData.lengthKm && <Metric label="Length" value={`${aoiData.lengthKm} km`} />}
              {aoiData.perimeterKm && <Metric label="Perimeter" value={`${aoiData.perimeterKm} km`} />}
              {aoiData.elevation !== undefined && aoiData.elevation !== null && !aoiData.pointsList && (
                <Metric label="Elevation (Z)" value={`${aoiData.elevation} m`} />
              )}
              {aoiData.center && !aoiData.pointsList && (
                <Metric
                  label="Centroid"
                  value={`[${aoiData.center[0]}, ${aoiData.center[1]}]`}
                  full
                  mono
                />
              )}
              {aoiData.bbox && (
                <Metric
                  label="Bounding box [W, S, E, N]"
                  value={`[${aoiData.bbox.join(", ")}]`}
                  full
                  mono
                />
              )}
            </div>

            {/* Result actions */}
            <div className="mt-2.5 flex gap-1.5">
              <button
                type="button"
                onClick={onFlyToAoi}
                title="Fly camera to marked points / AOI"
                className="flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-md border border-line bg-white/[0.06] px-2 py-1.5 text-[10.5px] font-semibold text-ink transition-colors hover:bg-white/12 active:scale-[0.98]"
              >
                <Plane size={12} className="shrink-0" />
                <span className="truncate">Fly to</span>
              </button>
              <button
                type="button"
                onClick={handleCopyData}
                title="Copy all coordinates or BBOX"
                className="flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-md border border-line bg-white/[0.06] px-2 py-1.5 text-[10.5px] font-semibold text-ink transition-colors hover:bg-white/12 active:scale-[0.98]"
              >
                {copied ? <Check size={12} className="shrink-0 text-ok" /> : <Copy size={12} className="shrink-0" />}
                <span className="truncate">{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                type="button"
                onClick={onExportGeoJson}
                title="Download GeoJSON"
                className="flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-md bg-accent px-2 py-1.5 text-[10.5px] font-semibold text-surface-0 transition-colors hover:bg-accent-soft active:scale-[0.98]"
              >
                <Download size={12} className="shrink-0" />
                <span className="truncate">Export</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
