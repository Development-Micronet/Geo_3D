import React, { useEffect, useImperativeHandle, forwardRef, useRef } from "react";
import "@arcgis/core/assets/esri/themes/dark/main.css";
import esriConfig from "@arcgis/core/config";
esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY || ""; // Optional API Key for Esri services, defaults to empty for local SLPKs
if (typeof window !== "undefined" && esriConfig?.request?.corsEnabledServers) {
  const currentHost = window.location.hostname;
  if (currentHost && !esriConfig.request.corsEnabledServers.includes(`${currentHost}:8000`)) {
    esriConfig.request.corsEnabledServers.push(
      `${currentHost}:8000`,
      "localhost:8000",
      "127.0.0.1:8000"
    );
  }
}
esriConfig.request.interceptors.push({
  urls: [/arcgis\.com/i, /wayback/i, /esri/i],
  before: function (params) {
    if (params.requestOptions && params.requestOptions.query) {
      delete params.requestOptions.query.token;
      delete params.requestOptions.query.apiKey;
    }
  },
});
import Map from "@arcgis/core/Map";
import SceneView from "@arcgis/core/views/SceneView";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import Polyline from "@arcgis/core/geometry/Polyline";
import Polygon from "@arcgis/core/geometry/Polygon";
import Extent from "@arcgis/core/geometry/Extent";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import * as projection from "@arcgis/core/geometry/projection";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import TextSymbol from "@arcgis/core/symbols/TextSymbol";
import PolygonSymbol3D from "@arcgis/core/symbols/PolygonSymbol3D";
import FillSymbol3DLayer from "@arcgis/core/symbols/FillSymbol3DLayer";
import LineSymbol3DLayer from "@arcgis/core/symbols/LineSymbol3DLayer";
import PointSymbol3D from "@arcgis/core/symbols/PointSymbol3D";
import ObjectSymbol3DLayer from "@arcgis/core/symbols/ObjectSymbol3DLayer";
import IntegratedMesh3DTilesLayer from "@arcgis/core/layers/IntegratedMesh3DTilesLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import MediaLayer from "@arcgis/core/layers/MediaLayer";
import ImageElement from "@arcgis/core/layers/support/ImageElement";
import ExtentAndRotationGeoreference from "@arcgis/core/layers/support/ExtentAndRotationGeoreference";
import Daylight from "@arcgis/core/widgets/Daylight";
import LineOfSight from "@arcgis/core/widgets/LineOfSight";
import ElevationProfile from "@arcgis/core/widgets/ElevationProfile";
import DirectLineMeasurement3D from "@arcgis/core/widgets/DirectLineMeasurement3D";
import AreaMeasurement3D from "@arcgis/core/widgets/AreaMeasurement3D";
import Weather from "@arcgis/core/widgets/Weather";
import Compass from "@arcgis/core/widgets/Compass";

import Basemap from "@arcgis/core/Basemap";
import TileLayer from "@arcgis/core/layers/TileLayer";
import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
import {
  parseKml,
  parseKmz,
  parseGpx,
  parseCsv,
  parseDsmGrid,
  parseShapefile,
  parseGeoTiffRaster,
} from "../services/gisParsers.js";

function normalizeCoord(c) {
  if (!c || c.length < 2) return [0, 0, 0];
  let x = c[0];
  let y = c[1];
  let z = c[2] || 0;

  if (Math.abs(x) > 180 || Math.abs(y) > 90) {
    if (x >= 100000 && x <= 1000000 && y >= 0 && y <= 10000000) {
      const [lon, lat] = utmToLatLon(x, y, 43, false);
      x = lon;
      y = lat;
    } else {
      const [lon, lat] = webMercatorToWgs84(x, y);
      x = lon;
      y = lat;
    }
  }
  return [x, y, z];
}

function hexToRgbaArray(hex, alpha = 1) {
  if (!hex) return [56, 189, 248, alpha];
  let c = hex.replace("#", "");
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  if (isNaN(num)) return [56, 189, 248, alpha];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, alpha];
}

function calculateDistanceKm(p1, p2) {
  if (!p1 || !p2) return 0;
  const R = 6371;
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLon = ((p2[0] - p1[0]) * Math.PI) / 180;
  const lat1 = (p1[1] * Math.PI) / 180;
  const lat2 = (p2[1] * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculatePathLengthKm(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistanceKm(points[i], points[i + 1]);
  }
  return total;
}

function calculatePolygonAreaKm2(coords) {
  const n = coords ? coords.length : 0;
  if (n < 3) return 0;
  let area = 0;
  let avgLat = 0;
  for (let i = 0; i < n; i++) {
    avgLat += coords[i][1];
    const j = (i + 1) % n;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  avgLat = (avgLat / n) * (Math.PI / 180);
  return Math.max(0.0001, (Math.abs(area) / 2) * Math.cos(avgLat) * 111.32 * 111.32);
}

function createGraphicsFromGeoJson(geojson) {
  const graphics = [];
  if (!geojson || !geojson.features) return graphics;

  geojson.features.forEach((feature) => {
    const geom = feature.geometry;
    if (!geom) return;

    const style = feature.properties?._style || {};
    let geometry = null;
    let symbol = null;

    if (geom.type === "Point") {
      const [lon, lat, z] = normalizeCoord(geom.coordinates);
      geometry = new Point({
        longitude: lon,
        latitude: lat,
        z: z,
      });

      const ptColor = style.iconColor || [255, 69, 58, 1];
      symbol = new SimpleMarkerSymbol({
        color: ptColor,
        size: style.iconScale ? Math.min(24, Math.max(8, style.iconScale * 12)) : 10,
        outline: {
          color: [255, 255, 255, 1],
          width: 2,
        },
      });
    } else if (geom.type === "LineString") {
      const paths = geom.coordinates.map(normalizeCoord);
      geometry = new Polyline({
        paths: [paths],
      });

      const lineColor = style.lineColor || [255, 204, 0, 1];
      const lineWidth = style.lineWidth ? Math.min(10, Math.max(1.5, style.lineWidth)) : 3;
      symbol = new SimpleLineSymbol({
        color: lineColor,
        width: lineWidth,
      });
    } else if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
      const rawRings = geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat(1);
      const rings = rawRings.map((ring) => (Array.isArray(ring) ? ring.map(normalizeCoord) : ring));
      geometry = new Polygon({ rings });

      let fillColor;
      if (style.polyFill === false) {
        fillColor = [0, 0, 0, 0];
      } else if (style.polyColor) {
        fillColor = style.polyColor;
      } else {
        fillColor = [255, 204, 0, 0.22];
      }

      const outlineColor = style.lineColor || [255, 204, 0, 1];
      const outlineWidth = style.lineWidth ? Math.min(8, Math.max(1, style.lineWidth)) : 2;

      symbol = new SimpleFillSymbol({
        color: fillColor,
        outline: {
          color: style.polyOutline === false ? [0, 0, 0, 0] : outlineColor,
          width: outlineWidth,
        },
      });
    }

    if (geometry) {
      const graphic = new Graphic({
        geometry: geometry,
        symbol: symbol,
        attributes: feature.properties || {},
      });
      graphics.push(graphic);
    }
  });

  return graphics;
}

const ArcGISViewer = forwardRef(function ArcGISViewer({ onPick, onCursorMove, isLoggedIn = true }, ref) {
  const mapDivRef = useRef(null);
  const viewRef = useRef(null);
  const compassContainerRef = useRef(null);
  const layersRef = useRef({});
  const activeWidgetRef = useRef(null);
  const historicalLayerRef = useRef(null);
  const aoiLayerRef = useRef(null);
  const aoiDrawingStateRef = useRef({ active: false, mode: "bbox", points: [], options: {}, callback: null });
  const lastAoiDataRef = useRef(null);
  const measurementsLayerRef = useRef(null);
  const distanceMeasurementsRef = useRef([]);
  const distanceDrawingStateRef = useRef({ active: false, points: [], unit: "metric", callback: null });
  const distPreviewGraphicRef = useRef(null);
  const areaMeasurementsRef = useRef([]);
  const areaDrawingStateRef = useRef({ active: false, points: [], unit: "square-meters", callback: null });
  const areaPreviewGraphicRef = useRef(null);
  const elevationHoverGraphicRef = useRef(null);
  const onCursorMoveRef = useRef(onCursorMove);
  onCursorMoveRef.current = onCursorMove;
  const isLoggedInRef = useRef(isLoggedIn);
  isLoggedInRef.current = isLoggedIn;

  useEffect(() => {
    if (!mapDivRef.current) return;

    // Completely disable API key / tokens to allow open-source Wayback & public WMTS tiles to load with zero CORS issues
    delete esriConfig.apiKey;
    esriConfig.apiKey = null;

    const aoiLayer = new GraphicsLayer({
      title: "Area of Interest (AOI)",
      elevationInfo: { mode: "on-the-ground" },
    });
    aoiLayerRef.current = aoiLayer;

    const measurementsLayer = new GraphicsLayer({
      title: "3D Measurements Layer",
      elevationInfo: { mode: "relative-to-ground" },
    });
    measurementsLayerRef.current = measurementsLayer;

    const map = new Map({
      basemap: "satellite",
      ground: "world-elevation",
      layers: [aoiLayer, measurementsLayer],
    });

    const view = new SceneView({
      container: mapDivRef.current,
      map: map,
      viewingMode: "global", // 3D spherical planet Earth
      qualityProfile: "high",
      alphaCompositingEnabled: true,
      environment: {
        starsEnabled: true,
        atmosphereEnabled: true,
        atmosphere: { quality: "high" },
        background: {
          type: "color",
          color: [0, 0, 0, 1],
        },
        lighting: {
          type: "sun",
          directShadowsEnabled: true,
          ambientOcclusionEnabled: true,
          date: new Date(),
        },
        weather: { type: "sunny", cloudCover: 0.15 },
      },
      camera: {
        position: {
          x: 78.9629,
          y: 20.5937,
          z: 22000000,
        },
        heading: 0,
        tilt: 0,
      },
    });

    // Remove all default UI components (e.g. NavigationToggle, Zoom)
    view.ui.components = [];

    // Add only the compass widget with custom goTo behavior to ensure it resets tilt and heading
    const compass = new Compass({
      view: view,
      container: compassContainerRef.current,
      goToOverride: function(view, goToParameters) {
        // Force the camera to face straight down (tilt 0) and perfect North (heading 0)
        const camera = view.camera.clone();
        camera.heading = 0;
        camera.tilt = 0;
        return view.goTo(camera, { duration: 400 });
      }
    });

    // Click handler for AOI Drawing, Feature Picking & Hold Coordinates
    view.on("click", async (event) => {
      if (!isLoggedIn) return;
      const aoiState = aoiDrawingStateRef.current;
      const distActive = distanceDrawingStateRef.current?.active;
      const areaActive = areaDrawingStateRef.current?.active;

      // When clicking on map and not actively drawing, dispatch hold coordinates event
      if (!aoiState.active && !distActive && !areaActive) {
        let pt = event.mapPoint;
        if (!pt) {
          try {
            pt = view.toMap({ x: event.x, y: event.y });
          } catch (e) {
            pt = null;
          }
        }
        if (pt && (pt.latitude !== undefined || pt.longitude !== undefined || pt.x !== undefined)) {
          const lat = pt.latitude !== undefined ? pt.latitude : pt.y;
          const lon = pt.longitude !== undefined ? pt.longitude : pt.x;
          const elev = pt.z !== undefined && pt.z !== null ? pt.z : 0;
          const clickCoords = {
            lat,
            lon,
            elevation: elev,
            x: pt.x,
            y: pt.y,
            z: pt.z,
            spatialReference: pt.spatialReference?.wkid || 4326,
          };
          window.dispatchEvent(new CustomEvent("geo3d:hold-coordinates", { detail: clickCoords }));
        }
      }

      if (aoiState.active && event.mapPoint) {
        event.stopPropagation();
        const pt = event.mapPoint;
        const mode = aoiState.mode || "bbox";
        const stroke = hexToRgbaArray(aoiState.options?.strokeColor || "#38bdf8", 1);
        const fill = hexToRgbaArray(aoiState.options?.strokeColor || "#38bdf8", aoiState.options?.fillOpacity ?? 0.2);

        if (mode === "point") {
          if (!aoiState.points) aoiState.points = [];
          aoiState.points.push([pt.longitude, pt.latitude, pt.z || 0]);

          aoiLayer.removeAll();
          aoiState.points.forEach((coord, idx) => {
            const pointGeom = new Point({
              longitude: coord[0],
              latitude: coord[1],
              z: coord[2],
            });

            aoiLayer.add(
              new Graphic({
                geometry: pointGeom,
                symbol: new SimpleMarkerSymbol({
                  color: stroke,
                  size: 12,
                  outline: { color: [255, 255, 255, 1], width: 2 },
                }),
                attributes: {
                  Name: `Point ${idx + 1}`,
                  Longitude: coord[0].toFixed(5),
                  Latitude: coord[1].toFixed(5),
                  Elevation: `${coord[2].toFixed(1)} m`,
                },
              })
            );
          });

          const pointsList = aoiState.points.map((coord, idx) => ({
            id: idx + 1,
            lon: coord[0].toFixed(5),
            lat: coord[1].toFixed(5),
            elevation: coord[2].toFixed(1),
          }));

          const aoiData = {
            type: aoiState.points.length > 1 ? `Multi-Point (${aoiState.points.length} Points)` : "Point Marker",
            pointCount: aoiState.points.length,
            pointsList: pointsList,
            coordinates: aoiState.points.map((p) => [p[0].toFixed(5), p[1].toFixed(5), p[2].toFixed(1)]),
            center: [pt.longitude.toFixed(5), pt.latitude.toFixed(5)],
            elevation: (pt.z || 0).toFixed(1),
            geometryType: "point",
            geometry: pt,
            rawPoints: aoiState.points,
          };

          lastAoiDataRef.current = aoiData;
          if (aoiState.callback) aoiState.callback(aoiData);
          return;
        }

        if (mode === "bbox" || mode === "rectangle") {
          // Bounding Box (Rectangle 2-Click Mode)
          if (!aoiState.points || aoiState.points.length === 0) {
            aoiState.points = [[pt.longitude, pt.latitude]];
            aoiLayer.removeAll();
            aoiLayer.add(
              new Graphic({
                geometry: pt,
                symbol: new SimpleMarkerSymbol({
                  color: stroke,
                  size: 9,
                  outline: { color: [255, 255, 255, 1], width: 2 },
                }),
              })
            );
          } else {
            const p1 = aoiState.points[0];
            const p2 = [pt.longitude, pt.latitude];

            const minX = Math.min(p1[0], p2[0]);
            const maxX = Math.max(p1[0], p2[0]);
            const minY = Math.min(p1[1], p2[1]);
            const maxY = Math.max(p1[1], p2[1]);

            const aoiPolygon = new Polygon({
              rings: [
                [
                  [minX, maxY, 0],
                  [maxX, maxY, 0],
                  [maxX, minY, 0],
                  [minX, minY, 0],
                  [minX, maxY, 0],
                ],
              ],
              spatialReference: { wkid: 4326 },
            });

            const midLat = ((minY + maxY) / 2) * (Math.PI / 180);
            const widthKm = Math.abs(maxX - minX) * 111.32 * Math.cos(midLat);
            const heightKm = Math.abs(maxY - minY) * 111.32;
            const areaKm2 = Math.max(0.0001, widthKm * heightKm);

            finishAoiPolygon(aoiPolygon, "Bounding Box (BBOX)", {
              bbox: [minX.toFixed(5), minY.toFixed(5), maxX.toFixed(5), maxY.toFixed(5)],
              areaKm2: areaKm2.toFixed(3),
              areaAcres: (areaKm2 * 247.105).toFixed(2),
              perimeterKm: ((widthKm + heightKm) * 2).toFixed(2),
              center: [((minX + maxX) / 2).toFixed(5), ((minY + maxY) / 2).toFixed(5)],
            });
          }
        } else if (mode === "circle") {
          // Circle Mode (Center + Radius)
          if (!aoiState.points || aoiState.points.length === 0) {
            aoiState.points = [[pt.longitude, pt.latitude]];
            aoiLayer.removeAll();
            aoiLayer.add(
              new Graphic({
                geometry: pt,
                symbol: new SimpleMarkerSymbol({
                  color: stroke,
                  size: 9,
                  outline: { color: [255, 255, 255, 1], width: 2 },
                }),
              })
            );
          } else {
            const center = aoiState.points[0];
            const edge = [pt.longitude, pt.latitude];

            const radiusKm = calculateDistanceKm(center, edge);
            const areaKm2 = Math.PI * radiusKm * radiusKm;

            const ring = [];
            const steps = 64;
            const midLat = (center[1] * Math.PI) / 180;
            const degRadiusLat = radiusKm / 111.32;
            const degRadiusLon = radiusKm / (111.32 * Math.cos(midLat));

            for (let i = 0; i <= steps; i++) {
              const theta = (i / steps) * 2 * Math.PI;
              ring.push([center[0] + degRadiusLon * Math.cos(theta), center[1] + degRadiusLat * Math.sin(theta), 0]);
            }

            const aoiPolygon = new Polygon({
              rings: [ring],
              spatialReference: { wkid: 4326 },
            });

            finishAoiPolygon(aoiPolygon, "Circle AOI", {
              areaKm2: areaKm2.toFixed(3),
              areaAcres: (areaKm2 * 247.105).toFixed(2),
              perimeterKm: (2 * Math.PI * radiusKm).toFixed(2),
              radiusKm: radiusKm.toFixed(2),
              center: [center[0].toFixed(5), center[1].toFixed(5)],
            });
          }
        } else if (mode === "line" || mode === "polyline") {
          // Polyline Mode: Add vertices point by point
          if (!aoiState.points) aoiState.points = [];
          aoiState.points.push([pt.longitude, pt.latitude, pt.z || 0]);

          aoiLayer.removeAll();
          // Render vertices
          aoiState.points.forEach((coord) => {
            aoiLayer.add(
              new Graphic({
                geometry: new Point({ longitude: coord[0], latitude: coord[1], z: coord[2] || 0 }),
                symbol: new SimpleMarkerSymbol({
                  color: stroke,
                  size: 8,
                  outline: { color: [255, 255, 255, 1], width: 1.5 },
                }),
              })
            );
          });

          // Render polyline connecting vertices
          if (aoiState.points.length >= 2) {
            aoiLayer.add(
              new Graphic({
                geometry: new Polyline({ paths: [aoiState.points] }),
                symbol: new SimpleLineSymbol({
                  color: stroke,
                  width: 3,
                }),
              })
            );
          }
        } else {
          // Freeform Polygon Mode (Click point by point)
          if (!aoiState.points) aoiState.points = [];
          aoiState.points.push([pt.longitude, pt.latitude, pt.z || 0]);

          aoiLayer.removeAll();

          // Render vertices
          aoiState.points.forEach((coord) => {
            aoiLayer.add(
              new Graphic({
                geometry: new Point({ longitude: coord[0], latitude: coord[1], z: coord[2] || 0 }),
                symbol: new SimpleMarkerSymbol({
                  color: stroke,
                  size: 8,
                  outline: { color: [255, 255, 255, 1], width: 1.5 },
                }),
              })
            );
          });

          // Render polyline connecting vertices
          if (aoiState.points.length >= 2) {
            aoiLayer.add(
              new Graphic({
                geometry: new Polyline({ paths: [aoiState.points] }),
                symbol: new SimpleLineSymbol({
                  color: stroke,
                  width: 3,
                  style: "dash",
                }),
              })
            );
          }
        }
        return;
      }

      // Pick feature attributes on click
      try {
        const response = await view.hitTest(event);
        if (response.results.length > 0) {
          const graphic = response.results[0].graphic;
          if (graphic && graphic.attributes) {
            onPick && onPick(graphic.attributes, event.screenPoint);
            return;
          }
        }
        onPick && onPick(null, null);
      } catch (err) {
        console.warn("Hit test error:", err);
      }
    });

    // Double-click to complete Distance, Area, Freeform Polygon or Polyline
    view.on("double-click", (event) => {
      const distState = distanceDrawingStateRef.current;
      if (distState.active && distState.points && distState.points.length >= 2) {
        event.stopPropagation();
        finishDistanceMeasurement();
        return;
      }

      const areaState = areaDrawingStateRef.current;
      if (areaState.active && areaState.points && areaState.points.length >= 3) {
        event.stopPropagation();
        finishAreaMeasurement();
        return;
      }

      const aoiState = aoiDrawingStateRef.current;
      if (!aoiState.active || !aoiState.points) return;
      event.stopPropagation();

      const mode = aoiState.mode || "polygon";
      if ((mode === "line" || mode === "polyline") && aoiState.points.length >= 2) {
        finishAoiLine();
      } else if ((mode === "polygon" || mode === "freeform") && aoiState.points.length >= 3) {
        finishAoiFreeformPolygon();
      }
    });

    function renderDistanceInterim() {
      const distState = distanceDrawingStateRef.current;
      if (!distState.points || distState.points.length === 0) return;

      if (distPreviewGraphicRef.current) {
        measurementsLayer.remove(distPreviewGraphicRef.current);
        distPreviewGraphicRef.current = null;
      }

      const pts = distState.points;
      const lastCoord = pts[pts.length - 1];
      measurementsLayer.add(
        new Graphic({
          geometry: new Point({ longitude: lastCoord[0], latitude: lastCoord[1], z: lastCoord[2] || 0 }),
          symbol: new SimpleMarkerSymbol({
            color: [56, 189, 248, 1],
            size: 8,
            outline: { color: [255, 255, 255, 1], width: 1.5 },
          }),
        })
      );

      if (pts.length >= 2) {
        const polyline = new Polyline({ paths: [pts], spatialReference: { wkid: 4326 } });
        measurementsLayer.add(
          new Graphic({
            geometry: polyline,
            symbol: new SimpleLineSymbol({
              color: [56, 189, 248, 0.9],
              width: 3,
              style: "dash",
            }),
          })
        );
      }
    }

    function renderAreaInterim() {
      const areaState = areaDrawingStateRef.current;
      if (!areaState.points || areaState.points.length === 0) return;

      if (areaPreviewGraphicRef.current) {
        measurementsLayer.remove(areaPreviewGraphicRef.current);
        areaPreviewGraphicRef.current = null;
      }

      const pts = areaState.points;
      const lastCoord = pts[pts.length - 1];
      measurementsLayer.add(
        new Graphic({
          geometry: new Point({ longitude: lastCoord[0], latitude: lastCoord[1], z: lastCoord[2] || 0 }),
          symbol: new SimpleMarkerSymbol({
            color: [56, 189, 248, 1],
            size: 8,
            outline: { color: [255, 255, 255, 1], width: 1.5 },
          }),
        })
      );

      if (pts.length >= 2) {
        const polyline = new Polyline({ paths: [pts], spatialReference: { wkid: 4326 } });
        measurementsLayer.add(
          new Graphic({
            geometry: polyline,
            symbol: new SimpleLineSymbol({
              color: [56, 189, 248, 0.9],
              width: 2.5,
              style: "dash",
            }),
          })
        );
      }
    }

    function finishDistanceMeasurement() {
      const distState = distanceDrawingStateRef.current;
      if (!distState.points || distState.points.length < 2) return;

      if (distPreviewGraphicRef.current) {
        measurementsLayer.remove(distPreviewGraphicRef.current);
        distPreviewGraphicRef.current = null;
      }

      const pts = [...distState.points];
      const polyline = new Polyline({
        paths: [pts],
        spatialReference: { wkid: 4326 },
      });

      let total3DDistMeters = 0;
      let totalHorizDistMeters = 0;
      const segmentDetails = [];

      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const horizKm = calculateDistanceKm(p1, p2);
        const horizM = horizKm * 1000;
        const dZ = (p2[2] || 0) - (p1[2] || 0);
        const seg3DM = Math.sqrt(horizM * horizM + dZ * dZ);

        totalHorizDistMeters += horizM;
        total3DDistMeters += seg3DM;
        segmentDetails.push({
          segment: i + 1,
          horizMeters: horizM,
          direct3DMeters: seg3DM,
          dzMeters: dZ,
        });
      }

      const firstPt = pts[0];
      const lastPt = pts[pts.length - 1];
      const totalDzMeters = Math.abs((lastPt[2] || 0) - (firstPt[2] || 0));

      const measurementId = `dist_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const num = distanceMeasurementsRef.current.length + 1;

      const graphicsToAdd = [];

      // Line
      const lineGraphic = new Graphic({
        geometry: polyline,
        symbol: new SimpleLineSymbol({
          color: [56, 189, 248, 1],
          width: 3.5,
        }),
        attributes: { id: measurementId, name: `Line #${num}` },
      });
      graphicsToAdd.push(lineGraphic);

      // Vertex Markers
      pts.forEach((coord) => {
        graphicsToAdd.push(
          new Graphic({
            geometry: new Point({ longitude: coord[0], latitude: coord[1], z: coord[2] || 0 }),
            symbol: new SimpleMarkerSymbol({
              color: [56, 189, 248, 1],
              size: 8,
              outline: { color: [255, 255, 255, 1], width: 1.5 },
            }),
            attributes: { id: measurementId },
          })
        );
      });

      // Label at midpoint
      const midLon = (polyline.extent.xmin + polyline.extent.xmax) / 2;
      const midLat = (polyline.extent.ymin + polyline.extent.ymax) / 2;
      const midZ = ((firstPt[2] || 0) + (lastPt[2] || 0)) / 2 + 15;
      const distLabel = total3DDistMeters >= 1000
        ? `${(total3DDistMeters / 1000).toFixed(2)} km`
        : `${total3DDistMeters.toFixed(1)} m`;

      graphicsToAdd.push(
        new Graphic({
          geometry: new Point({ longitude: midLon, latitude: midLat, z: midZ }),
          symbol: new TextSymbol({
            text: `#${num}: ${distLabel}`,
            color: [255, 255, 255, 1],
            haloColor: [15, 23, 42, 0.95],
            haloSize: 2,
            font: { size: 10, weight: "bold", family: "Inter" },
            yoffset: 10,
          }),
          attributes: { id: measurementId },
        })
      );

      graphicsToAdd.forEach((g) => measurementsLayer.add(g));

      const measurementItem = {
        id: measurementId,
        number: num,
        total3DDistMeters,
        totalHorizDistMeters,
        totalDzMeters,
        segmentCount: pts.length - 1,
        segments: segmentDetails,
        points: pts,
        extent: polyline.extent,
        center: [midLon.toFixed(5), midLat.toFixed(5)],
        graphics: graphicsToAdd,
      };

      distanceMeasurementsRef.current.push(measurementItem);
      if (distState.callback) {
        distState.callback([...distanceMeasurementsRef.current]);
      }

      distState.points = [];
    }

    function finishAreaMeasurement() {
      const areaState = areaDrawingStateRef.current;
      if (!areaState.points || areaState.points.length < 3) return;

      if (areaPreviewGraphicRef.current) {
        measurementsLayer.remove(areaPreviewGraphicRef.current);
        areaPreviewGraphicRef.current = null;
      }

      const pts = [...areaState.points];
      const closedPts = [...pts, pts[0]];
      const polygon = new Polygon({
        rings: [closedPts],
        spatialReference: { wkid: 4326 },
      });

      const areaKm2 = calculatePolygonAreaKm2(pts);
      const areaSqMeters = areaKm2 * 1000000;
      const perimeterKm = calculatePathLengthKm(closedPts);
      const perimeterMeters = perimeterKm * 1000;

      const measurementId = `area_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const num = areaMeasurementsRef.current.length + 1;

      const graphicsToAdd = [];

      // 3D Polygon
      const polyGraphic = new Graphic({
        geometry: polygon,
        symbol: new PolygonSymbol3D({
          symbolLayers: [
            new FillSymbol3DLayer({
              material: { color: [56, 189, 248, 0.25] },
              outline: {
                color: [56, 189, 248, 1],
                size: 2.5,
              },
            }),
          ],
        }),
        attributes: { id: measurementId, name: `Area #${num}` },
      });
      graphicsToAdd.push(polyGraphic);

      // Vertex markers
      pts.forEach((coord) => {
        graphicsToAdd.push(
          new Graphic({
            geometry: new Point({ longitude: coord[0], latitude: coord[1], z: coord[2] || 0 }),
            symbol: new SimpleMarkerSymbol({
              color: [56, 189, 248, 1],
              size: 8,
              outline: { color: [255, 255, 255, 1], width: 1.5 },
            }),
            attributes: { id: measurementId },
          })
        );
      });

      // Centroid label
      let sumLon = 0, sumLat = 0, sumZ = 0;
      pts.forEach((p) => { sumLon += p[0]; sumLat += p[1]; sumZ += (p[2] || 0); });
      const centLon = sumLon / pts.length;
      const centLat = sumLat / pts.length;
      const centZ = sumZ / pts.length + 15;

      const areaLabel = areaSqMeters >= 1000000
        ? `${(areaSqMeters / 1e6).toFixed(3)} km²`
        : `${areaSqMeters.toFixed(1)} m²`;

      graphicsToAdd.push(
        new Graphic({
          geometry: new Point({ longitude: centLon, latitude: centLat, z: centZ }),
          symbol: new TextSymbol({
            text: `Area #${num}: ${areaLabel}`,
            color: [255, 255, 255, 1],
            haloColor: [15, 23, 42, 0.95],
            haloSize: 2,
            font: { size: 10, weight: "bold", family: "Inter" },
            yoffset: 10,
          }),
          attributes: { id: measurementId },
        })
      );

      graphicsToAdd.forEach((g) => measurementsLayer.add(g));

      const measurementItem = {
        id: measurementId,
        number: num,
        areaSqMeters,
        areaKm2,
        areaAcres: areaKm2 * 247.105,
        areaHectares: areaKm2 * 100,
        areaSqFeet: areaSqMeters * 10.7639,
        perimeterMeters,
        perimeterKm,
        points: pts,
        centroid: [centLon.toFixed(5), centLat.toFixed(5)],
        extent: polygon.extent,
        graphics: graphicsToAdd,
      };

      areaMeasurementsRef.current.push(measurementItem);
      if (areaState.callback) {
        areaState.callback([...areaMeasurementsRef.current]);
      }

      areaState.points = [];
    }

    function finishAoiPolygon(polygon, typeName, extraData = {}) {
      const aoiState = aoiDrawingStateRef.current;
      const stroke = hexToRgbaArray(aoiState.options?.strokeColor || "#38bdf8", 1);
      const fill = hexToRgbaArray(aoiState.options?.strokeColor || "#38bdf8", aoiState.options?.fillOpacity ?? 0.2);

      aoiLayer.removeAll();

      const aoiGraphic = new Graphic({
        geometry: polygon,
        symbol: new PolygonSymbol3D({
          symbolLayers: [
            new FillSymbol3DLayer({
              material: { color: fill },
              outline: {
                color: stroke,
                size: 3,
              },
            }),
          ],
        }),
        attributes: {
          Name: typeName || "Custom AOI (Area of Interest)",
          Area: extraData.areaKm2 ? `${extraData.areaKm2} km²` : undefined,
          Center: extraData.center ? `[${extraData.center[1]}, ${extraData.center[0]}]` : undefined,
        },
      });

      aoiLayer.add(aoiGraphic);

      const aoiExtent = polygon.extent;
      if (aoiExtent) {
        view.goTo(aoiExtent.expand(1.3), { duration: 1800 }).catch(() => {});
      }

      const aoiData = {
        type: typeName || "Polygon AOI",
        geometry: polygon,
        extent: aoiExtent,
        ...extraData,
      };

      lastAoiDataRef.current = aoiData;
      if (aoiState.callback) {
        aoiState.callback(aoiData);
      }

      aoiState.active = false;
      aoiState.points = [];
      view.container.style.cursor = "default";
    }

    function finishAoiLine() {
      const aoiState = aoiDrawingStateRef.current;
      if (!aoiState.points || aoiState.points.length < 2) return;

      const stroke = hexToRgbaArray(aoiState.options?.strokeColor || "#38bdf8", 1);
      const polyline = new Polyline({
        paths: [aoiState.points],
        spatialReference: { wkid: 4326 },
      });

      const totalKm = calculatePathLengthKm(aoiState.points);
      const centerLon = (polyline.extent.xmin + polyline.extent.xmax) / 2;
      const centerLat = (polyline.extent.ymin + polyline.extent.ymax) / 2;

      aoiLayer.removeAll();

      // Render vertex markers
      aoiState.points.forEach((coord) => {
        aoiLayer.add(
          new Graphic({
            geometry: new Point({ longitude: coord[0], latitude: coord[1], z: coord[2] || 0 }),
            symbol: new SimpleMarkerSymbol({
              color: stroke,
              size: 8,
              outline: { color: [255, 255, 255, 1], width: 1.5 },
            }),
          })
        );
      });

      const lineGraphic = new Graphic({
        geometry: polyline,
        symbol: new SimpleLineSymbol({
          color: stroke,
          width: 3.5,
        }),
        attributes: {
          Name: "Polyline Path",
          Length: `${totalKm.toFixed(3)} km`,
        },
      });

      aoiLayer.add(lineGraphic);
      view.goTo(polyline.extent.expand(1.3), { duration: 1800 }).catch(() => {});

      const aoiData = {
        type: "Polyline Path",
        geometry: polyline,
        lengthKm: totalKm.toFixed(3),
        lengthMeters: (totalKm * 1000).toFixed(1),
        segments: aoiState.points.length - 1,
        center: [centerLon.toFixed(5), centerLat.toFixed(5)],
        coordinates: aoiState.points,
        extent: polyline.extent,
      };

      lastAoiDataRef.current = aoiData;
      if (aoiState.callback) {
        aoiState.callback(aoiData);
      }

      aoiState.active = false;
      aoiState.points = [];
      view.container.style.cursor = "default";
    }

    function finishAoiFreeformPolygon() {
      const aoiState = aoiDrawingStateRef.current;
      if (!aoiState.points || aoiState.points.length < 3) return;

      const coords = [...aoiState.points, aoiState.points[0]];
      const aoiPolygon = new Polygon({
        rings: [coords],
        spatialReference: { wkid: 4326 },
      });

      const areaKm2 = calculatePolygonAreaKm2(aoiState.points);
      const perimeterKm = calculatePathLengthKm(coords);
      const centerLon = (aoiPolygon.extent.xmin + aoiPolygon.extent.xmax) / 2;
      const centerLat = (aoiPolygon.extent.ymin + aoiPolygon.extent.ymax) / 2;

      finishAoiPolygon(aoiPolygon, "Polygon AOI", {
        areaKm2: areaKm2.toFixed(3),
        areaAcres: (areaKm2 * 247.105).toFixed(2),
        perimeterKm: perimeterKm.toFixed(3),
        vertices: aoiState.points.length,
        center: [centerLon.toFixed(5), centerLat.toFixed(5)],
        coordinates: aoiState.points,
      });
    }

    // Real-time pointer move preview for Distance, Area, AOI rectangle, circle, line, and polygon
    view.on("pointer-move", (event) => {
      let currentPt = null;
      try {
        currentPt = view.toMap({ x: event.x, y: event.y });
      } catch (e) {
        currentPt = null;
      }

      if (currentPt && (currentPt.latitude !== undefined || currentPt.longitude !== undefined || currentPt.x !== undefined)) {
        const lat = currentPt.latitude !== undefined ? currentPt.latitude : currentPt.y;
        const lon = currentPt.longitude !== undefined ? currentPt.longitude : currentPt.x;
        const elev = currentPt.z !== undefined && currentPt.z !== null ? currentPt.z : 0;
        const coords = {
          lat,
          lon,
          elevation: elev,
          x: currentPt.x,
          y: currentPt.y,
          z: currentPt.z,
          spatialReference: currentPt.spatialReference?.wkid || 4326,
        };
        onCursorMoveRef.current?.(coords);
        window.dispatchEvent(new CustomEvent("geo3d:cursor-coordinates", { detail: coords }));
      } else {
        onCursorMoveRef.current?.(null);
      }

      if (!currentPt || currentPt.longitude === undefined) return;

      // Distance pointer-move rubberband
      const distState = distanceDrawingStateRef.current;
      if (distState.active && distState.points && distState.points.length >= 1) {
        const lastCoord = distState.points[distState.points.length - 1];
        const previewPoints = [lastCoord, [currentPt.longitude, currentPt.latitude, currentPt.z || 0]];
        const previewPolyline = new Polyline({ paths: [previewPoints], spatialReference: { wkid: 4326 } });

        if (distPreviewGraphicRef.current) {
          measurementsLayerRef.current?.remove(distPreviewGraphicRef.current);
        }

        distPreviewGraphicRef.current = new Graphic({
          geometry: previewPolyline,
          symbol: new SimpleLineSymbol({
            color: [56, 189, 248, 0.8],
            width: 2.5,
            style: "dash",
          }),
        });
        measurementsLayerRef.current?.add(distPreviewGraphicRef.current);
        return;
      }

      // Area pointer-move rubberband
      const areaState = areaDrawingStateRef.current;
      if (areaState.active && areaState.points && areaState.points.length >= 2) {
        const tempPts = [...areaState.points, [currentPt.longitude, currentPt.latitude, currentPt.z || 0], areaState.points[0]];
        const previewPoly = new Polygon({ rings: [tempPts], spatialReference: { wkid: 4326 } });

        if (areaPreviewGraphicRef.current) {
          measurementsLayerRef.current?.remove(areaPreviewGraphicRef.current);
        }

        areaPreviewGraphicRef.current = new Graphic({
          geometry: previewPoly,
          symbol: new PolygonSymbol3D({
            symbolLayers: [
              new FillSymbol3DLayer({
                material: { color: [56, 189, 248, 0.15] },
                outline: { color: [56, 189, 248, 0.8], size: 1.5, style: "dash" },
              }),
            ],
          }),
        });
        measurementsLayerRef.current?.add(areaPreviewGraphicRef.current);
        return;
      }

      const aoiState = aoiDrawingStateRef.current;
      if (!aoiState.active || !aoiState.points || aoiState.points.length === 0) return;

      const mode = aoiState.mode || "bbox";
      const stroke = hexToRgbaArray(aoiState.options?.strokeColor || "#38bdf8", 0.9);
      const fill = hexToRgbaArray(aoiState.options?.strokeColor || "#38bdf8", (aoiState.options?.fillOpacity ?? 0.2) * 0.7);

      if (mode === "bbox" || mode === "rectangle") {
        const p1 = aoiState.points[0];
        const minX = Math.min(p1[0], currentPt.longitude);
        const maxX = Math.max(p1[0], currentPt.longitude);
        const minY = Math.min(p1[1], currentPt.latitude);
        const maxY = Math.max(p1[1], currentPt.latitude);

        const previewPoly = new Polygon({
          rings: [
            [
              [minX, maxY, 0],
              [maxX, maxY, 0],
              [maxX, minY, 0],
              [minX, minY, 0],
              [minX, maxY, 0],
            ],
          ],
          spatialReference: { wkid: 4326 },
        });

        aoiLayer.removeAll();
        aoiLayer.add(
          new Graphic({
            geometry: previewPoly,
            symbol: new PolygonSymbol3D({
              symbolLayers: [
                new FillSymbol3DLayer({
                  material: { color: fill },
                  outline: { color: stroke, size: 2 },
                }),
              ],
            }),
          })
        );
      } else if (mode === "circle" && aoiState.points.length >= 1) {
        const center = aoiState.points[0];
        const edge = [currentPt.longitude, currentPt.latitude];
        const radiusKm = calculateDistanceKm(center, edge);
        const ring = [];
        const steps = 48;
        const midLat = (center[1] * Math.PI) / 180;
        const degRadiusLat = radiusKm / 111.32;
        const degRadiusLon = radiusKm / (111.32 * Math.cos(midLat));

        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * 2 * Math.PI;
          ring.push([center[0] + degRadiusLon * Math.cos(theta), center[1] + degRadiusLat * Math.sin(theta), 0]);
        }

        const previewPoly = new Polygon({
          rings: [ring],
          spatialReference: { wkid: 4326 },
        });

        aoiLayer.removeAll();
        aoiLayer.add(
          new Graphic({
            geometry: previewPoly,
            symbol: new PolygonSymbol3D({
              symbolLayers: [
                new FillSymbol3DLayer({
                  material: { color: fill },
                  outline: { color: stroke, size: 2 },
                }),
              ],
            }),
          })
        );
      } else if ((mode === "line" || mode === "polyline") && aoiState.points.length >= 1) {
        const previewCoords = [...aoiState.points, [currentPt.longitude, currentPt.latitude, currentPt.z || 0]];
        aoiLayer.removeAll();

        // Markers
        aoiState.points.forEach((coord) => {
          aoiLayer.add(
            new Graphic({
              geometry: new Point({ longitude: coord[0], latitude: coord[1], z: coord[2] || 0 }),
              symbol: new SimpleMarkerSymbol({
                color: stroke,
                size: 7,
                outline: { color: [255, 255, 255, 1], width: 1.5 },
              }),
            })
          );
        });

        aoiLayer.add(
          new Graphic({
            geometry: new Polyline({ paths: [previewCoords] }),
            symbol: new SimpleLineSymbol({
              color: stroke,
              width: 2.5,
              style: "dash",
            }),
          })
        );
      } else if (mode === "polygon" && aoiState.points.length >= 1) {
        const previewCoords = [...aoiState.points, [currentPt.longitude, currentPt.latitude]];
        aoiLayer.removeAll();

        // Markers
        aoiState.points.forEach((coord) => {
          aoiLayer.add(
            new Graphic({
              geometry: new Point({ longitude: coord[0], latitude: coord[1] }),
              symbol: new SimpleMarkerSymbol({
                color: stroke,
                size: 7,
                outline: { color: [255, 255, 255, 1], width: 1.5 },
              }),
            })
          );
        });

        aoiLayer.add(
          new Graphic({
            geometry: new Polyline({ paths: [previewCoords] }),
            symbol: new SimpleLineSymbol({
              color: stroke,
              width: 2.5,
              style: "dash",
            }),
          })
        );
      }
    });

    // Two-finger touch gestures: pinch/spread to zoom in & zoom out on mobile & tabs
    let isPinching = false;
    let lastTouchDistance = 0;
    let lastMidpoint = { x: 0, y: 0 };

    const getTouchDistance = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    };

    const getTouchMidpoint = (t1, t2, rect) => {
      const x = (t1.clientX + t2.clientX) / 2 - rect.left;
      const y = (t1.clientY + t2.clientY) / 2 - rect.top;
      return { x, y };
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        isPinching = true;
        const rect = containerEl.getBoundingClientRect();
        lastTouchDistance = getTouchDistance(e.touches[0], e.touches[1]);
        lastMidpoint = getTouchMidpoint(e.touches[0], e.touches[1], rect);
      } else {
        isPinching = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!isPinching || e.touches.length !== 2 || !viewRef.current) return;
      e.preventDefault();

      const rect = containerEl.getBoundingClientRect();
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const currentMidpoint = getTouchMidpoint(e.touches[0], e.touches[1], rect);

      if (lastTouchDistance > 0 && currentDistance > 0) {
        const scale = currentDistance / lastTouchDistance;
        const distDiff = Math.abs(currentDistance - lastTouchDistance);

        if (distDiff > 0.6 && scale > 0.01 && scale < 100) {
          const view = viewRef.current;
          const camera = view.camera ? view.camera.clone() : null;

          if (camera) {
            // scale > 1 (spreading fingers) = Zoom In (lower altitude)
            // scale < 1 (pinching fingers) = Zoom Out (higher altitude)
            const zoomFactor = Math.pow(scale, 1.4);
            const currentAlt = camera.position.z;
            const newAlt = Math.max(15, Math.min(25000000, currentAlt / zoomFactor));
            camera.position.z = newAlt;

            // Pan smoothly with touch midpoint translation
            const dMidX = currentMidpoint.x - lastMidpoint.x;
            const dMidY = currentMidpoint.y - lastMidpoint.y;
            if (Math.abs(dMidX) > 0.5 || Math.abs(dMidY) > 0.5) {
              const panScale = currentAlt / 45000000;
              camera.position.x -= dMidX * panScale;
              camera.position.y += dMidY * panScale;
            }

            view.goTo(camera, { animate: false }).catch(() => {});
          }
        }
      }

      lastTouchDistance = currentDistance;
      lastMidpoint = currentMidpoint;
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        isPinching = false;
        lastTouchDistance = 0;
      }
    };

    const handleGesturePrevent = (e) => {
      e.preventDefault();
    };

    // Mouse Middle Button Drag to Tilt & Rotate
    let isMiddleDragging = false;
    let lastMiddleX = 0;
    let lastMiddleY = 0;

    const handlePointerDown = (event) => {
      if (event.button === 1) {
        isMiddleDragging = true;
        lastMiddleX = event.clientX;
        lastMiddleY = event.clientY;
        event.preventDefault();
      }
    };

    const handlePointerMove = (event) => {
      if (!isMiddleDragging || !viewRef.current) return;
      const dx = event.clientX - lastMiddleX;
      const dy = event.clientY - lastMiddleY;
      lastMiddleX = event.clientX;
      lastMiddleY = event.clientY;

      const camera = viewRef.current.camera.clone();
      camera.tilt = Math.max(0, Math.min(88, camera.tilt - dy * 0.35));
      camera.heading = (camera.heading + dx * 0.35) % 360;

      viewRef.current.camera = camera;
      event.preventDefault();
    };

    const handlePointerUp = (event) => {
      if (event.button === 1 || event.buttons === 0) {
        isMiddleDragging = false;
      }
    };

    const handleMouseLeave = () => {
      onCursorMoveRef.current?.(null);
    };

    const containerEl = mapDivRef.current;
    containerEl.addEventListener("pointerdown", handlePointerDown);
    containerEl.addEventListener("mouseleave", handleMouseLeave);
    containerEl.addEventListener("touchstart", handleTouchStart, { passive: false });
    containerEl.addEventListener("touchmove", handleTouchMove, { passive: false });
    containerEl.addEventListener("touchend", handleTouchEnd, { passive: true });
    containerEl.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    containerEl.addEventListener("gesturestart", handleGesturePrevent, { passive: false });
    containerEl.addEventListener("gesturechange", handleGesturePrevent, { passive: false });

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    viewRef.current = view;

    return () => {
      containerEl.removeEventListener("pointerdown", handlePointerDown);
      containerEl.removeEventListener("mouseleave", handleMouseLeave);
      containerEl.removeEventListener("touchstart", handleTouchStart);
      containerEl.removeEventListener("touchmove", handleTouchMove);
      containerEl.removeEventListener("touchend", handleTouchEnd);
      containerEl.removeEventListener("touchcancel", handleTouchEnd);
      containerEl.removeEventListener("gesturestart", handleGesturePrevent);
      containerEl.removeEventListener("gesturechange", handleGesturePrevent);

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [onPick]);

  // Handle lock / unlock navigation and camera reset based on login status
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    if (!isLoggedIn) {
      const stopEvent = (e) => {
        e.stopPropagation();
      };

      const handles = [
        view.on("drag", stopEvent),
        view.on("mouse-wheel", stopEvent),
        view.on("double-click", stopEvent),
        view.on("double-click", ["Control"], stopEvent),
        view.on("pinch", stopEvent),
        view.on("key-down", (e) => {
          const prohibited = [
            "+", "-", "_", "=", "ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft",
            "PageUp", "PageDown", "Home", "End", "j", "k", "u", "i"
          ];
          if (prohibited.includes(e.key)) {
            e.stopPropagation();
          }
        }),
      ];

      // Smoothly fly to full globe view when not logged in
      view.goTo(
        {
          position: {
            x: 78.9629,
            y: 20.5937,
            z: 22000000,
          },
          heading: 0,
          tilt: 0,
        },
        { duration: 1200 }
      ).catch(() => {});

      return () => {
        handles.forEach((h) => h?.remove?.());
      };
    }
  }, [isLoggedIn]);

  function clearActiveWidget() {
    if (activeWidgetRef.current && viewRef.current) {
      try {
        viewRef.current.ui.remove(activeWidgetRef.current);
        activeWidgetRef.current.destroy();
      } catch (e) {
        console.warn("Error removing widget:", e);
      }
      activeWidgetRef.current = null;
    }
  }

function webMercatorToWgs84(x, y) {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lon, lat];
}

function utmToLatLon(easting, northing, zone, isSouth = false) {
  const a = 6378137.0;
  const eccSquared = 0.00669438;
  const k0 = 0.9996;
  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));

  const x = easting - 500000.0;
  let y = northing;
  if (isSouth) y -= 10000000.0;

  const m = y / k0;
  const mu = m / (a * (1 - eccSquared / 4 - (3 * eccSquared * eccSquared) / 64 - (5 * Math.pow(eccSquared, 3)) / 256));

  const phi1Rad =
    mu +
    ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
    ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu);

  const n1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  const t1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  const c1 = (eccSquared / (1 - eccSquared)) * Math.cos(phi1Rad) * Math.cos(phi1Rad);
  const r1 = (a * (1 - eccSquared)) / Math.pow(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  const d = x / (n1 * k0);

  let lat =
    phi1Rad -
    ((n1 * Math.tan(phi1Rad)) / r1) *
      ((d * d) / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * (eccSquared / (1 - eccSquared))) * Math.pow(d, 4)) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * (eccSquared / (1 - eccSquared)) - 3 * c1 * c1) * Math.pow(d, 6)) / 720);
  lat = (lat * 180) / Math.PI;

  let lon =
    (d -
      ((1 + 2 * t1 + c1) * Math.pow(d, 3)) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * (eccSquared / (1 - eccSquared)) + 24 * t1 * t1) * Math.pow(d, 5)) / 120) /
    Math.cos(phi1Rad);
  lon = (zone - 1) * 6 - 180 + 3 + (lon * 180) / Math.PI;

  return [lon, lat];
}

function calculateLayerExtent(layer) {
  if (!layer) return null;

  if (layer.customExtent) return layer.customExtent;
  if (layer.fullExtent) return layer.fullExtent;

  // GroupLayer inspection
  if (layer.layers) {
    const subLayers = layer.layers.toArray ? layer.layers.toArray() : layer.layers;
    for (const sub of subLayers) {
      const ext = calculateLayerExtent(sub);
      if (ext) return ext;
    }
  }

  // GraphicsLayer inspection
  if (layer.graphics && layer.graphics.length > 0) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const graphics = layer.graphics.toArray ? layer.graphics.toArray() : layer.graphics;

    graphics.forEach((g) => {
      if (!g.geometry) return;
      const geom = g.geometry;
      if (geom.extent) {
        minX = Math.min(minX, geom.extent.xmin);
        minY = Math.min(minY, geom.extent.ymin);
        maxX = Math.max(maxX, geom.extent.xmax);
        maxY = Math.max(maxY, geom.extent.ymax);
      } else if (geom.longitude !== undefined && geom.latitude !== undefined) {
        minX = Math.min(minX, geom.longitude);
        minY = Math.min(minY, geom.latitude);
        maxX = Math.max(maxX, geom.longitude);
        maxY = Math.max(maxY, geom.latitude);
      } else if (geom.x !== undefined && geom.y !== undefined) {
        minX = Math.min(minX, geom.x);
        minY = Math.min(minY, geom.y);
        maxX = Math.max(maxX, geom.x);
        maxY = Math.max(maxY, geom.y);
      }
    });

    if (minX !== Infinity && maxX !== -Infinity) {
      return new Extent({
        xmin: minX,
        ymin: minY,
        xmax: maxX,
        ymax: maxY,
        spatialReference: { wkid: 4326 },
      });
    }
  }

  // MediaLayer source inspection
  if (layer.source) {
    const elements = layer.source.toArray ? layer.source.toArray() : layer.source;
    for (const el of elements) {
      if (el?.georeference?.extent) return el.georeference.extent;
    }
  }

  return null;
}

// Helper to fly to any layer or extent using exact stable extent navigation
async function navigateToLayer(view, layer, isLoggedIn = true) {
  if (!view || !layer || !isLoggedIn) return;

  try {
    if (layer.load && !layer.loaded) {
      await layer.load().catch(() => {});
    }

    // 1. Prioritize clean customExtent (always clone to prevent in-place mutation)
    if (layer.customExtent && !isNaN(layer.customExtent.xmin)) {
      const ext = layer.customExtent.clone();
      await view.goTo(ext, { duration: 2000 }).catch(() => {});
      return;
    }

    // 2. Check extent calculated from graphics or media elements
    const calcExtent = calculateLayerExtent(layer);
    if (calcExtent && !isNaN(calcExtent.xmin)) {
      const ext = calcExtent.clone();
      if (Math.abs(ext.xmax - ext.xmin) < 0.0001 && Math.abs(ext.ymax - ext.ymin) < 0.0001) {
        await view.goTo({ target: ext.center, zoom: 16 }, { duration: 2000 }).catch(() => {});
      } else {
        await view.goTo(ext, { duration: 2000 }).catch(() => {});
      }
      return;
    }

    // 3. Fallback to layer.fullExtent (always clone to prevent mutation)
    if (layer.fullExtent && !isNaN(layer.fullExtent.xmin)) {
      const ext = layer.fullExtent.clone();
      await view.goTo(ext, { duration: 2000 }).catch(() => {});
      return;
    }

    // 4. Fallback: direct layer navigation
    await view.goTo(layer, { duration: 2000 }).catch(() => {});
  } catch (e) {
    console.warn("Navigation notice:", e);
  }
}

  useImperativeHandle(ref, () => ({
    async loadI3SLayer(packageId, layerUrl) {
      const view = viewRef.current;
      if (!view) return;
      if (layersRef.current[packageId]) return;

      const sceneLayer = new SceneLayer({
        url: layerUrl,
        title: `Layer ${packageId}`,
      });

      view.map.add(sceneLayer);
      layersRef.current[packageId] = sceneLayer;

      try {
        await sceneLayer.load();
        // Only zoom in if the user exists/is logged in and the layer has an extent
        if (isLoggedInRef.current && sceneLayer.fullExtent) {
          await view.goTo(sceneLayer.fullExtent.clone(), { duration: 2000 });
        }
      } catch (e) {
        console.error("Failed to load ArcGIS SceneLayer:", e);
      }
      return sceneLayer;
    },

    async loadGenericLayer(layerId, file) {
      const view = viewRef.current;
      if (!view || !file) return;
      if (layersRef.current[layerId]) return;

      const fileName = file.name.toLowerCase();
      let layer = null;

      try {
        let geojson = null;

        if (fileName.endsWith(".geojson") || fileName.endsWith(".json")) {
          const text = await file.text();
          geojson = JSON.parse(text);
        } else if (fileName.endsWith(".kml")) {
          const text = await file.text();
          geojson = parseKml(text);
        } else if (fileName.endsWith(".kmz")) {
          const buffer = await file.arrayBuffer();
          geojson = await parseKmz(buffer);
        } else if (fileName.endsWith(".shp") || fileName.endsWith(".zip")) {
          const buffer = await file.arrayBuffer();
          geojson = await parseShapefile(buffer);
        } else if (fileName.endsWith(".tif") || fileName.endsWith(".tiff") || fileName.endsWith(".img")) {
          const buffer = await file.arrayBuffer();
          const raster = await parseGeoTiffRaster(buffer);
          if (raster && raster.isRasterImage) {
            await projection.load().catch(() => {});

            let originX = raster.originX;
            let originY = raster.originY;
            let scaleX = raster.scaleX;
            let scaleY = raster.scaleY;

            // If photographic TIFF without geographic coordinates, anchor near current viewpoint
            if (!raster.hasGeoreference) {
              const cam = view.camera.position;
              const span = 0.05; // ~5km footprint in degrees
              originX = (cam.longitude || 73.85) - span / 2;
              originY = (cam.latitude || 18.52) + span / 2;
              scaleX = span / raster.width;
              scaleY = span / raster.height;
            }

            const sourceSR = new SpatialReference({ wkid: raster.wkid || 4326 });
            const xmin = originX;
            const ymax = originY;
            const xmax = originX + raster.width * scaleX;
            const ymin = originY - raster.height * scaleY;

            const rawExtent = new Extent({
              xmin: Math.min(xmin, xmax),
              ymin: Math.min(ymin, ymax),
              xmax: Math.max(xmin, xmax),
              ymax: Math.max(ymin, ymax),
              spatialReference: sourceSR,
            });

            let targetExtent = rawExtent;
            if (sourceSR.wkid !== 4326 && !sourceSR.isGeographic) {
              let projected = null;
              try {
                if (projection.isLoaded()) {
                  projected = projection.project(rawExtent, new SpatialReference({ wkid: 4326 }));
                }
              } catch (e) {
                console.warn("Projection conversion notice:", e);
              }

              if (!projected) {
                if (sourceSR.wkid === 3857 || sourceSR.wkid === 102100) {
                  const [minLon, minLat] = webMercatorToWgs84(rawExtent.xmin, rawExtent.ymin);
                  const [maxLon, maxLat] = webMercatorToWgs84(rawExtent.xmax, rawExtent.ymax);
                  projected = new Extent({
                    xmin: Math.min(minLon, maxLon),
                    ymin: Math.min(minLat, maxLat),
                    xmax: Math.max(minLon, maxLon),
                    ymax: Math.max(minLat, maxLat),
                    spatialReference: { wkid: 4326 },
                  });
                } else if (sourceSR.wkid >= 32601 && sourceSR.wkid <= 32660) {
                  const zone = sourceSR.wkid - 32600;
                  const [minLon, minLat] = utmToLatLon(rawExtent.xmin, rawExtent.ymin, zone, false);
                  const [maxLon, maxLat] = utmToLatLon(rawExtent.xmax, rawExtent.ymax, zone, false);
                  projected = new Extent({
                    xmin: Math.min(minLon, maxLon),
                    ymin: Math.min(minLat, maxLat),
                    xmax: Math.max(minLon, maxLon),
                    ymax: Math.max(minLat, maxLat),
                    spatialReference: { wkid: 4326 },
                  });
                } else if (sourceSR.wkid >= 32701 && sourceSR.wkid <= 32760) {
                  const zone = sourceSR.wkid - 32700;
                  const [minLon, minLat] = utmToLatLon(rawExtent.xmin, rawExtent.ymin, zone, true);
                  const [maxLon, maxLat] = utmToLatLon(rawExtent.xmax, rawExtent.ymax, zone, true);
                  projected = new Extent({
                    xmin: Math.min(minLon, maxLon),
                    ymin: Math.min(minLat, maxLat),
                    xmax: Math.max(minLon, maxLon),
                    ymax: Math.max(minLat, maxLat),
                    spatialReference: { wkid: 4326 },
                  });
                }
              }

              if (projected) targetExtent = projected;
            }

            // Create HTMLImageElement from canvas data URL
            const img = new Image();
            const dataUrl = raster.canvas.toDataURL("image/png");
            img.src = dataUrl;
            await new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });

            // 1. Create MediaLayer for native WebGL 3D raster imagery draping
            const imageElement = new ImageElement({
              image: img,
              georeference: new ExtentAndRotationGeoreference({
                extent: targetExtent,
              }),
            });

            const mediaLayer = new MediaLayer({
              source: [imageElement],
              title: file.name,
              opacity: 1.0,
            });

            // 2. Create 3D Boundary Graphic for attribute picking & boundary highlight
            const poly = new Polygon({
              rings: [
                [
                  [targetExtent.xmin, targetExtent.ymax, 0],
                  [targetExtent.xmax, targetExtent.ymax, 0],
                  [targetExtent.xmax, targetExtent.ymin, 0],
                  [targetExtent.xmin, targetExtent.ymin, 0],
                  [targetExtent.xmin, targetExtent.ymax, 0],
                ],
              ],
              spatialReference: targetExtent.spatialReference,
            });

            const boundarySymbol = new PolygonSymbol3D({
              symbolLayers: [
                new FillSymbol3DLayer({
                  material: { color: [0, 0, 0, 0] }, // Transparent fill
                  outline: {
                    color: [0, 195, 255, 0.9], // Cyan outline
                    size: 2,
                  },
                }),
              ],
            });

            const boundaryLayer = new GraphicsLayer({
              title: file.name + " (Boundary)",
              elevationInfo: { mode: "on-the-ground" },
            });
            boundaryLayer.add(
              new Graphic({
                geometry: poly,
                symbol: boundarySymbol,
                attributes: {
                  Name: file.name,
                  Width: raster.width,
                  Height: raster.height,
                  Format: raster.hasGeoreference ? "GeoTIFF Elevation / Raster" : "Standard TIFF Image",
                },
              })
            );

            const groupLayer = new GroupLayer({
              title: file.name,
              layers: [mediaLayer, boundaryLayer],
            });
            groupLayer.customExtent = targetExtent;
            groupLayer.fullExtent = targetExtent;

            layer = groupLayer;
          }
        } else if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
          const text = await file.text();
          geojson = parseCsv(text);
        } else if (fileName.endsWith(".gpx")) {
          const text = await file.text();
          geojson = parseGpx(text);
        } else if (
          fileName.endsWith(".dem") ||
          fileName.endsWith(".asc") ||
          fileName.endsWith(".xyz") ||
          fileName.endsWith(".hgt")
        ) {
          const text = await file.text();
          geojson = parseDsmGrid(text);
        } else if (
          fileName.endsWith(".gltf") ||
          fileName.endsWith(".glb") ||
          fileName.endsWith(".obj") ||
          fileName.endsWith(".dae") ||
          fileName.endsWith(".3ds") ||
          fileName.endsWith(".fbx")
        ) {
          const url = URL.createObjectURL(file);
          const graphicsLayer = new GraphicsLayer({
            title: file.name,
            elevationInfo: { mode: "on-the-ground" },
          });
          const cam = view.camera.position;
          const point = new Point({
            longitude: cam.longitude,
            latitude: cam.latitude,
            z: 0,
          });
          const symbol = new PointSymbol3D({
            symbolLayers: [
              new ObjectSymbol3DLayer({
                resource: { href: url },
                height: 50,
              }),
            ],
          });
          graphicsLayer.add(new Graphic({ geometry: point, symbol: symbol }));
          layer = graphicsLayer;
        } else if (fileName.endsWith(".3tz")) {
          const url = URL.createObjectURL(file);
          layer = new IntegratedMesh3DTilesLayer({
            url: url,
            title: file.name,
          });
        }

        if (geojson) {
          const graphics = createGraphicsFromGeoJson(geojson);
          if (graphics.length === 0) {
            throw new Error("No valid spatial features or coordinates found in the file.");
          }
          // Draped onto 3D Earth terrain so it is never occluded
          const graphicsLayer = new GraphicsLayer({
            title: file.name,
            elevationInfo: { mode: "on-the-ground" },
          });
          graphicsLayer.addMany(graphics);

          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
          graphics.forEach((g) => {
            if (g.geometry) {
              const ext = g.geometry.extent;
              if (ext) {
                minX = Math.min(minX, ext.xmin);
                minY = Math.min(minY, ext.ymin);
                maxX = Math.max(maxX, ext.xmax);
                maxY = Math.max(maxY, ext.ymax);
              } else if (g.geometry.longitude !== undefined) {
                minX = Math.min(minX, g.geometry.longitude);
                minY = Math.min(minY, g.geometry.latitude);
                maxX = Math.max(maxX, g.geometry.longitude);
                maxY = Math.max(maxY, g.geometry.latitude);
              }
            }
          });

          if (minX !== Infinity) {
            const geoExtent = new Extent({
              xmin: minX,
              ymin: minY,
              xmax: maxX,
              ymax: maxY,
              spatialReference: { wkid: 4326 },
            });
            graphicsLayer.customExtent = geoExtent;
          }
          layer = graphicsLayer;
        }

        if (layer) {
          view.map.add(layer);
          layersRef.current[layerId] = layer;

          if (layer.load) {
            await layer.load().catch(() => {});
          }

          // Only zoom into the layer if user is logged in and layer exists
          const targetExtent = layer.customExtent || layer.fullExtent || calculateLayerExtent(layer);
          if (isLoggedInRef.current && targetExtent) {
            await view.goTo(targetExtent.expand(1.2), { duration: 2500 });
          }
        }
      } catch (err) {
        console.error("Failed to load GIS layer:", file.name, err);
        throw err;
      }
      return layer;
    },

    unloadI3SLayer(packageId) {
      const view = viewRef.current;
      const layer = layersRef.current[packageId];
      if (view && layer) {
        view.map.remove(layer);
        try {
          layer.destroy();
        } catch (e) {}
        delete layersRef.current[packageId];
      }
    },

    unloadLayer(layerId) {
      const view = viewRef.current;
      const layer = layersRef.current[layerId];
      if (view && layer) {
        view.map.remove(layer);
        try {
          layer.destroy();
        } catch (e) {}
        delete layersRef.current[layerId];
      }
    },

    setLayerVisible(layerId, visible) {
      const layer = layersRef.current[layerId] || layersRef.current[String(layerId)] || layersRef.current[Number(layerId)];
      if (layer) {
        layer.visible = visible;
        if (layer.layers) {
          layer.layers.forEach((l) => { if (l) l.visible = visible; });
        }
      }
    },

    setLayerOpacity(layerId, opacity) {
      const layer = layersRef.current[layerId] || layersRef.current[String(layerId)] || layersRef.current[Number(layerId)];
      if (layer) {
        layer.opacity = opacity;
        if (layer.layers) {
          layer.layers.forEach((l) => { if (l) l.opacity = opacity; });
        }
      }
    },

    async flyToLayer(layerId) {
      const view = viewRef.current;
      const layer = layersRef.current[layerId] || layersRef.current[String(layerId)] || layersRef.current[Number(layerId)];
      if (!view || !layer || !isLoggedInRef.current) return;
      await navigateToLayer(view, layer, isLoggedInRef.current);
    },

    async goToLocation(target, options = {}) {
      const view = viewRef.current;
      if (!view || !target || !isLoggedInRef.current) return;
      try {
        if (target.xmin !== undefined && target.ymin !== undefined) {
          let ext = target;
          if (!target.spatialReference && Extent) {
            ext = new Extent({
              xmin: target.xmin,
              ymin: target.ymin,
              xmax: target.xmax,
              ymax: target.ymax,
              spatialReference: { wkid: 4326 },
            });
          }
          if (ext.expand) ext = ext.expand(1.4);
          await view.goTo(ext, { duration: 2500, ...options });
        } else if (target.target || target.center) {
          await view.goTo(target, { duration: 2500, ...options });
        } else if (Array.isArray(target) && target.length >= 2) {
          await view.goTo({ center: target, zoom: 15 }, { duration: 2500, ...options });
        } else {
          await view.goTo(target, { duration: 2500, ...options });
        }
      } catch (e) {
        console.warn("goToLocation failed:", e);
      }
    },

    startAoiDrawing(mode = "bbox", options = {}, callback) {
      const view = viewRef.current;
      if (!view) return;
      const cb = typeof options === "function" ? options : callback;
      const opts = typeof options === "object" && options !== null ? options : {};

      aoiDrawingStateRef.current = {
        active: true,
        mode: mode || "bbox",
        points: [],
        startPoint: null,
        options: opts,
        callback: cb,
      };
      view.container.style.cursor = "crosshair";
    },

    stopAoiDrawing() {
      const view = viewRef.current;
      aoiDrawingStateRef.current = {
        active: false,
        mode: null,
        points: [],
        startPoint: null,
        options: {},
        callback: null,
      };
      if (view && view.container) {
        view.container.style.cursor = "default";
      }
    },

    finishAoiDrawing() {
      const aoiState = aoiDrawingStateRef.current;
      if (!aoiState.active || !aoiState.points) return;
      const mode = aoiState.mode || "polygon";
      if ((mode === "line" || mode === "polyline") && aoiState.points.length >= 2) {
        finishAoiLine();
      } else if ((mode === "polygon" || mode === "freeform") && aoiState.points.length >= 3) {
        finishAoiFreeformPolygon();
      }
    },

    removePoint(index) {
      const aoiState = aoiDrawingStateRef.current;
      if (!aoiState.points || index < 0 || index >= aoiState.points.length) return;
      aoiState.points.splice(index, 1);
      const stroke = hexToRgbaArray(aoiState.options?.strokeColor || "#38bdf8", 1);

      if (aoiLayerRef.current) {
        aoiLayerRef.current.removeAll();
        aoiState.points.forEach((coord, idx) => {
          aoiLayerRef.current.add(
            new Graphic({
              geometry: new Point({ longitude: coord[0], latitude: coord[1], z: coord[2] }),
              symbol: new SimpleMarkerSymbol({
                color: stroke,
                size: 12,
                outline: { color: [255, 255, 255, 1], width: 2 },
              }),
              attributes: {
                Name: `Point ${idx + 1}`,
                Longitude: coord[0].toFixed(5),
                Latitude: coord[1].toFixed(5),
                Elevation: `${coord[2].toFixed(1)} m`,
              },
            })
          );
        });
      }

      if (aoiState.points.length === 0) {
        lastAoiDataRef.current = null;
        if (aoiState.callback) aoiState.callback(null);
        return;
      }

      const pointsList = aoiState.points.map((coord, idx) => ({
        id: idx + 1,
        lon: coord[0].toFixed(5),
        lat: coord[1].toFixed(5),
        elevation: coord[2].toFixed(1),
      }));

      const lastPt = aoiState.points[aoiState.points.length - 1];
      const aoiData = {
        type: aoiState.points.length > 1 ? `Multi-Point (${aoiState.points.length} Points)` : "Point Marker",
        pointCount: aoiState.points.length,
        pointsList: pointsList,
        coordinates: aoiState.points.map((p) => [p[0].toFixed(5), p[1].toFixed(5), p[2].toFixed(1)]),
        center: [lastPt[0].toFixed(5), lastPt[1].toFixed(5)],
        elevation: lastPt[2].toFixed(1),
        geometryType: "point",
        rawPoints: aoiState.points,
      };

      lastAoiDataRef.current = aoiData;
      if (aoiState.callback) aoiState.callback(aoiData);
    },

    flyToAoi() {
      const view = viewRef.current;
      const lastAoi = lastAoiDataRef.current;
      if (!view || !lastAoi) return;
      if (lastAoi.rawPoints && lastAoi.rawPoints.length > 1) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        lastAoi.rawPoints.forEach((p) => {
          minX = Math.min(minX, p[0]);
          maxX = Math.max(maxX, p[0]);
          minY = Math.min(minY, p[1]);
          maxY = Math.max(maxY, p[1]);
        });
        const ext = new Extent({ xmin: minX, ymin: minY, xmax: maxX, ymax: maxY, spatialReference: { wkid: 4326 } });
        view.goTo(ext.expand(1.8), { duration: 1800 }).catch(() => {});
      } else if (lastAoi.extent) {
        view.goTo(lastAoi.extent.expand(1.4), { duration: 1800 }).catch(() => {});
      } else if (lastAoi.geometry) {
        view.goTo(lastAoi.geometry, { duration: 1800 }).catch(() => {});
      }
    },

    exportAoiGeoJson() {
      const lastAoi = lastAoiDataRef.current;
      if (!lastAoi) return null;

      if (lastAoi.pointsList && lastAoi.pointsList.length > 0) {
        return {
          type: "FeatureCollection",
          features: lastAoi.pointsList.map((pt) => ({
            type: "Feature",
            properties: {
              name: `Point ${pt.id}`,
              elevation: `${pt.elevation} m`,
            },
            geometry: {
              type: "Point",
              coordinates: [parseFloat(pt.lon), parseFloat(pt.lat), parseFloat(pt.elevation) || 0],
            },
          })),
        };
      }

      if (!lastAoi.geometry) return null;

      let geojsonGeom = null;
      if (lastAoi.geometry.rings) {
        geojsonGeom = {
          type: "Polygon",
          coordinates: lastAoi.geometry.rings,
        };
      } else if (lastAoi.geometry.paths) {
        geojsonGeom = {
          type: "LineString",
          coordinates: lastAoi.geometry.paths[0],
        };
      } else if (lastAoi.geometry.longitude !== undefined) {
        geojsonGeom = {
          type: "Point",
          coordinates: [lastAoi.geometry.longitude, lastAoi.geometry.latitude, lastAoi.geometry.z || 0],
        };
      }

      if (!geojsonGeom) return null;

      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              name: lastAoi.type || "AOI Feature",
              areaKm2: lastAoi.areaKm2,
              areaAcres: lastAoi.areaAcres,
              lengthKm: lastAoi.lengthKm,
              perimeterKm: lastAoi.perimeterKm,
              elevation: lastAoi.elevation,
              center: lastAoi.center,
              bbox: lastAoi.bbox,
            },
            geometry: geojsonGeom,
          },
        ],
      };
    },

    clearAoi() {
      const view = viewRef.current;
      if (aoiLayerRef.current) {
        aoiLayerRef.current.removeAll();
      }
      aoiDrawingStateRef.current = { active: false, mode: "bbox", points: [], options: {}, callback: null };
      lastAoiDataRef.current = null;
      if (view) {
        view.container.style.cursor = "default";
      }
    },

    setDaylightTime(hour = 12, minute = 0, shadows = true, ambientOcclusion = true) {
      const view = viewRef.current;
      if (!view || !view.environment) return;
      const d = new Date();
      d.setHours(hour, minute, 0);
      view.environment.lighting = {
        type: "sun",
        date: d,
        directShadowsEnabled: shadows,
        ambientOcclusionEnabled: ambientOcclusion,
      };
    },

    setWeather(type = "sunny", cloudCover = 0.3, precipitation = 0.5) {
      const view = viewRef.current;
      if (!view || !view.environment) return;
      if (type === "sunny") {
        view.environment.weather = { type: "sunny", cloudCover };
      } else if (type === "cloudy") {
        view.environment.weather = { type: "cloudy", cloudCover };
      } else if (type === "rainy") {
        view.environment.weather = { type: "rainy", cloudCover, precipitation };
      } else if (type === "snowy") {
        view.environment.weather = { type: "snowy", cloudCover, precipitation };
      } else if (type === "foggy") {
        view.environment.weather = { type: "foggy", fogStrength: precipitation };
      }
    },

    startLineOfSight(containerEl) {
      const view = viewRef.current;
      if (!view) return null;
      if (activeWidgetRef.current) {
        try {
          if (typeof activeWidgetRef.current.destroy === "function") activeWidgetRef.current.destroy();
          else if (view.ui) view.ui.remove(activeWidgetRef.current);
        } catch (e) {}
        activeWidgetRef.current = null;
      }
      try {
        const opts = { view: view };
        if (containerEl) opts.container = containerEl;
        const los = new LineOfSight(opts);
        activeWidgetRef.current = los;
        return los;
      } catch (e) {
        console.warn("LineOfSight init:", e);
        return null;
      }
    },

    clearLineOfSight() {
      if (activeWidgetRef.current?.viewModel) {
        try { activeWidgetRef.current.viewModel.clear(); } catch (e) {}
      }
    },

    startDistanceMeasurement(unit = "metric", containerEl, callback) {
      const view = viewRef.current;
      if (!view) return null;

      if (activeWidgetRef.current) {
        try {
          if (typeof activeWidgetRef.current.destroy === "function") activeWidgetRef.current.destroy();
          else if (view.ui) view.ui.remove(activeWidgetRef.current);
        } catch (e) {}
        activeWidgetRef.current = null;
      }
      try {
        const opts = {
          view: view,
          unit: unit === "imperial" ? "imperial" : "metric",
        };
        if (containerEl) opts.container = containerEl;
        const directDist = new DirectLineMeasurement3D(opts);
        activeWidgetRef.current = directDist;

        if (directDist.viewModel && callback) {
          directDist.viewModel.watch("measurement", (m) => {
            if (m) {
              callback({
                directDistanceText: m.directDistance?.text || `${m.directDistance?.value?.toFixed(2) || 0} m`,
                horizontalDistanceText: m.horizontalDistance?.text || `${m.horizontalDistance?.value?.toFixed(2) || 0} m`,
                verticalDistanceText: m.verticalDistance?.text || `${m.verticalDistance?.value?.toFixed(2) || 0} m`,
              });
            }
          });
        }
        return directDist;
      } catch (e) {
        console.warn("Distance init:", e);
        return null;
      }
    },

    clearDistanceMeasurement() {
      if (activeWidgetRef.current?.viewModel) {
        try { activeWidgetRef.current.viewModel.clear(); } catch (e) {}
      }
    },

    setDistanceUnit(unit) {
      if (activeWidgetRef.current?.viewModel) {
        activeWidgetRef.current.viewModel.unit = unit;
      }
    },

    startAreaMeasurement(unit = "square-meters", containerEl, callback) {
      const view = viewRef.current;
      if (!view) return null;

      if (activeWidgetRef.current) {
        try {
          if (typeof activeWidgetRef.current.destroy === "function") activeWidgetRef.current.destroy();
          else if (view.ui) view.ui.remove(activeWidgetRef.current);
        } catch (e) {}
        activeWidgetRef.current = null;
      }
      try {
        const opts = { view: view, unit: unit };
        if (containerEl) opts.container = containerEl;
        const areaMeas = new AreaMeasurement3D(opts);
        activeWidgetRef.current = areaMeas;

        if (areaMeas.viewModel && callback) {
          areaMeas.viewModel.watch("measurement", (m) => {
            if (m) {
              callback({
                areaText: m.area?.text || `${m.area?.value?.toFixed(2) || 0} m²`,
                perimeterText: m.perimeterLength?.text || `${m.perimeterLength?.value?.toFixed(2) || 0} m`,
              });
            }
          });
        }
        return areaMeas;
      } catch (e) {
        console.warn("Area init:", e);
        return null;
      }
    },

    clearAreaMeasurement() {
      if (activeWidgetRef.current?.viewModel) {
        try { activeWidgetRef.current.viewModel.clear(); } catch (e) {}
      }
    },

    setAreaUnit(unit) {
      if (activeWidgetRef.current?.viewModel) {
        activeWidgetRef.current.viewModel.unit = unit;
      }
    },

    startElevationProfile(containerEl, onProfileUpdate) {
      const view = viewRef.current;
      if (!view) return null;
      if (activeWidgetRef.current) {
        if (activeWidgetRef.current._watcherHandles) {
          activeWidgetRef.current._watcherHandles.forEach((h) => {
            try { h.remove(); } catch (e) {}
          });
        }
        try {
          if (typeof activeWidgetRef.current.destroy === "function") activeWidgetRef.current.destroy();
          else if (view.ui) view.ui.remove(activeWidgetRef.current);
        } catch (e) {}
        activeWidgetRef.current = null;
      }
      try {
        const opts = {
          view: view,
          profiles: [{ type: "ground" }, { type: "view" }],
        };
        if (containerEl) opts.container = containerEl;
        const elev = new ElevationProfile(opts);
        activeWidgetRef.current = elev;

        if (elev.viewModel) {
          const syncData = () => {
            if (!onProfileUpdate) return;
            const vm = elev.viewModel;
            const groundLine = vm.profiles?.find((p) => p.type === "ground") || vm.profiles?.getItemAt?.(0);
            const viewLine = vm.profiles?.find((p) => p.type === "view") || vm.profiles?.getItemAt?.(1);

            const formatSamples = (line) => {
              if (!line?.samples) return [];
              return line.samples.map((s, idx) => {
                const dist = typeof s.distance === "number" ? s.distance : (s.x || 0);
                const elevVal = typeof s.elevation === "number" ? s.elevation : (s.y || s.z || 0);
                const lon = s.longitude !== undefined ? s.longitude : (s.x !== undefined && Math.abs(s.x) <= 180 ? s.x : (s.geometry?.longitude || null));
                const lat = s.latitude !== undefined ? s.latitude : (s.y !== undefined && Math.abs(s.y) <= 90 ? s.y : (s.geometry?.latitude || null));
                return {
                  id: idx,
                  distance: dist,
                  elevation: elevVal,
                  x: s.x,
                  y: s.y,
                  z: s.z,
                  longitude: lon,
                  latitude: lat,
                };
              });
            };

            const groundSamples = formatSamples(groundLine);
            const viewSamples = formatSamples(viewLine);

            onProfileUpdate({
              state: vm.state,
              progress: vm.progress,
              groundSamples,
              viewSamples,
              statistics: groundLine?.statistics || null,
              viewStatistics: viewLine?.statistics || null,
              input: vm.input,
            });
          };

          const handles = [];
          if (elev.viewModel.profiles) {
            elev.viewModel.profiles.forEach((profile) => {
              if (profile?.watch) {
                handles.push(profile.watch("samples", syncData));
                handles.push(profile.watch("statistics", syncData));
                handles.push(profile.watch("progress", syncData));
              }
            });
          }
          if (elev.viewModel.watch) {
            handles.push(elev.viewModel.watch("state", syncData));
            handles.push(elev.viewModel.watch("progress", syncData));
            handles.push(elev.viewModel.watch("input", syncData));
          }
          elev._watcherHandles = handles;
        }

        return elev;
      } catch (e) {
        console.warn("Elevation init:", e);
        return null;
      }
    },

    setElevationHoverPoint(coord) {
      const view = viewRef.current;
      if (!view) return;
      if (!coord) {
        if (elevationHoverGraphicRef.current && measurementsLayerRef.current) {
          measurementsLayerRef.current.remove(elevationHoverGraphicRef.current);
          elevationHoverGraphicRef.current = null;
        }
        return;
      }
      let pt = null;
      if (coord.longitude !== null && coord.longitude !== undefined && coord.latitude !== null && coord.latitude !== undefined) {
        pt = new Point({
          longitude: Number(coord.longitude),
          latitude: Number(coord.latitude),
          z: Number(coord.elevation || coord.z || 0),
          spatialReference: { wkid: 4326 },
        });
      } else if (coord.x !== undefined && coord.y !== undefined) {
        pt = new Point({
          x: coord.x,
          y: coord.y,
          z: coord.z || coord.elevation || 0,
          spatialReference: view.spatialReference || { wkid: 4326 },
        });
      }
      if (!pt) return;

      if (!elevationHoverGraphicRef.current) {
        const markerSymbol = new SimpleMarkerSymbol({
          style: "circle",
          color: [0, 210, 255, 0.9],
          size: 14,
          outline: {
            color: [255, 255, 255, 1],
            width: 2.5,
          },
        });
        const graphic = new Graphic({
          geometry: pt,
          symbol: markerSymbol,
        });
        elevationHoverGraphicRef.current = graphic;
        if (measurementsLayerRef.current) {
          measurementsLayerRef.current.add(graphic);
        }
      } else {
        elevationHoverGraphicRef.current.geometry = pt;
        if (measurementsLayerRef.current && !measurementsLayerRef.current.graphics.includes(elevationHoverGraphicRef.current)) {
          measurementsLayerRef.current.add(elevationHoverGraphicRef.current);
        }
      }
    },

    clearElevationHoverPoint() {
      if (elevationHoverGraphicRef.current && measurementsLayerRef.current) {
        measurementsLayerRef.current.remove(elevationHoverGraphicRef.current);
        elevationHoverGraphicRef.current = null;
      }
    },

    clearElevationProfile() {
      if (elevationHoverGraphicRef.current && measurementsLayerRef.current) {
        measurementsLayerRef.current.remove(elevationHoverGraphicRef.current);
        elevationHoverGraphicRef.current = null;
      }
      if (activeWidgetRef.current?.viewModel) {
        try { activeWidgetRef.current.viewModel.clear(); } catch (e) {}
      }
    },

    clearSavedMeasurements() {
      if (measurementsLayerRef.current) {
        measurementsLayerRef.current.removeAll();
      }
    },

    clearAllAnalysis() {
      aoiDrawingStateRef.current = {
        active: false,
        mode: null,
        points: [],
        startPoint: null,
        options: {},
        callback: null,
      };
      if (viewRef.current && viewRef.current.container) {
        viewRef.current.container.style.cursor = "default";
      }
      if (measurementsLayerRef.current) {
        measurementsLayerRef.current.removeAll();
      }
      if (activeWidgetRef.current) {
        try {
          if (typeof activeWidgetRef.current.destroy === "function") activeWidgetRef.current.destroy();
          else if (viewRef.current?.ui) viewRef.current.ui.remove(activeWidgetRef.current);
        } catch (e) {}
        activeWidgetRef.current = null;
      }
    },

    // 3D Analysis Widgets (ArcGIS Earth native features)
    setWidget(widgetType, containerEl) {
      const view = viewRef.current;
      if (!view) return;

      if (activeWidgetRef.current) {
        try {
          if (typeof activeWidgetRef.current.destroy === "function") {
            activeWidgetRef.current.destroy();
          } else if (view.ui) {
            view.ui.remove(activeWidgetRef.current);
          }
        } catch (err) {
          console.warn("Error removing active widget:", err);
        }
        activeWidgetRef.current = null;
      }

      if (!widgetType) return;

      let widget = null;
      try {
        const opts = { view: view };
        if (containerEl) {
          opts.container = containerEl;
        }

        if (widgetType === "daylight") {
          widget = new Daylight({ ...opts, playSliderSpeed: 5 });
        } else if (widgetType === "lineOfSight") {
          widget = new LineOfSight(opts);
        } else if (widgetType === "elevationProfile") {
          widget = new ElevationProfile(opts);
        } else if (widgetType === "distance") {
          widget = new DirectLineMeasurement3D(opts);
        } else if (widgetType === "area") {
          widget = new AreaMeasurement3D(opts);
        } else if (widgetType === "weather") {
          widget = new Weather(opts);
        }

        if (widget) {
          if (!containerEl) {
            view.ui.add(widget, "top-right");
          }
          activeWidgetRef.current = widget;
        }
      } catch (e) {
        console.warn("Failed to initialize widget:", widgetType, e);
      }
    },

    panVertical(direction) {
      const view = viewRef.current;
      if (!view) return;
      const camera = view.camera.clone();
      const currentZ = camera.position.z;
      const step = Math.max(25, currentZ * 0.2);
      const delta = direction === "up" ? step : -step;
      camera.position.z = Math.max(15, currentZ + delta);
      view.goTo(camera, { duration: 300 });
    },

    tiltCamera(direction) {
      const view = viewRef.current;
      if (!view) return;
      const camera = view.camera.clone();
      const delta = direction === "up" ? 10 : -10;
      camera.tilt = Math.max(0, Math.min(88, camera.tilt + delta));
      view.goTo(camera, { duration: 250 });
    },

    importGISData(file) {
      const view = viewRef.current;
      if (!view || !file) return;

      const fileName = file.name.toLowerCase();
      const url = URL.createObjectURL(file);

      if (fileName.endsWith(".geojson") || fileName.endsWith(".json")) {
        const geojsonLayer = new GeoJSONLayer({
          url: url,
          title: file.name,
        });
        view.map.add(geojsonLayer);
        geojsonLayer.load().then(() => {
          if (isLoggedInRef.current && geojsonLayer.fullExtent) {
            view.goTo(geojsonLayer.fullExtent);
          }
        });
      } else if (fileName.endsWith(".kml") || fileName.endsWith(".kmz")) {
        const kmlLayer = new KMLLayer({
          url: url,
          title: file.name,
        });
        view.map.add(kmlLayer);
        kmlLayer.load().then(() => {
          if (isLoggedInRef.current && kmlLayer.fullExtent) {
            view.goTo(kmlLayer.fullExtent);
          }
        });
      }
    },

    resetToGlobeView() {
      const view = viewRef.current;
      if (!view) return;
      view.goTo(
        {
          position: {
            x: 78.9629,
            y: 20.5937,
            z: 22000000,
          },
          heading: 0,
          tilt: 0,
        },
        { duration: 1500 }
      ).catch(() => {});
    },
  }));

  const resetNorth = () => {
    const view = viewRef.current;
    if (!view) return;

    if (view.camera) {
      const camera = view.camera.clone();
      camera.heading = 0;
      camera.tilt = 0;
      view.goTo(camera, { duration: 600 }).catch(() => {});
    } else {
      view.goTo({ heading: 0, tilt: 0 }, { duration: 600 }).catch(() => {});
    }
  };

  return (
    <div className={`relative h-full w-full ${!isLoggedIn ? "pointer-events-none select-none" : ""}`}>
      <div ref={mapDivRef} className="h-full w-full touch-none select-none" style={{ touchAction: "none" }} />

      {/* Floating compass control: north indicator + reset action (only when logged in) */}
      {isLoggedIn && (
        <div className="pointer-events-auto absolute bottom-6 right-4 z-[100] flex flex-col items-center gap-1.5 sm:right-6">
          <button
            type="button"
            onClick={resetNorth}
            title="Reset camera orientation to North (Heading 0°, Tilt 0°)"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2/85 text-ink shadow-float backdrop-blur-xl transition-colors hover:bg-surface-3"
          >
            <span className="flex flex-col items-center leading-none">
              <span className="text-[10px] font-bold tracking-wide text-ink">N</span>
              <svg
                width="11"
                height="13"
                viewBox="0 0 12 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mt-0.5"
              >
                <path d="M6 0L11 14L6 10L1 14L6 0Z" fill="currentColor" className="text-ink-faint" />
                <path d="M6 0L6 10L1 14L6 0Z" fill="#139dd8ff" />
              </svg>
            </span>
          </button>

          <button
            type="button"
            onClick={resetNorth}
            title="Reset camera orientation to North"
            className="whitespace-nowrap rounded-md border border-line bg-surface-2/85 px-2 py-1 text-[9.5px] font-semibold uppercase tracking-wider text-ink-muted shadow-float backdrop-blur-xl transition-colors hover:bg-surface-3 hover:text-accent"
          >
            Reset north
          </button>
        </div>
      )}

      {/* Esri compass widget ref container */}
      <div ref={compassContainerRef} style={{ display: "none" }} />
    </div>
  );
});

export default ArcGISViewer;
