import React, { useState, useCallback } from "react";
import { FaShareAlt, FaCheck } from "react-icons/fa";
import Map from "ol/Map";
import { MapControlButton } from "@/components/ui/MapControlButton";
import { useTOCStore } from "@/stores/tocStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useAppStore } from "@/stores/appStore";
import { getStorageItem } from "@/utils/storage";

interface ShareMapProps {
  map?: Map;
}

const BASEMAP_STORAGE_KEY = "Saved Basemap Options";

export const ShareMap = React.memo(({ map }: ShareMapProps) => {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    if (!map) return;

    const view = map.getView();
    const center = view.getCenter();
    const zoom = view.getZoom();

    const params = new URLSearchParams();

    // Center coordinates
    if (center) {
      params.set("X", center[0].toFixed(2));
      params.set("Y", center[1].toFixed(2));
    }

    // Zoom level
    if (zoom !== undefined) {
      params.set("ZOOM", zoom.toFixed(1));
    }

    // Active layers (comma-separated tocDisplayName values)
    const visibleLayers = useTOCStore.getState().getAllVisibleLayers();
    if (visibleLayers.length > 0) {
      const layerNames = new Set(visibleLayers.map((layer) => layer.tocDisplayName || layer.displayName || layer.name));

      params.set("LAYERS", Array.from(layerNames).join(","));
    }

    // Basemap state from localStorage
    try {
      const savedBasemap = getStorageItem(BASEMAP_STORAGE_KEY);
      if (savedBasemap) {
        const basemapOptions = JSON.parse(savedBasemap) as {
          activeButton?: string;
          selectedTopoServiceName?: string | null;
        };
        if (basemapOptions.activeButton) {
          params.set("BASEMAP", basemapOptions.activeButton);
        }
        if (basemapOptions.selectedTopoServiceName) {
          params.set("NAME", basemapOptions.selectedTopoServiceName);
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }

    // Active theme
    const sidebarState = useSidebarStore.getState();
    if (sidebarState.activeTheme) {
      const theme = sidebarState.themes.find((t) => t.id === sidebarState.activeTheme || t.component === sidebarState.activeTheme || t.name === sidebarState.activeTheme);
      if (theme) {
        params.set("THEME", theme.name);
      }
    }

    // Active tool
    if (sidebarState.activeTool) {
      const tool = sidebarState.tools.find((t) => t.id === sidebarState.activeTool || t.component === sidebarState.activeTool || t.name === sidebarState.activeTool);
      if (tool) {
        params.set("TOOL", tool.name);
      }
    }

    // Active map configuration (MAP_ID / MAP_VERSION)
    const appConfig = useAppStore.getState().config;
    if (appConfig && appConfig.mapId) {
      params.set("MAP_ID", appConfig.mapId);
      const mapVersion = (appConfig as Record<string, unknown>).mapVersion;
      if (mapVersion) {
        params.set("MAP_VERSION", String(mapVersion));
      }
    }

    // Compose final URL
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const shareUrl = `${baseUrl}?${params.toString()}`;

    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [map]);

  return (
    <MapControlButton onClick={handleShare} title={copied ? "Link copied!" : "Share map"}>
      {copied ? <FaCheck size={16} className="text-success" /> : <FaShareAlt size={16} className="text-base-content" />}
    </MapControlButton>
  );
});

ShareMap.displayName = "ShareMap";
export default ShareMap;
