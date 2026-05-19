import React, { useEffect, useState } from "react";
import { FaCompass } from "react-icons/fa";
import Map from "ol/Map";
import { MapControlButton } from "@/components/ui/MapControlButton";

// React component for the rotate control
interface RotateControlProps {
  map?: Map;
}

export const RotateControl = React.memo(({ map }: RotateControlProps) => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!map) return;

    const view = map.getView();

    const updateRotation = () => {
      setRotation(view.getRotation());
    };

    // Update rotation on view changes
    view.on("change:rotation", updateRotation);
    updateRotation(); // Initial update

    return () => {
      view.un("change:rotation", updateRotation);
    };
  }, [map]);

  const resetRotation = () => {
    if (!map) return;
    const view = map.getView();
    view.animate({
      rotation: 0,
      duration: 250,
    });
  };

  // Convert radians to degrees for display
  const rotationDegrees = (rotation * 180) / Math.PI;

  // Only show the control if there's rotation or if it's interactive
  const hasRotation = Math.abs(rotation) > 0.01;
  if (hasRotation) {
    return (
      <MapControlButton
        className={hasRotation ? "opacity-100" : "opacity-60 hover:opacity-100"}
        onClick={resetRotation}
        title={`Reset rotation ${hasRotation ? `(${Math.round(rotationDegrees)}°)` : ""}`}
        style={{ transform: `rotate(${rotationDegrees}deg)` }}
      >
        <FaCompass size={18} className="text-base-content rotate-135" />
      </MapControlButton>
    );
  }
  return null;
});

RotateControl.displayName = "RotateControl";

// Default export is now just the React component
export default RotateControl;
