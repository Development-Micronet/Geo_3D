import React, { useState } from "react";

const ALL_TOOLS = [
  {
    id: "aoi",
    label: "AOI / Draw",
    icon: "✏️",
    badge: "DRAWING",
    title: "Area of Interest & Vector Polygon/Line Tools",
    desc: "Draw custom bounding boxes, polygons, and line vectors on 3D terrain.",
  },
  {
    id: "daylight",
    label: "Daylight & Shadows",
    icon: "☀️",
    badge: "SOLAR",
    title: "Daylight, Sun Position & Shadow Simulation",
    desc: "Simulate sun position, direct sunlight, and shadows by date and time.",
  },
  {
    id: "lineOfSight",
    label: "Line of Sight",
    icon: "👁️",
    badge: "VISIBILITY",
    title: "3D Line of Sight Analysis",
    desc: "Calculate visible vs obstructed line-of-sight between target points.",
  },
  {
    id: "elevationProfile",
    label: "Elevation Profile",
    icon: "⛰️",
    badge: "TERRAIN",
    title: "Terrain & 3D Elevation Profile",
    desc: "Generate cross-sectional elevation profile charts across terrain paths.",
  },
  {
    id: "distance",
    label: "Distance Measurement",
    icon: "📏",
    badge: "MEASURE",
    title: "3D Point-to-Point Distance Measurement",
    desc: "Measure direct, horizontal, and vertical distance between 3D points.",
  },
  {
    id: "area",
    label: "Area Measurement",
    icon: "📐",
    badge: "MEASURE",
    title: "3D Surface Area Measurement",
    desc: "Measure 3D surface area and perimeter of planar or terrain surfaces.",
  },
  {
    id: "weather",
    label: "Atmospheric Weather",
    icon: "⛅",
    badge: "ATMOSPHERE",
    title: "Weather & Environment Effects",
    desc: "Apply cloud cover, rain, snow, and atmospheric fog parameters.",
  },
];

export default function EarthToolbar({
  activeTool,
  setActiveTool,
  currentUser,
  activeRightSidebarTab = "toolbox",
  setActiveRightSidebarTab,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [expandedToolInfo, setExpandedToolInfo] = useState({});

  const visibleTools = !currentUser
    ? []
    : currentUser.role === "admin" || currentUser.role === "superadmin"
    ? ALL_TOOLS
    : ALL_TOOLS.filter((t) => (currentUser.permissions || []).includes(t.id));

  const filteredTools = visibleTools.filter((t) => {
    const matchesSearch =
      t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.badge.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" || t.badge === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  function handleToolClick(toolId) {
    setActiveTool(activeTool === toolId ? null : toolId);
  }

  function toggleInfo(toolId) {
    setExpandedToolInfo((prev) => ({ ...prev, [toolId]: !prev[toolId] }));
  }

  return (
    <div style={containerStyle}>
      {/* ─── EXPANDED RIGHT TOOLBOX CARD PANEL ─── */}
      {activeRightSidebarTab && (
        <div style={expandedPanelStyle}>
          {/* Header */}
          <div style={panelHeaderStyle}>
            <div style={panelTitleStyle}>
              {activeRightSidebarTab === "toolbox" ? "Toolbox" : "Spatial Analysis"}
            </div>

            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button
                style={headerIconBtnStyle}
                onClick={() => setActiveRightSidebarTab(null)}
                title="Collapse Toolbox Panel"
              >
                ◧
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div style={searchSectionStyle}>
            <div style={inputWrapperStyle}>
              <span style={{ fontSize: 13, color: "#94a3b8", marginRight: 6 }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 3D tools, analysis..."
                style={inputStyle}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 11 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div style={pillsRowStyle}>
              {["ALL", "MEASURE", "SOLAR", "CLIPPING", "VISIBILITY", "DRAWING"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    ...pillBtnStyle,
                    ...(selectedCategory === cat ? activePillBtnStyle : {}),
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Tool Cards List */}
          <div style={scrollListContainerStyle}>
            {filteredTools.length === 0 ? (
              <div style={{ fontSize: 11, color: "#94a3b8", padding: "16px 0", textAlign: "center" }}>
                No tools match "{searchQuery}"
              </div>
            ) : (
              filteredTools.map((tool) => {
                const isSelected = activeTool === tool.id;
                const isInfoExpanded = expandedToolInfo[tool.id];

                return (
                  <div
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id)}
                    style={{
                      ...toolCardStyle,
                      ...(isSelected ? activeToolCardStyle : {}),
                    }}
                  >
                    {/* Tool Header Row */}
                    <div style={toolCardHeaderRow}>
                      <span style={dragHandleStyle} title="Drag to reorder tool">
                        ⠿
                      </span>

                      {/* Active Indicator Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToolClick(tool.id);
                        }}
                        style={{
                          ...eyeBtnStyle,
                          color: isSelected ? "#38bdf8" : "#64748b",
                        }}
                        title={isSelected ? "Deactivate Tool" : "Activate Tool"}
                      >
                        {isSelected ? "⚡" : "⚙️"}
                      </button>

                      {/* Icon */}
                      <span style={{ fontSize: 14, display: "flex", alignItems: "center" }}>
                        {tool.icon}
                      </span>

                      {/* Label */}
                      <span style={toolTitleStyle} title={tool.title}>
                        {tool.label}
                      </span>

                      {/* Badge */}
                      <span style={badgeStyle}>{tool.badge}</span>
                    </div>

                    {/* Description */}
                    <div style={toolDescStyle}>{tool.desc}</div>

                    {/* Expanded Info Drawer */}
                    {isInfoExpanded && (
                      <div style={expandedInfoBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: 2 }}>{tool.title}</div>
                        <div>Click to launch interactive widget on map viewport.</div>
                      </div>
                    )}

                    {/* Action Toolbar Row matching Left Sidebar Style */}
                    <div style={subToolbarStyle} onClick={(e) => e.stopPropagation()}>
                      <button
                        style={subToolBtnStyle}
                        onClick={() => toggleInfo(tool.id)}
                        title={isInfoExpanded ? "Hide Details" : "Show Details"}
                      >
                        {isInfoExpanded ? "▲" : "▼"}
                      </button>
                      <button
                        style={{
                          ...subToolBtnStyle,
                          background: isSelected ? "#3b82f6" : "rgba(255,255,255,0.06)",
                          color: "#ffffff",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                        onClick={() => handleToolClick(tool.id)}
                      >
                        {isSelected ? "Active" : "Launch"}
                      </button>
                      <button style={subToolBtnStyle} onClick={() => toggleInfo(tool.id)} title="Tool Information">
                        ⓘ
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Status */}
          <div style={panelBottomSearchContainerStyle}>
            <div style={{ fontSize: 10.5, color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Active Tool:</span>
              <span style={{ color: activeTool ? "#38bdf8" : "#cbd5e1", fontWeight: 700 }}>
                {activeTool ? ALL_TOOLS.find((t) => t.id === activeTool)?.label : "None (Select a tool)"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── FIXED VERTICAL RIGHT SIDEBAR (Right Rail) ─── */}
      <div style={verticalRailStyle}>
        {/* Top dock/panel toggle button */}
        <button
          style={railTopBtnStyle}
          onClick={() =>
            setActiveRightSidebarTab(activeRightSidebarTab ? null : "toolbox")
          }
          title="Toggle Toolbox Panel"
        >
          ◫
        </button>

        {/* TOOLBOX Vertical Button */}
        <button
          style={{
            ...railTabBtnStyle,
            ...(activeRightSidebarTab === "toolbox" ? activeRailTabStyle : {}),
          }}
          onClick={() =>
            setActiveRightSidebarTab(activeRightSidebarTab === "toolbox" ? null : "toolbox")
          }
          title="Open 3D GIS Toolbox"
        >
          <span style={railIconStyle}>🛠️</span>
          <span style={verticalTextLabelStyle}>TOOLBOX</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Styles ─── */

const containerStyle = {
  position: "absolute",
  top: 48,
  right: 0,
  bottom: 0,
  zIndex: 150,
  display: "flex",
  pointerEvents: "none",
};

const verticalRailStyle = {
  width: 52,
  height: "100%",
  background: "#111625",
  borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: 10,
  gap: 16,
  pointerEvents: "auto",
  boxShadow: "-2px 0 12px rgba(0,0,0,0.4)",
  zIndex: 160,
};

const railTopBtnStyle = {
  width: 34,
  height: 34,
  borderRadius: 6,
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  color: "#94a3b8",
  fontSize: 16,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
};

const railTabBtnStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "14px 0",
  width: "100%",
  background: "transparent",
  border: "none",
  borderRight: "3px solid transparent",
  color: "#94a3b8",
  cursor: "pointer",
  transition: "all 0.2s ease",
  outline: "none",
};

const activeRailTabStyle = {
  color: "#38bdf8",
  borderRight: "3px solid #38bdf8",
  background: "rgba(56, 189, 248, 0.12)",
};

const railIconStyle = {
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const verticalTextLabelStyle = {
  writingMode: "vertical-rl",
  textTransform: "uppercase",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "2px",
  transform: "rotate(180deg)",
};

const expandedPanelStyle = {
  width: 350,
  height: "100%",
  background: "#0c101c",
  borderLeft: "1px solid rgba(255, 255, 255, 0.14)",
  boxShadow: "-10px 0 30px rgba(0,0,0,0.6)",
  display: "flex",
  flexDirection: "column",
  pointerEvents: "auto",
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

const panelTitleStyle = {
  fontSize: 14,
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

const searchSectionStyle = {
  padding: 10,
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  background: "rgba(22, 30, 49, 0.5)",
};

const inputWrapperStyle = {
  display: "flex",
  alignItems: "center",
  background: "rgba(15, 23, 42, 0.8)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: 18,
  padding: "5px 10px",
  marginBottom: 8,
};

const inputStyle = {
  width: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#f8fafc",
  fontSize: 11.5,
  fontWeight: 500,
};

const pillsRowStyle = {
  display: "flex",
  gap: 4,
  overflowX: "auto",
  paddingBottom: 2,
};

const pillBtnStyle = {
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  color: "#94a3b8",
  fontSize: 9,
  fontWeight: 700,
  padding: "2px 7px",
  borderRadius: 10,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
};

const activePillBtnStyle = {
  background: "rgba(56, 189, 248, 0.2)",
  border: "1px solid #38bdf8",
  color: "#38bdf8",
};

const scrollListContainerStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "10px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const toolCardStyle = {
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

const activeToolCardStyle = {
  border: "1.5px solid #3b82f6",
  background: "rgba(59, 130, 246, 0.12)",
  boxShadow: "0 0 12px rgba(59, 130, 246, 0.25)",
};

const toolCardHeaderRow = {
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

const toolTitleStyle = {
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

const toolDescStyle = {
  fontSize: 10,
  color: "#94a3b8",
  lineHeight: 1.35,
  paddingLeft: 24,
};

const expandedInfoBoxStyle = {
  background: "rgba(15, 23, 42, 0.9)",
  border: "1px solid rgba(56, 189, 248, 0.3)",
  borderRadius: 6,
  padding: 8,
  fontSize: 10,
  color: "#e2e8f0",
  marginTop: 4,
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
