import React from "react";
import { fromLonLat } from "ol/proj";
import { FaCrosshairs } from "react-icons/fa";
import Map from "ol/Map";

// React component for the current location button
interface CurrentLocationButtonProps {
  map?: Map;
}

export const CurrentLocationButton = React.memo(({ map }: CurrentLocationButtonProps) => {
  const zoomToCurrentLocation = () => {
    if (!map) return;

    const options = { timeout: 5000 };
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        const coords = fromLonLat([pos.coords.longitude, pos.coords.latitude]);
        map.getView().animate({
          center: coords,
          zoom: 16,
          duration: 1000,
        });
      },
      (err) => {
        console.error("Error getting current location:", err);
      },
      options
    );
  };

  return (
    <div
      className="w-[38px] h-[38px] bg-gradient-to-b from-white to-gray-200 bg-no-repeat bg-center rounded-full shadow-md cursor-pointer btn btn-sm border-0 hover:shadow-lg transition-shadow duration-200 inline-flex items-center justify-center"
      onClick={zoomToCurrentLocation}
      title="Zoom to current location"
    >
      <FaCrosshairs size={18} className="text-gray-600" />
    </div>
  );
});

CurrentLocationButton.displayName = "CurrentLocationButton";

// Default export is now just the React component
export default CurrentLocationButton;
