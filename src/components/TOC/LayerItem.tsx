"use client";

import React, { useState, useEffect } from "react";
import { TOCLayerGroup, TOCLayer, useTOCStore } from "../../stores/tocStore";
import { FaPaperclip } from "react-icons/fa";
import LayerLegend from "./LayerLegend";
import "./LayerItem.css";

interface LayerItemProps {
  layerInfo: TOCLayer;
  group: TOCLayerGroup;
  searchText: string;
  onLayerChange: (layer: TOCLayer, group: TOCLayerGroup) => void;
  onLegendToggle: (layerInfo: TOCLayer, group: TOCLayerGroup) => void;
  onLayerOptionsClick: (evt: React.MouseEvent, layerInfo: TOCLayer) => void;
}

export default function LayerItem({ layerInfo, group, searchText, onLayerChange, onLegendToggle, onLayerOptionsClick }: LayerItemProps) {
  const [isVisibleAtScale, setIsVisibleAtScale] = useState(true);
  const [isInlineLegend, setIsInlineLegend] = useState(false);

  // Get the live layer data from the store to ensure we have the latest legend data
  const { allLayers, isLegendBlank } = useTOCStore();
  const currentLayerData = allLayers.find((l) => l.name === layerInfo.name) || layerInfo;

  useEffect(() => {
    // For now, assume all layers are visible at current scale
    // This will be implemented when map integration is added
    setIsVisibleAtScale(true);
  }, []);

  // Check if legend image is 20x20 to determine inline display
  useEffect(() => {
    if (currentLayerData.legendImage) {
      const img = new Image();
      img.onload = () => {
        setIsInlineLegend(img.naturalWidth === 20 && img.naturalHeight === 20);
      };
      img.src = currentLayerData.legendImage;
    } else {
      setIsInlineLegend(false);
    }
  }, [currentLayerData.legendImage]);

  const onCheckboxChange = () => {
    // Handle disclaimer if present
    if (layerInfo.disclaimer) {
      // TODO: Show disclaimer dialog
      console.log("Layer has disclaimer:", layerInfo.disclaimer);
    }

    // Toggle layer visibility
    const updatedLayer = { ...layerInfo, visible: !layerInfo.visible };
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
  if (layerInfo.visible) containerClassName += " on";

  // Truncate display name if too long
  const displayName = layerInfo.tocDisplayName.length < 60 ? layerInfo.tocDisplayName : `${layerInfo.tocDisplayName.slice(0, 57)}...`;

  return (
    <div id={`${layerInfo.name}_${layerInfo.group}_listview`}>
      <div className={containerClassName}>
        {/* Legend toggle button - hide for 20x20 inline legends only */}
        {!isInlineLegend && (
          <div
            className="sc-toc-item-plus-minus-container"
            role="button"
            onClick={() => {
              console.log(`Clicked legend toggle for ${layerInfo.name} - current showLegend: ${currentLayerData.showLegend}`);
              console.log(`LayerItem debug - allLayers.length: ${allLayers.length}, currentLayerData found:`, currentLayerData === layerInfo ? "NO (using fallback)" : "YES (from store)");
              if (currentLayerData !== layerInfo) {
                console.log(`Store data for ${layerInfo.name}:`, { showLegend: currentLayerData.showLegend, legendImage: currentLayerData.legendImage });
              }
              onLegendToggle(layerInfo, group);
            }}
          >
            <img
              src={
                layerInfo.styleUrl === "" && !currentLayerData.legendObj
                  ? "/images/toc/no-legend.png"
                  : currentLayerData.showLegend
                  ? "/images/toc/tree-expander-open-16.png"
                  : "/images/toc/tree-expander-closed-16.png"
              }
              alt="legend toggle"
              title={layerInfo.styleUrl === "" && !currentLayerData.legendObj ? "No Legend Available" : currentLayerData.showLegend ? "Hide Legend" : "Show Legend"}
            />
            <div className="sc-toc-item-plus-minus-sign" />
            <div className="sc-toc-item-lines-expanded" />
          </div>
        )}

        {/* Checkbox and label */}
        <label htmlFor={`sc-toc-item-checkbox-${layerInfo.name}_${layerInfo.group}`}>
          <input id={`sc-toc-item-checkbox-${layerInfo.name}_${layerInfo.group}`} className="sc-toc-item-checkbox" type="checkbox" onChange={onCheckboxChange} checked={layerInfo.visible} />
          {/* Inline legend for 20x20 images - before layer name */}
          {isInlineLegend && currentLayerData.legendImage && <LayerLegend legend={null} image={currentLayerData.legendImage} inline={true} />}
          <span className="sc-toc-item-layer-label" title={layerInfo.tocDisplayName} style={isLegendBlank(currentLayerData) && !isInlineLegend ? { marginLeft: "8px" } : undefined}>
            {highlightText(displayName, searchText)}
          </span>
        </label>

        {/* Layer indicators */}
        <div className={currentLayerData.liveLayer ? "sc-toc-item-layer-info-live-layer" : "sc-hidden"} title="This layer is Interactable in the map.">
          <img src="/images/toc/callout.png" alt="callout" />
        </div>

        <div className={currentLayerData.hasAttachments ? "sc-toc-item-layer-info-attachment-layer" : "sc-hidden"} title="This layer has attachments.">
          <FaPaperclip className="sc-attachment-icon" />
        </div>

        <div className={currentLayerData.canDownload ? "sc-toc-item-layer-info-download" : "sc-hidden"} title="This layer can be downloaded.">
          <img src="/images/toc/download.png" alt="can download" />
        </div>

        <div className={currentLayerData.secured ? "sc-toc-item-layer-info-secured" : "sc-hidden"} title="This layer is secured.">
          <img src="/images/toc/lock.png" alt="secure" />
        </div>

        <div className={currentLayerData.userLayer ? "sc-toc-item-layer-info-secured" : "sc-hidden"} title="This layer was user added.">
          <img src="/images/toc/user-icon.png" alt="user added layer" />
        </div>

        {/* Layer options menu button - moved inside flex container */}
        <div className="sc-toc-list-item-toolbox" title="Layer Options" role="button" onClick={(evt) => onLayerOptionsClick(evt, layerInfo)}>
          <img src="/images/toc/more-options.png" alt="more options" />
        </div>
      </div>

      {/* Legend container - Use currentLayerData for live legend data, hide for inline legends */}
      {!isInlineLegend && (
        <div className={currentLayerData.showLegend ? "sc-toc-layer-info-container" : "sc-hidden"}>
          <div className="sc-toc-item-layer-list-info-container-open-vertical-lines" />
          <div className="sc-toc-item-layer-list-info-container-open-horizontal-lines" />
          <LayerLegend legend={currentLayerData.legendObj} image={currentLayerData.legendImage} />
        </div>
      )}
    </div>
  );
}
