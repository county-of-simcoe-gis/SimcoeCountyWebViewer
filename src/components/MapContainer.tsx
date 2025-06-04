"use client";

import { useEffect } from "react";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useEventStore } from "@/stores/eventStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";

export default function MapContainer() {
  const { isOpen } = useSidebarStore();
  const { emitMapLoaded } = useEventStore();
  const { addLoadedItem } = useMapStore();
  const { setMapLoading } = useAppStore();

  useEffect(() => {
    // Simulate map loading and mark as loaded
    // In a real implementation, this would be when OpenLayers map is initialized
    const timer = setTimeout(() => {
      emitMapLoaded();
      addLoadedItem("map");
      setMapLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [emitMapLoaded, addLoadedItem, setMapLoading]);

  return (
    <div
      id="map"
      className={`sc-map ${!isOpen ? "sidebar-closed" : ""}`}
      style={{
        backgroundColor: "#f0f8ff", // Light blue background as placeholder
      }}
    >
      {/* Map placeholder content */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          color: "#666",
          fontSize: "18px",
        }}
      >
        OpenLayers Map will be initialized here
      </div>
    </div>
  );
}
