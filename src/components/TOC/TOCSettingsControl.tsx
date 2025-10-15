"use client";

import React, { useState } from "react";
import { FiSettings, FiTrash2, FiSave } from "react-icons/fi";
import "@/components/TOC/TOCSettingsControl.css";

interface TOCSettingsControlProps {
  tocType: "LIST" | "FOLDER";
  sortAlpha: boolean;
  globalOpacity: number;
  onSortChange: (sortAlpha: boolean) => void;
  onGlobalOpacityChange: (opacity: number) => void;
  onTOCTypeChange: () => void;
  onResetToDefault: () => void;
  onTurnOffLayers: () => void;
  onSaveAllLayers: () => void;
  onClearSavedLayers: () => void;
  onOpenLegend: () => void;
}

export default function TOCSettingsControl({
  tocType,
  sortAlpha,
  globalOpacity,
  onSortChange,
  onGlobalOpacityChange,
  onTOCTypeChange,
  onResetToDefault,
  onTurnOffLayers,
  onSaveAllLayers,
  onClearSavedLayers,
  onOpenLegend,
}: TOCSettingsControlProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onGlobalOpacityChange(parseFloat(e.target.value));
  };

  const closeMenu = () => {
    setShowSettings(false);
  };

  const handleTOCTypeChange = () => {
    onTOCTypeChange();
    closeMenu();
  };

  const handleSaveAllLayers = () => {
    onSaveAllLayers();
    closeMenu();
  };

  const handleClearSavedLayers = () => {
    onClearSavedLayers();
    closeMenu();
  };

  const handleResetToDefault = () => {
    onResetToDefault();
    closeMenu();
  };

  const handleTurnOffLayers = () => {
    onTurnOffLayers();
    closeMenu();
  };

  const handleOpenLegend = () => {
    onOpenLegend();
    closeMenu();
  };

  const handleSortChange = (sortAlpha: boolean) => {
    onSortChange(sortAlpha);
    closeMenu();
  };

  const toggleSettings = (e: React.MouseEvent) => {
    if (!showSettings) {
      // Calculate position relative to viewport
      const x = e.clientX;
      const y = e.clientY;

      // Adjust position to prevent dropdown from going off-screen
      const dropdownWidth = 200; // approximate width
      const dropdownHeight = 300; // approximate height
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // Adjust horizontal position if dropdown would go off right edge
      if (x + dropdownWidth > viewportWidth) {
        adjustedX = viewportWidth - dropdownWidth - 10;
      }

      // Adjust vertical position if dropdown would go off bottom edge
      if (y + dropdownHeight > viewportHeight) {
        adjustedY = y - dropdownHeight;
      }

      // Ensure dropdown doesn't go off top or left edges
      adjustedX = Math.max(10, adjustedX);
      adjustedY = Math.max(10, adjustedY);

      setMousePosition({ x: adjustedX, y: adjustedY });
    }
    setShowSettings(!showSettings);
  };

  const handleBackdropClick = () => {
    closeMenu();
  };

  const handleSettingsMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="sc-toc-settings-container">
      <button className="sc-toc-settings-button" onClick={toggleSettings} title="Layer Settings">
        <FiSettings size={16} />
      </button>

      {showSettings && (
        <div className="sc-toc-settings-dropdown" onClick={handleBackdropClick}>
          <div
            className="sc-toc-settings-content"
            onClick={handleSettingsMenuClick}
            style={{
              left: `${mousePosition.x}px`,
              top: `${mousePosition.y}px`,
            }}
          >
            {/* View Type Toggle */}
            <div className="sc-toc-settings-item">
              <button onClick={handleTOCTypeChange} className="sc-toc-settings-action">
                Switch to {tocType === "LIST" ? "Folder" : "List"} View
              </button>
            </div>

            {/* Save and Clear Layers - side by side */}
            <div className="sc-toc-settings-item sc-toc-settings-button-group">
              <button onClick={handleSaveAllLayers} className="sc-toc-settings-action sc-toc-settings-action-with-icon sc-toc-settings-action-half">
                <FiSave size={14} />
                <span>Save Layers</span>
              </button>
              <button onClick={handleClearSavedLayers} className="sc-toc-settings-action sc-toc-settings-action-with-icon sc-toc-settings-action-half">
                <FiTrash2 size={14} />
                <span>Clear</span>
              </button>
            </div>

            {/* Reset to Default */}
            <div className="sc-toc-settings-item">
              <button onClick={handleResetToDefault} className="sc-toc-settings-action">
                Reset to Default
              </button>
            </div>

            {/* Turn Off All Layers */}
            <div className="sc-toc-settings-item">
              <button onClick={handleTurnOffLayers} className="sc-toc-settings-action">
                Turn off all Layers
              </button>
            </div>

            {/* Show Legend */}
            <div className="sc-toc-settings-item">
              <button onClick={handleOpenLegend} className="sc-toc-settings-action">
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
                <input type="checkbox" checked={sortAlpha} onChange={(e) => handleSortChange(e.target.checked)} />
                Sort Alphabetically
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
