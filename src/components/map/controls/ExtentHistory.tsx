import React from "react";
import { FaForward, FaBackward } from "react-icons/fa";
import Map from "ol/Map";
import { useMapStore } from "@/stores/mapStore";

// React component for extent history navigation
interface ExtentHistoryButtonsProps {
  map?: Map;
}

export function ExtentHistoryButtons({}: ExtentHistoryButtonsProps) {
  const map = useMapStore((s) => s.map);
  const extentHistory = useMapStore((s) => s.extentHistory);
  const currentExtentIndex = useMapStore((s) => s.currentExtentIndex);
  const setCurrentExtentIndex = useMapStore((s) => s.setCurrentExtentIndex);

  const goToPreviousExtent = () => {
    if (currentExtentIndex > 0) {
      const newIndex = currentExtentIndex - 1;
      const extent = extentHistory[newIndex];

      if (map && extent) {
        map.getView().setZoom(extent.zoom);
        map.getView().setCenter(extent.center);
        setCurrentExtentIndex(newIndex);
      }
    }
  };

  const goToNextExtent = () => {
    if (currentExtentIndex < extentHistory.length - 1) {
      const newIndex = currentExtentIndex + 1;
      const extent = extentHistory[newIndex];

      if (map && extent) {
        map.getView().setZoom(extent.zoom);
        map.getView().setCenter(extent.center);
        setCurrentExtentIndex(newIndex);
      }
    }
  };

  const canGoPrevious = () => {
    return currentExtentIndex > 0;
  };

  const canGoNext = () => {
    return currentExtentIndex < extentHistory.length - 1;
  };

  const canGoPrev = canGoPrevious();
  const canGoFwd = canGoNext();

  return (
    <div className="flex gap-1 w-[38px] h-[38px]">
      <div
        className={`w-[19px] h-[38px] bg-gradient-to-b from-base-100 to-base-300 rounded-full shadow-md border-0 hover:shadow-lg transition-all duration-200 inline-flex items-center justify-center ${
          !canGoPrev ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"
        }`}
        title="Previous Extent"
        onClick={goToPreviousExtent}
      >
        <FaBackward size={15} className={`${canGoPrev ? "text-base-content" : "text-base-content/40"}`} />
      </div>

      <div
        className={`w-[19px] h-[38px] bg-gradient-to-b from-base-100 to-base-300 rounded-full shadow-md border-0 hover:shadow-lg transition-all duration-200 inline-flex items-center justify-center ${
          !canGoFwd ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"
        }`}
        title="Next Extent"
        onClick={goToNextExtent}
      >
        <FaForward size={15} className={`${canGoFwd ? "text-base-content" : "text-base-content/40"}`} />
      </div>
    </div>
  );
}

// Default export is now just the React component
export default ExtentHistoryButtons;
