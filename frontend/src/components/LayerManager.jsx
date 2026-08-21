import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Box,
  ChevronDown,
  Crosshair,
  Eye,
  EyeOff,
  GripVertical,
  Image,
  Layers,
  PanelLeftClose,
  Shapes,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import { getFileFormatBadge } from "../services/formats.js";
import Tooltip from "./ui/Tooltip.jsx";

/** Picks a glyph for the layer's data type. Presentation only. */
function iconForBadge(badge) {
  if (
    badge === "GeoJSON" ||
    badge === "KML" ||
    badge === "KMZ" ||
    badge === "SHP"
  ) {
    return Shapes;
  }

  if (badge === "DSM" || badge === "Raster" || badge === "WMTS") {
    return Image;
  }

  return Box;
}

/**
 * Confirmation dialog for deleting a single layer or all layers.
 */
function DeleteConfirmModal({ target, onConfirm, onCancel }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        onConfirm();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm, onCancel]);

  if (!target) return null;

  const isAll = target.type === "all";
  const layerName = target.layer?.filename || target.layer?.name || "this layer";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center   "
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl border border-line bg-surface-2 p-5 shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-bad/30 bg-bad/15 text-bad">
            <Trash2 size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-bold text-ink">
              {isAll ? "Delete All Layers?" : "Delete Layer?"}
            </h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
              {isAll ? (
                <>
                  Are you sure you want to remove all{" "}
                  <span className="font-semibold text-ink">{target.count}</span>{" "}
                  layers? This will clear all data from the 3D scene.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-ink break-all">
                    "{layerName}"
                  </span>
                  ? This will unload it from the 3D viewport and delete its data.
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-white/8 hover:text-ink"
            aria-label="Close dialog"
          >
            <X size={14} />
          </button>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-line/70 pt-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-semibold text-ink transition-colors hover:bg-white/10"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-lg border border-bad/30 bg-bad px-3.5 py-1.5 text-[11.5px] font-semibold text-white shadow-sm transition-all hover:bg-bad/90 active:scale-[0.98]"
          >
            <Trash2 size={13} />
            <span>{isAll ? "Delete All" : "Delete Layer"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function LayerCard({
  layer,
  badge,
  isSelected,
  isReady,
  isExpanded,
  canDelete = false,
  onSelect,
  onToggleDetail,
  onToggleVisible,
  onOpacityChange,
  onFlyTo,
  onDeleteRequest,
}) {
  const TypeIcon = iconForBadge(badge);

  const isVisible = layer.visible !== false;

  const opacity =
    layer.opacity !== undefined
      ? layer.opacity
      : 1;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
        onFlyTo(layer.id);
      }}
      className={`group relative shrink-0 cursor-pointer overflow-hidden rounded-lg border transition-colors duration-150 ${isSelected
        ? "border-accent/45 bg-accent/[0.07]"
        : "border-line bg-white/[0.02] hover:border-line-strong hover:bg-white/[0.05]"
        }`}
    >
      {/* Active rail marks the selected layer */}
      {isSelected && (
        <span className="absolute inset-y-0 left-0 w-[2px] bg-accent" />
      )}

      <div className="px-2.5 py-2.5">

        {/* ───────────────── Header ───────────────── */}
        <div className="flex items-center gap-2">



          {/* Visibility */}
          <Tooltip
            label={isVisible ? "Hide layer" : "Show layer"}
          >

            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) => {
                e.stopPropagation();
                onToggleVisible(layer.id, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 shrink-0 cursor-pointer rounded border border-ink-faint accent-accent"
            />
          </Tooltip>


          {/* Layer name */}
          <span
            className={`min-w-0 flex-1 truncate text-[12.5px] font-semibold ${isVisible
              ? "text-ink"
              : "text-ink"
              }`}
            title={layer.filename || layer.name || "3D Layer"}
          >
            {layer.filename ||
              layer.name ||
              "3D Layer"}
          </span>


          {/* Quick Header Delete Button (Superadmin only) */}
          {canDelete && (
            <Tooltip label="Delete layer" side="left">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest(layer);
                }}
                aria-label="Delete layer"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-faint opacity-60 transition-all hover:bg-bad/15 hover:text-bad hover:opacity-100 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </Tooltip>
          )}
        </div>

        {/* ───────────────── Status messages ───────────────── */}

        {layer.status === "extracting" && (
          <div className="mt-2 flex items-center justify-between gap-1.5 pl-[21px] text-[10px] font-medium text-warn">
            <div className="flex items-center gap-1.5 truncate">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-warn" />
              <span className="truncate">Extracting &amp; preparing I3S 3D tiles…</span>
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest(layer);
                }}
                className="flex shrink-0 items-center gap-1 rounded bg-bad/12 px-1.5 py-0.5 text-[9.5px] font-semibold text-bad transition-colors hover:bg-bad/20"
              >
                <Trash2 size={11} />
                Cancel
              </button>
            )}
          </div>
        )}

        {layer.status === "uploaded" && (
          <div className="mt-2 flex items-center justify-between gap-1.5 pl-[21px] text-[10px] font-medium text-warn">
            <div className="flex items-center gap-1.5 truncate">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-warn" />
              <span className="truncate">Processing uploaded file…</span>
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest(layer);
                }}
                className="flex shrink-0 items-center gap-1 rounded bg-bad/12 px-1.5 py-0.5 text-[9.5px] font-semibold text-bad transition-colors hover:bg-bad/20"
              >
                <Trash2 size={11} />
                Cancel
              </button>
            )}
          </div>
        )}

        {layer.status === "error" && (
          <div className="mt-2 flex items-center justify-between gap-1.5 pl-[21px] text-[10px] font-medium text-bad">
            <div className="flex items-start gap-1.5 truncate">
              <TriangleAlert
                size={12}
                className="mt-px shrink-0"
              />
              <span className="truncate">
                {layer.error || "Failed to load layer"}
              </span>
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest(layer);
                }}
                className="flex shrink-0 items-center gap-1 rounded bg-bad/15 px-1.5 py-0.5 text-[9.5px] font-semibold text-bad transition-colors hover:bg-bad/25"
              >
                <Trash2 size={11} />
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div >
  );
}

export default function LayerManager({
  layers,
  uploadProgress,
  canDelete = false,
  onToggleVisible,
  onOpacityChange,
  onFlyTo,
  onDelete,
  onDeleteAll,
  viewerRef,
  activeSidebarTab = "layers",
  setActiveSidebarTab,
}) {
  const [selectedLayerId, setSelectedLayerId] =
    useState(null);

  const [expandedLayerDetails, setExpandedLayerDetails] =
    useState({});

  const [deleteTarget, setDeleteTarget] =
    useState(null); // null | { type: "single", layer } | { type: "all", count }

  function toggleDetail(id) {
    setExpandedLayerDetails((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;

    if (deleteTarget.type === "all") {
      onDeleteAll && onDeleteAll();
    } else if (deleteTarget.type === "single" && deleteTarget.layer) {
      onDelete && onDelete(deleteTarget.layer.id);
    }
    setDeleteTarget(null);
  }

  /*
   * ─────────────────────────────────────────────
   * COLLAPSED STATE
   * ─────────────────────────────────────────────
   *
   * When panel is collapsed:
   * activeSidebarTab === null
   *
   * We show a floating Layers button.
   */

  if (!activeSidebarTab) {
    return (
      <Tooltip
        label="Open layers panel"
        side="right"
      >
        <button
          type="button"
          onClick={() =>
            setActiveSidebarTab("layers")
          }
          aria-label="Open layers panel"
          className="
            pointer-events-auto
            fixed
            left-0
            top-[50px]
         
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-r-lg
            border
            border-l-0
            border-line
            bg-surface-2/95
            text-ink-muted
            shadow-float
            backdrop-blur-xl
            transition-colors
            hover:bg-surface-3
            hover:text-accent
          "
        >
          <Layers size={16} />
        </button>
      </Tooltip>
    );
  }

  /*
   * ─────────────────────────────────────────────
   * OPEN PANEL
   * ─────────────────────────────────────────────
   */

  return (
    <>
      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        target={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <aside
        className="
          pointer-events-auto
          absolute
          bottom-0
          left-0
          top-12
          z-[155]
          flex
          h-[calc(100vh-48px)]
          max-h-[calc(100vh-48px)]
          w-[86vw]
          max-w-[340px]
          flex-col
          overflow-hidden
          border-r
          border-line
          bg-surface-1/95
          shadow-panel
          backdrop-blur-xl
        "
      >
        {/* ───────────────── Panel Header ───────────────── */}

        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line px-3">

          {/* Title */}
          <div className="flex min-w-0 items-center gap-2">

            <Layers
              size={15}
              className="shrink-0 text-accent"
            />

            <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-ink">
              Layers
            </h2>

            <span className="tabular rounded-full border border-line bg-white/[0.05] px-1.5 py-px font-mono text-[10px] font-semibold text-ink-muted">
              {layers.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Clear All / Delete All Button (Superadmin only) */}
            {canDelete && layers.length > 0 && onDeleteAll && (
              <Tooltip label="Delete all layers" side="bottom">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({
                      type: "all",
                      count: layers.length,
                    })
                  }
                  aria-label="Delete all layers"
                  className="flex h-7 items-center gap-1 rounded-md border border-line bg-white/[0.03] px-2 text-[10.5px] font-semibold text-ink-muted transition-colors hover:border-bad/40 hover:bg-bad/10 hover:text-bad"
                >
                  <Trash2 size={12} />
                  <span>Clear All</span>
                </button>
              </Tooltip>
            )}

            {/* Collapse button */}
            <Tooltip
              label="Collapse panel"
              side="left"
            >
              <button
                type="button"
                onClick={() =>
                  setActiveSidebarTab(null)
                }
                aria-label="Collapse layers panel"
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-md
                  text-ink-muted
                  transition-colors
                  hover:bg-white/8
                  hover:text-ink
                "
              >
                <PanelLeftClose size={15} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* ───────────────── Upload Progress ───────────────── */}

        {uploadProgress !== null &&
          uploadProgress !== undefined && (
            <div className="shrink-0 border-b border-line bg-accent/10 px-3 py-2">

              <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-semibold text-accent">

                <span>
                  Uploading dataset…
                </span>

                {typeof uploadProgress === "number" && (
                  <span className="tabular font-mono">
                    {uploadProgress}%
                  </span>
                )}
              </div>

              <div className="h-1 overflow-hidden rounded-full bg-surface-4">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{
                    width: `${typeof uploadProgress === "number"
                      ? uploadProgress
                      : 0
                      }%`,
                  }}
                />
              </div>
            </div>
          )}

        {/* ───────────────── Layer List ───────────────── */}

        <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto overflow-x-hidden p-2.5 overscroll-contain">

          {layers.length === 0 ? (
            <div className="mt-8 flex flex-col items-center gap-2 rounded-lg border border-dashed border-line px-4 py-8 text-center">

              <Layers
                size={22}
                className="text-ink-faint"
              />

              <p className="text-[12px] font-semibold text-ink-muted">
                No layers loaded
              </p>

              <p className="text-[11px] leading-relaxed text-ink-faint">
                Use{" "}
                <span className="font-semibold text-ink-muted">
                  Add Data
                </span>{" "}
                in the toolbar to load a GIS dataset.
              </p>
            </div>
          ) : (
            layers.map((layer) => {
              const badge =
                getFileFormatBadge(
                  layer.filename
                );

              return (
                <LayerCard
                  key={layer.id}
                  layer={layer}
                  badge={badge}
                  isSelected={
                    selectedLayerId === layer.id
                  }
                  isReady={
                    layer.status === "ready" ||
                    layer.status === undefined
                  }
                  isExpanded={
                    expandedLayerDetails[
                    layer.id
                    ]
                  }
                  canDelete={canDelete}
                  onSelect={() =>
                    setSelectedLayerId(
                      layer.id
                    )
                  }
                  onToggleDetail={() =>
                    toggleDetail(layer.id)
                  }
                  onToggleVisible={
                    onToggleVisible
                  }
                  onOpacityChange={
                    onOpacityChange
                  }
                  onFlyTo={onFlyTo}
                  onDeleteRequest={(l) =>
                    setDeleteTarget({
                      type: "single",
                      layer: l,
                    })
                  }
                />
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}