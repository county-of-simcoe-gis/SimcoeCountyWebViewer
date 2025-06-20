"use client";

import React, { useState, useEffect } from "react";
import { TOCLayerGroup, TOCLayer } from "../../stores/tocStore";
import LayerItem from "./LayerItem";
import "./LayersList.css";

interface LayersListProps {
  group: TOCLayerGroup;
  searchText: string;
  sortAlpha: boolean;
  onLayerChange: (layer: TOCLayer, group: TOCLayerGroup) => void;
  onLegendToggle: (layerInfo: TOCLayer, group: TOCLayerGroup) => void;
  onLayerOptionsClick: (evt: React.MouseEvent, layerInfo: TOCLayer) => void;
  onSortEnd: ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => void;
}

export default function LayersList({ group, searchText, sortAlpha, onLayerChange, onLegendToggle, onLayerOptionsClick, onSortEnd }: LayersListProps) {
  const [layers, setLayers] = useState<TOCLayer[]>([]);
  const [allLayers, setAllLayers] = useState<TOCLayer[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Update layers when group or search text changes
  useEffect(() => {
    if (group.layers && group.layers.length > 0) {
      setAllLayers(group.layers);

      // Filter layers based on search text
      const filteredLayers = group.layers.filter((layer) => {
        if (searchText === "") return true;
        return layer.tocDisplayName.toLowerCase().includes(searchText.toLowerCase());
      });

      setLayers(filteredLayers);
    }
  }, [group, searchText]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (sortAlpha) return; // Disable drag when alpha sorted

    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (sortAlpha) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (sortAlpha || draggedIndex === null) return;

    e.preventDefault();

    if (draggedIndex !== dropIndex) {
      // Find the actual indices in all layers
      const draggedLayer = layers[draggedIndex];
      const droppedLayer = layers[dropIndex];

      const oldIndexInAllLayers = allLayers.indexOf(draggedLayer);
      const newIndexInAllLayers = allLayers.indexOf(droppedLayer);

      onSortEnd({ oldIndex: oldIndexInAllLayers, newIndex: newIndexInAllLayers });
    }

    setDraggedIndex(null);
  };

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
        {layers.map((layer, index) => (
          <li
            key={layer.name}
            className={`sc-toc-layer-item${draggedIndex === index ? " sc-dragged" : ""}`}
            draggable={!sortAlpha}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, index)}
          >
            <LayerItem layerInfo={layer} group={group} searchText={searchText} onLayerChange={onLayerChange} onLegendToggle={onLegendToggle} onLayerOptionsClick={onLayerOptionsClick} />
          </li>
        ))}
      </ul>
    </div>
  );
}
