"use client";

import React, { useState, useCallback } from "react";
import { IdentifyResult } from "@/components/Identify/Identify";
import IdentifyFeatureItem from "@/components/Identify/IdentifyFeatureItem";
import { useAppStore } from "@/stores/appStore";
import { downloadFile } from "@/utils/helpersBrowser";
import Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";

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
    <div className="mb-[15px] border border-[#ddd] rounded overflow-hidden">
      <div className="bg-[#f5f5f5] p-2.5 cursor-pointer flex justify-between items-center select-none hover:bg-[#e9e9e9]" onClick={handleToggle}>
        <div className="flex items-center gap-2 font-bold">
          <span className="bg-[#007bff] text-white rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-bold">{layer.features.length}</span>
          <span className="text-[13px]">{layer.type}</span>
        </div>
        <div className={`transition-transform duration-200 text-[10px] text-[#666] ${open ? "rotate-180" : ""}`}>▼</div>
      </div>
      <div className={open ? "p-[5px] bg-white" : "hidden"}>
        {allowExport && layer.features.length > 1 && (
          <div className="text-[9pt] text-[dimgray] text-right px-2 py-[2px] pb-1 leading-[10px]">
            [&nbsp;
            <span className="text-[#007bff] cursor-pointer no-underline hover:underline" onClick={handleExport}>
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
