"use client";

import { useEffect, useState } from "react";
import { DragBox } from "ol/interaction";
import { GrSelect } from "react-icons/gr";
import type Map from "ol/Map";
import { MapControlButton } from "@/components/ui/MapControlButton";
import { useEventStore } from "@/stores/eventStore";
import { useInteractionManagerStore } from "@/stores/interactionManagerStore";
import { useMapStore } from "@/stores/mapStore";

const TOOL_ID = "results-box-select";
const INTERACTION_ID = "results-box-select-dragbox";

interface BoxSelectResultsProps {
  map?: Map;
}

export default function BoxSelectResults({ map }: BoxSelectResultsProps) {
  const [isActive, setIsActive] = useState(false);
  const activeToolId = useMapStore((state) => state.activeToolId);
  const setActiveToolId = useMapStore((state) => state.setActiveToolId);

  useEffect(() => {
    if (!isActive || !map) return;

    const dragBox = new DragBox({ className: "ol-dragbox" });
    dragBox.on("boxend", () => {
      const extent = dragBox.getGeometry().getExtent() as [number, number, number, number];
      useEventStore.getState().emit("results-box-select", { extent });
    });

    useInteractionManagerStore.getState().registerInteraction(INTERACTION_ID, dragBox, TOOL_ID);

    return () => {
      useInteractionManagerStore.getState().unregisterInteraction(INTERACTION_ID);
      if (useMapStore.getState().activeToolId === TOOL_ID) setActiveToolId(null);
    };
  }, [isActive, map, setActiveToolId]);

  useEffect(() => {
    if (isActive && activeToolId && activeToolId !== TOOL_ID) {
      setIsActive(false);
    }
  }, [isActive, activeToolId]);

  const toggleSelection = () => {
    if (!map) return;
    const nextIsActive = !isActive;
    if (nextIsActive) setActiveToolId(TOOL_ID);
    setIsActive(nextIsActive);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleSelection();
    }
  };

  return (
    <MapControlButton
      role="button"
      tabIndex={0}
      aria-label={isActive ? "Cancel area selection" : "Click and drag to select results by area"}
      aria-pressed={isActive}
      title={isActive ? "Cancel area selection" : "Click and drag to select results by area"}
      onClick={toggleSelection}
      onKeyDown={handleKeyDown}
      className={isActive ? "text-primary ring-2 ring-primary" : "text-base-content"}
    >
      <GrSelect size={18} />
    </MapControlButton>
  );
}
