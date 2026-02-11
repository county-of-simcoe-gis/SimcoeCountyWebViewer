"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { FaInfoCircle } from "react-icons/fa";
import type { WMSLayerConfig } from "./types/customerservice.types";
import { useMapStore } from "@/stores/mapStore";
import type BaseLayer from "ol/layer/Base";
import "./styles/CustomerServiceWMSLayerToggler.css";

interface CustomerServiceWMSLayerTogglerProps {
  layerConfig: WMSLayerConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onLayerInit?: (layer: any) => void;
}

export default function CustomerServiceWMSLayerToggler({ layerConfig, onLayerInit }: CustomerServiceWMSLayerTogglerProps) {
  const map = useMapStore((state) => state.map);
  const [layerVisible, setLayerVisible] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [layer] = useState<BaseLayer | null>(null);
  const [styleUrl, setStyleUrl] = useState("");
  const [recordCount] = useState(0);

  // Initialize layer
  useEffect(() => {
    if (!map) return;

    // This would create a WMS layer - implementation depends on your helper functions
    // For now, this is a placeholder
    // const newLayer = helpers.getImageWMSLayer(
    //   layerConfig.serverUrl,
    //   layerConfig.layerName,
    //   "geoserver",
    //   null,
    //   layerConfig.zIndex
    // );

    // setLayer(newLayer);
    // if (onLayerInit) onLayerInit(newLayer);

    // Generate legend URL
    const legendUrl = `${layerConfig.serverUrl}wms?REQUEST=GetLegendGraphic&VERSION=1.1&FORMAT=image/png&WIDTH=30&HEIGHT=30&TRANSPARENT=true&LAYER=${layerConfig.layerName}`;
    setStyleUrl(legendUrl);

    return () => {
      if (layer && map) {
        map.removeLayer(layer);
      }
    };
  }, [map, layerConfig, onLayerInit, layer]);

  const handleCheckboxClick = () => {
    const newVisible = !layerVisible;
    setLayerVisible(newVisible);
    layer?.setVisible(newVisible);
  };

  const handlePanelToggle = () => {
    setPanelOpen(!panelOpen);
  };

  return (
    <div className="sc-customer-service-wms-layer-container">
      {/* Header */}
      <div className="sc-customer-service-layer-header">
        <div className="sc-customer-service-layer-center">
          <input className="checkbox checkbox-sm sc-customer-service-checkbox" type="checkbox" checked={layerVisible} onChange={handleCheckboxClick} />
          <label className="sc-customer-service-layer-label cursor-pointer" onClick={handleCheckboxClick}>
            {layerConfig.displayName}
          </label>
          <label className="sc-customer-service-layer-count">({recordCount})</label>
          <button className="btn btn-ghost btn-xs sc-customer-service-information-icon" onClick={handlePanelToggle} title="Show Details">
            <FaInfoCircle />
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {panelOpen && styleUrl && (
        <div className="sc-customer-service-layer-content">
          <Image src={styleUrl} alt="legend" width={30} height={30} unoptimized />
        </div>
      )}
    </div>
  );
}
