"use client";

import React, { useState } from "react";
import "./TOCHeader.css";

interface TOCHeaderProps {
  tocType: "LIST" | "FOLDER";
  searchText: string;
  sortAlpha: boolean;
  globalOpacity: number;
  isLoading: boolean;
  layerCount: number;
  helpLink: string;
  onSearchChange: (value: string) => void;
  onSortChange: (sortAlpha: boolean) => void;
  onGlobalOpacityChange: (opacity: number) => void;
  onTOCTypeChange: () => void;
  onResetToDefault: () => void;
  onTurnOffLayers: () => void;
  onSaveAllLayers: () => void;
  onOpenLegend: () => void;
}

export default function TOCHeader({
  tocType,
  searchText,
  sortAlpha,
  globalOpacity,
  isLoading,
  layerCount,
  helpLink,
  onSearchChange,
  onSortChange,
  onGlobalOpacityChange,
  onTOCTypeChange,
  onResetToDefault,
  onTurnOffLayers,
  onSaveAllLayers,
  onOpenLegend,
}: TOCHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onGlobalOpacityChange(parseFloat(e.target.value));
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <div className="sc-toc-header">
      {/* Search Input */}
      <div className="sc-toc-search-container">
        <input className="sc-toc-search" type="text" placeholder={`Search ${layerCount} Layers...`} value={searchText} onChange={handleSearchInput} />
        {searchText && (
          <button className="sc-toc-search-clear" onClick={() => onSearchChange("")} title="Clear search">
            ×
          </button>
        )}
      </div>

      {/* Settings Dropdown */}
      <div className="sc-toc-settings-container">
        <button className="sc-toc-settings-button" onClick={toggleSettings} title="Layer Settings">
          <img src="/images/toc/settings.png" alt="settings" />
        </button>

        {showSettings && (
          <div className="sc-toc-settings-dropdown">
            <div className="sc-toc-settings-content">
              {/* View Type Toggle */}
              <div className="sc-toc-settings-item">
                <button onClick={onTOCTypeChange} className="sc-toc-settings-action">
                  Switch to {tocType === "LIST" ? "Folder" : "List"} View
                </button>
              </div>

              {/* Save Layers */}
              <div className="sc-toc-settings-item">
                <button onClick={onSaveAllLayers} className="sc-toc-settings-action">
                  Save Layers to My Maps
                </button>
              </div>

              {/* Reset to Default */}
              <div className="sc-toc-settings-item">
                <button onClick={onResetToDefault} className="sc-toc-settings-action">
                  Reset to Default
                </button>
              </div>

              {/* Turn Off All Layers */}
              <div className="sc-toc-settings-item">
                <button onClick={onTurnOffLayers} className="sc-toc-settings-action">
                  Turn off all Layers
                </button>
              </div>

              {/* Show Legend */}
              <div className="sc-toc-settings-item">
                <button onClick={onOpenLegend} className="sc-toc-settings-action">
                  Show Legend
                </button>
              </div>

              {/* Global Opacity */}
              <div className="sc-toc-settings-item">
                <label className="sc-toc-settings-label">Opacity: {Math.round(globalOpacity * 100)}%</label>
                <input type="range" min="0" max="1" step="0.1" value={globalOpacity} onChange={handleOpacityChange} className="sc-toc-opacity-slider" />
              </div>

              {/* Alpha Sort Toggle */}
              <div className="sc-toc-settings-item">
                <label className="sc-toc-settings-checkbox">
                  <input type="checkbox" checked={sortAlpha} onChange={(e) => onSortChange(e.target.checked)} />
                  Sort Alphabetically
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Button */}
      <div className="sc-toc-help-container">
        <a href={helpLink} target="_blank" rel="noopener noreferrer" className="sc-toc-help-button" title="Layer Help">
          <img src="/images/toc/help.png" alt="help" />
        </a>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="sc-toc-loading">
          <div className="sc-toc-loading-spinner"></div>
        </div>
      )}
    </div>
  );
}
