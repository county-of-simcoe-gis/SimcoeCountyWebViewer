"use client";

import React, { useState, useCallback } from "react";
import { IdentifyFeature } from "./Identify";
import { useMapStore } from "@/stores/mapStore";
import Image from "next/image";
import "@/components/Identify/Identify.css";

interface IdentifyFeatureItemProps {
  featureItem: IdentifyFeature;
  layerName: string;
  minScale?: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const IdentifyFeatureItemComponent: React.FC<IdentifyFeatureItemProps> = ({ featureItem, layerName, minScale = 0 }) => {
  const { map } = useMapStore();
  const [open, setOpen] = useState(false);
  const { feature, displayName } = featureItem;

  const onZoomClick = useCallback(() => {
    if (!map) return;

    const geom = feature.getGeometry();
    if (!geom) return;

    const extent = geom.getExtent();
    if (extent) {
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        duration: 500,
        maxZoom: minScale > 0 ? Math.log2(minScale) : 18,
      });
    }
  }, [map, feature, minScale]);

  const formatFieldName = (fieldName: string): string => {
    // Convert field name to title case and replace underscores with spaces
    return fieldName.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const renderFeatureContent = () => {
    const props = feature.getProperties();
    const keys = Object.keys(props).filter((key) => {
      // Filter out internal properties
      return !key.startsWith("_") && key !== "geometry" && key !== "boundedBy";
    });

    if (keys.length === 0) {
      return <div className="sc-identify-no-attributes">No attributes found</div>;
    }

    return (
      <div className="sc-identify-feature-attributes">
        {keys.map((key) => (
          <div key={key} className="sc-identify-feature-row">
            <div className="sc-identify-feature-label">{formatFieldName(key)}:</div>
            <div className="sc-identify-feature-value">{formatFieldValue(props[key])}</div>
          </div>
        ))}
      </div>
    );
  };

  const featureName = feature.get(displayName) || "N/A";
  const hasGeom = feature.getGeometry() !== undefined && feature.getGeometry() !== null;

  return (
    <div className="sc-identify-feature-container">
      <div className="sc-identify-feature-header">
        <div className="sc-identify-feature-header-label" onClick={() => setOpen(!open)}>
          {formatFieldName(displayName)}: {featureName}
        </div>
        {hasGeom && (
          <div className="sc-identify-feature-actions">
            <Image src="/images/toc/zoom-in.png" width={16} height={16} alt="Zoom" className="sc-identify-feature-header-img" onClick={onZoomClick} title="Zoom to feature" />
          </div>
        )}
      </div>
      <div className={open ? "sc-identify-feature-content" : "sc-hidden"}>{renderFeatureContent()}</div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
const IdentifyFeatureItem = React.memo(IdentifyFeatureItemComponent);
export default IdentifyFeatureItem;
