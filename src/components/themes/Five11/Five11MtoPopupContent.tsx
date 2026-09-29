"use client";

import type { MtoEventProperties } from "./types";
import { mtoPopupFields } from "./config";

interface Five11MtoPopupContentProps {
  properties: MtoEventProperties;
}

/**
 * Format field name for display (PascalCase to Title Case with spaces)
 */
function formatFieldName(fieldName: string): string {
  // Handle special cases
  const specialCases: Record<string, string> = {
    DirectionOfTravel: "Direction of Travel",
    LanesAffected: "Lanes Affected",
    EventType: "Event Type",
    IsFullClosure: "Full Closure",
    startDate: "Start Date",
    endDate: "End Date",
  };

  if (specialCases[fieldName]) {
    return specialCases[fieldName];
  }

  // Convert PascalCase/camelCase to Title Case
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format value for display
 */
function formatValue(key: string, value: unknown): string {
  if (value === undefined || value === null) return "";

  // Handle boolean values
  if (key === "IsFullClosure") {
    return value === true || value === "true" ? "Yes" : "No";
  }

  return String(value);
}

export default function Five11MtoPopupContent({ properties }: Five11MtoPopupContentProps) {
  // Include date fields if they exist
  const fieldsToShow = [...mtoPopupFields, "startDate", "endDate"];

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
          <span className="text-sm">{formatValue(key, value)}</span>
        </div>
      ))}
      {entries.length === 0 && <div className="text-sm text-base-content/70">No details available</div>}
    </div>
  );
}
