import React, { useState, useRef } from "react";
import { FolderOpen, Upload } from "lucide-react";
import { SUPPORTED_GIS_FORMATS } from "../services/formats.js";
import { PanelShell, PanelHeader, FieldLabel, selectField } from "./ui/Panel.jsx";

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
    <PanelShell className="w-[320px] sm:w-[340px]">
      {/* ── Header ── */}
      <PanelHeader
        icon={Upload}
        title="Add GIS data layer"
        onClose={onClose}
      />

      {/* ── Upload progress ── */}
      {uploadProgress !== null && uploadProgress !== undefined && (
        <div className="border-b border-line bg-accent/10 px-3.5 py-2">
          <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-semibold text-accent">
            <span>Uploading dataset…</span>
            {typeof uploadProgress === "number" && (
              <span className="tabular font-mono">{uploadProgress}%</span>
            )}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-surface-4">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${typeof uploadProgress === "number" ? uploadProgress : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex flex-col p-3.5">
        <div className="mb-3">
          <label className="mb-1.5 block">
            <FieldLabel>Format filter</FieldLabel>
          </label>
          <select
            value={selectedFormatId}
            onChange={(e) => setSelectedFormatId(e.target.value)}
            className={`${selectField} truncate`}
          >
            {SUPPORTED_GIS_FORMATS.map((fmt) => (
              <option key={fmt.id} value={fmt.id} className="bg-surface-1 text-ink">
                {fmt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Hidden input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={currentFormat.accept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelected(e.target.files[0]);
              e.target.value = "";
            }
          }}
        />

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
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
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          className={`mb-3 cursor-pointer rounded-xl border-2 border-dashed px-3 py-6 text-center transition-colors ${
            isDragging
              ? "border-accent bg-accent/12"
              : "border-line-strong bg-white/[0.02] hover:border-accent/50 hover:bg-white/[0.05]"
          }`}
        >
          <Upload
            size={26}
            className={`mx-auto mb-2 transition-colors ${
              isDragging ? "text-accent" : "text-ink-faint"
            }`}
            strokeWidth={1.6}
          />
          <div className="text-[12.5px] font-semibold text-ink">Drop GIS files here</div>
          <div className="mt-0.5 text-[11px] font-medium text-accent">or click to browse</div>
          <p className="mx-auto mt-2.5 max-w-[240px] text-[10px] leading-relaxed text-ink-faint">
            .slpk .kml .kmz .geojson .shp .zip .tif .dem .csv .3ds .gltf
          </p>
        </div>

        {/* Action */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-[12px] font-semibold text-surface-0 transition-colors hover:bg-accent-soft"
        >
          <FolderOpen size={14} />
          Browse files
        </button>
      </div>
    </PanelShell>
  );
}
