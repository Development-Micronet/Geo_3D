import React, { useState, useEffect, useRef } from "react";

// ==========================================
// 1. ☀️ DAYLIGHT & SUN SHADOWS PANEL
// ==========================================
export function DaylightPanel({ viewerRef, onClose }) {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [shadows, setShadows] = useState(true);
  const [ambientOcclusion, setAmbientOcclusion] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const playIntervalRef = useRef(null);

  useEffect(() => {
    viewerRef.current?.setDaylightTime?.(hour, minute, shadows, ambientOcclusion);
  }, [hour, minute, shadows, ambientOcclusion, viewerRef]);

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setMinute((prev) => {
          if (prev + 15 >= 60) {
            setHour((h) => (h + 1) % 24);
            return (prev + 15) % 60;
          }
          return prev + 15;
        });
      }, 300);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying]);

  const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const isDay = hour >= 6 && hour < 18;

  const presets = [
    { label: "🌅 Dawn", h: 6, m: 0 },
    { label: "☀️ Noon", h: 12, m: 0 },
    { label: "🌇 Dusk", h: 18, m: 0 },
    { label: "🌙 Night", h: 22, m: 0 },
  ];

  return (
    <div style={panelContainer}>
      <PanelHeader
        icon="☀️"
        title="Daylight"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <div style={{ display: isMinimized ? "none" : "block" }}>
        {/* Time Display & Play Control */}
        <div style={controlBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>{isDay ? "☀️" : "🌙"}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#90cdf4", letterSpacing: 1 }}>{timeString}</span>
            </div>
            <button
              style={isPlaying ? activePlayBtn : playBtn}
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause Sun Animation" : "Play Sun Simulation"}
            >
              {isPlaying ? "⏸️ Pause" : "▶️ Play"}
            </button>
          </div>

          {/* Time of Day Slider */}
          <div style={{ marginBottom: 10 }}>
            <div style={labelRow}>
              <span>Time of Day:</span>
              <span style={{ color: "#38bdf8" }}>{timeString}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1439"
              step="5"
              value={hour * 60 + minute}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setHour(Math.floor(val / 60));
                setMinute(val % 60);
              }}
              style={sliderStyle}
            />
          </div>

          {/* Quick Presets */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 10 }}>
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setHour(p.h);
                  setMinute(p.m);
                }}
                style={hour === p.h && minute === p.m ? activePresetBtn : presetBtn}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shadow & Lighting Options */}
        <div style={controlBox}>
          <label style={checkboxRow}>
            <input
              type="checkbox"
              checked={shadows}
              onChange={(e) => setShadows(e.target.checked)}
              style={{ accentColor: "#3182ce" }}
            />
            <span style={{ fontSize: 11, fontWeight: 500, color: "#ffffff", textShadow: "1px 1px 2px rgba(0,0,0,0.9)" }}>Direct 3D Shadows</span>
          </label>
          <label style={{ ...checkboxRow, marginTop: 6 }}>
            <input
              type="checkbox"
              checked={ambientOcclusion}
              onChange={(e) => setAmbientOcclusion(e.target.checked)}
              style={{ accentColor: "#3182ce" }}
            />
            <span style={{ fontSize: 11, fontWeight: 500, color: "#ffffff", textShadow: "1px 1px 2px rgba(0,0,0,0.9)" }}>Ambient Occlusion</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. ⛅ ATMOSPHERIC WEATHER PANEL
// ==========================================
export function WeatherPanel({ viewerRef, onClose }) {
  const [weatherType, setWeatherType] = useState("sunny");
  const [cloudCover, setCloudCover] = useState(0.3);
  const [precipitation, setPrecipitation] = useState(0.5);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    viewerRef.current?.setWeather?.(weatherType, cloudCover, precipitation);
  }, [weatherType, cloudCover, precipitation, viewerRef]);

  const weatherModes = [
    { id: "sunny", label: "Sunny", icon: "☀️" },
    { id: "cloudy", label: "Cloudy", icon: "⛅" },
    { id: "rainy", label: "Rainy", icon: "🌧️" },
    { id: "snowy", label: "Snowy", icon: "❄️" },
    { id: "foggy", label: "Foggy", icon: "🌫️" },
  ];

  return (
    <div style={panelContainer}>
      <PanelHeader
        icon="⛅"
        title="Weather"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <div style={{ display: isMinimized ? "none" : "block" }}>
        {/* Weather Selector Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5, marginBottom: 12 }}>
          {weatherModes.map((w) => {
            const isActive = weatherType === w.id;
            return (
              <button
                key={w.id}
                onClick={() => setWeatherType(w.id)}
                style={isActive ? activeModeGridBtn : modeGridBtn}
              >
                <span style={{ fontSize: 15 }}>{w.icon}</span>
                <span style={{ fontSize: 10.5 }}>{w.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sliders */}
        <div style={controlBox}>
          <div style={{ marginBottom: 10 }}>
            <div style={labelRow}>
              <span>Cloud Cover:</span>
              <span style={{ color: "#38bdf8" }}>{Math.round(cloudCover * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={cloudCover}
              onChange={(e) => setCloudCover(parseFloat(e.target.value))}
              style={sliderStyle}
            />
          </div>

          {(weatherType === "rainy" || weatherType === "snowy" || weatherType === "foggy") && (
            <div>
              <div style={labelRow}>
                <span>{weatherType === "foggy" ? "Fog Density:" : "Precipitation:"}</span>
                <span style={{ color: "#38bdf8" }}>{Math.round(precipitation * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={precipitation}
                onChange={(e) => setPrecipitation(parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </div>
          )}
        </div>

        <div style={infoBox}>
          <span>💡 Atmospheric weather effects are rendered dynamically in real-time across the 3D globe.</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. 🔪 3D SLICE TOOL PANEL
// ==========================================
export function SlicePanel({ viewerRef, onClose }) {
  const containerRef = useRef(null);
  const sliceRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    let t;
    if (containerRef.current && viewerRef.current?.startSlice) {
      const slice = viewerRef.current.startSlice(containerRef.current);
      sliceRef.current = slice;

      // Auto-trigger slicing drawing directly on load
      t = setTimeout(() => {
        if (slice?.viewModel) {
          slice.viewModel.start();
        }
      }, 150);
    }
    return () => {
      if (t) clearTimeout(t);
      viewerRef.current?.clearSlice?.();
    };
  }, [viewerRef]);

  function handleTriggerNewSlice() {
    if (sliceRef.current?.viewModel) {
      sliceRef.current.viewModel.start();
    } else if (viewerRef.current?.startSlice) {
      const slice = viewerRef.current.startSlice(containerRef.current);
      sliceRef.current = slice;
      if (slice?.viewModel) {
        slice.viewModel.start();
      }
    }
  }

  function handleClear() {
    if (sliceRef.current?.viewModel) {
      sliceRef.current.viewModel.clear();
    }
    viewerRef.current?.clearSlice?.();
  }

  return (
    <div style={panelContainer} className="calcite-mode-dark esri-component">
      <PanelHeader
        icon="🔪"
        title="3D Slicing"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <div style={{ display: isMinimized ? "none" : "block" }}>
        {/* <div style={instructionBox}>
          <span>Click <b>New Slice</b> then click and drag on 3D objects to inspect internal cross-sections.</span>
        </div> */}

        <div style={{ marginBottom: 10 }}>
          <button
            style={{ ...dangerBtn, width: "100%" }}
            onClick={handleClear}
            title="Remove slice plane"
          >
            🗑️ Clear
          </button>
        </div>

        <div
          ref={containerRef}
          style={{
            width: "100%",
            minHeight: 140,
            display: "flex",
            flexDirection: "column",
          }}
        />
      </div>
    </div>
  );
}

// ==========================================
// 4. 👁️ 3D LINE OF SIGHT PANEL
// ==========================================
export function LineOfSightPanel({ viewerRef, onClose }) {
  const containerRef = useRef(null);
  const losRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    let t;
    if (containerRef.current && viewerRef.current?.startLineOfSight) {
      const los = viewerRef.current.startLineOfSight(containerRef.current);
      losRef.current = los;

      // Auto-trigger Line of Sight analysis start directly on load
      t = setTimeout(() => {
        if (los?.viewModel) {
          los.viewModel.start();
        }
      }, 150);
    }
    return () => {
      if (t) clearTimeout(t);
      viewerRef.current?.clearLineOfSight?.();
    };
  }, [viewerRef]);

  function handleStartLos() {
    if (losRef.current?.viewModel) {
      losRef.current.viewModel.start();
    } else if (viewerRef.current?.startLineOfSight) {
      const los = viewerRef.current.startLineOfSight(containerRef.current);
      losRef.current = los;
      if (los?.viewModel) los.viewModel.start();
    }
  }

  function handleClearLos() {
    if (losRef.current?.viewModel) {
      losRef.current.viewModel.clear();
    }
    viewerRef.current?.clearLineOfSight?.();
  }

  return (
    <div style={panelContainer} className="calcite-mode-dark esri-component">
      <PanelHeader
        icon="👁️"
        title="Line of Sight"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <div style={{ display: isMinimized ? "none" : "block" }}>
        {/* <div style={instructionBox}>
          <span>Click <b>New Analysis</b>, then click an observer point, followed by one or more target points.</span>
        </div> */}

        <div style={{ marginBottom: 10 }}>
          <button
            style={{ ...dangerBtn, width: "100%" }}
            onClick={handleClearLos}
            title="Clear sight lines"
          >
            🗑️ Clear
          </button>
        </div>

        <div
          ref={containerRef}
          style={{
            width: "100%",
            minHeight: 120,
            display: "flex",
            flexDirection: "column",
          }}
        />
      </div>
    </div>
  );
}

// ==========================================
// 5. 📏 3D DISTANCE MEASUREMENT PANEL
// ==========================================
export function DistancePanel({ viewerRef, onClose }) {
  const containerRef = useRef(null);
  const distRef = useRef(null);
  const [unit, setUnit] = useState("metric");
  const [measurement, setMeasurement] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const distanceUnits = [
    { value: "metric", label: "Metric (Auto)" },
    { value: "meters", label: "Meters (m)" },
    { value: "kilometers", label: "Kilometers (km)" },
    { value: "imperial", label: "Imperial (Auto)" },
    { value: "feet", label: "Feet (ft)" },
    { value: "yards", label: "Yards (yd)" },
    { value: "miles", label: "Miles (mi)" },
    { value: "nautical-miles", label: "Nautical Miles (NM)" },
  ];

  useEffect(() => {
    let t;
    if (containerRef.current && viewerRef.current?.startDistanceMeasurement) {
      const dist = viewerRef.current.startDistanceMeasurement(
        unit,
        containerRef.current,
        (data) => setMeasurement(data)
      );
      distRef.current = dist;

      t = setTimeout(() => {
        if (dist?.viewModel) {
          dist.viewModel.start();
        }
      }, 150);
    }
    return () => {
      if (t) clearTimeout(t);
      viewerRef.current?.clearDistanceMeasurement?.();
    };
  }, [viewerRef]);

  function handleStart() {
    setMeasurement(null);
    if (distRef.current?.viewModel) {
      distRef.current.viewModel.start();
    } else if (viewerRef.current?.startDistanceMeasurement) {
      const dist = viewerRef.current.startDistanceMeasurement(
        unit,
        containerRef.current,
        (data) => setMeasurement(data)
      );
      distRef.current = dist;
      if (dist?.viewModel) dist.viewModel.start();
    }
  }

  function handleClear() {
    setMeasurement(null);
    if (distRef.current?.viewModel) {
      distRef.current.viewModel.clear();
    }
    viewerRef.current?.clearDistanceMeasurement?.();
  }

  return (
    <div style={panelContainer} className="calcite-mode-dark esri-component">
      <PanelHeader
        icon="📏"
        title="Distance"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <div style={{ display: isMinimized ? "none" : "block" }}>
        {/* Measurement Unit Selector Box */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 10, color: "#90cdf4", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>
            Measurement Unit:
          </label>
          <select
            value={unit}
            onChange={(e) => {
              const selected = e.target.value;
              setUnit(selected);
              viewerRef.current?.setDistanceUnit?.(selected);
            }}
            style={selectStyle}
          >
            {distanceUnits.map((u) => (
              <option key={u.value} value={u.value} style={{ background: "#1a202c", color: "#fff" }}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        {/* Real-Time 3 Distance Measurement Values Display Box */}
        {measurement && (
          <div style={resultBoxStyle}>
            <div style={resultRowStyle}>
              <span style={resultLabelStyle}>📏 Direct 3D Distance:</span>
              <span style={resultValueStyle}>{measurement.directDistanceText || "--"}</span>
            </div>
            <div style={resultRowStyle}>
              <span style={resultLabelStyle}>↔️ Horizontal Distance:</span>
              <span style={resultValueStyle}>{measurement.horizontalDistanceText || "--"}</span>
            </div>
            <div style={resultRowStyle}>
              <span style={resultLabelStyle}>↕️ Vertical Difference (ΔZ):</span>
              <span style={resultValueStyle}>{measurement.verticalDistanceText || "--"}</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button
            style={primaryBtn}
            onClick={handleStart}
            title="Start new distance measurement"
          >
            📐 New Measurement
          </button>
          <button
            style={dangerBtn}
            onClick={handleClear}
            title="Clear measurement"
          >
            🗑️ Clear
          </button>
        </div>

        <div
          ref={containerRef}
          style={{
            width: "100%",
            minHeight: 140,
            display: "flex",
            flexDirection: "column",
          }}
        />
      </div>
    </div>
  );
}

// ==========================================
// 6. 📐 3D AREA MEASUREMENT PANEL
// ==========================================
export function AreaPanel({ viewerRef, onClose }) {
  const containerRef = useRef(null);
  const areaRef = useRef(null);
  const [unit, setUnit] = useState("square-meters");
  const [measurement, setMeasurement] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const areaUnits = [
    { value: "square-meters", label: "Square Meters (m²)" },
    { value: "square-kilometers", label: "Square Kilometers (km²)" },
    { value: "hectares", label: "Hectares (ha)" },
    { value: "acres", label: "Acres (ac)" },
    { value: "square-feet", label: "Square Feet (ft²)" },
    { value: "square-yards", label: "Square Yards (yd²)" },
    { value: "square-miles", label: "Square Miles (mi²)" },
  ];

  useEffect(() => {
    let t;
    if (containerRef.current && viewerRef.current?.startAreaMeasurement) {
      const area = viewerRef.current.startAreaMeasurement(
        unit,
        containerRef.current,
        (data) => setMeasurement(data)
      );
      areaRef.current = area;

      t = setTimeout(() => {
        if (area?.viewModel) {
          area.viewModel.start();
        }
      }, 150);
    }
    return () => {
      if (t) clearTimeout(t);
      viewerRef.current?.clearAreaMeasurement?.();
    };
  }, [viewerRef]);

  function handleStart() {
    setMeasurement(null);
    if (areaRef.current?.viewModel) {
      areaRef.current.viewModel.start();
    } else if (viewerRef.current?.startAreaMeasurement) {
      const area = viewerRef.current.startAreaMeasurement(
        unit,
        containerRef.current,
        (data) => setMeasurement(data)
      );
      areaRef.current = area;
      if (area?.viewModel) area.viewModel.start();
    }
  }

  function handleClear() {
    setMeasurement(null);
    if (areaRef.current?.viewModel) {
      areaRef.current.viewModel.clear();
    }
    viewerRef.current?.clearAreaMeasurement?.();
  }

  return (
    <div style={panelContainer} className="calcite-mode-dark esri-component">
      <PanelHeader
        icon="📐"
        title="Area Measurement"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <div style={{ display: isMinimized ? "none" : "block" }}>
        {/* Measurement Unit Selector Box */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 10, color: "#90cdf4", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>
            Measurement Unit:
          </label>
          <select
            value={unit}
            onChange={(e) => {
              const selected = e.target.value;
              setUnit(selected);
              viewerRef.current?.setAreaUnit?.(selected);
            }}
            style={selectStyle}
          >
            {areaUnits.map((u) => (
              <option key={u.value} value={u.value} style={{ background: "#1a202c", color: "#fff" }}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        {/* Real-Time Area Measurement Values Display Box */}
        {measurement && (
          <div style={resultBoxStyle}>
            <div style={resultRowStyle}>
              <span style={resultLabelStyle}>📐 3D Surface Area:</span>
              <span style={resultValueStyle}>{measurement.areaText || "--"}</span>
            </div>
            <div style={resultRowStyle}>
              <span style={resultLabelStyle}>🔄 Perimeter Length:</span>
              <span style={resultValueStyle}>{measurement.perimeterText || "--"}</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button
            style={primaryBtn}
            onClick={handleStart}
            title="Start new area measurement"
          >
            📐 New Area
          </button>
          <button
            style={dangerBtn}
            onClick={handleClear}
            title="Clear area measurement"
          >
            🗑️ Clear
          </button>
        </div>

        <div
          ref={containerRef}
          style={{
            width: "100%",
            minHeight: 140,
            display: "flex",
            flexDirection: "column",
          }}
        />
      </div>
    </div>
  );
}

// ==========================================
// 7. ⛰️ ELEVATION PROFILE PANEL
// ==========================================
export function ElevationPanel({ viewerRef, onClose }) {
  const containerRef = useRef(null);
  const elevRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    let t;
    if (containerRef.current && viewerRef.current?.startElevationProfile) {
      const elev = viewerRef.current.startElevationProfile(containerRef.current);
      elevRef.current = elev;

      // Auto-trigger measurement start directly on load
      t = setTimeout(() => {
        if (elev?.viewModel) {
          elev.viewModel.start();
        }
      }, 150);
    }
    return () => {
      if (t) clearTimeout(t);
      viewerRef.current?.clearElevationProfile?.();
    };
  }, [viewerRef]);

  function handleStartProfile() {
    if (elevRef.current?.viewModel) {
      elevRef.current.viewModel.start();
    } else if (viewerRef.current?.startElevationProfile) {
      const elev = viewerRef.current.startElevationProfile(containerRef.current);
      elevRef.current = elev;
      if (elev?.viewModel) elev.viewModel.start();
    }
  }

  function handleClearProfile() {
    if (elevRef.current?.viewModel) {
      elevRef.current.viewModel.clear();
    }
    viewerRef.current?.clearElevationProfile?.();
  }

  return (
    <div style={panelContainer} className="calcite-mode-dark esri-component">
      <PanelHeader
        icon="⛰️"
        title="Elevation Profile"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <div style={{ display: isMinimized ? "none" : "block" }}>
        {/* <div style={instructionBox}>
          <span>Click points across the 3D terrain to calculate and chart the elevation cross-section. Double click to complete.</span>
        </div> */}

        <div style={{ marginBottom: 10 }}>
          <button
            style={{ ...dangerBtn, width: "100%" }}
            onClick={handleClearProfile}
            title="Clear elevation profile"
          >
            🗑️ Clear
          </button>
        </div>

        <div
          ref={containerRef}
          style={{
            width: "100%",
            minHeight: 160,
            display: "flex",
            flexDirection: "column",
          }}
        />
      </div>
    </div>
  );
}

// ==========================================
// SHARED REUSABLE COMPONENTS & STYLES
// ==========================================
function PanelHeader({ icon, title, onClose, isMinimized, onToggleMinimize }) {
  return (
    <div style={{ ...headerStyle, marginBottom: isMinimized ? 0 : 10 }}>
      <div style={titleStyle}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span>{title}</span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {onToggleMinimize && (
          <button
            style={minimizeBtnStyle}
            onClick={onToggleMinimize}
            title={isMinimized ? "Expand Panel" : "Minimize Panel"}
          >
            {isMinimized ? "➕" : "➖"}
          </button>
        )}
        <button style={closeBtn} onClick={onClose} title="Close Panel">
          ✕
        </button>
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

const controlBox = {
  background: "rgba(30, 41, 59, 0.5)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  padding: "8px 10px",
  marginBottom: 10,
};

const labelRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 11,
  color: "#cbd5e1",
  fontWeight: 500,
  marginBottom: 4,
  textShadow: "1px 1px 2px rgba(0,0,0,0.9)",
};

const sliderStyle = {
  width: "100%",
  accentColor: "#3182ce",
  cursor: "pointer",
};

const checkboxRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  color: "#e2e8f0",
};

const primaryBtn = {
  flex: 1,
  background: "linear-gradient(135deg, #3182ce, #2b6cb0)",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(49, 130, 206, 0.4)",
  textAlign: "center",
};

const dangerBtn = {
  flex: 1,
  background: "rgba(239, 68, 68, 0.2)",
  color: "#fca5a5",
  border: "1px solid rgba(239, 68, 68, 0.4)",
  padding: "6px 10px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center",
};

const presetBtn = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#cbd5e1",
  padding: "5px 8px",
  borderRadius: 5,
  fontSize: 10.5,
  cursor: "pointer",
};

const activePresetBtn = {
  ...presetBtn,
  background: "rgba(49, 130, 206, 0.35)",
  border: "1px solid #3182ce",
  color: "#90cdf4",
  fontWeight: 700,
};

const playBtn = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#cbd5e1",
  padding: "3px 8px",
  borderRadius: 4,
  fontSize: 11,
  cursor: "pointer",
  fontWeight: 600,
};

const activePlayBtn = {
  ...playBtn,
  background: "rgba(49, 130, 206, 0.4)",
  border: "1px solid #38bdf8",
  color: "#38bdf8",
};

const modeGridBtn = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 3,
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  color: "#cbd5e1",
  padding: "7px 4px",
  borderRadius: 6,
  cursor: "pointer",
};

const activeModeGridBtn = {
  ...modeGridBtn,
  background: "linear-gradient(135deg, rgba(49, 130, 206, 0.35), rgba(37, 99, 235, 0.45))",
  border: "1px solid #38bdf8",
  color: "#38bdf8",
  fontWeight: 700,
};

const instructionBox = {
  background: "rgba(30, 41, 59, 0.5)",
  borderLeft: "3px solid #38bdf8",
  padding: "7px 9px",
  borderRadius: 4,
  fontSize: 11,
  color: "#cbd5e1",
  lineHeight: 1.4,
  marginBottom: 10,
  textShadow: "1px 1px 2px rgba(0,0,0,0.9)",
};

const infoBox = {
  fontSize: 10.5,
  color: "#94a3b8",
  background: "rgba(255,255,255,0.03)",
  padding: "6px 8px",
  borderRadius: 4,
  lineHeight: 1.4,
};

const selectStyle = {
  width: "100%",
  background: "rgba(15, 23, 42, 0.9)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "#e2e8f0",
  padding: "5px 8px",
  borderRadius: 4,
  fontSize: 11,
  outline: "none",
  cursor: "pointer",
};

const resultBoxStyle = {
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(56, 189, 248, 0.35)",
  borderRadius: 8,
  padding: "10px 12px",
  marginBottom: 10,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
};

const resultRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 11,
};

const resultLabelStyle = {
  color: "#cbd5e1",
  fontWeight: 600,
};

const resultValueStyle = {
  color: "#38bdf8",
  fontWeight: 800,
  fontSize: 12,
  fontFamily: "monospace",
};
