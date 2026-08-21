import React, { useState } from "react";
import {
  Plus,
  PenTool,
  Sun,
  Eye,
  Mountain,
  Ruler,
  Square,
  CloudSun,
  MoreHorizontal,
} from "lucide-react";
import Tooltip from "./Tooltip.jsx";

/**
 * Tool metadata for the toolbar. `id` values map 1:1 to the existing
 * `activeTool` state values in App.jsx — do not rename them.
 */
export const TOOLS = [
  { id: "aoi", label: "AOI / Draw", icon: PenTool, hint: "Area of Interest & Vector Drawing" },
  { id: "daylight", label: "Daylight", icon: Sun, hint: "Sun & Shadow Simulation" },
  { id: "lineOfSight", label: "Line of Sight", icon: Eye, hint: "3D Line of Sight Analysis" },
  { id: "elevationProfile", label: "Elevation", icon: Mountain, hint: "Terrain & Elevation Profile" },
  { id: "distance", label: "Distance", icon: Ruler, hint: "3D Distance Measurement" },
  { id: "area", label: "Area", icon: Square, hint: "3D Surface Area Measurement" },
  { id: "weather", label: "Weather", icon: CloudSun, hint: "Atmospheric Weather Simulation" },
];

const toolBase =
  "relative flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium whitespace-nowrap transition-colors duration-150";
const toolIdle = "text-white hover:bg-white/15 hover:text-white";
const toolActive = "bg-accent/25 text-white ring-1 ring-accent/60 font-semibold";

function ToolButton({ tool, isActive, onSelect }) {
  const Icon = tool.icon;
  return (
    <Tooltip label={tool.hint}>
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          onSelect(tool.id);
        }}
        aria-pressed={isActive}
        className={`${toolBase} ${isActive ? toolActive : toolIdle}`}
      >
        <Icon size={14} strokeWidth={2} className="text-white" />
        <span className="hidden 2xl:inline text-white">{tool.label}</span>
        {/* Active rail — the one signal that a tool is engaged */}
        {isActive && (
          <span className="absolute inset-x-2 -bottom-[7px] h-[2px] rounded-full bg-accent" />
        )}
      </button>
    </Tooltip>
  );
}

export default function TopToolbar({
  brand,
  showTools,
  currentUser,
  canAddData = false,
  activeTool,
  onToolSelect,
  showAddDataPanel,
  onToggleAddData,
  right,
}) {
  const [overflowOpen, setOverflowOpen] = useState(false);

  const visibleTools = !currentUser
    ? []
    : currentUser.role === "superadmin" || currentUser.role === "admin"
    ? TOOLS
    : TOOLS.filter(
        (tool) =>
          Array.isArray(currentUser.permissions) &&
          currentUser.permissions.includes(tool.id)
      );

  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-[200] flex h-12 items-center justify-between gap-3 border-b border-line bg-surface-2/95 px-3 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.04),0_8px_24px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:px-4">
      {/* ── Left: brand + tools ── */}
      <div className="flex min-w-0 flex-1 items-center gap-3 text-white">
        {brand}

        {showTools && (canAddData || visibleTools.length > 0) && (
          <>
            <span className="hidden h-5 w-px shrink-0 bg-line md:block mx-1 ml-36 lg:ml-36 md:ml-10" />

            {/* Add Data (Superadmin / Admin only) */}
            {canAddData && (
              <Tooltip label="Add GIS Data Layer">
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleAddData();
                  }}
                  aria-pressed={showAddDataPanel}
                  className={`${toolBase} ${
                    showAddDataPanel
                      ? toolActive
                      : "bg-white/[0.08] text-white ring-1 ring-white/15 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <Plus size={14} strokeWidth={2.4} className="text-white" />
                  <span className="hidden sm:inline text-white">Add Data</span>
                </button>
              </Tooltip>
            )}

            {canAddData && visibleTools.length > 0 && <span className="hidden h-5 w-px shrink-0 bg-line lg:block" />}

            {/* Inline tools — full row on wide screens */}
            {visibleTools.length > 0 && (
              <nav className="hidden items-center gap-0.5 lg:flex text-white" aria-label="Analysis tools">
                {visibleTools.map((tool) => (
                  <ToolButton
                    key={tool.id}
                    tool={tool}
                    isActive={activeTool === tool.id}
                    onSelect={onToolSelect}
                  />
                ))}
              </nav>
            )}

            {/* Overflow menu — narrow screens keep visible tools reachable */}
            {visibleTools.length > 0 && (
              <div className="relative lg:hidden text-white">
                <button
                  type="button"
                  onClick={() => setOverflowOpen((v) => !v)}
                  aria-expanded={overflowOpen}
                  aria-haspopup="menu"
                  className={`${toolBase} ${
                    activeTool ? toolActive : "text-white hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <MoreHorizontal size={15} className="text-white" />
                  <span className="hidden sm:inline text-white">Tools</span>
                </button>

                {overflowOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[199]"
                      onClick={() => setOverflowOpen(false)}
                    />
                    <div
                      role="menu"
                      className="absolute left-0 top-[calc(100%+10px)] z-[201] w-56 overflow-hidden rounded-xl border border-line bg-surface-2/95 p-1.5 shadow-panel backdrop-blur-xl text-white"
                    >
                      {visibleTools.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = activeTool === tool.id;
                        return (
                          <button
                            key={tool.id}
                            type="button"
                            role="menuitem"
                            onClick={(e) => {
                              e.currentTarget.blur();
                              onToolSelect(tool.id);
                              setOverflowOpen(false);
                            }}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors ${
                              isActive
                                ? "bg-accent/25 text-white"
                                : "text-white hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <Icon size={14} strokeWidth={2} className="text-white" />
                            <span className="text-white">{tool.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Right: search + user ── */}
      <div className="flex shrink-0 items-center gap-2">{right}</div>
    </header>
  );
}
