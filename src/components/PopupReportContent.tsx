"use client";

import { useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import type { PopupFeature } from "@/stores/popupStore";
import "./PopupReportContent.css";
import "./MapPopup.css";

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
    <div className="sc-popup-in-reports">
      {/* Feature navigation for multiple features */}
      {hasMultipleFeatures && (
        <div className="sc-popup-report-nav">
          <button className="sc-popup-report-nav-btn" onClick={handlePrev} aria-label="Previous feature">
            <FaChevronLeft size={12} />
          </button>
          <span className="sc-popup-report-nav-count">
            {selectedIndex + 1} of {features.length}
          </span>
          <button className="sc-popup-report-nav-btn" onClick={handleNext} aria-label="Next feature">
            <FaChevronRight size={12} />
          </button>
        </div>
      )}

      {/* Layer name badge if available */}
      {currentFeature.layerName && <div className="sc-popup-report-layer-badge">{currentFeature.layerName}</div>}

      {/* Feature content */}
      <div className="sc-popup-report-content">{currentFeature.content}</div>
    </div>
  );
}
