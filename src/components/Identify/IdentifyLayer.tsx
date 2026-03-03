"use client";

import React, { useState, useCallback } from "react";
import { IdentifyResult } from "@/components/Identify/Identify";
import IdentifyFeatureItem from "@/components/Identify/IdentifyFeatureItem";
import { useAppStore } from "@/stores/appStore";
import { downloadFile } from "@/utils/helpersBrowser";
import Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import "@/components/Identify/Identify.css";

/** Regex patterns for keys to exclude from CSV export (ported from old app's FilterKeys) */
const FILTER_KEY_PATTERNS = [
  /^_.*$/,
  /^id$/,
  /^geometry$/,
  /^geom$/,
  /^extent_geom$/,
  /^.*gid.*$/,
  /^globalid$/,
  /^objectid.*$/,
  /^shape.*$/,
  /^displayfieldname$/,
  /^displayfieldvalue$/,
  /^layerdisplayname$/,
  /^geostasis\..*$/,
  /^.*fid.*$/,
  /^boundedby$/,
];

/** Filter feature property keys, removing internal/system fields */
function filterFeatureKeys(feature: Feature<Geometry>): string[] {
  const props = feature.getProperties();
  return Object.keys(props).filter((key) => {
    const val = props[key];
    if (val !== null && typeof val === "object") return false;
    const lower = key.toLowerCase();
    return !FILTER_KEY_PATTERNS.some((pattern) => pattern.test(lower));
  });
}

/** Export layer features to a CSV file */
function exportLayerToCSV(title: string, features: Feature<Geometry>[]): void {
  if (features.length === 0) return;

  const fields = filterFeatureKeys(features[0]);
  if (fields.length === 0) return;

  const headers = fields.map((f) => `"${f}"`).join(",");
  const rows = features.map((feature) =>
    fields
      .map((field) => {
        const val = feature.get(field);
        return val === null || val === undefined ? "" : `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(","),
  );

  const csv = [headers, ...rows].join("\r\n").replaceAll("#", "Number");
  downloadFile(csv, `${title} export.csv`, "text/csv;charset=utf-8");
}

interface IdentifyLayerProps {
  layer: IdentifyResult;
  expanded: boolean;
}

const IdentifyLayerComponent: React.FC<IdentifyLayerProps> = ({ layer, expanded }) => {
  const [open, setOpen] = useState(expanded);
  const allowExport = useAppStore((s) => s.config?.allowIdentifyExport ?? false);

  const handleToggle = () => {
    setOpen(!open);
  };

  const handleExport = useCallback(() => {
    exportLayerToCSV(
      layer.type,
      layer.features.map((f) => f.feature),
    );
  }, [layer]);

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
        {allowExport && layer.features.length > 1 && (
          <div className="sc-identify-export-csv">
            [&nbsp;
            <span className="sc-fakeLink" onClick={handleExport}>
              Export to csv
            </span>
            &nbsp;]
          </div>
        )}
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
