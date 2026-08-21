import React, { useState, useEffect, useRef } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";

export default function LocationSearch({ viewerRef, placeholder = "Search location…", fullWidth = false, className = "" }) {
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
    <div className={`relative ${fullWidth ? "w-full" : "w-36 sm:w-48 lg:w-56"} ${className}`}>
      {/* Click-outside backdrop */}
      {isOpen && <div className="fixed inset-0 z-[199]" onClick={() => setIsOpen(false)} />}

      {/* Input */}
      {/* <div className="group relative flex items-center rounded-full border border-line bg-white/[0.04] px-3 transition-colors focus-within:border-accent/60 focus-within:bg-surface-1 hover:border-line-strong">
        <span className="pointer-events-none flex shrink-0 items-center text-ink-faint">
          {loading ? <Loader2 size={13} className="animate-spin text-accent" /> : <Search size={13} />}
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search for a location"
          className="w-full bg-transparent py-1.5 pl-2 text-[11.5px] font-medium text-ink outline-none placeholder:text-ink-faint"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            title="Clear search"
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-white/10 hover:text-ink"
          >
            <X size={11} />
          </button>
        )}
      </div> */}
      <div className="group relative flex h-9 w-full items-center rounded-full bg-white/[0.08] px-3">
        <span className="pointer-events-none flex shrink-0 items-center text-white">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-white" />
          ) : (
            <Search size={14} className="text-white" />
          )}
        </span>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search for a location"
          className="!border-0 !outline-none !ring-0 !shadow-none focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none focus-visible:!border-0 focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!shadow-none w-full min-w-0 bg-transparent py-1.5 pl-2 text-[11.5px] font-medium text-white placeholder:text-white"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            title="Clear search"
            className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/20 hover:text-white"
          >
            <X size={11} className="text-white" />
          </button>
        )}
      </div>


      {/* Suggestions */}
      {isOpen && results.length > 0 && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[201] max-h-60 w-72 overflow-y-auto rounded-xl border border-line bg-surface-2/95 p-1.5 shadow-panel backdrop-blur-xl">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/10"
            >
              <MapPin size={13} className="shrink-0 text-accent" />
              <span className="truncate text-[11.5px] text-ink-muted" title={item.name}>
                {item.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
