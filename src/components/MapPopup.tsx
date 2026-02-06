"use client";

import { useEffect, useRef } from "react";
import { Overlay } from "ol";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./MapPopup.css";

export default function MapPopup() {
  const { map } = useMapStore();
  const { setOverlay, isVisible, features, selectedIndex, hide, nextFeature, prevFeature } = usePopupStore();
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);

  // Initialize overlay
  useEffect(() => {
    if (!map || !popupRef.current || overlayRef.current) return;

    const overlay = new Overlay({
      element: popupRef.current,
      autoPan: false, // Don't automatically pan the map when popup opens
      positioning: "bottom-center",
      stopEvent: true, // Prevent map interactions when interacting with popup
      offset: [0, -10],
    });

    map.addOverlay(overlay);
    overlayRef.current = overlay;
    setOverlay(overlay);

    return () => {
      if (overlayRef.current) {
        map.removeOverlay(overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [map, setOverlay]);

  if (!isVisible || features.length === 0) {
    return (
      <div ref={popupRef} className="sc-map-popup" style={{ display: "none" }}>
        <div className="sc-map-popup-content"></div>
      </div>
    );
  }

  const currentFeature = features[selectedIndex];
  const hasMultipleFeatures = features.length > 1;

  return (
    <div ref={popupRef} className="sc-map-popup">
      <div className="sc-map-popup-header">
        <h3 className="sc-map-popup-title">{currentFeature.title}</h3>
        <button className="sc-map-popup-close" onClick={hide} aria-label="Close popup">
          ×
        </button>
      </div>

      {/* Feature navigation for multiple features */}
      {hasMultipleFeatures && (
        <div className="sc-map-popup-nav">
          <button className="sc-map-popup-nav-btn" onClick={prevFeature} aria-label="Previous feature">
            <FaChevronLeft size={12} />
          </button>
          <span className="sc-map-popup-nav-count">
            {selectedIndex + 1} of {features.length}
          </span>
          <button className="sc-map-popup-nav-btn" onClick={nextFeature} aria-label="Next feature">
            <FaChevronRight size={12} />
          </button>
        </div>
      )}

      {/* Layer name badge if available */}
      {currentFeature.layerName && <div className="sc-map-popup-layer-badge">{currentFeature.layerName}</div>}

      <div className="sc-map-popup-content">{currentFeature.content}</div>
    </div>
  );
}
