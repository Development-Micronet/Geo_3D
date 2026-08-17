import React, { useState, useEffect, useRef } from "react";

export default function LocationSearch({ viewerRef, placeholder = "Search location or city...", fullWidth = false, containerStyle: customContainerStyle }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      fetchLocations(query.trim());
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  async function fetchLocations(searchQuery) {
    setLoading(true);
    try {
      // 1. Try ArcGIS World Geocoding Service (Free, global, accurate)
      const esriUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
        searchQuery
      )}&maxLocations=6&outFields=Match_addr,PlaceName`;

      const res = await fetch(esriUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.candidates && data.candidates.length > 0) {
          const items = data.candidates.map((c, idx) => ({
            id: `esri_${idx}_${c.location.x}_${c.location.y}`,
            name: c.address,
            extent: c.extent
              ? {
                  xmin: c.extent.xmin,
                  ymin: c.extent.ymin,
                  xmax: c.extent.xmax,
                  ymax: c.extent.ymax,
                }
              : null,
            center: [c.location.x, c.location.y],
          }));
          setResults(items);
          setIsOpen(true);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to OpenStreetMap Nominatim
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=6`;
      const nomRes = await fetch(nomUrl);
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        const items = nomData.map((item, idx) => ({
          id: `nom_${idx}_${item.place_id}`,
          name: item.display_name,
          center: [parseFloat(item.lon), parseFloat(item.lat)],
          extent: item.boundingbox
            ? {
                xmin: parseFloat(item.boundingbox[2]),
                ymin: parseFloat(item.boundingbox[0]),
                xmax: parseFloat(item.boundingbox[3]),
                ymax: parseFloat(item.boundingbox[1]),
              }
            : null,
        }));
        setResults(items);
        setIsOpen(true);
      }
    } catch (e) {
      console.warn("Geocoding search failed", e);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(item) {
    setIsOpen(false);
    setQuery(item.name);
    if (!viewerRef?.current) return;

    if (item.extent) {
      viewerRef.current.goToLocation(item.extent);
    } else if (item.center) {
      viewerRef.current.goToLocation({
        target: item.center,
        zoom: 15,
      });
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && results.length > 0) {
      handleSelect(results[0]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div style={{ ...containerStyle, width: fullWidth ? "100%" : 220, ...customContainerStyle }}>
      {/* Invisible click outside backdrop */}
      {isOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 199, background: "transparent" }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Input Field */}
      <div style={inputWrapperStyle}>
        <span style={searchIconStyle}>{loading ? "⏳" : "🔍"}</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={inputStyle}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            style={clearBtnStyle}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && results.length > 0 && (
        <div style={dropdownStyle}>
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              style={itemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(56, 189, 248, 0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 13, flexShrink: 0 }}>📍</span>
              <span style={itemTextStyle}>{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Styles ─── */

const containerStyle = {
  position: "relative",
  width: 220,
};

const inputWrapperStyle = {
  display: "flex",
  alignItems: "center",
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: 20,
  padding: "6px 12px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  transition: "all 0.2s ease",
};

const searchIconStyle = {
  fontSize: 13,
  marginRight: 6,
  color: "#94a3b8",
  display: "flex",
  alignItems: "center",
};

const inputStyle = {
  width: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#f8fafc",
  fontSize: 12,
  fontWeight: 500,
};

const clearBtnStyle = {
  background: "transparent",
  border: "none",
  color: "#94a3b8",
  fontSize: 11,
  cursor: "pointer",
  padding: "0 2px",
  lineHeight: 1,
};

const dropdownStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: 280,
  background: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: 12,
  padding: "6px 0",
  boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6)",
  zIndex: 201,
  maxHeight: 240,
  overflowY: "auto",
};

const itemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  cursor: "pointer",
  transition: "background 0.15s ease",
};

const itemTextStyle = {
  fontSize: 12,
  color: "#e2e8f0",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
