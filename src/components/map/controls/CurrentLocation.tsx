import React from "react";
import { fromLonLat } from "ol/proj";
import { FaCrosshairs } from "react-icons/fa";
import Map from "ol/Map";
import { MapControlButton } from "@/components/ui/MapControlButton";
import { useToast } from "@/hooks/useToast";

// React component for the current location button
interface CurrentLocationButtonProps {
  map?: Map;
}

export const CurrentLocationButton = React.memo(({ map }: CurrentLocationButtonProps) => {
  const toast = useToast();

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
        if (err && (err.code === 1 || (err as any).PERMISSION_DENIED)) {
          toast.warning("Geolocation permission denied.");
        } else {
          toast.error("Could not get current location.");
        }
      },
      options,
    );
  };

  return (
    <MapControlButton onClick={zoomToCurrentLocation} title="Zoom to current location">
      <FaCrosshairs size={18} className="text-base-content" />
    </MapControlButton>
  );
});

CurrentLocationButton.displayName = "CurrentLocationButton";

// Default export is now just the React component
export default CurrentLocationButton;
