import React, { useState, useEffect, useRef } from "react";

export const HISTORICAL_WAYBACK_YEARS = [
  { year: 2014, releaseId: "WB_2014_R01", label: "2014 Snapshot" },
  { year: 2016, releaseId: "WB_2016_R01", label: "2016 Snapshot" },
  { year: 2018, releaseId: "WB_2018_R01", label: "2018 Snapshot" },
  { year: 2020, releaseId: "WB_2020_R01", label: "2020 Snapshot" },
  { year: 2022, releaseId: "WB_2022_R01", label: "2022 Snapshot" },
  { year: 2024, releaseId: "WB_2024_R01", label: "2024 Snapshot" },
  { year: 2025, releaseId: "WB_2025_R01", label: "2025 Snapshot" },
  { year: 2026, releaseId: "latest", label: "2026 (Present)" },
];

export const HISTORICAL_MAP_MODES = [
  { id: "wayback", label: "🛰️ Satellite Wayback", desc: "Esri World Imagery Archive (2014 - Present)" },
  { id: "usgsTopo", label: "🗺️ USGS Historical Topo", desc: "USGS Historical Topographic Archive" },
  { id: "nasaBlueMarble", label: "🌍 NASA Blue Marble", desc: "NASA Earth Observation Satellite Archive" },
  { id: "openHistory", label: "📜 Vintage Cartography", desc: "OpenHistoricalMap Heritage Project" },
];

export default function HistoryTimeline({
  onYearChange,
  onModeChange,
  onOpacityChange,
  onDrawAoi,
  onFinishPolygon,
  onClearAoi,
  aoiInfo,
  isDrawingAoi,
  onClose,
}) {
  const [selectedMode, setSelectedMode] = useState("wayback");
  const [yearIndex, setYearIndex] = useState(HISTORICAL_WAYBACK_YEARS.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [opacity, setOpacity] = useState(1.0);
  const [playSpeed, setPlaySpeed] = useState(2000); // 2 seconds per frame
  const [drawType, setDrawType] = useState("polygon"); // 'polygon' | 'rectangle' | 'circle'

  const playTimerRef = useRef(null);
  const currentSnapshot = HISTORICAL_WAYBACK_YEARS[yearIndex];

  // Notify parent on change
  useEffect(() => {
    onModeChange && onModeChange(selectedMode);
  }, [selectedMode, onModeChange]);

  useEffect(() => {
    if (selectedMode === "wayback") {
      onYearChange && onYearChange(currentSnapshot.year, currentSnapshot.releaseId);
    }
  }, [yearIndex, selectedMode, currentSnapshot, onYearChange]);

  useEffect(() => {
    onOpacityChange && onOpacityChange(opacity);
  }, [opacity, onOpacityChange]);

  // Animation player loop
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setYearIndex((prev) => (prev + 1) % HISTORICAL_WAYBACK_YEARS.length);
      }, playSpeed);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playSpeed]);

  function handleStartDraw(type) {
    setDrawType(type);
    onDrawAoi && onDrawAoi(type);
  }

  return (
    <div style={containerStyle}>
      {/* Header Bar */}
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⏱️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#fff", letterSpacing: "0.5px" }}>
              HISTORICAL TIME MACHINE
            </div>
            <div style={{ fontSize: 10, color: "#90cdf4" }}>
              {selectedMode === "wayback"
                ? `Viewing year ${currentSnapshot.year} Satellite Snapshot`
                : HISTORICAL_MAP_MODES.find((m) => m.id === selectedMode)?.desc}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Opacity Control */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#cbd5e0" }}>Fade:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={{ width: 70, cursor: "pointer" }}
              title="Adjust Historical Layer Opacity"
            />
            <span style={{ fontSize: 10, color: "#a0aec0", width: 30 }}>{Math.round(opacity * 100)}%</span>
          </div>

          <button onClick={onClose} style={closeBtn} title="Close History Map">
            ✕
          </button>
        </div>
      </div>

      {/* Mode Selector & AOI Draw Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={modeGroup}>
          {HISTORICAL_MAP_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              style={selectedMode === mode.id ? activeModeBtn : modeBtn}
              title={mode.desc}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* AOI Drawing Tool Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {!isDrawingAoi ? (
            <>
              <button
                onClick={() => handleStartDraw("polygon")}
                style={aoiBtn}
                title="Click point-by-point on globe, double-click to close"
              >
                ⬡ Draw Polygon
              </button>

              <button
                onClick={() => handleStartDraw("rectangle")}
                style={aoiBtn}
                title="Click 2 opposite corners on globe"
              >
                🔲 Box
              </button>

              <button
                onClick={() => handleStartDraw("circle")}
                style={aoiBtn}
                title="Click center and radius on globe"
              >
                ⭕ Circle
              </button>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#38bdf8", fontWeight: 600 }}>
                {drawType === "polygon"
                  ? "🎯 Click points on globe (Double-Click or click Finish)"
                  : drawType === "rectangle"
                  ? "🎯 Click 2 opposite corners on globe..."
                  : "🎯 Click Center, then click Radius on globe..."}
              </span>

              {drawType === "polygon" && (
                <button onClick={onFinishPolygon} style={finishBtn} title="Finish Polygon AOI">
                  ✅ Finish
                </button>
              )}

              <button onClick={onClearAoi} style={clearAoiBtn} title="Cancel Drawing">
                ✕ Cancel
              </button>
            </div>
          )}

          {aoiInfo && !isDrawingAoi && (
            <button onClick={onClearAoi} style={clearAoiBtn} title="Remove drawn AOI">
              🗑️ Clear AOI
            </button>
          )}
        </div>
      </div>

      {/* AOI Active Info Banner */}
      {aoiInfo && (
        <div style={aoiBanner}>
          <span>📐 <b>AOI Region:</b> {aoiInfo.areaKm2} km²</span>
          <span>📍 <b>Center:</b> {aoiInfo.center[1]}° N, {aoiInfo.center[0]}° E</span>
          <span style={{ color: "#38bdf8" }}>✨ Historical Time-Lapse active in this zone</span>
        </div>
      )}

      {/* Wayback Time Slider Section */}
      {selectedMode === "wayback" && (
        <div style={{ marginTop: 10 }}>
          {/* Slider & Year Bubbles */}
          <div style={{ position: "relative", padding: "0 10px", marginBottom: 6 }}>
            <input
              type="range"
              min="0"
              max={HISTORICAL_WAYBACK_YEARS.length - 1}
              step="1"
              value={yearIndex}
              onChange={(e) => {
                setYearIndex(parseInt(e.target.value));
                setIsPlaying(false);
              }}
              style={sliderStyle}
            />

            {/* Year Labels */}
            <div style={ticksContainer}>
              {HISTORICAL_WAYBACK_YEARS.map((item, idx) => (
                <div
                  key={item.year}
                  onClick={() => {
                    setYearIndex(idx);
                    setIsPlaying(false);
                  }}
                  style={{
                    ...tickStyle,
                    color: idx === yearIndex ? "#38bdf8" : "#94a3b8",
                    fontWeight: idx === yearIndex ? 800 : 500,
                    transform: idx === yearIndex ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  <div style={{ fontSize: 11 }}>{item.year}</div>
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: idx === yearIndex ? "#38bdf8" : "rgba(255,255,255,0.3)",
                      margin: "2px auto 0",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Player Controls Bar */}
          <div style={playerBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={playBtn}
                title={isPlaying ? "Pause Time-Lapse" : "Play Historical Time-Lapse"}
              >
                {isPlaying ? "⏸️ Pause" : "▶️ Play Time-Lapse"}
              </button>

              <button
                onClick={() => setYearIndex((prev) => Math.max(0, prev - 1))}
                disabled={yearIndex === 0}
                style={navBtn}
                title="Previous Snapshot"
              >
                ⏮️
              </button>

              <button
                onClick={() => setYearIndex((prev) => Math.min(HISTORICAL_WAYBACK_YEARS.length - 1, prev + 1))}
                disabled={yearIndex === HISTORICAL_WAYBACK_YEARS.length - 1}
                style={navBtn}
                title="Next Snapshot"
              >
                ⏭️
              </button>

              <span style={{ fontSize: 11, color: "#64748b", marginLeft: 4 }}>Speed:</span>
              <select
                value={playSpeed}
                onChange={(e) => setPlaySpeed(parseInt(e.target.value))}
                style={speedSelect}
              >
                <option value={3000}>0.5x</option>
                <option value={2000}>1.0x</option>
                <option value={1000}>2.0x</option>
                <option value={600}>3.0x Fast</option>
              </select>
            </div>

            <div style={activeBadge}>
              Snapshot: <b style={{ color: "#38bdf8", marginLeft: 4 }}>{currentSnapshot.year}</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const containerStyle = {
  position: "absolute",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 120,
  width: "92%",
  maxWidth: 740,
  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94))",
  borderRadius: 14,
  padding: "14px 18px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.65)",
  border: "1px solid rgba(255,255,255,0.16)",
  color: "#fff",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  paddingBottom: 8,
};

const closeBtn = {
  background: "rgba(255,255,255,0.08)",
  border: "none",
  color: "#94a3b8",
  borderRadius: 6,
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: 12,
};

const modeGroup = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const modeBtn = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#cbd5e0",
  padding: "5px 10px",
  borderRadius: 6,
  fontSize: 11,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const activeModeBtn = {
  ...modeBtn,
  background: "linear-gradient(135deg, #0284c7, #0369a1)",
  borderColor: "#38bdf8",
  color: "#fff",
  fontWeight: 700,
  boxShadow: "0 0 10px rgba(56, 189, 248, 0.4)",
};

const aoiBtn = {
  background: "linear-gradient(135deg, #0d9488, #0f766e)",
  color: "#fff",
  border: "1px solid #14b8a6",
  borderRadius: 6,
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(13, 148, 136, 0.4)",
  transition: "all 0.2s ease",
};

const finishBtn = {
  background: "linear-gradient(135deg, #16a34a, #15803d)",
  color: "#fff",
  border: "1px solid #22c55e",
  borderRadius: 6,
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(34, 197, 94, 0.4)",
};

const clearAoiBtn = {
  background: "rgba(225, 29, 72, 0.8)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "5px 8px",
  fontSize: 11,
  cursor: "pointer",
};

const aoiBanner = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  background: "rgba(13, 148, 136, 0.2)",
  border: "1px solid rgba(20, 184, 166, 0.4)",
  padding: "6px 12px",
  borderRadius: 8,
  fontSize: 11,
  marginTop: 8,
  color: "#ccfbf1",
};

const sliderStyle = {
  width: "100%",
  height: 6,
  borderRadius: 3,
  background: "linear-gradient(to right, #0284c7, #38bdf8)",
  outline: "none",
  cursor: "pointer",
};

const ticksContainer = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 6,
};

const tickStyle = {
  cursor: "pointer",
  textAlign: "center",
  transition: "all 0.2s ease",
};

const playerBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 10,
  paddingTop: 8,
  borderTop: "1px solid rgba(255,255,255,0.06)",
};

const playBtn = {
  background: "linear-gradient(135deg, #0284c7, #2563eb)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(2, 132, 199, 0.4)",
};

const navBtn = {
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 11,
  cursor: "pointer",
};

const speedSelect = {
  background: "rgba(15, 23, 42, 0.8)",
  color: "#cbd5e0",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  padding: "3px 6px",
  fontSize: 11,
  cursor: "pointer",
};

const activeBadge = {
  background: "rgba(2, 132, 199, 0.2)",
  border: "1px solid rgba(56, 189, 248, 0.4)",
  padding: "4px 10px",
  borderRadius: 6,
  fontSize: 11,
  color: "#e2e8f0",
};
