"use client";

import React, { useState } from "react";
import { IdentifyResult } from "@/components/Identify/Identify";
import IdentifyFeatureItem from "@/components/Identify/IdentifyFeatureItem";
import "@/components/Identify/Identify.css";

interface IdentifyLayerProps {
  layer: IdentifyResult;
  expanded: boolean;
}

const IdentifyLayerComponent: React.FC<IdentifyLayerProps> = ({ layer, expanded }) => {
  const [open, setOpen] = useState(expanded);

  const handleToggle = () => {
    setOpen(!open);
  };

  return (
    <div className="sc-identify-layer-container">
      <div className="sc-identify-layer-header" onClick={handleToggle}>
        <div className="sc-identify-layer-header-label">
          <span className="sc-identify-layer-count">{layer.features.length}</span>
          <span className="sc-identify-layer-name">{layer.type}</span>
        </div>
        <div className={`sc-identify-layer-toggle ${open ? "open" : ""}`}>▼</div>
      </div>
      <div className={open ? "sc-identify-layer-content-container" : "sc-hidden"}>
        {layer.features.map((featureItem, idx) => (
          <IdentifyFeatureItem key={`feature-${idx}`} featureItem={featureItem} layerName={layer.name} minScale={layer.minScale} />
        ))}
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
const IdentifyLayer = React.memo(IdentifyLayerComponent);
export default IdentifyLayer;
