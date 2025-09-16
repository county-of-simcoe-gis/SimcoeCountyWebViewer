import React from "react";
import { FaGlobe } from "react-icons/fa";
import Map from "ol/Map";

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
    <div
      className="w-[38px] h-[38px] bg-gradient-to-b from-white to-gray-200 bg-no-repeat bg-center rounded-full shadow-md cursor-pointer btn btn-sm border-0 hover:shadow-lg transition-all duration-200 inline-flex items-center justify-center hover:scale-105"
      onClick={zoomFullExtent}
      title="Zoom to full extent"
    >
      <FaGlobe size={18} className="text-gray-600" />
    </div>
  );
}

// Default export is now just the React component
export default ZoomToExtentButton;
