"use client";

import { usePopupStore } from "@/stores/popupStore";
import { FaExternalLinkAlt, FaTimes } from "react-icons/fa";
import { isExcludedKey } from "@/utils/identifyHelpers";
import AppImage from "@/components/shared/AppImage";

interface ThemePopupContentProps {
  properties: Record<string, unknown>;
  moreInfoUrlFieldName?: string;
  popupLogoImage?: string;
}

export default function ThemePopupContent({ properties, moreInfoUrlFieldName, popupLogoImage }: ThemePopupContentProps) {
  const { hide } = usePopupStore();

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
      window.open(moreInfoUrl, "_blank");
    }
  };

  return (
    <div className="min-w-[280px] max-w-[400px]">
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
            <span className="text-sm text-base-content flex-1">{formatValue(value)}</span>
          </div>
        ))}
      </div>

      {/* Action buttons — shrink-0 keeps them from being squeezed when the
          outer popup adds a scrollbar. The Close button fires on pointerdown
          (rather than click) because the button's focus state can introduce a
          1–2 px layout shift in the outer popup, causing a scrollbar to appear
          between mousedown and mouseup; the resulting horizontal reflow moves
          the button out from under the cursor and the click is lost. Acting on
          pointerdown commits the close before any layout change can happen. */}
      <div className="flex gap-2 mt-4 shrink-0">
        {moreInfoUrl && (
          <button className="btn btn-sm btn-primary flex-1" onClick={handleMoreInfo}>
            <FaExternalLinkAlt className="w-3 h-3" />
            More Information
          </button>
        )}
        <button
          className="btn btn-sm btn-outline flex-1"
          onPointerDown={(e) => {
            e.preventDefault();
            hide();
          }}
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
