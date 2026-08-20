"use client";

import React, { useState, useCallback } from "react";
import { IdentifyResult } from "@/components/Identify/Identify";
import IdentifyFeatureItem from "@/components/Identify/IdentifyFeatureItem";
import { useAppStore } from "@/stores/appStore";
import { downloadFile } from "@/utils/helpersBrowser";
import Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";

import { filterFeatureKeys } from "@/utils/identifyHelpers";

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
    <div className="mb-[15px] border border-base-300 rounded overflow-hidden">
      <div className="bg-base-200 p-2.5 cursor-pointer flex justify-between items-center select-none hover:bg-base-300" onClick={handleToggle}>
        <div className="flex items-center gap-2 font-bold">
          <span className="bg-primary text-primary-content rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-bold">{layer.features.length}</span>
          <span className="text-[13px]">{layer.type}</span>
        </div>
        <div className={`transition-transform duration-200 text-[10px] text-base-content/70 ${open ? "rotate-180" : ""}`}>▼</div>
      </div>
      <div className={open ? "p-[5px] bg-base-100" : "hidden"}>
        {allowExport && layer.features.length > 1 && (
          <div className="text-[9pt] text-base-content/70 text-right px-2 py-[2px] pb-1 leading-[10px]">
            [&nbsp;
            <span className="text-primary cursor-pointer no-underline hover:underline" onClick={handleExport}>
              Export to csv
            </span>
            &nbsp;]
          </div>
        )}
        {layer.features.map((featureItem, idx) => (
          <IdentifyFeatureItem key={`feature-${idx}`} featureItem={featureItem} layerName={layer.name} minScale={layer.minScale} fieldMetadata={layer.fieldMetadata} />
        ))}
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
const IdentifyLayer = React.memo(IdentifyLayerComponent);
export default IdentifyLayer;
