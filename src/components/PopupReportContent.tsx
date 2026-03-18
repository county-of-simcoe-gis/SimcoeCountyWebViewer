"use client";

import { useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import type { PopupFeature } from "@/stores/popupStore";

interface PopupReportContentProps {
  features: PopupFeature[];
  initialSelectedIndex: number;
}

/**
 * Renders popup feature content inside the Reports sidebar tab.
 * Re-uses MapPopup.css base styles but wraps everything in
 * `.sc-popup-in-reports` for sidebar-specific overrides.
 */
export default function PopupReportContent({ features, initialSelectedIndex }: PopupReportContentProps) {
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);

  if (features.length === 0) return null;

  const currentFeature = features[selectedIndex];
  const hasMultipleFeatures = features.length > 1;

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev - 1 + features.length) % features.length);
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev + 1) % features.length);
  };

  return (
    <div className="w-full">
      {/* Feature navigation for multiple features */}
      {hasMultipleFeatures && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-2.5 bg-[#f0f0f0] border-b border-[#e0e0e0]">
          <button
            className="bg-white border border-[#ddd] rounded px-2 py-1 cursor-pointer flex items-center justify-center transition-all hover:bg-[#e8e8e8] hover:border-[#ccc]"
            onClick={handlePrev}
            aria-label="Previous feature"
          >
            <FaChevronLeft size={12} />
          </button>
          <span className="text-xs text-[#666] font-medium min-w-[60px] text-center">
            {selectedIndex + 1} of {features.length}
          </span>
          <button
            className="bg-white border border-[#ddd] rounded px-2 py-1 cursor-pointer flex items-center justify-center transition-all hover:bg-[#e8e8e8] hover:border-[#ccc]"
            onClick={handleNext}
            aria-label="Next feature"
          >
            <FaChevronRight size={12} />
          </button>
        </div>
      )}

      {/* Layer name badge if available */}
      {currentFeature.layerName && <div className="text-[10px] text-[#666] bg-[#e8f4fd] border-b border-[#d0e8f7] px-2.5 py-1 font-medium">{currentFeature.layerName}</div>}

      {/* Feature content */}
      <div className="p-1.5">{currentFeature.content}</div>
    </div>
  );
}
