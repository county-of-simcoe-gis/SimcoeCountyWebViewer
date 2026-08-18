"use client";

import React from "react";
import { FaQuestionCircle, FaTimes } from "react-icons/fa";
import TOCSettingsControl from "@/components/TOC/TOCSettingsControl";
import { showURLWindow } from "@/utils/helpersUI";

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
    <div className="flex items-center p-[5px] bg-base-200 border-b border-base-300 gap-[5px] font-[Verdana,Arial,sans-serif] text-[9pt]">
      {/* Search Input */}
      <div className="flex-1 relative">
        <input
          className="w-full py-[3px] pr-5 pl-[5px] border border-base-300 rounded-[3px] font-[Verdana,Arial,sans-serif] text-[9pt] bg-base-100 text-base-content focus:outline-1 focus:outline-primary focus:border-primary"
          type="text"
          placeholder={`Search ${layerCount} Layers...`}
          value={searchText}
          onChange={handleSearchInput}
        />
        {searchText && (
          <button
            className="absolute right-[5px] top-1/2 -translate-y-1/2 bg-transparent border-none text-base text-base-content/50 cursor-pointer w-4 h-4 flex items-center justify-center hover:text-base-content"
            onClick={() => onSearchChange("")}
            title="Clear search"
          >
            <FaTimes />
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
      <div className="flex items-center">
        <button
          onClick={() => showURLWindow(helpLink + "#layers", false)}
          className="flex items-center justify-center w-5 h-5 bg-transparent border-none cursor-pointer rounded-[3px] hover:bg-base-300"
          title="Layer Help"
        >
          <FaQuestionCircle size={16} />
        </button>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center ml-[5px]">
          <div className="w-4 h-4 border-2 border-base-300 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
