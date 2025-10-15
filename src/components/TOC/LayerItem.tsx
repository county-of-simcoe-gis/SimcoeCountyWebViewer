"use client";

import React, { useState, useEffect, useRef } from "react";

import { TOCLayerGroup, TOCLayer, useTOCStore } from "@/stores/tocStore";
import { FaPaperclip, FaInfoCircle, FaDownload, FaLock, FaUser, FaEllipsisV, FaGripVertical } from "react-icons/fa";
import LayerLegend, { LegendToggleButton, useLegendDisplayMode } from "@/components/TOC/LayerLegend";
import "@/components/TOC/LayerItem.css";

interface LayerItemProps {
  layerInfo: TOCLayer;
  group: TOCLayerGroup;
  searchText: string;
  showDragHandle?: boolean; // Controls whether to show the drag handle (default: true for backwards compatibility)
  onLayerChange: (layer: TOCLayer, group: TOCLayerGroup) => void;
  onLegendToggle: (layerInfo: TOCLayer, group: TOCLayerGroup) => void;
  onLayerOptionsClick: (evt: React.MouseEvent, layerInfo: TOCLayer) => void;
}

export default function LayerItem({ layerInfo, group, searchText, showDragHandle = true, onLayerChange, onLegendToggle, onLayerOptionsClick }: LayerItemProps) {
  const [isVisibleAtScale, setIsVisibleAtScale] = useState(true);
  const [shouldLoadLegend, setShouldLoadLegend] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the live layer data from the store to ensure we have the latest legend data
  const { allLayers } = useTOCStore();
  const currentLayerData = allLayers.find((l) => l.name === layerInfo.name) || layerInfo;

  // Use the hook to determine legend display mode, but ONLY when shouldLoadLegend is true
  // This way we only load/check images for items that are in or near the viewport
  const legendDisplayMode = useLegendDisplayMode(shouldLoadLegend ? currentLayerData.legendImage : null, shouldLoadLegend ? currentLayerData.legendObj : null);

  // Fetch legend data on-demand when layer becomes visible
  useEffect(() => {
    if (shouldLoadLegend && !currentLayerData.legendImage && !currentLayerData.legendObj && !currentLayerData.legendFetching) {
      // Trigger legend fetch from the TOC store
      const { fetchLayerLegend, fetchLayerLegendFromRest } = useTOCStore.getState();

      if (currentLayerData.styleUrl) {
        fetchLayerLegend(currentLayerData, group);
      } else if (currentLayerData.metadataUrl) {
        fetchLayerLegendFromRest(currentLayerData, group);
      }
    }
  }, [shouldLoadLegend, currentLayerData, group]);

  useEffect(() => {
    // For now, assume all layers are visible at current scale
    // This will be implemented when map integration is added
    setIsVisibleAtScale(true);
  }, []);

  // Intersection Observer for lazy loading legend images
  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Trigger legend loading when in viewport
            setShouldLoadLegend(true);
            // Once triggered, disconnect the observer
            if (observer) {
              observer.disconnect();
            }
          }
        });
      },
      {
        root: null, // Use viewport as root
        rootMargin: "200px", // Load images 200px before they enter viewport for smooth experience
        threshold: 0.01, // Trigger when at least 1% is visible
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  const onCheckboxChange = () => {
    // Handle disclaimer if present
    if (layerInfo.disclaimer) {
      // TODO: Show disclaimer dialog
    }

    // Use the current layer data from the store (which has the OpenLayers layer object)
    const currentLayerFromStore = currentLayerData;
    const updatedLayer = { ...currentLayerFromStore, visible: !currentLayerFromStore.visible };
    onLayerChange(updatedLayer, group);
  };

  const highlightText = (text: string, searchText: string) => {
    if (!searchText) return text;

    const parts = text.split(new RegExp(`(${searchText})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === searchText.toLowerCase() ? (
        <span key={index} className="sc-search-toc-highlight-words">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Determine container class based on layer state
  let containerClassName = "sc-toc-item-container";
  if (!isVisibleAtScale) containerClassName += " not-in-scale";
  if (currentLayerData.visible) containerClassName += " on";

  // Truncate display name if too long
  const displayName = layerInfo.tocDisplayName.length < 60 ? layerInfo.tocDisplayName : `${layerInfo.tocDisplayName.slice(0, 57)}...`;

  return (
    <div id={`${layerInfo.id}_listview`} ref={containerRef}>
      <div className={containerClassName}>
        {/* Legend toggle button - inline with other elements for expandable legends */}
        {legendDisplayMode === "expandable" && (
          <LegendToggleButton
            showLegend={currentLayerData.showLegend}
            onToggleLegend={() => {
              if (currentLayerData !== layerInfo) {
              }
              onLegendToggle(layerInfo, group);
            }}
            hasLegend={!!(currentLayerData.legendObj || currentLayerData.legendImage)}
            styleUrl={layerInfo.styleUrl}
          />
        )}

        {/* Checkbox and label */}
        {/* Inline legend for small images - before layer name */}
        <label htmlFor={`sc-toc-item-checkbox-${layerInfo.id}`}>
          {legendDisplayMode === "inline" && shouldLoadLegend && <LayerLegend legend={currentLayerData.legendObj} image={currentLayerData.legendImage} forceMode="inline" />}

          <input id={`sc-toc-item-checkbox-${layerInfo.id}`} className="sc-toc-item-checkbox" type="checkbox" onChange={onCheckboxChange} checked={currentLayerData.visible} />

          <span className="sc-toc-item-layer-label" title={layerInfo.tocDisplayName}>
            {highlightText(displayName, searchText)}
          </span>
        </label>

        {/* Layer indicators */}
        <div className={currentLayerData.liveLayer ? "sc-toc-item-layer-info-live-layer" : "sc-hidden"} title="This layer is Interactable in the map.">
          <FaInfoCircle size={16} style={{ opacity: 0.7, color: "#666" }} />
        </div>

        <div className={currentLayerData.hasAttachments ? "sc-toc-item-layer-info-attachment-layer" : "sc-hidden"} title="This layer has attachments.">
          <FaPaperclip className="sc-attachment-icon" />
        </div>

        <div className={currentLayerData.canDownload ? "sc-toc-item-layer-info-download" : "sc-hidden"} title="This layer can be downloaded.">
          <FaDownload size={16} style={{ opacity: 0.7, color: "#666" }} />
        </div>

        <div className={currentLayerData.secured ? "sc-toc-item-layer-info-secured" : "sc-hidden"} title="This layer is secured.">
          <FaLock size={16} style={{ opacity: 0.7, color: "#666" }} />
        </div>

        <div className={currentLayerData.userLayer ? "sc-toc-item-layer-info-secured" : "sc-hidden"} title="This layer was user added.">
          <FaUser size={16} style={{ opacity: 0.7, color: "#666" }} />
        </div>

        {/* Drag handle - only shown in LIST view */}
        {showDragHandle && (
          <div
            className="sc-toc-drag-handle"
            title="Drag to reorder layer"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", layerInfo.id);
              e.currentTarget.style.cursor = "grabbing";
            }}
            onDragEnd={(e) => {
              e.currentTarget.style.cursor = "grab";
            }}
          >
            <FaGripVertical size={14} style={{ opacity: 0.6, color: "#666" }} />
          </div>
        )}

        {/* Layer options menu button - moved inside flex container */}
        <div
          className={`sc-toc-list-item-toolbox${!showDragHandle ? " sc-toc-list-item-toolbox-right" : ""}`}
          title="Layer Options"
          role="button"
          onClick={(evt) => onLayerOptionsClick(evt, layerInfo)}
        >
          <FaEllipsisV size={16} style={{ opacity: 0.7, color: "#666" }} />
        </div>
      </div>

      {/* Legend container - Legend content appears below when expanded */}
      {legendDisplayMode === "expandable" && currentLayerData.showLegend && (
        <div className="sc-toc-layer-info-container">
          <div className="sc-toc-item-layer-list-info-container-open-vertical-lines" />
          <div className="sc-toc-item-layer-list-info-container-open-horizontal-lines" />
          {shouldLoadLegend && <LayerLegend legend={currentLayerData.legendObj} image={currentLayerData.legendImage} forceMode="expandable" />}
        </div>
      )}
    </div>
  );
}
