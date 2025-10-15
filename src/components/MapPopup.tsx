"use client";

import { useEffect, useRef } from "react";
import { Overlay } from "ol";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import "./MapPopup.css";

export default function MapPopup() {
  const { map } = useMapStore();
  const { setOverlay, isVisible, content, hide } = usePopupStore();
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

  if (!isVisible || !content) {
    return (
      <div ref={popupRef} className="sc-map-popup" style={{ display: "none" }}>
        <div className="sc-map-popup-content"></div>
      </div>
    );
  }

  return (
    <div ref={popupRef} className="sc-map-popup">
      <div className="sc-map-popup-header">
        <h3 className="sc-map-popup-title">{content.title}</h3>
        <button className="sc-map-popup-close" onClick={hide} aria-label="Close popup">
          ×
        </button>
      </div>
      <div className="sc-map-popup-content">{content.content}</div>
    </div>
  );
}
