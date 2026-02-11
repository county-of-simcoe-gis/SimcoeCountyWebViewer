"use client";

import React, { useState, useEffect } from "react";
import { FaInfoCircle } from "react-icons/fa";
import type { LayerTogglerProps } from "./types/customerservice.types";
import "./styles/CustomerServiceVectorLayerToggler.css";

export default function CustomerServiceVectorLayerToggler({ layer, displayName, legendImage }: LayerTogglerProps) {
  const [layerVisible, setLayerVisible] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [recordCount, setRecordCount] = useState(0);

  // Update record count when layer features change
  useEffect(() => {
    if (!layer) return;

    const updateCount = () => {
      const count = layer.getSource()?.getFeatures()?.length || 0;
      setRecordCount(count);
    };

    // Initial count
    updateCount();

    // Listen for changes
    const source = layer.getSource();
    const changeKey = source?.on("change", updateCount);

    return () => {
      // OpenLayers event key cleanup
      if (changeKey && typeof (changeKey as { remove?: () => void }).remove === "function") {
        (changeKey as { remove: () => void }).remove();
      }
    };
  }, [layer]);

  const handleCheckboxClick = () => {
    const newVisible = !layerVisible;
    setLayerVisible(newVisible);
    layer?.setVisible(newVisible);
  };

  const handlePanelToggle = () => {
    setPanelOpen(!panelOpen);
  };

  return (
    <div className="sc-customer-service-layer-container">
      <div className="sc-border-bottom" />

      {/* Header */}
      <div className="sc-customer-service-layer-header">
        <div className="sc-customer-service-layer-center">
          <input className="checkbox checkbox-sm sc-customer-service-checkbox" type="checkbox" checked={layerVisible} onChange={handleCheckboxClick} />
          <label className="sc-customer-service-layer-label cursor-pointer" onClick={handleCheckboxClick}>
            {displayName}
          </label>
          <label className="sc-customer-service-layer-count">({recordCount})</label>
          <button className="btn btn-ghost btn-xs sc-customer-service-information-icon" onClick={handlePanelToggle} title="Show Details">
            <FaInfoCircle />
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {panelOpen && (
        <div className="sc-customer-service-layer-content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {legendImage && <img src={legendImage} alt="legend" />}
        </div>
      )}

      <div className="sc-border-bottom" />
    </div>
  );
}
