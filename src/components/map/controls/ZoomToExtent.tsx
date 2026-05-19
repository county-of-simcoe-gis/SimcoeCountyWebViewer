import React from "react";
import { FaGlobe } from "react-icons/fa";
import Map from "ol/Map";
import { MapControlButton } from "@/components/ui/MapControlButton";

// React component for the zoom to extent button
interface ZoomToExtentButtonProps {
  map?: Map;
  centerCoords: number[];
  defaultZoom: number;
}

export function ZoomToExtentButton({ map, centerCoords, defaultZoom }: ZoomToExtentButtonProps) {
  const zoomFullExtent = () => {
    if (map) {
      map.getView().animate({
        center: centerCoords,
        zoom: defaultZoom,
        duration: 1000,
      });
    }
  };

  return (
    <MapControlButton onClick={zoomFullExtent} title="Zoom to full extent" className="hover:scale-105">
      <FaGlobe size={18} className="text-base-content" />
    </MapControlButton>
  );
}

// Default export is now just the React component
export default ZoomToExtentButton;
