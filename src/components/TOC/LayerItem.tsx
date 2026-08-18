"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

import { TOCLayerGroup, TOCLayer, useTOCStore } from "@/stores/tocStore";
import { useMapStore } from "@/stores/mapStore";
import { getMapScale } from "@/utils/mapHelpers";
import { FaPaperclip, FaInfoCircle, FaDownload, FaLock, FaUser, FaEllipsisV, FaGripVertical } from "react-icons/fa";
import LayerLegend, { LegendToggleButton, useLegendDisplayMode } from "@/components/TOC/LayerLegend";
import { acceptDisclaimer } from "@/utils/disclaimerHelpers";
import { trackLayer } from "@/lib/appStats";

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
  const map = useMapStore((s) => s.map);

  // Get the live layer data from the store to ensure we have the latest legend data
  // Use id as primary lookup (unique), fall back to name for legacy layers
  const currentLayerData = useTOCStore((state) => state.allLayers.find((l) => (layerInfo.id ? l.id === layerInfo.id : l.name === layerInfo.name)) || layerInfo);

  // Memoize the legend data to prevent unnecessary recalculations
  const legendData = useMemo(
    () => ({
      image: shouldLoadLegend ? currentLayerData.legendImage : null,
      obj: shouldLoadLegend ? currentLayerData.legendObj : null,
    }),
    [shouldLoadLegend, currentLayerData.legendImage, currentLayerData.legendObj],
  );

  // Use the hook to determine legend display mode, but ONLY when shouldLoadLegend is true
  // This way we only load/check images for items that are in or near the viewport
  const legendDisplayMode = useLegendDisplayMode(legendData.image, legendData.obj);

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

  // Check if the layer is visible at the current map scale
  const checkVisibleScale = useCallback(() => {
    if (!map) return;
    const currentScale = getMapScale(map);
    const minScale = layerInfo.minScale || 0;
    const maxScale = layerInfo.maxScale || 100000000000;
    setIsVisibleAtScale(currentScale >= minScale && currentScale <= maxScale);
  }, [map, layerInfo.minScale, layerInfo.maxScale]);

  useEffect(() => {
    if (!map) return;
    checkVisibleScale();
    map.on("moveend", checkVisibleScale);
    return () => {
      map.un("moveend", checkVisibleScale);
    };
  }, [map, checkVisibleScale]);

  // Intersection Observer for lazy loading legend images
  useEffect(() => {
    // If legend is already loaded OR already marked to load, skip observer setup
    if (shouldLoadLegend || currentLayerData.legendImage || currentLayerData.legendObj) {
      if (!shouldLoadLegend) {
        setShouldLoadLegend(true);
      }
      return;
    }

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
      },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [shouldLoadLegend, currentLayerData.legendImage, currentLayerData.legendObj]);

  const doToggleLayer = () => {
    // Use the current layer data from the store (which has the OpenLayers layer object)
    const currentLayerFromStore = currentLayerData;
    const updatedLayer = { ...currentLayerFromStore, visible: !currentLayerFromStore.visible };
    onLayerChange(updatedLayer, group);
  };

  const onCheckboxChange = () => {
    // Block the toggle if the layer has a disclaimer that has not been accepted.
    if (!acceptDisclaimer(currentLayerData, doToggleLayer)) {
      return;
    }

    // Track user-initiated turn-on only, not default visibility or turn-offs
    if (!currentLayerData.visible) {
      trackLayer(currentLayerData.tocDisplayName, group.label);
    }

    doToggleLayer();
  };

  const highlightText = (text: string, searchText: string) => {
    if (!searchText) return text;

    const parts = text.split(new RegExp(`(${searchText})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === searchText.toLowerCase() ? (
        <span key={index} className="bg-yellow-200 font-bold">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  // Determine container class based on layer state
  let containerClassName = "flex items-center flex-nowrap select-none mx-0.5 font-[Verdana,Arial,sans-serif] text-[9pt] min-h-[3em] min-w-0";
  if (!isVisibleAtScale) containerClassName += " italic";
  if (currentLayerData.visible) containerClassName += " font-bold";
  if (!isVisibleAtScale && currentLayerData.visible) containerClassName += " text-gray-500";

  // Let CSS handle truncation with text-overflow: ellipsis; title attribute provides full name on hover
  const displayName = layerInfo.tocDisplayName;

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
        <label htmlFor={`sc-toc-item-checkbox-${layerInfo.id}`} className="flex items-center min-w-0 flex-1 overflow-hidden">
          {legendDisplayMode === "inline" && shouldLoadLegend && <LayerLegend legend={currentLayerData.legendObj} image={currentLayerData.legendImage} forceMode="inline" />}

          <input id={`sc-toc-item-checkbox-${layerInfo.id}`} className="inline-flex ml-[5px] scale-110" type="checkbox" onChange={onCheckboxChange} checked={currentLayerData.visible} />

          <span className="flex-1 min-w-0 ml-2" title={layerInfo.tocDisplayName} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {highlightText(displayName, searchText)}
          </span>
        </label>

        {/* Layer indicators */}
        <div className={currentLayerData.liveLayer ? "inline-flex items-center ml-[5px] cursor-default" : "hidden"} title="This layer is Interactable in the map.">
          <FaInfoCircle size={16} className="opacity-70 text-[#666]" />
        </div>

        <div className={currentLayerData.hasAttachments ? "inline-flex items-center ml-[5px]" : "hidden"} title="This layer has attachments.">
          <FaPaperclip className="text-[#666] text-xs" />
        </div>

        <div className={currentLayerData.canDownload ? "inline-flex items-center ml-[5px] cursor-default" : "hidden"} title="This layer can be downloaded.">
          <FaDownload size={16} className="opacity-70 text-[#666]" />
        </div>

        <div className={currentLayerData.secured ? "inline-flex items-center ml-[5px]" : "hidden"} title="This layer is secured.">
          <FaLock size={16} className="opacity-70 text-[#666]" />
        </div>

        <div className={currentLayerData.userLayer ? "inline-flex items-center ml-[5px]" : "hidden"} title="This layer was user added.">
          <FaUser size={16} className="opacity-70 text-[#666]" />
        </div>

        {/* Drag handle - only shown in LIST view. The actual draggable element is the
            row wrapper in LayersList, which sets the correct "index:id" payload that the
            drop handler expects. This handle is purely a visual affordance. */}
        {showDragHandle && (
          <div
            className="cursor-grab flex items-center justify-center ml-auto mr-2 p-1 rounded-[3px] transition-all duration-200 min-w-5 min-h-5 hover:bg-black/10 active:cursor-grabbing active:bg-black/15"
            title="Drag to reorder layer"
          >
            <FaGripVertical size={14} className="opacity-60 text-[#666]" />
          </div>
        )}

        {/* Layer options menu button - moved inside flex container */}
        <div
          className={`cursor-pointer flex items-center ml-[5px] pr-[5px]${!showDragHandle ? " ml-auto" : ""}`}
          title="Layer Options"
          role="button"
          onClick={(evt) => onLayerOptionsClick(evt, layerInfo)}
        >
          <FaEllipsisV size={16} className="opacity-70 text-[#666]" />
        </div>
      </div>

      {/* Legend container - Legend content appears below when expanded */}
      {legendDisplayMode === "expandable" && currentLayerData.showLegend && (
        <div className="table">
          <div className="h-[22px] w-[11px] relative -top-[11px] -right-[6px] table-cell bg-[url('/images/toc/verticle_dots.png')] bg-[0px] bg-repeat-y" />
          <div className="h-[5px] w-[11px] relative top-[15px] right-[2px] bg-[url('/images/toc/horizontal_dots.png')] bg-[0px] bg-no-repeat" />
          {shouldLoadLegend && <LayerLegend legend={currentLayerData.legendObj} image={currentLayerData.legendImage} forceMode="expandable" />}
        </div>
      )}
    </div>
  );
}
