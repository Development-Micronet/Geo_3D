import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Mountain,
  Trash2,
  Download,
  Maximize2,
  Minimize2,
  X,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Ruler,
  Activity,
} from "lucide-react";
import Tooltip from "./ui/Tooltip.jsx";

export default function ElevationProfileStudio({ viewerRef, onClose }) {
  const containerRef = useRef(null);
  const elevRef = useRef(null);
  const [profileData, setProfileData] = useState(null);
  const [unitSystem, setUnitSystem] = useState("metric"); // "metric" or "imperial"
  const [isMinimized, setIsMinimized] = useState(false);
  const [showEsriWidget, setShowEsriWidget] = useState(false);
  const [hoverData, setHoverData] = useState(null);
  const svgRef = useRef(null);

  // Initialize elevation profile widget and listen for samples
  useEffect(() => {
    let t;
    if (containerRef.current && viewerRef.current?.startElevationProfile) {
      const elev = viewerRef.current.startElevationProfile(
        containerRef.current,
        (data) => {
          setProfileData(data);
        }
      );
      elevRef.current = elev;

      t = setTimeout(() => {
        if (elev?.viewModel) {
          elev.viewModel.start();
        }
      }, 200);
    }

    return () => {
      if (t) clearTimeout(t);
      viewerRef.current?.clearElevationHoverPoint?.();
      viewerRef.current?.clearElevationProfile?.();
    };
  }, [viewerRef]);

  function handleStart() {
    setProfileData(null);
    setHoverData(null);
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

  function handleClear() {
    setProfileData(null);
    setHoverData(null);
    viewerRef.current?.clearElevationHoverPoint?.();
    if (elevRef.current?.viewModel) {
      elevRef.current.viewModel.clear();
    }
    viewerRef.current?.clearElevationProfile?.();
  }

  // Extract samples & stats
  const groundSamples = profileData?.groundSamples || [];
  const viewSamples = profileData?.viewSamples || [];
  const stats = profileData?.statistics;
  const hasData = groundSamples.length > 1;

  // Unit conversion helpers
  const isMetric = unitSystem === "metric";
  const distMultiplier = isMetric ? 1 : 3.28084;
  const elevMultiplier = isMetric ? 1 : 3.28084;
  const elevUnitLabel = isMetric ? "m" : "ft";

  function formatDist(meters) {
    if (meters === undefined || meters === null || isNaN(meters)) return "--";
    if (isMetric) {
      return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
    }
    const feet = meters * 3.28084;
    return feet >= 5280 ? `${(feet / 5280).toFixed(2)} mi` : `${Math.round(feet)} ft`;
  }

  function formatElev(meters) {
    if (meters === undefined || meters === null || isNaN(meters)) return "--";
    const val = meters * elevMultiplier;
    return `${Math.round(val).toLocaleString()} ${elevUnitLabel}`;
  }

  // Computed metrics
  const computedStats = useMemo(() => {
    if (!hasData) return null;

    let minElev = Infinity;
    let maxElev = -Infinity;
    let maxDist = 0;
    let totalGain = 0;
    let totalLoss = 0;
    let maxSlope = 0;

    const all = [...groundSamples, ...viewSamples];
    all.forEach((s) => {
      if (typeof s.elevation === "number" && !isNaN(s.elevation)) {
        if (s.elevation < minElev) minElev = s.elevation;
        if (s.elevation > maxElev) maxElev = s.elevation;
      }
      if (typeof s.distance === "number" && !isNaN(s.distance) && s.distance > maxDist) {
        maxDist = s.distance;
      }
    });

    for (let i = 0; i < groundSamples.length; i++) {
      const e = groundSamples[i].elevation;
      if (i > 0) {
        const prev = groundSamples[i - 1];
        const diffE = e - prev.elevation;
        const diffD = groundSamples[i].distance - prev.distance;
        if (diffE > 0) totalGain += diffE;
        else totalLoss += Math.abs(diffE);

        if (diffD > 0) {
          const slopePct = Math.abs(diffE / diffD) * 100;
          if (slopePct > maxSlope) maxSlope = slopePct;
        }
      }
    }

    const totalDist = maxDist || (groundSamples[groundSamples.length - 1]?.distance || 0);
    const avgSlope = totalDist > 0 ? (totalGain / totalDist) * 100 : 0;

    return {
      minElevation: minElev !== Infinity ? minElev : (stats?.minElevation ?? 0),
      maxElevation: maxElev !== -Infinity ? maxElev : (stats?.maxElevation ?? 100),
      elevationGain: stats?.elevationGain ?? totalGain,
      elevationLoss: stats?.elevationLoss ?? totalLoss,
      totalDistance: totalDist,
      avgSlope: stats?.avgSlope ?? avgSlope,
      maxSlope: stats?.maxSlope ?? maxSlope,
    };
  }, [groundSamples, viewSamples, stats, hasData]);

  // SVG Chart Geometry
  const chartWidth = 960;
  const chartHeight = 220;
  const padding = { top: 28, right: 36, bottom: 32, left: 64 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const chartData = useMemo(() => {
    if (!hasData || !computedStats) return null;

    const totalDist = Math.max(1, computedStats.totalDistance);
    let minE = computedStats.minElevation;
    let maxE = computedStats.maxElevation;

    // Add 15% elevation padding for visual headroom
    const eRange = Math.max(10, maxE - minE);
    const domainMin = Math.floor((minE - eRange * 0.08) / 10) * 10;
    const domainMax = Math.ceil((maxE + eRange * 0.16) / 10) * 10;
    const domainRange = Math.max(1, domainMax - domainMin);

    const toX = (dist) => padding.left + (Math.max(0, Math.min(totalDist, dist)) / totalDist) * plotWidth;
    const toY = (elev) => padding.top + (1 - (elev - domainMin) / domainRange) * plotHeight;

    const groundPoints = groundSamples.map((s) => ({
      x: toX(s.distance),
      y: toY(s.elevation),
      sample: s,
    }));

    // Generate smooth SVG paths
    const groundPathD = groundPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, "");

    const groundAreaD = `${groundPathD} L ${toX(totalDist).toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} L ${padding.left.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} Z`;

    // View line if available
    let viewPathD = null;
    if (viewSamples.length > 1) {
      const viewPoints = viewSamples.map((s) => ({
        x: toX(s.distance),
        y: toY(s.elevation),
      }));
      viewPathD = viewPoints.reduce((acc, pt, i) => {
        return i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      }, "");
    }

    // Grid tick lines
    const yTicksCount = 4;
    const yTicks = [];
    for (let i = 0; i <= yTicksCount; i++) {
      const val = domainMin + (domainRange / yTicksCount) * i;
      yTicks.push({
        value: val,
        y: toY(val),
        label: formatElev(val),
      });
    }

    const xTicksCount = 5;
    const xTicks = [];
    for (let i = 0; i <= xTicksCount; i++) {
      const distVal = (totalDist / xTicksCount) * i;
      xTicks.push({
        value: distVal,
        x: toX(distVal),
        label: formatDist(distVal),
      });
    }

    // Min and Max Points
    let peakPt = groundPoints[0];
    let basePt = groundPoints[0];
    groundPoints.forEach((pt) => {
      if (pt.sample.elevation > peakPt.sample.elevation) peakPt = pt;
      if (pt.sample.elevation < basePt.sample.elevation) basePt = pt;
    });

    return {
      groundPoints,
      groundPathD,
      groundAreaD,
      viewPathD,
      yTicks,
      xTicks,
      domainMin,
      domainMax,
      totalDist,
      toX,
      toY,
      peakPt,
      basePt,
    };
  }, [hasData, groundSamples, viewSamples, computedStats, unitSystem]);

  // Interactive mouse hover handler
  function handleSvgMouseMove(e) {
    if (!svgRef.current || !chartData || !hasData) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * chartWidth;

    if (svgX < padding.left || svgX > padding.left + plotWidth) {
      setHoverData(null);
      viewerRef.current?.clearElevationHoverPoint?.();
      return;
    }

    const ratio = (svgX - padding.left) / plotWidth;
    const targetDist = ratio * chartData.totalDist;

    // Find nearest sample
    let nearest = groundSamples[0];
    let minDiff = Infinity;
    for (let i = 0; i < groundSamples.length; i++) {
      const diff = Math.abs(groundSamples[i].distance - targetDist);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = groundSamples[i];
      }
    }

    if (nearest) {
      const ptX = chartData.toX(nearest.distance);
      const ptY = chartData.toY(nearest.elevation);

      setHoverData({
        x: ptX,
        y: ptY,
        sample: nearest,
        distanceText: formatDist(nearest.distance),
        elevationText: formatElev(nearest.elevation),
      });

      viewerRef.current?.setElevationHoverPoint?.(nearest);
    }
  }

  function handleSvgMouseLeave() {
    setHoverData(null);
    viewerRef.current?.clearElevationHoverPoint?.();
  }

  function exportCSV() {
    if (!hasData) return;
    let csv = "Index,Distance_m,Elevation_m,Latitude,Longitude\n";
    groundSamples.forEach((s, idx) => {
      csv += `${idx + 1},${s.distance?.toFixed(2) || 0},${s.elevation?.toFixed(2) || 0},${s.latitude || ""},${s.longitude || ""}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elevation_profile_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full max-w-[1240px] mx-auto overflow-hidden rounded-2xl border border-line bg-surface-2/95 text-ink shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all duration-300">
      {/* ─── Header Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white/[0.03] px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/30">
            <Mountain size={16} strokeWidth={2.2} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-white">
                Elevation Profile Studio
              </span>
              {hasData ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Profile Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn ring-1 ring-warn/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-warn animate-pulse" />
                  Click 3D terrain to draw path
                </span>
              )}
            </div>
            <span className="text-[10.5px] text-ink-muted">
              Interactive 3D cross-sectional terrain graph with real-time globe sync
            </span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Unit Toggle */}
          <div className="flex items-center rounded-lg border border-line bg-white/[0.04] p-0.5">
            <button
              type="button"
              onClick={() => setUnitSystem("metric")}
              className={`rounded-md px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                isMetric
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-muted hover:text-white"
              }`}
            >
              Metric (m/km)
            </button>
            <button
              type="button"
              onClick={() => setUnitSystem("imperial")}
              className={`rounded-md px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                !isMetric
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-muted hover:text-white"
              }`}
            >
              Imperial (ft/mi)
            </button>
          </div>

          {/* New Profile */}
          <button
            type="button"
            onClick={handleStart}
            title="Draw a new elevation profile path"
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-accent-soft shadow-sm"
          >
            <Mountain size={13} strokeWidth={2.2} />
            New
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            title="Clear elevation profile"
            className="flex items-center gap-1.5 rounded-lg border border-bad/30 bg-bad/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-bad transition-colors hover:bg-bad/20"
          >
            <Trash2 size={13} />
            Clear
          </button>

          {/* Export */}
          {hasData && (
            <button
              type="button"
              onClick={exportCSV}
              title="Export elevation data to CSV"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-line bg-white/[0.04] px-2.5 py-1.5 text-[11.5px] font-semibold text-ink transition-colors hover:bg-white/10"
            >
              <Download size={13} />
              Export
            </button>
          )}

          {/* Esri Widget Toggle */}
          <button
            type="button"
            onClick={() => setShowEsriWidget(!showEsriWidget)}
            title="Toggle native Esri widget options"
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
              showEsriWidget
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-line bg-white/[0.04] text-ink-muted hover:bg-white/8 hover:text-ink"
            }`}
          >
            <Layers size={13} />
            <span className="hidden md:inline">Esri Options</span>
          </button>

          <span className="h-4 w-px bg-line mx-0.5" />

          {/* Minimize / Expand */}
          <Tooltip label={isMinimized ? "Expand graph" : "Minimize graph"}>
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-ink-muted transition-colors hover:bg-white/8 hover:text-white"
            >
              {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
            </button>
          </Tooltip>

          {/* Close */}
          <Tooltip label="Close elevation tool">
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-ink-muted transition-colors hover:bg-bad/20 hover:text-bad"
            >
              <X size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ─── Body Content ─── */}
      {!isMinimized && (
        <div className="p-3.5 sm:p-4 flex flex-col gap-3">
          {/* ── Metric Summary Strip (ArcGIS Earth Studio style) ── */}
          {computedStats && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <div className="flex flex-col rounded-xl border border-line/60 bg-white/[0.02] p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Max Elevation
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[16px] font-bold text-warn">
                    {formatElev(computedStats.maxElevation)}
                  </span>
                  <span className="text-[10px] text-warn/80">Peak</span>
                </div>
              </div>

              <div className="flex flex-col rounded-xl border border-line/60 bg-white/[0.02] p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Min Elevation
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[16px] font-bold text-accent">
                    {formatElev(computedStats.minElevation)}
                  </span>
                  <span className="text-[10px] text-accent/80">Base</span>
                </div>
              </div>

              <div className="flex flex-col rounded-xl border border-line/60 bg-white/[0.02] p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1">
                  <ArrowUpRight size={11} className="text-emerald-400" />
                  Elevation Gain
                </span>
                <span className="mt-1 text-[16px] font-bold text-emerald-400">
                  +{formatElev(computedStats.elevationGain)}
                </span>
              </div>

              <div className="flex flex-col rounded-xl border border-line/60 bg-white/[0.02] p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1">
                  <ArrowDownRight size={11} className="text-amber-400" />
                  Elevation Loss
                </span>
                <span className="mt-1 text-[16px] font-bold text-amber-400">
                  -{formatElev(computedStats.elevationLoss)}
                </span>
              </div>

              <div className="flex flex-col rounded-xl border border-line/60 bg-white/[0.02] p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1">
                  <Ruler size={11} className="text-accent" />
                  Total Distance
                </span>
                <span className="mt-1 text-[16px] font-bold text-white">
                  {formatDist(computedStats.totalDistance)}
                </span>
              </div>

              <div className="flex flex-col rounded-xl border border-line/60 bg-white/[0.02] p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1">
                  <TrendingUp size={11} className="text-ink-muted" />
                  Avg / Max Slope
                </span>
                <span className="mt-1 text-[14px] font-bold text-ink">
                  {computedStats.avgSlope.toFixed(1)}%{" "}
                  <span className="text-[11px] font-normal text-ink-muted">
                    ({computedStats.maxSlope.toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* ── Interactive Line Graph Viewport ── */}
          <div className="relative w-full overflow-hidden rounded-xl border border-line bg-black/40 p-2">
            {hasData && chartData ? (
              <div className="relative w-full h-[200px] sm:h-[220px]">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-full cursor-crosshair select-none"
                  preserveAspectRatio="none"
                  onMouseMove={handleSvgMouseMove}
                  onMouseLeave={handleSvgMouseLeave}
                >
                  <defs>
                    {/* Terrain Elevation Gradient */}
                    <linearGradient id="elevation-area-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.45" />
                      <stop offset="60%" stopColor="#00f5a0" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#00f5a0" stopOpacity="0.02" />
                    </linearGradient>

                    {/* View profile gradient */}
                    <linearGradient id="view-line-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>

                    {/* Ground line gradient */}
                    <linearGradient id="ground-line-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#00e5ff" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {chartData.yTicks.map((tick, i) => (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={tick.y}
                        x2={chartWidth - padding.right}
                        y2={tick.y}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 8}
                        y={tick.y + 3.5}
                        textAnchor="end"
                        fill="rgba(255, 255, 255, 0.45)"
                        fontSize="9.5"
                        fontFamily="monospace"
                      >
                        {tick.label}
                      </text>
                    </g>
                  ))}

                  {/* Vertical Grid lines */}
                  {chartData.xTicks.map((tick, i) => (
                    <g key={i}>
                      <line
                        x1={tick.x}
                        y1={padding.top}
                        x2={tick.x}
                        y2={padding.top + plotHeight}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={tick.x}
                        y={padding.top + plotHeight + 18}
                        textAnchor="middle"
                        fill="rgba(255, 255, 255, 0.5)"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {tick.label}
                      </text>
                    </g>
                  ))}

                  {/* Shaded Terrain Area */}
                  <path d={chartData.groundAreaD} fill="url(#elevation-area-gradient)" />

                  {/* 3D View Profile Line (if buildings/features exist) */}
                  {chartData.viewPathD && (
                    <path
                      d={chartData.viewPathD}
                      fill="none"
                      stroke="url(#view-line-gradient)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Main Ground Elevation Line */}
                  <path
                    d={chartData.groundPathD}
                    fill="none"
                    stroke="url(#ground-line-gradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Peak Marker Badge */}
                  {chartData.peakPt && (
                    <g transform={`translate(${chartData.peakPt.x}, ${chartData.peakPt.y})`}>
                      <circle r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                      <line y1="0" y2="-12" stroke="#f59e0b" strokeWidth="1" />
                      <rect
                        x="-30"
                        y="-26"
                        width="60"
                        height="14"
                        rx="3"
                        fill="rgba(15, 23, 42, 0.85)"
                        stroke="#f59e0b"
                        strokeWidth="0.8"
                      />
                      <text
                        y="-17"
                        textAnchor="middle"
                        fill="#fbbf24"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        ▲ {formatElev(chartData.peakPt.sample.elevation)}
                      </text>
                    </g>
                  )}

                  {/* Base Marker Badge */}
                  {chartData.basePt && (
                    <g transform={`translate(${chartData.basePt.x}, ${chartData.basePt.y})`}>
                      <circle r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                      <line y1="0" y2="12" stroke="#38bdf8" strokeWidth="1" />
                      <rect
                        x="-30"
                        y="12"
                        width="60"
                        height="14"
                        rx="3"
                        fill="rgba(15, 23, 42, 0.85)"
                        stroke="#38bdf8"
                        strokeWidth="0.8"
                      />
                      <text
                        y="22"
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        ▼ {formatElev(chartData.basePt.sample.elevation)}
                      </text>
                    </g>
                  )}

                  {/* Interactive Cursor Scrubber */}
                  {hoverData && (
                    <g>
                      {/* Vertical tracker line */}
                      <line
                        x1={hoverData.x}
                        y1={padding.top}
                        x2={hoverData.x}
                        y2={padding.top + plotHeight}
                        stroke="#00d2ff"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />

                      {/* Snap Dot */}
                      <circle
                        cx={hoverData.x}
                        cy={hoverData.y}
                        r="6"
                        fill="#00d2ff"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        className="animate-pulse"
                      />
                    </g>
                  )}
                </svg>

                {/* Floating HUD Tooltip */}
                {hoverData && (
                  <div
                    className="pointer-events-none absolute z-20 flex flex-col gap-0.5 rounded-lg border border-accent/40 bg-surface-1/95 p-2 text-[11px] shadow-xl backdrop-blur-md transition-all duration-75"
                    style={{
                      left: `${Math.min(85, Math.max(5, (hoverData.x / chartWidth) * 100))}%`,
                      top: `${Math.max(10, Math.min(65, (hoverData.y / chartHeight) * 100))}%`,
                      transform: "translate(-50%, -120%)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-line pb-1">
                      <span className="font-semibold text-accent">📍 Profile Point</span>
                      <span className="font-mono text-[10px] text-ink-muted">
                        {hoverData.sample.latitude ? `${Number(hoverData.sample.latitude).toFixed(4)}°, ${Number(hoverData.sample.longitude).toFixed(4)}°` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-0.5">
                      <span className="text-ink-muted">Elevation:</span>
                      <span className="font-bold text-white tabular font-mono">
                        {hoverData.elevationText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-ink-muted">Distance:</span>
                      <span className="font-semibold text-accent tabular font-mono">
                        {hoverData.distanceText}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* No path drawn yet guide */
              <div className="flex flex-col items-center justify-center py-9 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30 shadow-inner">
                  <Activity size={24} className="animate-pulse" />
                </div>
                <h3 className="text-[15px] font-bold text-white">
                  Draw Route on 3D Globe to Generate Elevation Profile
                </h3>
                <p className="mx-auto mt-1 max-w-[500px] text-[12px] text-ink-muted">
                  Click anywhere on the 3D terrain to drop your start point, add vertices along
                  your route, and <strong className="text-accent">double-click</strong> to generate the cross-sectional line graph.
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleStart}
                    className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-accent-soft shadow-md"
                  >
                    <Mountain size={15} />
                    Start Drawing Path
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Native Esri Widget Container Slot (Collapsible) ── */}
          <div className={showEsriWidget ? "block" : "hidden"}>
            <div className="rounded-xl border border-line bg-black/30 p-2">
              <div className="mb-1.5 flex items-center justify-between px-2 text-[11px] font-semibold text-ink-muted">
                <span>ArcGIS Native Widget Controls</span>
              </div>
              <div
                ref={containerRef}
                style={{ minHeight: "140px" }}
                className="esri-component calcite-mode-dark flex w-full flex-col rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Persistent container for Esri widget lifecycle if not displayed above */}
      {!showEsriWidget && (
        <div ref={containerRef} style={{ display: "none" }} />
      )}
    </div>
  );
}
