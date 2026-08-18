"use client";

import type { WazeAlertProperties, WazeLineProperties } from "./types";
import { wazePopupFields } from "./config";

interface Five11WazePopupContentProps {
  properties: WazeAlertProperties | WazeLineProperties;
  layerName: string;
}

/**
 * Format field name for display (camelCase to Title Case)
 */
function formatFieldName(fieldName: string): string {
  // Handle special cases
  const specialCases: Record<string, string> = {
    speedKMH: "Speed (km/h)",
    reportDescription: "Description",
    subtype: "Subtype",
  };

  if (specialCases[fieldName]) {
    return specialCases[fieldName];
  }

  // Convert camelCase to Title Case
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export default function Five11WazePopupContent({ properties, layerName }: Five11WazePopupContentProps) {
  // Determine which fields to show based on layer type
  const isLineLayer = layerName.includes("jam-lines") || layerName.includes("irregularity-lines");

  // For line layers, show speed, delay, date, street
  const fieldsToShow = isLineLayer ? ["speedKMH", "delay", "date", "street", "city"] : wazePopupFields;

  const entries = Object.entries(properties).filter(([key, value]) => {
    // Skip geometry and internal fields
    if (key === "geometry" || key.startsWith("_")) return false;
    // Only show fields in our list
    return fieldsToShow.includes(key) && value !== undefined && value !== null && value !== "";
  });

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col">
          <span className="text-xs font-semibold text-base-content/70">{formatFieldName(key)}</span>
          <span className="text-sm">{String(value)}</span>
        </div>
      ))}
      {entries.length === 0 && <div className="text-sm text-base-content/70">No details available</div>}
    </div>
  );
}
