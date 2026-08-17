import React, { useState, useRef } from "react";
import { SUPPORTED_GIS_FORMATS } from "../services/formats.js";

export default function AddDataPanel({ onUploadData, uploadProgress, onClose }) {
  const [selectedFormatId, setSelectedFormatId] = useState("all");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const currentFormat =
    SUPPORTED_GIS_FORMATS.find((f) => f.id === selectedFormatId) ||
    SUPPORTED_GIS_FORMATS[0];

  function handleFileSelected(file) {
    if (!file) return;
    onUploadData && onUploadData(file);
  }

  return (
    <div style={panelContainerStyle}>
      {/* Panel Header */}
      <div style={panelHeaderStyle}>
        <div style={panelTitleStyle}>
          <span>🥞</span> Add GIS Data Layer
        </div>
        <button onClick={onClose} style={closeBtnStyle} title="Close Add Data Panel">
          ✕
        </button>
      </div>

      {/* Upload Progress Banner */}
      {uploadProgress !== null && uploadProgress !== undefined && (
        <div style={uploadProgressBannerStyle}>
          ⏳ Uploading Dataset… {typeof uploadProgress === "number" ? `${uploadProgress}%` : ""}
        </div>
      )}

      {/* Panel Content */}
      <div style={panelBodyStyle}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, color: "#cbd5e1", fontWeight: 600, marginBottom: 5 }}>
            GIS Format Filter:
          </label>
          <select
            value={selectedFormatId}
            onChange={(e) => setSelectedFormatId(e.target.value)}
            style={selectDropdownStyle}
          >
            {SUPPORTED_GIS_FORMATS.map((fmt) => (
              <option key={fmt.id} value={fmt.id} style={{ background: "#0f172a", color: "#fff" }}>
                {fmt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Hidden Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={currentFormat.accept}
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelected(e.target.files[0]);
              e.target.value = "";
            }
          }}
        />

        {/* Drag and Drop Zone */}
        <div
          style={{
            ...dropZoneStyle,
            borderColor: isDragging ? "#38bdf8" : "rgba(255, 255, 255, 0.25)",
            background: isDragging ? "rgba(56, 189, 248, 0.18)" : "rgba(255, 255, 255, 0.04)",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileSelected(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: 32, marginBottom: 6 }}>📥</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 2 }}>
            Drag & Drop GIS files here
          </div>
          <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 600, marginBottom: 8 }}>
            or click to browse files
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.4 }}>
            Supported Formats: .slpk, .kml, .kmz, .geojson, .shp, .zip, .tif, .dem, .csv, .3ds, .gltf
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={browseBtnStyle}
        >
          📁 Browse Files
        </button>
      </div>
    </div>
  );
}

/* ─── Styles ─── */

const panelContainerStyle = {
  width: 340,
  background: "rgba(12, 16, 28, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: 12,
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6)",
  color: "#ffffff",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  pointerEvents: "auto",
};

const panelHeaderStyle = {
  padding: "10px 14px",
  background: "rgba(20, 28, 46, 0.9)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const panelTitleStyle = {
  fontSize: 13.5,
  fontWeight: 800,
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const closeBtnStyle = {
  background: "transparent",
  border: "none",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 14,
  padding: "2px 6px",
  borderRadius: 4,
  transition: "all 0.15s ease",
};

const uploadProgressBannerStyle = {
  background: "rgba(56, 189, 248, 0.9)",
  color: "#fff",
  padding: "7px 10px",
  fontSize: 11,
  fontWeight: 700,
  textAlign: "center",
};

const panelBodyStyle = {
  padding: 14,
  display: "flex",
  flexDirection: "column",
};

const selectDropdownStyle = {
  width: "100%",
  background: "rgba(15, 23, 42, 0.95)",
  color: "#edf2f7",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 11.5,
  outline: "none",
  cursor: "pointer",
};

const dropZoneStyle = {
  border: "2px dashed rgba(255, 255, 255, 0.25)",
  borderRadius: 10,
  padding: "20px 12px",
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.2s ease",
  marginBottom: 12,
};

const browseBtnStyle = {
  width: "100%",
  background: "linear-gradient(135deg, #38bdf8, #0284c7)",
  border: "none",
  borderRadius: 8,
  color: "#ffffff",
  fontSize: 12,
  fontWeight: 700,
  padding: "10px",
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(56, 189, 248, 0.35)",
  transition: "all 0.2s ease",
};
