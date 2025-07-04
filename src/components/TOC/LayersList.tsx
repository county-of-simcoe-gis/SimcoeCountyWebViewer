"use client";

import React, { useState, useEffect } from "react";
import { TOCLayerGroup, TOCLayer } from "../../stores/tocStore";
import LayerItem from "./LayerItem";
import "./LayersList.css";

interface LayersListProps {
  group: TOCLayerGroup;
  searchText: string;
  onLayerChange: (layer: TOCLayer, group: TOCLayerGroup) => void;
  onLegendToggle: (layerInfo: TOCLayer, group: TOCLayerGroup) => void;
  onLayerOptionsClick: (evt: React.MouseEvent, layerInfo: TOCLayer) => void;
}

export default function LayersList({ group, searchText, onLayerChange, onLegendToggle, onLayerOptionsClick }: LayersListProps) {
  const [layers, setLayers] = useState<TOCLayer[]>([]);

  // Update layers when group or search text changes
  useEffect(() => {
    if (group.layers && group.layers.length > 0) {
      // Filter layers based on search text
      const filteredLayers = group.layers.filter((layer) => {
        if (searchText === "") return true;
        return layer.tocDisplayName.toLowerCase().includes(searchText.toLowerCase());
      });

      setLayers(filteredLayers);
    }
  }, [group, searchText]);

  if (!group.layers || group.layers.length === 0) {
    return (
      <div className="sc-toc-no-layers">
        <p>No layers available in this group.</p>
      </div>
    );
  }

  return (
    <div className="sc-toc-layer-container">
      <ul className="sc-toc-layers-list">
        {layers.map((layer) => (
          <li key={layer.name} className="sc-toc-layer-item">
            <LayerItem layerInfo={layer} group={group} searchText={searchText} onLayerChange={onLayerChange} onLegendToggle={onLegendToggle} onLayerOptionsClick={onLayerOptionsClick} />
          </li>
        ))}
      </ul>
    </div>
  );
}
