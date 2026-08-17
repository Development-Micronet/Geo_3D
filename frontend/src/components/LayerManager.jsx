import React, { useState } from "react";
import { getFileFormatBadge } from "../services/formats.js";

export default function LayerManager({
  layers,
  uploadProgress,
  onToggleVisible,
  onOpacityChange,
  onFlyTo,
  onDelete,
  viewerRef,
  activeSidebarTab = "layers",
  setActiveSidebarTab,
}) {
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [expandedLayerDetails, setExpandedLayerDetails] = useState({});

  function toggleDetail(id) {
    setExpandedLayerDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // When panel is closed, show only the floating ◫ icon button at left: 0
  if (!activeSidebarTab) {
    return (
      <button
        style={closedFloatingIconBtnStyle}
        onClick={() => setActiveSidebarTab("layers")}
        title="Open Layers Panel"
      >
        ◫
      </button>
    );
  }

  // When panel is open, render the Layers Panel starting completely from left: 0
  return (
    <div style={expandedPanelStyle}>
      {/* Panel Header */}
      <div style={panelHeaderStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            style={headerToggleIconStyle}
            onClick={() => setActiveSidebarTab(null)}
            title="Collapse Layers Panel"
          >
            ◫
          </button>
          <div style={panelTitleStyle}>Layers ({layers.length})</div>
        </div>

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button
            style={headerIconBtnStyle}
            onClick={() => setActiveSidebarTab(null)}
            title="Collapse Panel"
          >
            ◧
          </button>
        </div>
      </div>

      {/* Upload Progress Banner */}
      {uploadProgress !== null && uploadProgress !== undefined && (
        <div style={uploadProgressBannerStyle}>
          ⏳ Uploading Dataset… {typeof uploadProgress === "number" ? `${uploadProgress}%` : ""}
        </div>
      )}

      {/* ─── LAYERS LIST ─── */}
      <div style={scrollListContainerStyle}>
        {/* Loaded GIS Layers added by user */}
        {layers.map((layer) => {
          const badge = getFileFormatBadge(layer.filename);
          const isSelected = selectedLayerId === layer.id;
          const isReady = layer.status === "ready" || layer.status === undefined;
          const isExpanded = expandedLayerDetails[layer.id];

          let layerIcon = "⬜"; // default 3D tile / object icon
          if (badge === "GeoJSON" || badge === "KML" || badge === "KMZ" || badge === "SHP") {
            layerIcon = "📐";
          } else if (badge === "DSM" || badge === "Raster" || badge === "WMTS") {
            layerIcon = "🖼️";
          }

          return (
            <div
              key={layer.id}
              onClick={() => setSelectedLayerId(layer.id)}
              style={{
                ...layerCardStyle,
                ...(isSelected ? activeLayerCardStyle : {}),
              }}
            >
              {/* Layer Header Row */}
              <div style={layerCardHeaderRow}>
                {/* Drag Handle */}
                <span style={dragHandleStyle} title="Drag to reorder layer">
                  ⠿
                </span>

                {/* Visibility Check / Eye Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisible(layer.id, layer.visible === false ? true : false);
                  }}
                  style={eyeBtnStyle}
                  title={layer.visible !== false ? "Hide layer" : "Show layer"}
                >
                  {layer.visible !== false ? "👁️" : "👁️‍🗨️"}
                </button>

                {/* Layer Type Icon */}
                <span style={{ fontSize: 13, display: "flex", alignItems: "center" }}>
                  {layerIcon}
                </span>

                {/* Title */}
                <span style={layerTitleStyle} title={layer.filename}>
                  {layer.filename || layer.name || "3D Layer"}
                </span>

                {/* Badge */}
                <span style={badgeStyle}>{badge}</span>
              </div>

              {/* Opacity Control Slider */}
              {isReady && (
                <div style={opacityRowStyle} onClick={(e) => e.stopPropagation()}>
                  <span style={opacityLabelStyle}>Opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={layer.opacity !== undefined ? layer.opacity : 1}
                    onChange={(e) => onOpacityChange(layer.id, parseFloat(e.target.value))}
                    style={rangeInputStyle}
                  />
                  <span style={opacityValueStyle}>
                    {(layer.opacity !== undefined ? layer.opacity : 1).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Sub-toolbar Action Icons */}
              {isReady && (
                <div style={subToolbarStyle} onClick={(e) => e.stopPropagation()}>
                  <button
                    style={subToolBtnStyle}
                    onClick={() => toggleDetail(layer.id)}
                    title={isExpanded ? "Collapse layer options" : "Expand layer options"}
                  >
                    {isExpanded ? "▲" : "▼"}
                  </button>
                  <button
                    style={subToolBtnStyle}
                    onClick={() => onFlyTo(layer.id)}
                    title="Zoom / Fly camera to layer extent"
                  >
                    🔍 Zoom To Layer
                  </button>
                  <button
                    style={{ ...subToolBtnStyle, color: "#ef4444" }}
                    onClick={() => onDelete(layer.id)}
                    title="Remove layer"
                  >
                    🗑️
                  </button>
                </div>
              )}

              {/* Status Messages */}
              {layer.status === "extracting" && (
                <div style={{ color: "#fbbf24", fontSize: 10, marginTop: 4, paddingLeft: 24 }}>
                  ⏳ Extracting &amp; preparing I3S 3D Tiles...
                </div>
              )}
              {layer.status === "uploaded" && (
                <div style={{ color: "#fbbf24", fontSize: 10, marginTop: 4, paddingLeft: 24 }}>
                  ⏳ Processing uploaded file...
                </div>
              )}
              {layer.status === "error" && (
                <div style={{ color: "#ef4444", fontSize: 10, marginTop: 4, paddingLeft: 24 }}>
                  ⚠️ {layer.error || "Failed to load layer"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Styles ─── */

const closedFloatingIconBtnStyle = {
  position: "absolute",
  top: 48,
  left: 0,
  width: 44,
  height: 44,
  background: "#111625",
  border: "none",
  borderRight: "1px solid rgba(255, 255, 255, 0.14)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: "0 0 6px 0",
  color: "#ffffff",
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "2px 2px 12px rgba(0,0,0,0.5)",
  pointerEvents: "auto",
  transition: "all 0.2s ease",
  zIndex: 160,
};

const expandedPanelStyle = {
  position: "absolute",
  top: 48,
  left: 0,
  bottom: 0,
  width: 350,
  background: "#0c101c",
  borderRight: "1px solid rgba(255, 255, 255, 0.14)",
  boxShadow: "10px 0 30px rgba(0,0,0,0.6)",
  display: "flex",
  flexDirection: "column",
  pointerEvents: "auto",
  overflow: "hidden",
  zIndex: 155,
};

const panelHeaderStyle = {
  height: 46,
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(18, 24, 40, 0.9)",
};

const headerToggleIconStyle = {
  background: "#38bdf8",
  border: "none",
  borderRadius: 4,
  color: "#0f172a",
  fontSize: 14,
  fontWeight: "bold",
  cursor: "pointer",
  padding: "3px 6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const panelTitleStyle = {
  fontSize: 13.5,
  fontWeight: 800,
  color: "#ffffff",
  letterSpacing: "0.3px",
};

const headerIconBtnStyle = {
  background: "transparent",
  border: "none",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 13,
  padding: "4px 5px",
  borderRadius: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s ease",
};

const uploadProgressBannerStyle = {
  background: "rgba(56, 189, 248, 0.9)",
  color: "#fff",
  padding: "6px 8px",
  fontSize: 10.5,
  fontWeight: 600,
  textAlign: "center",
};

const scrollListContainerStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "10px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const layerCardStyle = {
  background: "rgba(20, 27, 44, 0.7)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 8,
  padding: "10px 12px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const activeLayerCardStyle = {
  border: "1.5px solid #3b82f6",
  background: "rgba(59, 130, 246, 0.12)",
  boxShadow: "0 0 12px rgba(59, 130, 246, 0.25)",
};

const layerCardHeaderRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const dragHandleStyle = {
  color: "#64748b",
  fontSize: 14,
  cursor: "grab",
  userSelect: "none",
};

const eyeBtnStyle = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  padding: 0,
  display: "flex",
  alignItems: "center",
};

const layerTitleStyle = {
  flex: 1,
  fontSize: 13,
  fontWeight: 700,
  color: "#ffffff",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const badgeStyle = {
  fontSize: 8.5,
  fontWeight: 800,
  letterSpacing: "0.5px",
  color: "#94a3b8",
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 3,
  padding: "1px 5px",
  textTransform: "uppercase",
};

const opacityRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 2,
};

const opacityLabelStyle = {
  fontSize: 10,
  color: "#94a3b8",
  fontWeight: 600,
  width: 42,
};

const rangeInputStyle = {
  flex: 1,
  height: 4,
  borderRadius: 2,
  accentColor: "#3b82f6",
  cursor: "pointer",
};

const opacityValueStyle = {
  fontSize: 10.5,
  fontWeight: 700,
  color: "#f8fafc",
  fontFamily: "monospace",
  width: 30,
  textAlign: "right",
};

const subToolbarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 4,
  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
  marginTop: 2,
};

const subToolBtnStyle = {
  background: "transparent",
  border: "none",
  color: "#94a3b8",
  fontSize: 11,
  cursor: "pointer",
  padding: "2px 5px",
  borderRadius: 4,
  transition: "all 0.15s ease",
};

const panelBottomSearchContainerStyle = {
  padding: 10,
  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(15, 22, 36, 0.95)",
};
