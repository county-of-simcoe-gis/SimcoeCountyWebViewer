"use client";

import React, { useState, useEffect, useRef } from "react";
import { TOCLayerGroup, TOCLayer, useTOCStore } from "@/stores/tocStore";
import LayerItem from "@/components/TOC/LayerItem";

interface LayersListProps {
  group: TOCLayerGroup;
  searchText: string;
  onLayerChange: (layer: TOCLayer, group: TOCLayerGroup) => void;
  onLegendToggle: (layerInfo: TOCLayer, group: TOCLayerGroup) => void;
  onLayerOptionsClick: (evt: React.MouseEvent, layerInfo: TOCLayer) => void;
}

export default function LayersList({ group, searchText, onLayerChange, onLegendToggle, onLayerOptionsClick }: LayersListProps) {
  const [layers, setLayers] = useState<TOCLayer[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const moveLayer = useTOCStore((s) => s.moveLayer);
  const sortAlpha = useTOCStore((s) => s.sortAlpha);

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
  }, [group, group.layers, searchText]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}:${layers[index].id}`);

    // Add dragging class to the dragged element
    const target = e.target as HTMLElement;
    const container = target.closest(".sc-toc-item-container") as HTMLElement;
    if (container) {
      container.classList.add("dragging");
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;

    // Remove dragging class
    const target = e.target as HTMLElement;
    const container = target.closest(".sc-toc-item-container") as HTMLElement;
    if (container) {
      container.classList.remove("dragging");
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Only set drag over if it's a different item
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    dragCounter.current--;

    // Only clear drag over if all child elements have been left
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    dragCounter.current++;

    // Set drag over index
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    dragCounter.current = 0;

    const dragData = e.dataTransfer.getData("text/plain");
    const [draggedIndexStr, draggedLayerId] = dragData.split(":");
    const draggedIndex = parseInt(draggedIndexStr, 10);

    if (isNaN(draggedIndex) || draggedIndex === dropIndex) {
      return;
    }

    // Verify that the dragged layer ID matches the layer at the dragged index
    if (layers[draggedIndex]?.id !== draggedLayerId) {
      console.warn("Drag data mismatch - layer may have been reordered during drag");
      return;
    }

    // Reorder layers locally first for immediate feedback
    const newLayers = [...layers];
    const [movedLayer] = newLayers.splice(draggedIndex, 1);
    newLayers.splice(dropIndex, 0, movedLayer);
    setLayers(newLayers);

    // Update the store to persist the change (this also updates LayerManager z-indices)
    moveLayer(group.label, draggedIndex, dropIndex);
  };

  if (!group.layers || group.layers.length === 0) {
    return (
      <div className="p-5 text-center text-base-content/60 italic">
        <p className="m-0 text-[9pt] font-[Verdana,Arial,sans-serif]">No layers available in this group.</p>
      </div>
    );
  }

  return (
    <div className="absolute top-[148px] bottom-0 w-full max-w-[400px] overflow-y-scroll select-all max-[770px]:top-[160px]">
      <ul className="list-none p-0 m-0 select-all">
        {layers.map((layer, index) => (
          <li
            key={layer.id || `${group.value}-${layer.name}-${index}`}
            className={`m-0 p-0 border-none bg-transparent cursor-default min-h-[3em] leading-[2em] relative ${!sortAlpha && dragOverIndex === index ? "bg-primary/5 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-primary before:z-10" : ""}`}
            draggable={false}
            onDragOver={sortAlpha ? undefined : (e) => handleDragOver(e, index)}
            onDragLeave={sortAlpha ? undefined : handleDragLeave}
            onDragEnter={sortAlpha ? undefined : (e) => handleDragEnter(e, index)}
            onDrop={sortAlpha ? undefined : (e) => handleDrop(e, index)}
          >
            <div
              draggable={!sortAlpha}
              onDragStart={sortAlpha ? undefined : (e) => handleDragStart(e, index)}
              onDragEnd={sortAlpha ? undefined : handleDragEnd}
              className={!sortAlpha && draggedIndex === index ? "dragging" : ""}
            >
              <LayerItem
                layerInfo={layer}
                group={group}
                searchText={searchText}
                showDragHandle={!sortAlpha}
                onLayerChange={onLayerChange}
                onLegendToggle={onLegendToggle}
                onLayerOptionsClick={onLayerOptionsClick}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
