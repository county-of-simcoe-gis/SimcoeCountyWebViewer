"use client";

import React, { useMemo } from "react";
import { FaHistory } from "react-icons/fa";
import { MY_FAVOURITES_VALUE, useTOCStore } from "@/stores/tocStore";

export interface RecentLayerOption {
  name: string;
  displayName: string;
}

// Resolves stored recent layer names to display names, skipping layers no longer loaded.
export function useRecentLayerOptions(): RecentLayerOption[] {
  const recentLayers = useTOCStore((state) => state.recentLayers);
  const allLayers = useTOCStore((state) => state.allLayers);

  return useMemo(
    () =>
      recentLayers.flatMap((name) => {
        const source = allLayers.find((layer) => layer.name === name && layer.group !== MY_FAVOURITES_VALUE);
        return source ? [{ name, displayName: source.tocDisplayName }] : [];
      }),
    [recentLayers, allLayers],
  );
}

interface RecentLayersDropdownProps {
  options: RecentLayerOption[];
  highlightedIndex: number;
  onSelect: (option: RecentLayerOption) => void;
}

export default function RecentLayersDropdown({ options, highlightedIndex, onSelect }: RecentLayersDropdownProps) {
  return (
    <ul
      role="listbox"
      aria-label="Recent layers"
      className="absolute left-0 right-0 top-full mt-[1px] z-50 max-h-60 overflow-y-auto bg-base-100 border border-base-300 rounded-[3px] shadow-md font-[Verdana,Arial,sans-serif] text-[9pt]"
    >
      <li role="presentation" className="flex items-center gap-[5px] px-[5px] py-[3px] text-base-content/60 border-b border-base-300">
        <FaHistory size={10} />
        Recent layers
      </li>
      {options.map((option, index) => (
        <li
          key={option.name}
          role="option"
          aria-selected={index === highlightedIndex}
          title={option.displayName}
          // Keeps focus in the filter input so the blur handler does not close the list before the click.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(option)}
          className={`px-[5px] py-[3px] cursor-pointer truncate ${index === highlightedIndex ? "bg-primary text-primary-content" : "text-base-content hover:bg-base-200"}`}
        >
          {option.displayName}
        </li>
      ))}
    </ul>
  );
}
