import React, { useEffect, useRef, useState, useCallback } from "react";
import ArcGISViewer from "./components/ArcGISViewer.jsx";
import LayerManager from "./components/LayerManager.jsx";
import IdentifyPanel from "./components/IdentifyPanel.jsx";
import AoiPanel from "./components/AoiPanel.jsx";
import LoginModal from "./components/LoginModal.jsx";
import AdminModal from "./components/AdminModal.jsx";
import LocationSearch from "./components/LocationSearch.jsx";
import AddDataPanel from "./components/AddDataPanel.jsx";
import {
  DaylightPanel,
  WeatherPanel,
  SlicePanel,
  LineOfSightPanel,
  DistancePanel,
  AreaPanel,
  ElevationPanel,
} from "./components/AnalysisPanels.jsx";
import { listPackages, getPackage, deletePackage, uploadSlpk, resolveLayerUrl } from "./services/api.js";
import { getCurrentUser, logout } from "./services/auth.js";

export default function App() {
  const viewerRef = useRef(null);
  const [packages, setPackages] = useState([]);
  const [localLayers, setLocalLayers] = useState([]);
  const [pickedAttrs, setPickedAttrs] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [layerOverrides, setLayerOverrides] = useState({});
  const [uploadProgress, setUploadProgress] = useState(null);
  const [aoiData, setAoiData] = useState(null);
  const [isAoiDrawing, setIsAoiDrawing] = useState(false);
  const loadedRef = useRef(new Set());

  // Auth state
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showUserCard, setShowUserCard] = useState(false);

  // Sidebar & Popup state
  const [activeSidebarTab, setActiveSidebarTab] = useState("layers");
  const [showAddDataPanel, setShowAddDataPanel] = useState(false);

  const refreshPackages = useCallback(async () => {
    try {
      const list = await listPackages();
      setPackages(list);
    } catch (e) {
      console.warn("Backend API not reachable (offline mode):", e?.message || e);
    }
  }, []);

  useEffect(() => {
    refreshPackages();
  }, [refreshPackages]);

  // Poll packages while extracting
  useEffect(() => {
    const hasPending = packages.some((p) => p.status === "uploaded" || p.status === "extracting");
    if (!hasPending) return;
    const t = setTimeout(refreshPackages, 1500);
    return () => clearTimeout(t);
  }, [packages, refreshPackages]);

  // Auto load ready packages
  useEffect(() => {
    packages.forEach(async (p) => {
      if (p.status === "ready" && !loadedRef.current.has(p.id)) {
        try {
          const detail = await getPackage(p.id);
          if (detail.layer_url && viewerRef.current) {
            loadedRef.current.add(p.id);
            const finalLayerUrl = resolveLayerUrl(detail.layer_url);
            await viewerRef.current.loadI3SLayer(p.id, finalLayerUrl);
            await viewerRef.current.flyToLayer(p.id);
          }
        } catch (e) {
          loadedRef.current.delete(p.id);
          console.error("Failed to load I3S layer", e);
        }
      }
    });
  }, [packages]);

  // Clean up active analysis widgets when tool changes
  useEffect(() => {
    if (activeTool !== "slice" && activeTool !== "lineOfSight" && activeTool !== "distance" && activeTool !== "area" && activeTool !== "elevationProfile") {
      viewerRef.current?.clearAllAnalysis?.();
    }
  }, [activeTool]);

  async function handleUploadData(file) {
    if (!file) return;
    const fileName = file.name.toLowerCase();
    setUploadProgress(0);
    try {
      if (fileName.endsWith(".slpk") || fileName.endsWith(".spk")) {
        await uploadSlpk(file, (p) => setUploadProgress(p));
        refreshPackages();
        setActiveSidebarTab("layers");
      } else {
        const localId = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        if (viewerRef.current?.loadGenericLayer) {
          await viewerRef.current.loadGenericLayer(localId, file);
        }
        setLocalLayers((prev) => [
          ...prev,
          { id: localId, filename: file.name, status: "ready", visible: true, opacity: 1, isLocal: true },
        ]);
        setActiveSidebarTab("layers");
      }
    } catch (err) {
      console.error("Failed to load file:", err);
      alert("Failed to load dataset: " + (err.message || "Unknown error"));
    } finally {
      setUploadProgress(null);
    }
  }

  function handleToggleVisible(id, visible) {
    viewerRef.current?.setLayerVisible(id, visible);
    const isLocal = localLayers.some((l) => l.id === id);
    if (isLocal) {
      setLocalLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible } : l)));
    } else {
      setLayerOverrides((prev) => ({ ...prev, [id]: { ...prev[id], visible } }));
    }
  }

  function handleOpacityChange(id, opacity) {
    viewerRef.current?.setLayerOpacity(id, opacity);
    const isLocal = localLayers.some((l) => l.id === id);
    if (isLocal) {
      setLocalLayers((prev) => prev.map((l) => (l.id === id ? { ...l, opacity } : l)));
    } else {
      setLayerOverrides((prev) => ({ ...prev, [id]: { ...prev[id], opacity } }));
    }
  }

  function handleFlyTo(id) {
    viewerRef.current?.flyToLayer(id);
  }

  async function handleDelete(id) {
    const isLocal = localLayers.some((l) => l.id === id);
    if (isLocal) {
      viewerRef.current?.unloadLayer(id);
      setLocalLayers((prev) => prev.filter((l) => l.id !== id));
    } else {
      viewerRef.current?.unloadI3SLayer(id);
      loadedRef.current.delete(id);
      try {
        await deletePackage(id);
      } finally {
        refreshPackages();
      }
    }
  }

  const handleStartAoiDrawing = useCallback((mode, options) => {
    setIsAoiDrawing(true);
    if (viewerRef.current?.startAoiDrawing) {
      viewerRef.current.startAoiDrawing(mode, options, (data) => {
        setAoiData(data);
        setIsAoiDrawing(false);
      });
    }
  }, []);

  function handleFinishAoiDrawing() {
    viewerRef.current?.finishAoiDrawing();
    setIsAoiDrawing(false);
  }

  function handleClearAoi() {
    viewerRef.current?.clearAoi();
    setAoiData(null);
    setIsAoiDrawing(false);
  }

  function handleFlyToAoi() {
    viewerRef.current?.flyToAoi();
  }

  function handleExportGeoJson() {
    const geojson = viewerRef.current?.exportAoiGeoJson();
    if (!geojson) { alert("No active AOI geometry to export."); return; }
    const jsonStr = JSON.stringify(geojson, null, 2);
    const blob = new Blob([jsonStr], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aoi_${Date.now()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleLogin(user) {
    setCurrentUser(user);
  }

  function handleLogout() {
    logout();
    setCurrentUser(null);
    setActiveTool(null);
    setShowAdminModal(false);
    setShowUserCard(false);
  }

  const allLayers = [
    ...packages.map((p) => ({
      ...p,
      isBackend: true,
      visible: layerOverrides[p.id]?.visible !== false,
      opacity: layerOverrides[p.id]?.opacity !== undefined ? layerOverrides[p.id]?.opacity : 1,
    })),
    ...localLayers,
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#0b0f19" }}>
      {/* Login Modal: shown when not logged in */}
      {!currentUser && <LoginModal onLogin={handleLogin} />}

      {/* Admin Modal: shown when admin/superadmin clicks Manage Users */}
      {showAdminModal && <AdminModal currentUser={currentUser} onClose={() => setShowAdminModal(false)} />}

      {/* 3D Viewport */}
      <ArcGISViewer ref={viewerRef} onPick={setPickedAttrs} />

      {/* ─── TOP NAVIGATION BAR ─── */}
      <div style={topNavBar} className="responsive-top-navbar">
        {/* Left: Logo & Brand + Quick Tools */}
        <div style={navLeft}>
          <a
            href="https://www.micronetsolutions.in/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit", marginRight: 16 }}
            title="Visit Micronet Solutions"
          >
            <img
              src="https://media.licdn.com/dms/image/v2/C5103AQHPC-qbGnfG8g/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1569932828822?e=2147483647&v=beta&t=eBiVY2-wVaeHPJs8bz9XnPNk72ITTEakAlShx35baQU"
              alt="Micronet Solutions Logo"
              style={logoStyle}
              className="responsive-logo"
            />
            <div style={geo3dTitleStyle} className="responsive-title-text">
              Geo<span style={{ color: "#38bdf8" }}>-3D</span>
            </div>
          </a>

          {/* Top Navbar Quick Actions: Add Data & 3D GIS Analysis Tools */}
          {currentUser && (
            <div
              className="responsive-tools-group"
              style={{
                ...topNavToolsGroupStyle,
                marginLeft: 180,
              }}
            >
              {/* 🥞 Add Data Button */}
              <button
                style={{
                  ...topNavToolBtnStyle,
                  ...(showAddDataPanel ? activeTopNavToolBtnStyle : {}),
                }}
                onClick={() => setShowAddDataPanel((prev) => !prev)}
                title="Add GIS Data Layer (Open Popup Form)"
              >
                🥞 Add Data
              </button>

              <div style={topNavDividerStyle} />

              {/* 3D GIS Tools Shortcuts */}
              <button
                style={{
                  ...topNavToolBtnStyle,
                  ...(activeTool === "aoi" ? activeTopNavToolBtnStyle : {}),
                }}
                onClick={() => setActiveTool(activeTool === "aoi" ? null : "aoi")}
                title="Area of Interest & Vector Drawing"
              >
                ✏️ AOI / Draw
              </button>

              <button
                style={{
                  ...topNavToolBtnStyle,
                  ...(activeTool === "daylight" ? activeTopNavToolBtnStyle : {}),
                }}
                onClick={() => setActiveTool(activeTool === "daylight" ? null : "daylight")}
                title="Sun & Shadow Simulation"
              >
                ☀️ Daylight
              </button>

              <button
                style={{
                  ...topNavToolBtnStyle,
                  ...(activeTool === "slice" ? activeTopNavToolBtnStyle : {}),
                }}
                onClick={() => setActiveTool(activeTool === "slice" ? null : "slice")}
                title="3D Cross-Section Slicing"
              >
                🔪 Slice
              </button>

              <button
                style={{
                  ...topNavToolBtnStyle,
                  ...(activeTool === "lineOfSight" ? activeTopNavToolBtnStyle : {}),
                }}
                onClick={() => setActiveTool(activeTool === "lineOfSight" ? null : "lineOfSight")}
                title="3D Line of Sight Analysis"
              >
                👁️ Line of Sight
              </button>

              <button
                style={{
                  ...topNavToolBtnStyle,
                  ...(activeTool === "elevationProfile" ? activeTopNavToolBtnStyle : {}),
                }}
                onClick={() => setActiveTool(activeTool === "elevationProfile" ? null : "elevationProfile")}
                title="Terrain & Elevation Profile"
              >
                ⛰️ Elevation
              </button>

              <button
                style={{
                  ...topNavToolBtnStyle,
                  ...(activeTool === "distance" ? activeTopNavToolBtnStyle : {}),
                }}
                onClick={() => setActiveTool(activeTool === "distance" ? null : "distance")}
                title="3D Distance Measurement"
              >
                📏 Distance
              </button>

              <button
                style={{
                  ...topNavToolBtnStyle,
                  ...(activeTool === "area" ? activeTopNavToolBtnStyle : {}),
                }}
                onClick={() => setActiveTool(activeTool === "area" ? null : "area")}
                title="3D Surface Area Measurement"
              >
                📐 Area
              </button>

              <button
                style={{
                  ...topNavToolBtnStyle,
                  ...(activeTool === "weather" ? activeTopNavToolBtnStyle : {}),
                }}
                onClick={() => setActiveTool(activeTool === "weather" ? null : "weather")}
                title="Atmospheric Weather Simulation"
              >
                ⛅ Weather
              </button>
            </div>
          )}
        </div>

        {/* Right: Location Search & User Profile */}
        <div style={navRight}>
          <LocationSearch viewerRef={viewerRef} />

          {currentUser ? (
            <div style={{ position: "relative" }}>
              {/* Invisible overlay backdrop to close dropdown on click outside */}
              {showUserCard && (
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 199, background: "transparent" }}
                  onClick={() => setShowUserCard(false)}
                />
              )}

              {/* User Trigger Button */}
              <button
                style={userTriggerBtnStyle}
                onClick={() => setShowUserCard((prev) => !prev)}
                title="Click to view profile & settings"
              >
                <span style={userNameText}>{currentUser.username}</span>
                <span style={userRoleBadgeIcon}>
                  👤
                </span>
                <span style={{ fontSize: 9, color: "#94a3b8", transform: showUserCard ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>
                  ▼
                </span>
              </button>

              {/* User Profile Dropdown Card */}
              {showUserCard && (
                <div style={userDropdownCard}>
                  <div style={userCardHeader}>
                    <div style={userAvatarContainer}>
                      👤
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={userCardName} title={currentUser.username}>
                        {currentUser.username}
                      </div>
                      <div style={
                        currentUser.role === "superadmin" ? superadminRoleTag
                        : currentUser.role === "admin" ? adminRoleTag
                        : userRoleTag
                      }>
                        {currentUser.role === "superadmin" ? "Superadmin" : currentUser.role === "admin" ? "Admin" : "User"}
                      </div>
                    </div>
                  </div>

                  <div style={userCardDivider} />

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(currentUser.role === "admin" || currentUser.role === "superadmin") && (
                      <button
                        style={cardAdminBtnStyle}
                        onClick={() => {
                          setShowAdminModal(true);
                          setShowUserCard(false);
                        }}
                      >
                        ⚙️ Manage Users
                      </button>
                    )}
                    <button
                      style={cardLogoutBtnStyle}
                      onClick={() => {
                        setShowUserCard(false);
                        handleLogout();
                      }}
                    >
                      🚪 Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button style={loginBtnStyle} onClick={() => { }}>
              🔐 Sign In
            </button>
          )}
        </div>
      </div>

      {/* ─── FIXED VERTICAL SIDEBAR + EXPANDED CARD PANEL (only when logged in) ─── */}
      {currentUser && (
        <LayerManager
          layers={allLayers}
          onUploadData={handleUploadData}
          uploadProgress={uploadProgress}
          onToggleVisible={handleToggleVisible}
          onOpacityChange={handleOpacityChange}
          onFlyTo={handleFlyTo}
          onDelete={handleDelete}
          onRefresh={refreshPackages}
          onOpenAoi={() => setActiveTool(activeTool === "aoi" ? null : "aoi")}
          viewerRef={viewerRef}
          activeSidebarTab={activeSidebarTab}
          setActiveSidebarTab={setActiveSidebarTab}
        />
      )}

      {/* ─── ADD DATA POPUP PANEL FORM ─── */}
      {currentUser && showAddDataPanel && (
        <div style={{ position: "absolute", top: 60, left: activeSidebarTab ? 362 : 14, zIndex: 180 }}>
          <AddDataPanel
            onUploadData={(file) => {
              handleUploadData(file);
              setShowAddDataPanel(false);
            }}
            uploadProgress={uploadProgress}
            onClose={() => setShowAddDataPanel(false)}
          />
        </div>
      )}

      {/* ─── ANALYSIS PANELS (Right-docked floating panels) ─── */}
      {currentUser && activeTool === "aoi" && (
        <div style={{ position: "absolute", top: 60, right: 20, zIndex: 90 }}>
          <AoiPanel
            onStartDrawing={handleStartAoiDrawing}
            onFinishDrawing={handleFinishAoiDrawing}
            onClearAoi={handleClearAoi}
            onRemovePoint={(idx) => viewerRef.current?.removePoint(idx)}
            onFlyToAoi={handleFlyToAoi}
            onExportGeoJson={handleExportGeoJson}
            aoiData={aoiData}
            isDrawing={isAoiDrawing}
            onClose={() => setActiveTool(null)}
          />
        </div>
      )}

      {currentUser && activeTool === "daylight" && (
        <div className="responsive-panel" style={{ position: "absolute", top: 60, right: 20, zIndex: 90 }}>
          <DaylightPanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </div>
      )}

      {currentUser && activeTool === "weather" && (
        <div className="responsive-panel" style={{ position: "absolute", top: 60, right: 20, zIndex: 90 }}>
          <WeatherPanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </div>
      )}

      {currentUser && activeTool === "slice" && (
        <div className="responsive-panel" style={{ position: "absolute", top: 60, right: 20, zIndex: 90 }}>
          <SlicePanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </div>
      )}

      {currentUser && activeTool === "lineOfSight" && (
        <div className="responsive-panel" style={{ position: "absolute", top: 60, right: 20, zIndex: 90 }}>
          <LineOfSightPanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </div>
      )}

      {currentUser && activeTool === "distance" && (
        <div className="responsive-panel" style={{ position: "absolute", top: 60, right: 20, zIndex: 90 }}>
          <DistancePanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </div>
      )}

      {currentUser && activeTool === "area" && (
        <div className="responsive-panel" style={{ position: "absolute", top: 60, right: 20, zIndex: 90 }}>
          <AreaPanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </div>
      )}

      {currentUser && activeTool === "elevationProfile" && (
        <div className="responsive-panel" style={{ position: "absolute", top: 60, right: 20, zIndex: 90 }}>
          <ElevationPanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </div>
      )}

      {/* Attributes Inspector (always rendered when visible) */}
      <div style={{ position: "absolute", bottom: 86, right: 20, zIndex: 100 }}>
        <IdentifyPanel attributes={pickedAttrs} onClose={() => setPickedAttrs(null)} />
      </div>
    </div>
  );
}

/* ─── Styles ─── */

const topNavBar = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 48,
  zIndex: 200,
  background: "#111625",
  borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 16px",
  pointerEvents: "auto",
  boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
};

const topMenuItemsGroup = {
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const topMenuItemStyle = {
  background: "transparent",
  border: "none",
  color: "#cbd5e1",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: "6px 10px",
  borderRadius: 6,
  transition: "all 0.15s ease",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const topNavToolsGroupStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  overflowX: "auto",
  flex: 1,
  minWidth: 0,
};

const topNavToolBtnStyle = {
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 6,
  color: "#cbd5e1",
  fontSize: 11.5,
  fontWeight: 600,
  padding: "5px 9px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const activeTopNavToolBtnStyle = {
  background: "rgba(56, 189, 248, 0.2)",
  border: "1px solid #38bdf8",
  color: "#38bdf8",
  fontWeight: 700,
  boxShadow: "0 0 8px rgba(56, 189, 248, 0.3)",
};

const topNavDividerStyle = {
  width: 1,
  height: 18,
  background: "rgba(255, 255, 255, 0.15)",
  margin: "0 4px",
  flexShrink: 0,
};

const navLeft = {
  display: "flex",
  alignItems: "center",
  flex: 1,
  minWidth: 0,
};

const navRight = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const logoStyle = {
  width: 40,
  height: 40,
  borderRadius: 8,
  objectFit: "contain",
  background: "#ffffff",
  padding: 2,
  border: "1.5px solid rgba(56, 189, 248, 0.5)",
  boxShadow: "0 2px 10px rgba(56,189,248,0.25)",
  flexShrink: 0,
};

const geo3dTitleStyle = {
  fontWeight: 900,
  fontSize: 26,
  letterSpacing: "2.5px",
  color: "#ffffff",
  textTransform: "uppercase",
  lineHeight: 1.2,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  textShadow: "0 0 24px rgba(56,189,248,0.5)",
};

const userTriggerBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: 20,
  padding: "6px 14px",
  cursor: "pointer",
  color: "#ffffff",
  transition: "all 0.2s ease",
  outline: "none",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
};

const userRoleBadgeIcon = {
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const userNameText = {
  fontSize: 12,
  fontWeight: 700,
  color: "#e2e8f0",
  letterSpacing: "0.3px",
};

const userDropdownCard = {
  position: "absolute",
  top: "calc(100% + 10px)",
  right: 0,
  width: 220,
  background: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: 14,
  padding: "16px",
  boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6)",
  zIndex: 201,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const userCardHeader = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const userAvatarContainer = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  flexShrink: 0,
};

const userCardName = {
  fontSize: 13,
  fontWeight: 700,
  color: "#f8fafc",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const superadminRoleTag = {
  fontSize: 10,
  fontWeight: 700,
  color: "#c084fc",
  background: "rgba(192, 132, 252, 0.15)",
  border: "1px solid rgba(192, 132, 252, 0.4)",
  borderRadius: 4,
  padding: "1px 6px",
  display: "inline-block",
  marginTop: 2,
};

const adminRoleTag = {
  fontSize: 10,
  fontWeight: 700,
  color: "#fbbf24",
  background: "rgba(251, 191, 36, 0.15)",
  border: "1px solid rgba(251, 191, 36, 0.4)",
  borderRadius: 4,
  padding: "1px 6px",
  display: "inline-block",
  marginTop: 2,
};

const userRoleTag = {
  fontSize: 10,
  fontWeight: 700,
  color: "#38bdf8",
  background: "rgba(56, 189, 248, 0.15)",
  border: "1px solid rgba(56, 189, 248, 0.4)",
  borderRadius: 4,
  padding: "1px 6px",
  display: "inline-block",
  marginTop: 2,
};

const userCardDivider = {
  height: 1,
  background: "rgba(255, 255, 255, 0.1)",
};

const cardAdminBtnStyle = {
  width: "100%",
  background: "rgba(251, 191, 36, 0.12)",
  border: "1px solid rgba(251, 191, 36, 0.35)",
  borderRadius: 8,
  color: "#fbbf24",
  fontSize: 12,
  fontWeight: 700,
  padding: "9px 12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "all 0.2s ease",
};

const cardLogoutBtnStyle = {
  width: "100%",
  background: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  borderRadius: 8,
  color: "#fca5a5",
  fontSize: 12,
  fontWeight: 700,
  padding: "9px 12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "all 0.2s ease",
};

const loginBtnStyle = {
  background: "linear-gradient(135deg, #3182ce, #2b6cb0)",
  border: "none",
  borderRadius: 7,
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  padding: "7px 16px",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(49,130,206,0.4)",
};

const leftSidebarContainer = {
  position: "absolute",
  top: 86,
  left: 0,
  bottom: 14,
  zIndex: 100,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: 270,
  pointerEvents: "auto",
};
