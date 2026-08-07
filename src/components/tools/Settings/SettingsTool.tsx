"use client";

import React, { useState, useEffect } from "react";
import PanelComponent from "@/components/PanelComponent";
import { useMapStore, type ControlVisibility } from "@/stores/mapStore";
import { getStorageKeys, getStorageItem, removeStorageItem } from "@/utils/storage";
import { flushUserStorage } from "@/utils/userStorage";

interface SettingsToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  config?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

interface LocalStorageItem {
  key: string;
  size: number;
}

// Control display configuration with logical grouping
const controlGroups = {
  navigation: [
    { key: "rotate" as keyof ControlVisibility, label: "Rotate Map", tooltip: "Shows a compass button to reset map rotation. Rotate the map with Alt+Shift+Drag or pinch/turn on touch devices" },
    { key: "fullScreen" as keyof ControlVisibility, label: "Full Screen", tooltip: "Toggles full-screen mode for the map" },
    { key: "zoomInOut" as keyof ControlVisibility, label: "Zoom In/Out", tooltip: "Shows zoom in (+) and zoom out (-) buttons. You can also zoom with the mouse wheel or +/- keys" },
    { key: "currentLocation" as keyof ControlVisibility, label: "Current Location", tooltip: "Zooms to your current GPS location" },
    { key: "zoomExtent" as keyof ControlVisibility, label: "Zoom to Extent", tooltip: "Zooms to the full extent of the map" },
    { key: "extentHistory" as keyof ControlVisibility, label: "Extent History", tooltip: "Navigate back and forward through previous map extents" },
  ],
  display: [
    { key: "scale" as keyof ControlVisibility, label: "Scale Text", tooltip: "Shows the current map scale as text (e.g. 1:10,000)" },
    { key: "scaleLine" as keyof ControlVisibility, label: "Scale Line", tooltip: "Shows a scale bar on the map" },
    { key: "scaleSelector" as keyof ControlVisibility, label: "Scale Selector", tooltip: "Shows a dropdown to select a specific map scale" },
    { key: "basemap" as keyof ControlVisibility, label: "Basemap Switcher", tooltip: "Shows the basemap switcher to change the background map" },
    { key: "grid" as keyof ControlVisibility, label: "Grid", tooltip: "Toggles a coordinate grid overlay on the map" },
  ],
  other: [
    { key: "gitHubButton" as keyof ControlVisibility, label: "GitHub Button", tooltip: "Shows a link to the project's GitHub repository" },
    { key: "attributeTable" as keyof ControlVisibility, label: "Attribute Table", tooltip: "Shows an attribute table for querying layer data" },
    { key: "shareMap" as keyof ControlVisibility, label: "Share Map", tooltip: "Shows a button to copy a shareable URL of the current map view" },
  ],
};

export default function SettingsTool({ name = "Settings", helpLink, hideHeader = false, onClose, onSidebarVisibility }: SettingsToolProps) {
  const { controlVisibility, setControlVisibility, resetControlVisibilityToDefaults } = useMapStore();
  const [localStorageItems, setLocalStorageItems] = useState<LocalStorageItem[]>([]);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // Load localStorage items on mount
  useEffect(() => {
    loadLocalStorageItems();
  }, []);

  const loadLocalStorageItems = () => {
    if (typeof window === "undefined") return;

    const items: LocalStorageItem[] = [];

    for (const key of getStorageKeys()) {
      // Filter out Next-Auth tokens
      if (key.startsWith("next-auth") || key.startsWith("__Secure-next-auth") || key.includes("session-token") || key.includes("csrf-token")) {
        continue;
      }

      const value = getStorageItem(key);
      const size = value ? new Blob([value]).size : 0;

      items.push({ key, size });
    }

    // Sort by key name
    items.sort((a, b) => a.key.localeCompare(b.key));
    setLocalStorageItems(items);
  };

  const handleControlToggle = (key: keyof ControlVisibility) => {
    setControlVisibility(key, !controlVisibility[key]);
  };

  const handleResetToDefaults = () => {
    resetControlVisibilityToDefaults();
  };

  const handleReloadPage = () => {
    window.location.reload();
  };

  const handleClearAll = () => {
    setShowClearAllModal(true);
  };

  const confirmClearAll = () => {
    if (typeof window === "undefined") return;

    // Clear all except Next-Auth tokens
    const keysToRemove: string[] = [];

    for (const key of getStorageKeys()) {
      // Keep Next-Auth tokens
      if (key.startsWith("next-auth") || key.startsWith("__Secure-next-auth") || key.includes("session-token") || key.includes("csrf-token")) {
        continue;
      }

      keysToRemove.push(key);
    }

    keysToRemove.forEach((key) => removeStorageItem(key));
    flushUserStorage();

    setShowClearAllModal(false);
    loadLocalStorageItems();
  };

  const handleClearItem = (key: string) => {
    if (typeof window === "undefined") return;

    removeStorageItem(key);
    flushUserStorage();
    loadLocalStorageItems();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="flex flex-col gap-4 p-4 text-sm">
        {/* Map Controls Section */}
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-4 gap-4">
            <div className="flex items-center justify-between">
              <h3 className="card-title text-sm">Map Controls</h3>
              <button className="btn btn-primary btn-xs shadow-sm" onClick={handleResetToDefaults}>
                Reset to Defaults
              </button>
            </div>

            {/* Navigation Controls */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-ghost badge-sm">Navigation</span>
                <span className="text-xs text-base-content/60">Map movement tools</span>
              </div>
              <div className="flex flex-col gap-1">
                {controlGroups.navigation.map(({ key, label, tooltip }) => (
                  <label key={key} className="label cursor-pointer justify-start gap-3 rounded-lg px-2 py-1 hover:bg-base-200/60" title={tooltip}>
                    <input type="checkbox" className="checkbox checkbox-sm" checked={controlVisibility[key]} onChange={() => handleControlToggle(key)} />
                    <span className="label-text text-xs">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Display Controls */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-ghost badge-sm">Display</span>
                <span className="text-xs text-base-content/60">Map visual aids</span>
              </div>
              <div className="flex flex-col gap-1">
                {controlGroups.display.map(({ key, label, tooltip }) => (
                  <label key={key} className="label cursor-pointer justify-start gap-3 rounded-lg px-2 py-1 hover:bg-base-200/60" title={tooltip}>
                    <input type="checkbox" className="checkbox checkbox-sm" checked={controlVisibility[key]} onChange={() => handleControlToggle(key)} />
                    <span className="label-text text-xs">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Other Controls */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-ghost badge-sm">Other</span>
                <span className="text-xs text-base-content/60">Misc controls</span>
              </div>
              <div className="flex flex-col gap-1">
                {controlGroups.other.map(({ key, label, tooltip }) => (
                  <label key={key} className="label cursor-pointer justify-start gap-3 rounded-lg px-2 py-1 hover:bg-base-200/60" title={tooltip}>
                    <input type="checkbox" className="checkbox checkbox-sm" checked={controlVisibility[key]} onChange={() => handleControlToggle(key)} />
                    <span className="label-text text-xs">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Local Storage Management Section */}
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-4 gap-4">
            <div className="flex items-center justify-between">
              <h3 className="card-title text-sm">Local Storage</h3>
              <div className="flex gap-2">
                <button className="btn btn-sm btn-secondary shadow-sm" onClick={handleReloadPage}>
                  Reload
                </button>
                <button className="btn btn-sm btn-error shadow-sm" onClick={handleClearAll}>
                  Clear All
                </button>
              </div>
            </div>

            {/* Individual Storage Items */}
            {localStorageItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-base-content/70 mb-2">Stored Items</h4>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                  {localStorageItems.map(({ key, size }) => (
                    <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-base-200 bg-base-200/40 p-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{key}</div>
                        <div className="text-base-content/60 text-xs">{formatBytes(size)}</div>
                      </div>
                      <button className="btn btn-xs btn-error shadow-sm" onClick={() => handleClearItem(key)} title={`Clear ${key}`}>
                        Clear
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {localStorageItems.length === 0 && <div className="text-xs text-base-content/60 text-center py-6">No stored items found</div>}
          </div>
        </div>

        {/* Info Note */}
        <div className="alert alert-info text-xs">
          <span>
            <strong>Note:</strong> Map control changes apply immediately. Clearing storage removes saved data from your browser.
          </span>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearAllModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Clear All Saved Data?</h3>
            <p className="py-4 text-sm text-base-content/70">This will remove all saved settings, search history, and other local data. This action cannot be undone.</p>
            <div className="modal-action">
              <button className="btn btn-sm shadow-sm" onClick={() => setShowClearAllModal(false)}>
                Cancel
              </button>
              <button className="btn btn-error btn-sm shadow-sm" onClick={confirmClearAll}>
                Clear All Data
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowClearAllModal(false)}></div>
        </div>
      )}
    </PanelComponent>
  );
}
