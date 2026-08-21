import React, { useState, useRef } from "react";

/**
 * Pure Elevation Line Graph component (ArcGIS Earth Style).
 * Renders the clean elevation profile graph at the bottom of the viewport,
 * displaying both bare-earth terrain and 3D buildings / scene surfaces.
 */
export default function ElevationLineGraphOnly({ profileData, unit = "metric", viewerRef }) {
  const [hoverData, setHoverData] = useState(null);
  const svgRef = useRef(null);

  const groundSamples = profileData?.groundSamples || [];
  const viewSamples = profileData?.viewSamples || [];

  if (groundSamples.length < 2 && viewSamples.length < 2) return null;

  const isMetric = unit === "metric";
  const elevMul = isMetric ? 1 : 3.28084;
  const elevUnit = isMetric ? "m" : "ft";

  function formatElev(meters) {
    if (meters === undefined || meters === null || isNaN(meters)) return "--";
    return `${Math.round(meters * elevMul)} ${elevUnit}`;
  }

  function formatDist(meters) {
    if (meters === undefined || meters === null || isNaN(meters)) return "--";
    if (isMetric) {
      return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
    }
    const ft = meters * 3.28084;
    return ft >= 5280 ? `${(ft / 5280).toFixed(2)} mi` : `${Math.round(ft)} ft`;
  }

  // Calculate comprehensive bounds considering BOTH ground terrain AND 3D buildings/structures
  const allSamples = [...groundSamples, ...viewSamples];
  let minElev = Infinity;
  let maxElev = -Infinity;
  let maxDist = 0;

  allSamples.forEach((s) => {
    if (typeof s.elevation === "number" && !isNaN(s.elevation)) {
      if (s.elevation < minElev) minElev = s.elevation;
      if (s.elevation > maxElev) maxElev = s.elevation;
    }
    if (typeof s.distance === "number" && !isNaN(s.distance) && s.distance > maxDist) {
      maxDist = s.distance;
    }
  });

  if (minElev === Infinity) minElev = 0;
  if (maxElev === -Infinity) maxElev = 100;
  const totalDist = Math.max(1, maxDist);

  const chartWidth = 960;
  const chartHeight = 160;
  const padding = { top: 26, right: 36, bottom: 26, left: 54 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Add 16% headroom so building heights, rooftops, and peaks are fully visible
  const eRange = Math.max(6, maxElev - minElev);
  const domainMin = Math.floor((minElev - eRange * 0.08) / 2) * 2;
  const domainMax = Math.ceil((maxElev + eRange * 0.16) / 2) * 2;
  const domainRange = Math.max(1, domainMax - domainMin);

  const toX = (dist) => padding.left + (Math.max(0, Math.min(totalDist, dist)) / totalDist) * plotWidth;
  const toY = (elev) => padding.top + (1 - (elev - domainMin) / domainRange) * plotHeight;

  const groundPoints = groundSamples.map((s) => ({
    x: toX(s.distance),
    y: toY(s.elevation),
    sample: s,
  }));

  const groundPathD = groundPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");

  const groundAreaD = groundPoints.length > 0
    ? `${groundPathD} L ${toX(totalDist).toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} L ${padding.left.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} Z`
    : "";

  let viewPoints = [];
  let viewPathD = null;
  const hasBuildingData = viewSamples.length > 1;

  if (hasBuildingData) {
    viewPoints = viewSamples.map((s) => ({
      x: toX(s.distance),
      y: toY(s.elevation),
      sample: s,
    }));
    viewPathD = viewPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, "");
  }

  // Y-axis Ticks
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

  // X-axis Ticks
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

  // Peak & Base across both ground & building points
  const allRenderPoints = [...groundPoints, ...viewPoints];
  let peakPt = allRenderPoints[0] || null;
  let basePt = groundPoints[0] || allRenderPoints[0] || null;

  allRenderPoints.forEach((pt) => {
    if (peakPt && pt.sample.elevation > peakPt.sample.elevation) peakPt = pt;
  });
  groundPoints.forEach((pt) => {
    if (basePt && pt.sample.elevation < basePt.sample.elevation) basePt = pt;
  });

  function handleSvgMouseMove(e) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * chartWidth;

    if (svgX < padding.left || svgX > padding.left + plotWidth) {
      setHoverData(null);
      viewerRef.current?.clearElevationHoverPoint?.();
      return;
    }

    const ratio = (svgX - padding.left) / plotWidth;
    const targetDist = ratio * totalDist;

    // Find nearest ground sample
    let nearestGround = groundSamples[0] || null;
    let minGroundDiff = Infinity;
    for (let i = 0; i < groundSamples.length; i++) {
      const diff = Math.abs(groundSamples[i].distance - targetDist);
      if (diff < minGroundDiff) {
        minGroundDiff = diff;
        nearestGround = groundSamples[i];
      }
    }

    // Find nearest view/building sample
    let nearestView = viewSamples[0] || null;
    let minViewDiff = Infinity;
    for (let i = 0; i < viewSamples.length; i++) {
      const diff = Math.abs(viewSamples[i].distance - targetDist);
      if (diff < minViewDiff) {
        minViewDiff = diff;
        nearestView = viewSamples[i];
      }
    }

    const activeSample =
      nearestView && nearestGround && nearestView.elevation > nearestGround.elevation + 0.5
        ? nearestView
        : nearestGround || nearestView;

    if (activeSample) {
      const ptX = toX(activeSample.distance);
      const ptY = toY(activeSample.elevation);

      const hasBuildingOffset =
        nearestView && nearestGround && nearestView.elevation - nearestGround.elevation > 0.8;
      const buildingDiff = hasBuildingOffset ? nearestView.elevation - nearestGround.elevation : 0;

      setHoverData({
        x: ptX,
        y: ptY,
        sample: activeSample,
        groundElevation: nearestGround ? formatElev(nearestGround.elevation) : null,
        viewElevation: nearestView ? formatElev(nearestView.elevation) : null,
        hasBuilding: hasBuildingOffset,
        buildingHeight: hasBuildingOffset ? formatElev(buildingDiff) : null,
        distanceText: formatDist(activeSample.distance),
        elevationText: formatElev(activeSample.elevation),
      });

      viewerRef.current?.setElevationHoverPoint?.(activeSample);
    }
  }

  function handleSvgMouseLeave() {
    setHoverData(null);
    viewerRef.current?.clearElevationHoverPoint?.();
  }

  return (
    <div className="fixed bottom-21 inset-x-3 md:inset-x-6 lg:left-[350px] lg:right-6 max-w-[1200px] mx-auto z-[140] pointer-events-auto transition-all duration-300">
      <div className="relative w-full overflow-hidden rounded-xl border border-line bg-surface-2/95 shadow-[0_16px_36px_rgba(0,0,0,0.85)] backdrop-blur-xl p-1.5 sm:p-2">
        {/* Top bar with Profile Legend */}
        <div className="flex items-center justify-between px-2 pb-1 text-[10.5px] font-semibold text-ink-muted">
          <span className="flex items-center gap-1.5 text-ink">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            3D Elevation &amp; Surface Profile
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-4 rounded-full bg-[#00d2ff]" />
              <span className="text-[10px] text-ink-muted">Terrain</span>
            </span>
            {hasBuildingData && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-4 rounded-full bg-[#f59e0b]" />
                <span className="text-[10px] text-amber-400">3D Buildings / Structures</span>
              </span>
            )}
          </div>
        </div>

        <div className="relative w-full h-[140px] sm:h-[160px]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full cursor-crosshair select-none overflow-visible"
            preserveAspectRatio="none"
            onMouseMove={handleSvgMouseMove}
            onMouseLeave={handleSvgMouseLeave}
          >
            <defs>
              <linearGradient id="pure-elev-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.35" />
                <stop offset="65%" stopColor="#00f5a0" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#00f5a0" stopOpacity="0.01" />
              </linearGradient>

              <linearGradient id="pure-line-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#00e5ff" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {yTicks.map((tick, i) => (
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
                  x={padding.left - 6}
                  y={tick.y + 3.5}
                  textAnchor="end"
                  fill="rgba(255, 255, 255, 0.45)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Vertical Grid lines */}
            {xTicks.map((tick, i) => (
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
                  y={padding.top + plotHeight + 15}
                  textAnchor="middle"
                  fill="rgba(255, 255, 255, 0.5)"
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Shaded Ground Area */}
            {groundAreaD && <path d={groundAreaD} fill="url(#pure-elev-gradient)" />}

            {/* Ground Profile Line (solid cyan) */}
            {groundPathD && (
              <path
                d={groundPathD}
                fill="none"
                stroke="url(#pure-line-gradient)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* 3D Buildings / View Profile Line (bright amber with shadow) */}
            {viewPathD && (
              <path
                d={viewPathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Peak Marker Badge */}
            {peakPt && (
              <g transform={`translate(${peakPt.x}, ${peakPt.y})`}>
                <circle r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                <line y1="0" y2="-10" stroke="#f59e0b" strokeWidth="1" />
                <rect
                  x="-28"
                  y="-22"
                  width="56"
                  height="13"
                  rx="3"
                  fill="rgba(15, 23, 42, 0.92)"
                  stroke="#f59e0b"
                  strokeWidth="0.8"
                />
                <text
                  y="-13"
                  textAnchor="middle"
                  fill="#fbbf24"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  ▲ {formatElev(peakPt.sample.elevation)}
                </text>
              </g>
            )}

            {/* Base Marker Badge */}
            {basePt && (
              <g transform={`translate(${basePt.x}, ${basePt.y})`}>
                <circle r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                <line y1="0" y2="10" stroke="#38bdf8" strokeWidth="1" />
                <rect
                  x="-28"
                  y="10"
                  width="56"
                  height="13"
                  rx="3"
                  fill="rgba(15, 23, 42, 0.92)"
                  stroke="#38bdf8"
                  strokeWidth="0.8"
                />
                <text
                  y="19.5"
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  ▼ {formatElev(basePt.sample.elevation)}
                </text>
              </g>
            )}

            {/* Interactive Cursor Scrubber */}
            {hoverData && (
              <g>
                <line
                  x1={hoverData.x}
                  y1={padding.top}
                  x2={hoverData.x}
                  y2={padding.top + plotHeight}
                  stroke={hoverData.hasBuilding ? "#f59e0b" : "#00d2ff"}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={hoverData.x}
                  cy={hoverData.y}
                  r="5"
                  fill={hoverData.hasBuilding ? "#f59e0b" : "#00d2ff"}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              </g>
            )}
          </svg>

          {/* Floating Tooltip */}
          {hoverData && (
            <div
              className="pointer-events-none absolute z-20 flex items-center gap-2.5 rounded-lg border border-accent/40 bg-surface-1/95 px-2.5 py-1.5 text-[11px] shadow-lg backdrop-blur-md transition-all duration-75"
              style={{
                left: `${Math.min(82, Math.max(12, (hoverData.x / chartWidth) * 100))}%`,
                top: `${Math.max(10, Math.min(50, (hoverData.y / chartHeight) * 100))}%`,
                transform: "translate(-50%, -130%)",
              }}
            >
              {hoverData.hasBuilding ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 font-semibold text-amber-400">
                    <span>🏢</span>
                    <span className="font-mono text-white">{hoverData.viewElevation}</span>
                    <span className="text-[10px] text-amber-300">({hoverData.buildingHeight})</span>
                  </div>
                  <span className="text-line">|</span>
                  <div className="flex items-center gap-1 font-mono text-ink-muted text-[10.5px]">
                    <span>Terrain:</span>
                    <span className="text-white">{hoverData.groundElevation}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 font-semibold text-accent">
                  <span>📍</span>
                  <span className="font-mono text-white">{hoverData.elevationText}</span>
                </div>
              )}
              <span className="text-line">|</span>
              <div className="font-mono text-ink-muted text-[10.5px]">
                Dist: <span className="text-white font-semibold">{hoverData.distanceText}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
