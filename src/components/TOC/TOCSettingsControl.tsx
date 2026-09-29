"use client";

import React, { useState } from "react";
import { FiSettings, FiTrash2, FiSave, FiList, FiFolder, FiRefreshCw, FiEyeOff, FiMap } from "react-icons/fi";

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
    <div className="relative">
      <button className="bg-transparent border-none p-[3px] cursor-pointer rounded-[3px] hover:bg-base-300" onClick={toggleSettings} title="Layer Settings">
        <FiSettings size={16} />
      </button>

      {showSettings && (
        <div className="fixed inset-0 z-[1000] bg-transparent" onClick={handleBackdropClick}>
          <div
            className="fixed bg-base-100 border border-base-300 rounded-[3px] shadow-md min-w-[200px] p-[5px] z-[1001]"
            onClick={handleSettingsMenuClick}
            style={{
              left: `${mousePosition.x}px`,
              top: `${mousePosition.y}px`,
            }}
          >
            {/* View Type Toggle */}
            <div className="mb-2 py-[3px]">
              <button
                onClick={handleTOCTypeChange}
                className="bg-transparent border-none text-left w-full p-[5px] cursor-pointer font-[Verdana,Arial,sans-serif] text-[9pt] rounded-[3px] hover:bg-base-200 flex items-center gap-1.5"
              >
                {tocType === "LIST" ? <FiFolder size={14} /> : <FiList size={14} />}
                <span>Switch to {tocType === "LIST" ? "Folder" : "List"} View</span>
              </button>
            </div>

            {/* Save and Clear Layers - side by side */}
            <div className="mb-2 py-[3px] flex gap-[5px]">
              <button
                onClick={handleSaveAllLayers}
                className="bg-transparent border-none text-left w-full p-[5px] cursor-pointer font-[Verdana,Arial,sans-serif] text-[9pt] rounded-[3px] hover:bg-base-200 flex items-center gap-1.5 flex-1 justify-center"
              >
                <FiSave size={14} />
                <span>Save Layers</span>
              </button>
              <button
                onClick={handleClearSavedLayers}
                className="bg-transparent border-none text-left w-full p-[5px] cursor-pointer font-[Verdana,Arial,sans-serif] text-[9pt] rounded-[3px] hover:bg-base-200 flex items-center gap-1.5 flex-1 justify-center"
              >
                <FiTrash2 size={14} />
                <span>Clear</span>
              </button>
            </div>

            {/* Reset to Default */}
            <div className="mb-2 py-[3px]">
              <button
                onClick={handleResetToDefault}
                className="bg-transparent border-none text-left w-full p-[5px] cursor-pointer font-[Verdana,Arial,sans-serif] text-[9pt] rounded-[3px] hover:bg-base-200 flex items-center gap-1.5"
              >
                <FiRefreshCw size={14} />
                <span>Reset to Default</span>
              </button>
            </div>

            {/* Turn Off All Layers */}
            <div className="mb-2 py-[3px]">
              <button
                onClick={handleTurnOffLayers}
                className="bg-transparent border-none text-left w-full p-[5px] cursor-pointer font-[Verdana,Arial,sans-serif] text-[9pt] rounded-[3px] hover:bg-base-200 flex items-center gap-1.5"
              >
                <FiEyeOff size={14} />
                <span>Turn off all Layers</span>
              </button>
            </div>

            {/* Show Legend */}
            <div className="mb-2 py-[3px]">
              <button
                onClick={handleOpenLegend}
                className="bg-transparent border-none text-left w-full p-[5px] cursor-pointer font-[Verdana,Arial,sans-serif] text-[9pt] rounded-[3px] hover:bg-base-200 flex items-center gap-1.5"
              >
                <FiMap size={14} />
                <span>Show Legend</span>
              </button>
            </div>

            {/* Global Opacity */}
            <div className="mb-2 py-[3px]">
              <label className="block font-[Verdana,Arial,sans-serif] text-[9pt] mb-[3px] text-base-content">Opacity: {Math.round(globalOpacity * 100)}%</label>
              <input type="range" min="0" max="1" step="0.1" value={globalOpacity} onChange={handleOpacityChange} className="w-full h-5" />
            </div>

            {/* Alpha Sort Toggle */}
            <div className="py-[3px]">
              <label className="flex items-center font-[Verdana,Arial,sans-serif] text-[9pt] cursor-pointer">
                <input type="checkbox" checked={sortAlpha} onChange={(e) => handleSortChange(e.target.checked)} className="mr-[5px]" />
                Sort Alphabetically
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
