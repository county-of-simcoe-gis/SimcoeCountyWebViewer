import React from "react";
import { FaLocationArrow } from "react-icons/fa";
import { MapControlButton } from "@/components/ui/MapControlButton";
import { useLocationFollowStore } from "@/stores/locationFollowStore";

export const FollowLocationButton = React.memo(() => {
  const mode = useLocationFollowStore((s) => s.mode);
  const toggleFollow = useLocationFollowStore((s) => s.toggleFollow);
  const isActive = mode !== "off";

  return (
    <MapControlButton onClick={toggleFollow} title={isActive ? "Stop following my location" : "Follow my location"} aria-pressed={isActive}>
      <FaLocationArrow size={16} className={isActive ? "text-primary" : "text-base-content"} />
    </MapControlButton>
  );
});

FollowLocationButton.displayName = "FollowLocationButton";

export default FollowLocationButton;
