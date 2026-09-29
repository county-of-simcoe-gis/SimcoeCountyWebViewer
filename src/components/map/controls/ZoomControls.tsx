import React from "react";
import { FaPlus, FaMinus } from "react-icons/fa";
import Map from "ol/Map";
import { MapControlButton } from "@/components/ui/MapControlButton";

// React component for the zoom controls
interface ZoomControlsProps {
  map?: Map;
}

export const ZoomControls = React.memo(({ map }: ZoomControlsProps) => {
  const zoomIn = () => {
    if (!map) return;
    const view = map.getView();
    const currentZoom = view.getZoom();
    if (currentZoom !== undefined) {
      view.animate({
        zoom: Math.round(currentZoom) + 1,
        duration: 250,
      });
    }
  };

  const zoomOut = () => {
    if (!map) return;
    const view = map.getView();
    const currentZoom = view.getZoom();
    if (currentZoom !== undefined) {
      view.animate({
        zoom: Math.round(currentZoom) - 1,
        duration: 250,
      });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <MapControlButton onClick={zoomIn} title="Zoom in">
        <FaPlus size={14} className="text-base-content" />
      </MapControlButton>
      <MapControlButton onClick={zoomOut} title="Zoom out">
        <FaMinus size={14} className="text-base-content" />
      </MapControlButton>
    </div>
  );
});

ZoomControls.displayName = "ZoomControls";

// Default export is now just the React component
export default ZoomControls;
