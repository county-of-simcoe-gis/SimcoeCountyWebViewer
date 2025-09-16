import React, { useEffect, useState } from "react";
import { FaExpand, FaCompress } from "react-icons/fa";
import Map from "ol/Map";

// React component for the fullscreen control
interface FullscreenControlProps {
  map?: Map;
}

export const FullscreenControl = React.memo(({ map }: FullscreenControlProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!map) return;

    const mapTarget = map.getTarget();
    if (!mapTarget) return;

    const element = typeof mapTarget === "string" ? document.getElementById(mapTarget) : (mapTarget as HTMLElement);
    if (!element) return;

    try {
      if (!document.fullscreenElement) {
        await element.requestFullscreen();
        // Update map size after entering fullscreen
        setTimeout(() => {
          map.updateSize();
        }, 100);
      } else {
        await document.exitFullscreen();
        // Update map size after exiting fullscreen
        setTimeout(() => {
          map.updateSize();
        }, 100);
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error);
    }
  };

  return (
    <div
      className="w-[38px] h-[38px] bg-gradient-to-b from-white to-gray-200 bg-no-repeat bg-center rounded-full shadow-md cursor-pointer btn btn-sm border-0 hover:shadow-lg transition-shadow duration-200 inline-flex items-center justify-center"
      onClick={toggleFullscreen}
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFullscreen ? <FaCompress size={16} className="text-gray-600" /> : <FaExpand size={16} className="text-gray-600" />}
    </div>
  );
});

FullscreenControl.displayName = "FullscreenControl";

// Default export is now just the React component
export default FullscreenControl;
