import React, { useEffect, useRef, useState, useCallback } from "react";
import ArcGISViewer from "./components/ArcGISViewer.jsx";
import LayerManager from "./components/LayerManager.jsx";
import IdentifyPanel from "./components/IdentifyPanel.jsx";
import AoiPanel from "./components/AoiPanel.jsx";
import LoginModal from "./components/LoginModal.jsx";
import AdminModal from "./components/AdminModal.jsx";
import LocationSearch from "./components/LocationSearch.jsx";
import AddDataPanel from "./components/AddDataPanel.jsx";
import TopToolbar from "./components/ui/TopToolbar.jsx";
import UserMenu from "./components/ui/UserMenu.jsx";
import Footer from "./components/Footer.jsx";
import {
  DaylightPanel,
  WeatherPanel,
  LineOfSightPanel,
  DistancePanel,
  AreaPanel,
  ElevationPanel,
} from "./components/AnalysisPanels.jsx";
import { listPackages, getPackage, deletePackage, uploadSlpk, resolveLayerUrl } from "./services/api.js";
import { getCurrentUser, logout } from "./services/auth.js";

const LOGO_URL = "/logo.png";

/** Shared shell for the right-docked floating tool panels. */
function PanelDock({ children }) {
  return (
    <div className="absolute right-3 top-[60px] z-[90] sm:right-5">{children}</div>
  );
}

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

  // Auto load ready packages (only fly to layer when user exists and layer exists)
  useEffect(() => {
    packages.forEach(async (p) => {
      if (p.status === "ready" && !loadedRef.current.has(p.id)) {
        try {
          const detail = await getPackage(p.id);
          if (detail.layer_url && viewerRef.current) {
            loadedRef.current.add(p.id);
            const finalLayerUrl = resolveLayerUrl(detail.layer_url);
            await viewerRef.current.loadI3SLayer(p.id, finalLayerUrl);
            // Only zoom into the globe if user exists AND layer exists
            if (currentUser && detail.layer_url) {
              await viewerRef.current.flyToLayer(p.id);
            }
          }
        } catch (e) {
          loadedRef.current.delete(p.id);
          console.error("Failed to load I3S layer", e);
        }
      }
    });
  }, [packages, currentUser]);

  // Clean up active analysis widgets when tool changes
  useEffect(() => {
    if (activeTool !== "aoi") {
      viewerRef.current?.stopAoiDrawing?.();
      setIsAoiDrawing(false);
    }
    if (activeTool !== "lineOfSight" && activeTool !== "distance" && activeTool !== "area" && activeTool !== "elevationProfile") {
      viewerRef.current?.clearAllAnalysis?.();
    }
  }, [activeTool]);

  const hasToolPermission = useCallback(
    (toolId) => {
      if (!currentUser) return false;
      if (currentUser.role === "superadmin" || currentUser.role === "admin") return true;
      return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(toolId);
    },
    [currentUser]
  );

  // Auto-close active tool if current user doesn't have permission for it
  useEffect(() => {
    if (activeTool && !hasToolPermission(activeTool)) {
      setActiveTool(null);
    }
  }, [activeTool, hasToolPermission]);

  const canManageData = currentUser?.role === "superadmin" || currentUser?.role === "admin";

  async function handleUploadData(file) {
    if (!file) return;
    if (!canManageData) {
      alert("Only admin or superadmin has permission to add/upload datasets.");
      return;
    }
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
    if (!canManageData) {
      alert("Only admin or superadmin has permission to delete datasets.");
      return;
    }
    const isLocal = localLayers.some((l) => l.id === id);
    if (isLocal) {
      viewerRef.current?.unloadLayer(id);
      setLocalLayers((prev) => prev.filter((l) => l.id !== id));
    } else {
      viewerRef.current?.unloadI3SLayer(id);
      loadedRef.current.delete(id);
      try {
        await deletePackage(id);
      } catch (e) {
        console.error("Failed to delete package from backend:", e);
      } finally {
        refreshPackages();
      }
    }
    setLayerOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleDeleteAll() {
    if (!canManageData) {
      alert("Only admin or superadmin has permission to delete datasets.");
      return;
    }
    // 1. Unload and clear local layers
    localLayers.forEach((l) => {
      viewerRef.current?.unloadLayer(l.id);
    });
    setLocalLayers([]);

    // 2. Unload and delete server packages
    for (const p of packages) {
      viewerRef.current?.unloadI3SLayer(p.id);
      loadedRef.current.delete(p.id);
      try {
        await deletePackage(p.id);
      } catch (e) {
        console.error("Failed to delete package:", p.id, e);
      }
    }
    setLayerOverrides({});
    refreshPackages();
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

  const handleStopAoiDrawing = useCallback(() => {
    setIsAoiDrawing(false);
    viewerRef.current?.stopAoiDrawing?.();
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
    if (user && packages && packages.length > 0) {
      const readyPkg = packages.find((p) => p.status === "ready");
      if (readyPkg && viewerRef.current) {
        setTimeout(() => {
          viewerRef.current?.flyToLayer(readyPkg.id);
        }, 400);
      }
    }
  }

  function handleLogout() {
    logout();
    setCurrentUser(null);
    setActiveTool(null);
    setShowAdminModal(false);
    setShowUserCard(false);
    setShowAddDataPanel(false);
    viewerRef.current?.clearAllAnalysis?.();
    viewerRef.current?.resetToGlobeView?.();
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
    <div className="relative h-full w-full overflow-hidden bg-surface-0 font-sans text-ink">
      {/* Login Modal: shown when not logged in */}
      {!currentUser && <LoginModal onLogin={handleLogin} />}

      {/* Admin Modal: shown when admin/superadmin clicks Manage Users */}
      {showAdminModal && <AdminModal currentUser={currentUser} onClose={() => setShowAdminModal(false)} />}

      {/* 3D Viewport — always full-bleed beneath the UI chrome */}
      <ArcGISViewer ref={viewerRef} onPick={setPickedAttrs} isLoggedIn={!!currentUser} />

      {/* ─── TOP NAVIGATION BAR ─── */}
      <TopToolbar
        showTools={!!currentUser}
        currentUser={currentUser}
        canAddData={canManageData}
        activeTool={activeTool}
        onToolSelect={(id) => {
          if (!hasToolPermission(id)) return;
          setShowAddDataPanel(false);
          setShowUserCard(false);
          setActiveTool((prev) => (prev === id ? null : id));
        }}
        showAddDataPanel={showAddDataPanel}
        onToggleAddData={() => {
          if (!canManageData) return;
          setShowAddDataPanel((prev) => {
            const next = !prev;
            if (next) {
              setActiveTool(null);
              setShowUserCard(false);
            }
            return next;
          });
        }}
        brand={
          <a
            href="https://www.micronetsolutions.in/"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit Micronet Solutions"
            className="flex shrink-0 items-center gap-3 pl-2 no-underline transition-opacity hover:opacity-95"
          >
            <img
              src={LOGO_URL}
              alt="Micronet Solutions"
              className="h-9 w-9 shrink-0 rounded-lg object-contain"
            />
            <span className="hidden text-[21px] font-extrabold uppercase leading-none tracking-[0.16em] text-white sm:block">
              Geo<span className="text-accent">-3D</span>
            </span>
          </a>
        }
        right={
          <>
            {currentUser && <LocationSearch viewerRef={viewerRef} />}

            {currentUser ? (
              <UserMenu
                currentUser={currentUser}
                isOpen={showUserCard}
                onToggle={() => {
                  setShowUserCard((prev) => {
                    const next = !prev;
                    if (next) {
                      setShowAddDataPanel(false);
                    }
                    return next;
                  });
                }}
                onClose={() => setShowUserCard(false)}
                onManageUsers={() => {
                  setShowAdminModal(true);
                  setShowUserCard(false);
                }}
                onLogout={() => {
                  setShowUserCard(false);
                  handleLogout();
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => { }}
                className="rounded-lg bg-accent px-3.5 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-accent-soft"
              >
                Sign in
              </button>
            )}
          </>
        }
      />

      {/* ─── LEFT LAYER PANEL (only when logged in) ─── */}
      {currentUser && (
        <LayerManager
          layers={allLayers}
          canDelete={canManageData}
          onUploadData={handleUploadData}
          uploadProgress={uploadProgress}
          onToggleVisible={handleToggleVisible}
          onOpacityChange={handleOpacityChange}
          onFlyTo={handleFlyTo}
          onDelete={handleDelete}
          onDeleteAll={handleDeleteAll}
          onRefresh={refreshPackages}
          onOpenAoi={() => {
            if (!hasToolPermission("aoi")) return;
            setShowAddDataPanel(false);
            setShowUserCard(false);
            setActiveTool(activeTool === "aoi" ? null : "aoi");
          }}
          viewerRef={viewerRef}
          activeSidebarTab={activeSidebarTab}
          setActiveSidebarTab={setActiveSidebarTab}
        />
      )}

      {/* ─── ADD DATA POPUP PANEL FORM (Right-docked floating panel) ─── */}
      {currentUser && canManageData && showAddDataPanel && (
        <PanelDock>
          <AddDataPanel
            onUploadData={(file) => {
              handleUploadData(file);
              setShowAddDataPanel(false);
            }}
            uploadProgress={uploadProgress}
            onClose={() => setShowAddDataPanel(false)}
          />
        </PanelDock>
      )}

      {/* ─── ANALYSIS PANELS (Right-docked floating panels) ─── */}
      {currentUser && hasToolPermission("aoi") && activeTool === "aoi" && (
        <PanelDock>
          <AoiPanel
            onStartDrawing={handleStartAoiDrawing}
            onStopDrawing={handleStopAoiDrawing}
            onFinishDrawing={handleFinishAoiDrawing}
            onClearAoi={handleClearAoi}
            onRemovePoint={(idx) => viewerRef.current?.removePoint(idx)}
            onFlyToAoi={handleFlyToAoi}
            onExportGeoJson={handleExportGeoJson}
            aoiData={aoiData}
            isDrawing={isAoiDrawing}
            onClose={() => {
              handleStopAoiDrawing();
              setActiveTool(null);
            }}
          />
        </PanelDock>
      )}

      {currentUser && hasToolPermission("daylight") && activeTool === "daylight" && (
        <PanelDock>
          <DaylightPanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </PanelDock>
      )}

      {currentUser && hasToolPermission("weather") && activeTool === "weather" && (
        <PanelDock>
          <WeatherPanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </PanelDock>
      )}

      {currentUser && hasToolPermission("lineOfSight") && activeTool === "lineOfSight" && (
        <PanelDock>
          <LineOfSightPanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </PanelDock>
      )}

      {currentUser && hasToolPermission("distance") && activeTool === "distance" && (
        <PanelDock>
          <DistancePanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </PanelDock>
      )}

      {currentUser && hasToolPermission("area") && activeTool === "area" && (
        <PanelDock>
          <AreaPanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </PanelDock>
      )}

      {currentUser && hasToolPermission("elevationProfile") && activeTool === "elevationProfile" && (
        <PanelDock>
          <ElevationPanel viewerRef={viewerRef} onClose={() => setActiveTool(null)} />
        </PanelDock>
      )}

      {/* Attributes Inspector (always rendered when visible) */}
      <div className="absolute bottom-[86px] right-3 z-[100] sm:right-5">
        <IdentifyPanel attributes={pickedAttrs} onClose={() => setPickedAttrs(null)} />
      </div>

      {/* ─── BOTTOM STATUS FOOTER (h-10, Live Lat/Lon/Evl Readout) ─── */}
      {currentUser && <Footer />}
    </div>
  );
}
