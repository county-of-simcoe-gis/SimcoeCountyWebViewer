"use client";

import React from "react";
import { TOCLayerGroup, TOCLayer } from "../../stores/tocStore";
import LayersList from "./LayersList";
import "./TOCListView.css";

interface TOCListViewProps {
  id: string;
  visible: boolean;
  layerGroups: TOCLayerGroup[];
  selectedGroup: TOCLayerGroup | null;
  searchText: string;
  sortAlpha: boolean;
  onGroupDropDownChange: (group: TOCLayerGroup) => void;
  onLayerChange: (layer: TOCLayer, group: TOCLayerGroup) => void;
  onLegendToggle: (layerInfo: TOCLayer, group: TOCLayerGroup) => void;
  onLayerOptionsClick: (evt: React.MouseEvent, layerInfo: TOCLayer) => void;
  onSortEnd: ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => void;
}

export default function TOCListView({
  id,
  visible,
  layerGroups,
  selectedGroup,
  searchText,
  sortAlpha,
  onGroupDropDownChange,
  onLayerChange,
  onLegendToggle,
  onLayerOptionsClick,
  onSortEnd,
}: TOCListViewProps) {
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    const group = layerGroups.find((g) => g.value === selectedValue);
    if (group) {
      onGroupDropDownChange(group);
    }
  };

  if (!visible) {
    return <div className="sc-hidden" />;
  }

  return (
    <div id={`${id}-container-main`} className="sc-toc-list-view-container">
      {/* Groups Dropdown */}
      <div className="sc-toc-groups-container">
        <div id={`${id}-groups-dropdown`} title="Click here for more layers">
          <select id={`${id}-select`} className="sc-toc-groups-select" value={selectedGroup?.value || ""} onChange={handleGroupChange}>
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
        <div className="sc-toc-layers-section">
          <LayersList
            group={selectedGroup}
            searchText={searchText}
            sortAlpha={sortAlpha}
            onLayerChange={onLayerChange}
            onLegendToggle={onLegendToggle}
            onLayerOptionsClick={onLayerOptionsClick}
            onSortEnd={onSortEnd}
          />
        </div>
      )}
    </div>
  );
}
