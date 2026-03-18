"use client";

import React from "react";
import { TOCLayerGroup, TOCLayer, useTOCStore } from "@/stores/tocStore";
import LayersList from "@/components/TOC/LayersList";

interface TOCListViewProps {
  id: string;
  visible: boolean;
  layerGroups: TOCLayerGroup[];
  selectedGroup: TOCLayerGroup | null;
  searchText: string;
  onGroupDropDownChange: (group: TOCLayerGroup) => void;
  onLayerChange: (layer: TOCLayer, group: TOCLayerGroup) => void;
  onLegendToggle: (layerInfo: TOCLayer, group: TOCLayerGroup) => void;
  onLayerOptionsClick: (evt: React.MouseEvent, layerInfo: TOCLayer) => void;
}

export default function TOCListView({ id, visible, layerGroups, selectedGroup, searchText, onGroupDropDownChange, onLayerChange, onLegendToggle, onLayerOptionsClick }: TOCListViewProps) {
  const { switchToGroup } = useTOCStore();

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    const group = layerGroups.find((g) => g.value === selectedValue);
    if (group) {
      // Use the new switchToGroup function that handles layer visibility
      switchToGroup(group);
      // Also call the original callback for compatibility
      onGroupDropDownChange(group);
    }
  };

  if (!visible) {
    return <div className="hidden" />;
  }

  return (
    <div id={`${id}-container-main`} className="h-full flex flex-col">
      {/* Groups Dropdown */}
      <div className="p-[5px] border-b border-[#ddd] bg-[#f8f9fa]">
        <div id={`${id}-groups-dropdown`} title="Click here for more layers">
          <select
            id={`${id}-select`}
            className="w-full h-[30px] px-2 border border-[#ccc] rounded-[3px] text-[9pt] font-[Verdana,Arial,sans-serif] bg-white cursor-pointer focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            value={selectedGroup?.value || ""}
            onChange={handleGroupChange}
          >
            <option value="" disabled>
              Click Here for more Layers...
            </option>
            {layerGroups.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Layers List */}
      {selectedGroup && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <LayersList group={selectedGroup} searchText={searchText} onLayerChange={onLayerChange} onLegendToggle={onLegendToggle} onLayerOptionsClick={onLayerOptionsClick} />
        </div>
      )}
    </div>
  );
}
