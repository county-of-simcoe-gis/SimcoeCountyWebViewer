import React from "react";
import { FaPlus, FaMinus } from "react-icons/fa";
import Map from "ol/Map";

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
        zoom: currentZoom + 1,
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
        zoom: currentZoom - 1,
        duration: 250,
      });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div
        className="w-[38px] h-[38px] bg-gradient-to-b from-white to-gray-200 bg-no-repeat bg-center rounded-full shadow-md cursor-pointer btn btn-sm border-0 hover:shadow-lg transition-shadow duration-200 inline-flex items-center justify-center"
        onClick={zoomIn}
        title="Zoom in"
      >
        <FaPlus size={14} className="text-gray-600" />
      </div>
      <div
        className="w-[38px] h-[38px] bg-gradient-to-b from-white to-gray-200 bg-no-repeat bg-center rounded-full shadow-md cursor-pointer btn btn-sm border-0 hover:shadow-lg transition-shadow duration-200 inline-flex items-center justify-center"
        onClick={zoomOut}
        title="Zoom out"
      >
        <FaMinus size={14} className="text-gray-600" />
      </div>
    </div>
  );
});

ZoomControls.displayName = "ZoomControls";

// Default export is now just the React component
export default ZoomControls;
