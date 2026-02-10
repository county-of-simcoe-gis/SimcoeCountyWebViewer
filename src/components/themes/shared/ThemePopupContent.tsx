"use client";

import { usePopupStore } from "@/stores/popupStore";
import { FaExternalLinkAlt, FaTimes } from "react-icons/fa";

interface ThemePopupContentProps {
  properties: Record<string, unknown>;
  moreInfoUrlFieldName?: string;
  popupLogoImage?: string;
}

export default function ThemePopupContent({
  properties,
  moreInfoUrlFieldName,
  popupLogoImage,
}: ThemePopupContentProps) {
  const { hide } = usePopupStore();

  // Find the URL field value if specified
  let moreInfoUrl = "";
  if (moreInfoUrlFieldName && properties[moreInfoUrlFieldName]) {
    moreInfoUrl = String(properties[moreInfoUrlFieldName]);
  }

  // Filter out geometry and internal fields (starting with _)
  const displayEntries = Object.entries(properties).filter(([key]) => {
    return key !== "geometry" && !key.startsWith("_");
  });

  const handleMoreInfo = () => {
    if (moreInfoUrl) {
      window.open(moreInfoUrl, "_blank");
    }
  };

  return (
    <div className="min-w-[280px] max-w-[400px]">
      {/* Logo if provided */}
      {popupLogoImage && (
        <div className="text-center mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/images/${popupLogoImage}`}
            alt="Theme Logo"
            className="max-h-12 mx-auto"
          />
        </div>
      )}

      {/* Property rows */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {displayEntries.map(([key, value]) => (
          <div
            key={key}
            className="flex gap-2 py-1 border-b border-base-200 last:border-0"
          >
            <span className="font-medium text-xs text-base-content/70 min-w-[80px]">
              {formatLabel(key)}:
            </span>
            <span className="text-sm text-base-content flex-1">
              {formatValue(value)}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        {moreInfoUrl && (
          <button
            className="btn btn-sm btn-primary flex-1"
            onClick={handleMoreInfo}
          >
            <FaExternalLinkAlt className="w-3 h-3" />
            More Information
          </button>
        )}
        <button
          className="btn btn-sm btn-outline flex-1"
          onClick={hide}
        >
          <FaTimes className="w-3 h-3" />
          Close
        </button>
      </div>
    </div>
  );
}

// Helper to format field labels (convert camelCase/snake_case to readable text)
function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Helper to format values for display
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
