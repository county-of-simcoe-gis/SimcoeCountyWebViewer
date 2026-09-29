"use client";

import { FaExternalLinkAlt } from "react-icons/fa";
import { formatIdentifyDateValue, isExcludedKey } from "@/utils/identifyHelpers";
import AppImage from "@/components/shared/AppImage";
import { showURLWindow } from "@/utils/helpersUI";
import type { ReactNode } from "react";

interface ThemePopupContentProps {
  properties: Record<string, unknown>;
  moreInfoUrlFieldName?: string;
  popupLogoImage?: string;
}

export default function ThemePopupContent({ properties, moreInfoUrlFieldName, popupLogoImage }: ThemePopupContentProps) {
  // Find the URL field value if specified
  let moreInfoUrl = "";
  if (moreInfoUrlFieldName && properties[moreInfoUrlFieldName]) {
    moreInfoUrl = String(properties[moreInfoUrlFieldName]);
  }

  // Filter out internal/system fields using shared identify filter
  const displayEntries = Object.entries(properties).filter(([key]) => {
    return !isExcludedKey(key);
  });

  const handleMoreInfo = () => {
    if (moreInfoUrl) {
      showURLWindow(moreInfoUrl, false, "normal", false, false, "More Information");
    }
  };

  return (
    <div className="min-w-[280px] max-w-[400px] pr-2">
      {/* Logo if provided */}
      {popupLogoImage && (
        <div className="text-center mb-3">
          <AppImage src={`/images/${popupLogoImage}`} alt="Theme Logo" className="max-h-12 mx-auto" />
        </div>
      )}

      {/* Property rows — scrolling is handled by the outer popup wrapper, so do
          not introduce a nested scroll container here. Nested overflow
          containers caused the popup to add/remove scrollbars in response to
          tiny layout changes (e.g. button focus rings), which shifted the
          Close button under the cursor between mousedown and click. */}
      <div className="space-y-1">
        {displayEntries.map(([key, value]) => (
          <div key={key} className="flex gap-2 py-1 border-b border-base-200 last:border-0">
            <span className="font-medium text-xs text-base-content/70 min-w-[80px]">{formatLabel(key)}:</span>
            <span className="text-sm text-base-content flex-1 min-w-0 break-words">{formatValue(key, value)}</span>
          </div>
        ))}
      </div>

      {moreInfoUrl && (
        <div className="mt-4 shrink-0">
          <button className="btn btn-sm btn-primary w-full" onClick={handleMoreInfo}>
            <FaExternalLinkAlt className="w-3 h-3" />
            More Information
          </button>
        </div>
      )}
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
function formatValue(key: string, value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  const str = String(value);

  // Detect strict ISO 8601 date/time strings; includes time-of-day when present
  const dateValue = formatIdentifyDateValue(key, str);
  if (dateValue !== null) {
    return dateValue;
  }

  if (/^https?:\/\//i.test(str)) {
    return (
      <button className="link link-primary text-sm" onClick={() => showURLWindow(str, false, "normal", false, false, "Information")}>
        Click to Open
      </button>
    );
  }
  return str;
}
