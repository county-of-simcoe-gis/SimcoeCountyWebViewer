"use client";

import React from "react";
import { FaQuestionCircle } from "react-icons/fa";
import TOCSettingsControl from "@/components/TOC/TOCSettingsControl";
import "@/components/TOC/TOCHeader.css";

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
  onClearSavedLayers: () => void;
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
  onClearSavedLayers,
  onOpenLegend,
}: TOCHeaderProps) {
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
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

      {/* Settings Control */}
      <TOCSettingsControl
        tocType={tocType}
        sortAlpha={sortAlpha}
        globalOpacity={globalOpacity}
        onSortChange={onSortChange}
        onGlobalOpacityChange={onGlobalOpacityChange}
        onTOCTypeChange={onTOCTypeChange}
        onResetToDefault={onResetToDefault}
        onTurnOffLayers={onTurnOffLayers}
        onSaveAllLayers={onSaveAllLayers}
        onClearSavedLayers={onClearSavedLayers}
        onOpenLegend={onOpenLegend}
      />

      {/* Help Button */}
      <div className="sc-toc-help-container">
        <a href={helpLink} target="_blank" rel="noopener noreferrer" className="sc-toc-help-button" title="Layer Help">
          <FaQuestionCircle size={16} />
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
