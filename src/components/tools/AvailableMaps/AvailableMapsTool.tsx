"use client";

import React, { useState, useEffect, useCallback } from "react";
import PanelComponent from "@/components/PanelComponent";
import axiosInstance from "@/lib/axiosInstance";
import { FaExternalLinkAlt, FaChevronDown, FaChevronUp, FaLock, FaSpinner, FaTimes } from "react-icons/fa";
import type { MapItem } from "@/types/mapSettings";

interface AvailableMapsToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  config?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

const MAX_RETRY_ATTEMPTS = 2;

export default function AvailableMapsTool({
  name = "Available Maps",
  helpLink,
  hideHeader = false,
  onClose,
  onSidebarVisibility,
}: AvailableMapsToolProps): React.ReactElement {
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [publicCollapsed, setPublicCollapsed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchMaps = useCallback(async (isRetry = false) => {
    if (!isRetry) setRetryCount(0);
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get<MapItem[]>("/map/all");
      const data = response.data;

      if (!Array.isArray(data)) {
        setError("Invalid response format: expected array of maps");
        return;
      }

      // Validate map entries
      const validMaps = data.filter(
        (map): map is MapItem =>
          map != null && typeof map === "object" && typeof map.map_name === "string" && map.map_name.length > 0,
      );

      if (validMaps.length !== data.length) {
        console.warn(`Filtered out ${data.length - validMaps.length} invalid map entries`);
      }

      setMaps(validMaps);
      setRetryCount(0);
    } catch (err) {
      console.error("Error fetching maps:", err);
      const message = err instanceof Error ? err.message : "Failed to fetch maps";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    fetchMaps(true);
  };

  const handleMapClick = (mapName: string) => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("MAP_ID", mapName);
    window.location.href = currentUrl.toString();
  };

  const handleNewTabClick = (e: React.MouseEvent, mapName: string) => {
    e.stopPropagation();
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("MAP_ID", mapName);
    window.open(currentUrl.toString(), "_blank");
  };

  const filterMaps = (items: MapItem[]) => {
    if (!filterText) return items;
    const term = filterText.toLowerCase();
    return items.filter(
      (map) => map.map_name.toLowerCase().includes(term) || (map.description && map.description.toLowerCase().includes(term)),
    );
  };

  const publicMaps = maps.filter((m) => !m.is_secured);
  const filteredPublicMaps = filterMaps(publicMaps);

  const totalFiltered = filteredPublicMaps.length;
  const totalMaps = publicMaps.length;

  const renderMapItem = (map: MapItem, index: number) => (
    <div key={index} className="group border-b border-gray-200 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
        onClick={() => handleMapClick(map.map_name)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleMapClick(map.map_name); } }}
        title={map.description || `Switch to ${map.map_name} map`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
              {map.is_secured && <FaLock className="text-amber-500 text-xs shrink-0" title="Secured map" />}
              <span className="truncate">{map.map_name}</span>
            </div>
            {map.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{map.description}</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {map.is_default && (
              <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Default</span>
            )}
            <button
              className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-100"
              onClick={(e) => handleNewTabClick(e, map.map_name)}
              title="Open in new tab"
              aria-label="Open in new tab"
            >
              <FaExternalLinkAlt className="text-xs" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSection = (
    title: string,
    items: MapItem[],
    collapsed: boolean,
    onToggle: () => void,
    headerColorClass: string,
    collapsible: boolean,
  ) => {
    if (!collapsible) {
      // Single-section mode: no header, just the list
      return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              {filterText ? "No maps match your filter" : "No maps available"}
            </div>
          ) : (
            items.map(renderMapItem)
          )}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          className={`w-full flex items-center justify-between px-3 py-2 ${headerColorClass} cursor-pointer`}
          onClick={onToggle}
        >
          <h4 className="text-sm font-semibold">
            {title} ({items.length})
          </h4>
          <span className="text-gray-600">{collapsed ? <FaChevronDown /> : <FaChevronUp />}</span>
        </button>
        {!collapsed && (
          <>
            {items.length === 0 ? (
              <div className="px-4 py-4 text-center text-sm text-gray-500">
                {filterText ? `No ${title.toLowerCase()} match your filter` : `No ${title.toLowerCase()} available`}
              </div>
            ) : (
              items.map(renderMapItem)
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="flex flex-col h-full text-sm">
        {/* Header */}
        <div className="px-3 pt-3 pb-2">
          <p className="text-xs text-gray-500">Click on a map to switch to that configuration.</p>
        </div>

        {/* Filter input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="Filter maps by name or description..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            {filterText && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setFilterText("")}
                title="Clear filter"
                aria-label="Clear filter"
              >
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>
          {filterText && (
            <div className="text-xs text-gray-400 mt-1">
              Showing {totalFiltered} of {totalMaps} maps
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <FaSpinner className="animate-spin" />
              <span>Loading maps...</span>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 mb-2">Error loading maps: {error}</p>
              {retryCount < MAX_RETRY_ATTEMPTS ? (
                <button
                  className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
                  onClick={handleRetry}
                >
                  Retry {retryCount > 0 ? `(${retryCount}/${MAX_RETRY_ATTEMPTS})` : ""}
                </button>
              ) : (
                <p className="text-xs text-red-500">Maximum retry attempts reached. Please try again later.</p>
              )}
            </div>
          )}

          {!loading && !error && (
            <>
              {renderSection(
                "Public Maps",
                filteredPublicMaps,
                publicCollapsed,
                () => setPublicCollapsed((prev) => !prev),
                "bg-blue-50 border-b border-blue-200",
                false, // Public-only build: never collapsible
              )}
            </>
          )}
        </div>
      </div>
    </PanelComponent>
  );
}
