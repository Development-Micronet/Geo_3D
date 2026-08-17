import React, { useState, useEffect } from "react";

export default function AoiPanel({
  onStartDrawing,
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
  const [selectedMode, setSelectedMode] = useState("bbox"); // "bbox", "point", "line", "polygon", "circle"
  const [copied, setCopied] = useState(false);
  const [strokeColor, setStrokeColor] = useState("#38bdf8");
  const [fillOpacity, setFillOpacity] = useState(0.2);

  // Trigger drawing mode whenever mode or color changes while panel is open
  useEffect(() => {
    if (onStartDrawing) {
      onStartDrawing(selectedMode, { strokeColor, fillOpacity });
    }
  }, [selectedMode, strokeColor, fillOpacity, onStartDrawing]);

  function handleModeChange(mode) {
    setSelectedMode(mode);
    if (onStartDrawing) {
      onStartDrawing(mode, { strokeColor, fillOpacity });
    }
  }

  function handleCopyData() {
    if (!aoiData) return;
    let textToCopy = "";
    if (aoiData.pointsList && aoiData.pointsList.length > 0) {
      textToCopy = aoiData.pointsList
        .map((p) => `Point ${p.id}: Lon ${p.lon}, Lat ${p.lat}, Elev ${p.elevation}m`)
        .join("\n");
    } else if (aoiData.bbox) {
      textToCopy = `BBOX: [${aoiData.bbox.join(", ")}]`;
    } else if (aoiData.coordinates) {
      textToCopy = JSON.stringify(aoiData.coordinates, null, 2);
    } else if (aoiData.center) {
      textToCopy = `Center: [${aoiData.center.join(", ")}]`;
    }
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const modes = [
    { id: "bbox", label: "Bounding Box", icon: "🔲", desc: "Click 2 opposite corners" },
    { id: "point", label: "Multi-Point", icon: "📍", desc: "Click on globe to mark points" },
    { id: "line", label: "Line", icon: "📏", desc: "Click vertices, 2x click to finish" },
    { id: "polygon", label: "Polygon", icon: "⬡", desc: "Click vertices, 2x click to close" },
    { id: "circle", label: "Circle", icon: "⭕", desc: "Click center, then radius" },
  ];

  const currentModeInfo = modes.find((m) => m.id === selectedMode) || modes[0];

  return (
    <div style={panelContainer}>
      {/* Header */}
      <div style={{ ...headerStyle, marginBottom: isMinimized ? 0 : 10 }}>
        <div style={titleStyle}>
          <span style={{ fontSize: 15 }}>✏️</span>
          <span>AOI &amp; Spatial Draw</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            style={minimizeBtnStyle}
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand Panel" : "Minimize Panel"}
          >
            {isMinimized ? "➕" : "➖"}
          </button>
          <button style={closeBtn} onClick={onClose} title="Close Panel">
            ✕
          </button>
        </div>
      </div>

      <div style={{ display: isMinimized ? "none" : "block" }}>

      {/* Mode Selector Tabs */}
      <div style={modeGrid}>
        {modes.map((m) => {
          const isActive = selectedMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              style={isActive ? activeModeBtn : modeBtn}
              title={m.desc}
            >
              <span style={{ fontSize: 13 }}>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Instructions & Drawing Status */}
      <div style={instructionBanner}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#90cdf4" }}>
          <span>{isDrawing ? "🟢 Marking Active" : "ℹ️ Mode"}</span>
        </div>
        <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 3 }}>
          {selectedMode === "point"
            ? "Click on globe to mark points. Each click adds a new numbered point marker."
            : currentModeInfo.desc}
        </div>
      </div>

      {/* Drawing Actions (Finish / Clear) */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(selectedMode === "polygon" || selectedMode === "line") && isDrawing && (
          <button
            style={primaryActionBtn}
            onClick={onFinishDrawing}
            title="Complete current polyline / polygon"
          >
            ✅ Finish Drawing
          </button>
        )}
        <button
          style={secondaryActionBtn}
          onClick={onClearAoi}
          title="Clear all drawings / points"
        >
          🗑️ Clear All
        </button>
      </div>

      {/* Color Customizer */}
      <div style={sectionBox}>
        <div style={sectionTitle}>🎨 Styling</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#38bdf8", "#f59e0b", "#10b981", "#ef4444", "#a855f7", "#ec4899"].map((c) => (
              <div
                key={c}
                onClick={() => setStrokeColor(c)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  backgroundColor: c,
                  cursor: "pointer",
                  border: strokeColor === c ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.3)",
                  boxShadow: strokeColor === c ? `0 0 8px ${c}` : "none",
                  transition: "all 0.15s ease",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#cbd5e1" }}>
            <span>Fill:</span>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={fillOpacity}
              onChange={(e) => setFillOpacity(parseFloat(e.target.value))}
              style={{ width: 55, accentColor: strokeColor }}
            />
          </div>
        </div>
      </div>

      {/* Results / Measurements Card */}
      {aoiData ? (
        <div style={resultCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "#38bdf8", textTransform: "uppercase" }}>
              📐 {aoiData.type || "Geometry Details"}
            </span>
            <span style={{ fontSize: 10, background: "rgba(56, 189, 248, 0.2)", padding: "1px 6px", borderRadius: 4, color: "#90cdf4" }}>
              {aoiData.pointCount ? `${aoiData.pointCount} Pts` : "Active"}
            </span>
          </div>

          <div style={metricGrid}>
            {/* Multi-Point list */}
            {aoiData.pointsList && aoiData.pointsList.length > 0 && (
              <div style={{ gridColumn: "span 2", marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>
                  Marked Points List ({aoiData.pointsList.length}):
                </div>
                <div style={{ maxHeight: 120, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {aoiData.pointsList.map((pt, idx) => (
                    <div
                      key={pt.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(255,255,255,0.05)",
                        padding: "3px 6px",
                        borderRadius: 4,
                        fontSize: 10.5,
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{pt.id}</span>
                      <span style={{ color: "#e2e8f0" }}>{pt.lon}, {pt.lat}</span>
                      <span style={{ color: "#94a3b8", fontSize: 9.5 }}>{pt.elevation}m</span>
                      {onRemovePoint && (
                        <button
                          onClick={() => onRemovePoint(idx)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#f87171",
                            cursor: "pointer",
                            fontSize: 11,
                            padding: "0 2px",
                          }}
                          title={`Delete Point ${pt.id}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aoiData.areaKm2 && (
              <div style={metricItem}>
                <span style={metricLabel}>Area:</span>
                <span style={metricValue}>{aoiData.areaKm2} km²</span>
              </div>
            )}
            {aoiData.areaAcres && (
              <div style={metricItem}>
                <span style={metricLabel}>Acres:</span>
                <span style={metricValue}>{aoiData.areaAcres} ac</span>
              </div>
            )}
            {aoiData.lengthKm && (
              <div style={metricItem}>
                <span style={metricLabel}>Length:</span>
                <span style={metricValue}>{aoiData.lengthKm} km</span>
              </div>
            )}
            {aoiData.perimeterKm && (
              <div style={metricItem}>
                <span style={metricLabel}>Perimeter:</span>
                <span style={metricValue}>{aoiData.perimeterKm} km</span>
              </div>
            )}
            {aoiData.elevation !== undefined && aoiData.elevation !== null && !aoiData.pointsList && (
              <div style={metricItem}>
                <span style={metricLabel}>Elevation (Z):</span>
                <span style={metricValue}>{aoiData.elevation} m</span>
              </div>
            )}
            {aoiData.center && !aoiData.pointsList && (
              <div style={metricItemFull}>
                <span style={metricLabel}>Centroid:</span>
                <span style={metricValueSmall}>
                  [{aoiData.center[0]}, {aoiData.center[1]}]
                </span>
              </div>
            )}
            {aoiData.bbox && (
              <div style={metricItemFull}>
                <span style={metricLabel}>Bounding Box [W, S, E, N]:</span>
                <span style={metricValueSmall}>
                  [{aoiData.bbox.join(", ")}]
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions for Results */}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button
              style={actionBtnStyle}
              onClick={onFlyToAoi}
              title="Fly camera to marked points/AOI"
            >
              ✈️ Fly To
            </button>
            <button
              style={actionBtnStyle}
              onClick={handleCopyData}
              title="Copy All Coordinates or BBOX"
            >
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
            <button
              style={{ ...actionBtnStyle, background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
              onClick={onExportGeoJson}
              title="Download GeoJSON format"
            >
              💾 Export
            </button>
          </div>
        </div>
      ) : (
        <div style={emptyState}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🎯</div>
          <div>
            {selectedMode === "point"
              ? "Click on the 3D globe to place multiple points."
              : "Select a drawing mode above and click on the 3D globe to measure & extract coordinates."}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

const panelContainer = {
  background: "rgba(0, 0, 0, 0.65)",
  color: "#fff",
  padding: "14px",
  borderRadius: 10,
  fontSize: 12,
  width: 290,
  maxHeight: "75vh",
  overflowY: "auto",
  border: "1px solid #ffffff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
  boxSizing: "border-box",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  paddingBottom: 8,
};

const titleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 700,
  fontSize: 13,
  color: "#90cdf4",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  textShadow: "1px 1px 2px rgba(0,0,0,0.9)",
};

const closeBtn = {
  background: "transparent",
  border: "none",
  color: "#a0aec0",
  fontSize: 14,
  cursor: "pointer",
  padding: "2px 6px",
  borderRadius: 4,
  transition: "all 0.2s ease",
};

const minimizeBtnStyle = {
  background: "transparent",
  border: "none",
  color: "#cbd5e1",
  cursor: "pointer",
  fontSize: 11,
  padding: "2px 6px",
  borderRadius: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s ease",
};

const modeGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
  marginBottom: 10,
};

const modeBtn = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  color: "#cbd5e1",
  padding: "7px 8px",
  borderRadius: 6,
  fontSize: 11,
  cursor: "pointer",
  fontWeight: 500,
  transition: "all 0.15s ease",
  justifyContent: "flex-start",
};

const activeModeBtn = {
  ...modeBtn,
  background: "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(37, 99, 235, 0.35))",
  border: "1px solid #38bdf8",
  color: "#38bdf8",
  fontWeight: 700,
  boxShadow: "0 0 10px rgba(56, 189, 248, 0.35)",
};

const instructionBanner = {
  background: "rgba(30, 41, 59, 0.7)",
  borderLeft: "3px solid #38bdf8",
  padding: "8px 10px",
  borderRadius: 4,
  marginBottom: 10,
  textShadow: "1px 1px 2px rgba(0,0,0,0.9)",
};

const primaryActionBtn = {
  flex: 1,
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
};

const secondaryActionBtn = {
  flex: 1,
  background: "rgba(239, 68, 68, 0.2)",
  color: "#fca5a5",
  border: "1px solid rgba(239, 68, 68, 0.4)",
  padding: "6px 10px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const sectionBox = {
  background: "rgba(30, 41, 59, 0.5)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  padding: "8px 10px",
  marginBottom: 10,
};

const sectionTitle = {
  fontSize: 10,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  marginBottom: 6,
  letterSpacing: "0.5px",
};

const resultCard = {
  background: "rgba(15, 23, 42, 0.8)",
  border: "1px solid rgba(56, 189, 248, 0.3)",
  borderRadius: 8,
  padding: "10px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
};

const metricItem = {
  display: "flex",
  flexDirection: "column",
  background: "rgba(255,255,255,0.04)",
  padding: "5px 7px",
  borderRadius: 4,
};

const metricItemFull = {
  ...metricItem,
  gridColumn: "span 2",
};

const metricLabel = {
  fontSize: 9.5,
  color: "#94a3b8",
  textTransform: "uppercase",
  fontWeight: 600,
};

const metricValue = {
  fontSize: 12,
  fontWeight: 700,
  color: "#f8fafc",
  marginTop: 1,
};

const metricValueSmall = {
  fontSize: 10.5,
  fontWeight: 600,
  color: "#38bdf8",
  wordBreak: "break-all",
  marginTop: 1,
};

const actionBtnStyle = {
  flex: 1,
  background: "rgba(255, 255, 255, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  color: "#fff",
  padding: "5px 8px",
  borderRadius: 5,
  fontSize: 10.5,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.15s ease",
};

const emptyState = {
  textAlign: "center",
  color: "#cbd5e1",
  padding: "14px 8px",
  fontSize: 11,
  lineHeight: 1.4,
  background: "rgba(255,255,255,0.02)",
  borderRadius: 6,
  border: "1px dashed rgba(255,255,255,0.12)",
  textShadow: "1px 1px 2px rgba(0,0,0,0.9)",
};
