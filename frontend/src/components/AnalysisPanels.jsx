import React, { useState, useEffect, useRef } from "react";
import {
  CloudFog,
  CloudRain,
  CloudSun,
  Eye,
  Moon,
  Mountain,
  Pause,
  Play,
  Ruler,
  Snowflake,
  Square,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
} from "lucide-react";
import {
  PanelShell,
  PanelHeader,
  ControlBox,
  FieldLabel,
  LabelRow,
  ResultRow,
  btnPrimary,
  btnDanger,
  selectField,
} from "./ui/Panel.jsx";
import ElevationLineGraphOnly from "./ElevationLineGraphOnly.jsx";

/** Body wrapper: keeps panels mounted while minimized (Esri widgets need the DOM node). */
function PanelBody({ isMinimized, children }) {
  return <div className={`p-3 ${isMinimized ? "hidden" : "block"}`}>{children}</div>;
}

/** Host element for an Esri-rendered widget. */
function EsriSlot({ innerRef, minHeight }) {
  return (
    <div
      ref={innerRef}
      style={{ minHeight }}
      className="flex w-full flex-col rounded-lg bg-black/20 px-2 py-1"
    />
  );
}

// ==========================================
// 1. DAYLIGHT & SUN SHADOWS PANEL
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
    { label: "Dawn", icon: Sunrise, h: 6, m: 0 },
    { label: "Noon", icon: Sun, h: 12, m: 0 },
    { label: "Dusk", icon: Sunset, h: 18, m: 0 },
    { label: "Night", icon: Moon, h: 22, m: 0 },
  ];

  return (
    <PanelShell>
      <PanelHeader
        icon={Sun}
        title="Daylight"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <PanelBody isMinimized={isMinimized}>
        <ControlBox className="mb-2.5">
          {/* Clock + transport */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDay ? (
                <Sun size={16} className="text-warn" />
              ) : (
                <Moon size={16} className="text-accent-soft" />
              )}
              <span className="tabular font-mono text-[17px] font-semibold tracking-wider text-ink">
                {timeString}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause sun animation" : "Play sun simulation"}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
                isPlaying
                  ? "bg-accent/15 text-accent ring-1 ring-accent/40"
                  : "border border-line bg-white/[0.04] text-ink-muted hover:bg-white/10 hover:text-ink"
              }`}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>

          {/* Time of day */}
          <div className="mb-3">
            <LabelRow label="Time of day" value={timeString} />
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
              className="geo-range"
              aria-label="Time of day"
            />
          </div>

          {/* Presets */}
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((p) => {
              const Icon = p.icon;
              const isActive = hour === p.h && minute === p.m;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setHour(p.h);
                    setMinute(p.m);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-md py-1.5 text-[9.5px] font-semibold transition-colors ${
                    isActive
                      ? "bg-accent/15 text-accent ring-1 ring-accent/40"
                      : "border border-line bg-white/[0.03] text-ink-muted hover:bg-white/8 hover:text-ink"
                  }`}
                >
                  <Icon size={13} />
                  {p.label}
                </button>
              );
            })}
          </div>
        </ControlBox>

        {/* Lighting toggles */}
        <ControlBox className="flex flex-col gap-2.5">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={shadows}
              onChange={(e) => setShadows(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-accent)]"
            />
            <span className="text-[11px] font-medium text-ink-muted">Direct 3D shadows</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={ambientOcclusion}
              onChange={(e) => setAmbientOcclusion(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-accent)]"
            />
            <span className="text-[11px] font-medium text-ink-muted">Ambient occlusion</span>
          </label>
        </ControlBox>
      </PanelBody>
    </PanelShell>
  );
}

// ==========================================
// 2. ATMOSPHERIC WEATHER PANEL
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
    { id: "sunny", label: "Sunny", icon: Sun },
    { id: "cloudy", label: "Cloudy", icon: CloudSun },
    { id: "rainy", label: "Rainy", icon: CloudRain },
    { id: "snowy", label: "Snowy", icon: Snowflake },
    { id: "foggy", label: "Foggy", icon: CloudFog },
  ];

  return (
    <PanelShell>
      <PanelHeader
        icon={CloudSun}
        title="Weather"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <PanelBody isMinimized={isMinimized}>
        {/* Mode grid */}
        <div className="mb-2.5 grid grid-cols-3 gap-1.5">
          {weatherModes.map((w) => {
            const Icon = w.icon;
            const isActive = weatherType === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setWeatherType(w.id)}
                className={`flex flex-col items-center gap-1.5 rounded-lg py-2.5 text-[10px] font-semibold transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent ring-1 ring-accent/40"
                    : "border border-line bg-white/[0.03] text-ink-muted hover:bg-white/8 hover:text-ink"
                }`}
              >
                <Icon size={16} strokeWidth={1.9} />
                {w.label}
              </button>
            );
          })}
        </div>

        {/* Sliders */}
        <ControlBox className="mb-2.5">
          <div className={weatherType === "rainy" || weatherType === "snowy" || weatherType === "foggy" ? "mb-3" : ""}>
            <LabelRow label="Cloud cover" value={`${Math.round(cloudCover * 100)}%`} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={cloudCover}
              onChange={(e) => setCloudCover(parseFloat(e.target.value))}
              className="geo-range"
              aria-label="Cloud cover"
            />
          </div>

          {(weatherType === "rainy" || weatherType === "snowy" || weatherType === "foggy") && (
            <div>
              <LabelRow
                label={weatherType === "foggy" ? "Fog density" : "Precipitation"}
                value={`${Math.round(precipitation * 100)}%`}
              />
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={precipitation}
                onChange={(e) => setPrecipitation(parseFloat(e.target.value))}
                className="geo-range"
                aria-label={weatherType === "foggy" ? "Fog density" : "Precipitation"}
              />
            </div>
          )}
        </ControlBox>

        <p className="rounded-md border-l-2 border-accent/50 bg-white/[0.03] px-2.5 py-2 text-[10.5px] leading-relaxed text-ink-muted">
          Atmospheric effects render in real time across the 3D globe.
        </p>
      </PanelBody>
    </PanelShell>
  );
}

// ==========================================
// 3. 3D LINE OF SIGHT PANEL
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
    let los = losRef.current;
    if (!los || los.destroyed || !los.viewModel) {
      los = viewerRef.current?.startLineOfSight?.(containerRef.current);
      losRef.current = los;
    }
    if (los?.viewModel) {
      try {
        los.viewModel.clear();
      } catch (e) {}
      try {
        los.viewModel.start();
      } catch (e) {}
    }
  }

  function handleClearLos() {
    if (losRef.current?.viewModel) {
      try {
        losRef.current.viewModel.clear();
      } catch (e) {}
    }
    viewerRef.current?.clearLineOfSight?.();
  }

  return (
    <PanelShell className="calcite-mode-dark esri-component">
      <PanelHeader
        icon={Eye}
        title="Line of Sight"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <PanelBody isMinimized={isMinimized}>
        <div className="mb-2.5 flex gap-2">
          <button type="button" className={btnPrimary} onClick={handleStartLos} title="Start new line of sight analysis">
            <Eye size={13} />
            New
          </button>
          <button type="button" className={btnDanger} onClick={handleClearLos} title="Clear sight lines">
            <Trash2 size={13} />
            Clear
          </button>
        </div>

        <EsriSlot innerRef={containerRef} minHeight={120} />
      </PanelBody>
    </PanelShell>
  );
}

// ==========================================
// 5. 3D DISTANCE MEASUREMENT PANEL
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
    let dist = distRef.current;
    if (!dist || dist.destroyed || !dist.viewModel) {
      dist = viewerRef.current?.startDistanceMeasurement?.(
        unit,
        containerRef.current,
        (data) => setMeasurement(data)
      );
      distRef.current = dist;
    }
    if (dist?.viewModel) {
      try {
        dist.viewModel.clear();
      } catch (e) {}
      try {
        dist.viewModel.start();
      } catch (e) {}
    }
  }

  function handleClear() {
    setMeasurement(null);
    if (distRef.current?.viewModel) {
      try {
        distRef.current.viewModel.clear();
      } catch (e) {}
    }
    viewerRef.current?.clearDistanceMeasurement?.();
  }

  return (
    <PanelShell className="calcite-mode-dark esri-component">
      <PanelHeader
        icon={Ruler}
        title="Distance"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <PanelBody isMinimized={isMinimized}>
        <div className="mb-2.5">
          <label className="mb-1.5 block">
            <FieldLabel>Measurement unit</FieldLabel>
          </label>
          <select
            value={unit}
            onChange={(e) => {
              const selected = e.target.value;
              setUnit(selected);
              viewerRef.current?.setDistanceUnit?.(selected);
            }}
            className={selectField}
          >
            {distanceUnits.map((u) => (
              <option key={u.value} value={u.value} className="bg-surface-1 text-ink">
                {u.label}
              </option>
            ))}
          </select>
        </div>

        {measurement && (
          <div className="mb-2.5 flex flex-col gap-2 rounded-lg border border-accent/25 bg-accent/[0.06] p-2.5">
            <ResultRow label="Direct 3D distance" value={measurement.directDistanceText || "--"} />
            <ResultRow label="Horizontal" value={measurement.horizontalDistanceText || "--"} />
            <ResultRow label="Vertical (ΔZ)" value={measurement.verticalDistanceText || "--"} />
          </div>
        )}

        <div className="mb-2.5 flex gap-2">
          <button type="button" className={btnPrimary} onClick={handleStart} title="Start new distance measurement">
            <Ruler size={13} />
            New
          </button>
          <button type="button" className={btnDanger} onClick={handleClear} title="Clear measurement">
            <Trash2 size={13} />
            Clear
          </button>
        </div>

        <EsriSlot innerRef={containerRef} minHeight={140} />
      </PanelBody>
    </PanelShell>
  );
}

// ==========================================
// 6. 3D AREA MEASUREMENT PANEL
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
    let area = areaRef.current;
    if (!area || area.destroyed || !area.viewModel) {
      area = viewerRef.current?.startAreaMeasurement?.(
        unit,
        containerRef.current,
        (data) => setMeasurement(data)
      );
      areaRef.current = area;
    }
    if (area?.viewModel) {
      try {
        area.viewModel.clear();
      } catch (e) {}
      try {
        area.viewModel.start();
      } catch (e) {}
    }
  }

  function handleClear() {
    setMeasurement(null);
    if (areaRef.current?.viewModel) {
      try {
        areaRef.current.viewModel.clear();
      } catch (e) {}
    }
    viewerRef.current?.clearAreaMeasurement?.();
  }

  return (
    <PanelShell className="calcite-mode-dark esri-component">
      <PanelHeader
        icon={Square}
        title="Area Measurement"
        onClose={onClose}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
      />

      <PanelBody isMinimized={isMinimized}>
        <div className="mb-2.5">
          <label className="mb-1.5 block">
            <FieldLabel>Measurement unit</FieldLabel>
          </label>
          <select
            value={unit}
            onChange={(e) => {
              const selected = e.target.value;
              setUnit(selected);
              viewerRef.current?.setAreaUnit?.(selected);
            }}
            className={selectField}
          >
            {areaUnits.map((u) => (
              <option key={u.value} value={u.value} className="bg-surface-1 text-ink">
                {u.label}
              </option>
            ))}
          </select>
        </div>

        {measurement && (
          <div className="mb-2.5 flex flex-col gap-2 rounded-lg border border-accent/25 bg-accent/[0.06] p-2.5">
            <ResultRow label="3D surface area" value={measurement.areaText || "--"} />
            <ResultRow label="Perimeter" value={measurement.perimeterText || "--"} />
          </div>
        )}

        <div className="mb-2.5 flex gap-2">
          <button type="button" className={btnPrimary} onClick={handleStart} title="Start new area measurement">
            <Square size={13} />
            New
          </button>
          <button type="button" className={btnDanger} onClick={handleClear} title="Clear area measurement">
            <Trash2 size={13} />
            Clear
          </button>
        </div>

        <EsriSlot innerRef={containerRef} minHeight={140} />
      </PanelBody>
    </PanelShell>
  );
}

// ==========================================
// 7. ELEVATION PROFILE PANEL
// ==========================================
export function ElevationPanel({ viewerRef, onClose }) {
  const containerRef = useRef(null);
  const elevRef = useRef(null);
  const [profileData, setProfileData] = useState(null);
  const [unit, setUnit] = useState("metric");
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    let t;
    if (containerRef.current && viewerRef.current?.startElevationProfile) {
      const elev = viewerRef.current.startElevationProfile(
        containerRef.current,
        (data) => setProfileData(data)
      );
      elevRef.current = elev;

      t = setTimeout(() => {
        if (elev?.viewModel) {
          elev.viewModel.start();
        }
      }, 150);
    }
    return () => {
      if (t) clearTimeout(t);
      viewerRef.current?.clearElevationHoverPoint?.();
      viewerRef.current?.clearElevationProfile?.();
    };
  }, [viewerRef]);

  function handleStartProfile() {
    setProfileData(null);
    viewerRef.current?.clearElevationHoverPoint?.();
    let elev = elevRef.current;
    if (!elev || elev.destroyed || !elev.viewModel) {
      elev = viewerRef.current?.startElevationProfile?.(
        containerRef.current,
        (data) => setProfileData(data)
      );
      elevRef.current = elev;
    }
    if (elev?.viewModel) {
      try {
        elev.viewModel.clear();
      } catch (e) {}
      try {
        elev.viewModel.start();
      } catch (e) {}
    }
  }

  function handleClearProfile() {
    setProfileData(null);
    viewerRef.current?.clearElevationHoverPoint?.();
    if (elevRef.current?.viewModel) {
      try {
        elevRef.current.viewModel.clear();
      } catch (e) {}
    }
    viewerRef.current?.clearElevationProfile?.();
  }

  const groundSamples = profileData?.groundSamples || [];
  const viewSamples = profileData?.viewSamples || [];
  const stats = profileData?.statistics;
  const viewStats = profileData?.viewStatistics;

  const allElevations = [...groundSamples, ...viewSamples]
    .map((s) => s.elevation)
    .filter((e) => typeof e === "number" && !isNaN(e));

  const maxElevation =
    allElevations.length > 0
      ? Math.max(...allElevations)
      : stats?.maxElevation;
  const minElevation =
    allElevations.length > 0
      ? Math.min(...allElevations)
      : stats?.minElevation;
  const maxDistance = Math.max(
    0,
    ...[...groundSamples, ...viewSamples].map((s) => s.distance || 0)
  );

  const isMetric = unit === "metric";
  const elevUnit = isMetric ? "m" : "ft";
  const elevMul = isMetric ? 1 : 3.28084;

  const formatE = (val) => {
    if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return "--";
    return `${Math.round(val * elevMul)} ${elevUnit}`;
  };

  const formatD = (val) => {
    if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return "--";
    if (isMetric) {
      return val >= 1000 ? `${(val / 1000).toFixed(2)} km` : `${Math.round(val)} m`;
    }
    const ft = val * 3.28084;
    return ft >= 5280 ? `${(ft / 5280).toFixed(2)} mi` : `${Math.round(ft)} ft`;
  };

  return (
    <>
      <PanelShell className="calcite-mode-dark esri-component w-[320px]">
        <PanelHeader
          icon={Mountain}
          title="Elevation Profile"
          onClose={onClose}
          isMinimized={isMinimized}
          onToggleMinimize={() => setIsMinimized(!isMinimized)}
        />

        <PanelBody isMinimized={isMinimized}>
          <div className="mb-2.5">
            <label className="mb-1.5 block">
              <FieldLabel>Measurement unit</FieldLabel>
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={selectField}
            >
              <option value="metric" className="bg-surface-1 text-ink">Metric (m / km)</option>
              <option value="imperial" className="bg-surface-1 text-ink">Imperial (ft / mi)</option>
            </select>
          </div>

          {(stats || allElevations.length > 0) && (
            <div className="mb-2.5 flex flex-col gap-1.5 rounded-lg border border-accent/25 bg-accent/[0.06] p-2.5">
              <ResultRow label="Max elevation" value={formatE(maxElevation)} />
              <ResultRow label="Min elevation" value={formatE(minElevation)} />
              {stats?.elevationGain !== undefined && stats?.elevationGain !== null && (
                <ResultRow label="Elevation gain" value={`+${formatE(stats.elevationGain)}`} />
              )}
              {stats?.elevationLoss !== undefined && stats?.elevationLoss !== null && (
                <ResultRow label="Elevation loss" value={`-${formatE(stats.elevationLoss)}`} />
              )}
              {maxDistance > 0 && (
                <ResultRow label="Total distance" value={formatD(maxDistance)} />
              )}
            </div>
          )}

          <div className="mb-2.5 flex gap-2">
            <button
              type="button"
              className={btnPrimary}
              onClick={handleStartProfile}
              title="Start new elevation profile"
            >
              <Mountain size={13} />
              New
            </button>
            <button
              type="button"
              className={btnDanger}
              onClick={handleClearProfile}
              title="Clear elevation profile"
            >
              <Trash2 size={13} />
              Clear
            </button>
          </div>

          <EsriSlot innerRef={containerRef} minHeight={120} />
        </PanelBody>
      </PanelShell>

      {/* Pure Elevation Line Graph docked at bottom */}
      <ElevationLineGraphOnly
        profileData={profileData}
        unit={unit}
        viewerRef={viewerRef}
      />
    </>
  );
}

