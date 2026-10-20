"use client";

import React from "react";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { useLocationFollowStore } from "@/stores/locationFollowStore";
import { DrawType } from "@/types/myMaps";
import myMapsConfig from "@/config/myMapsConfig.json";
import DrawButton from "@/components/myMaps/DrawButton";
import { useIsMobile } from "@/hooks/useIsMobile";

interface ButtonBarProps {
  isEditing?: boolean;
}

type DrawingTool = (typeof myMapsConfig.drawingTools)[number];

const ButtonBar: React.FC<ButtonBarProps> = ({ isEditing = false }) => {
  const { drawType, setDrawType } = useMyMapsStore();
  const locationMode = useLocationFollowStore((s) => s.mode);
  const toggleTrack = useLocationFollowStore((s) => s.toggleTrack);
  const requestPointAtLocation = useLocationFollowStore((s) => s.requestPointAtLocation);
  const isMobileViewport = useIsMobile();

  const handleButtonClick = (tool: DrawingTool) => {
    if (tool.action === "track") {
      setDrawType("Cancel");
      toggleTrack();
      return;
    }
    if (tool.action === "pointAtLocation") {
      requestPointAtLocation();
      return;
    }
    setDrawType(tool.drawType as DrawType);
  };

  return (
    <div
      data-testid="mymaps-button-bar"
      className={`flex flex-wrap gap-1 p-2 bg-base-200 border-b border-base-300 mb-2 max-[768px]:justify-center max-[768px]:gap-[3px] max-[768px]:p-1.5 ${isEditing ? "opacity-50 pointer-events-none" : ""}`}
    >
      {myMapsConfig.drawingTools.map((tool) => (
        <DrawButton
          key={tool.id}
          title={tool.title}
          imageName={tool.imageName}
          onClick={() => handleButtonClick(tool)}
          isActive={tool.action === "track" ? locationMode === "track" : drawType === tool.drawType}
          disabled={!tool.enabled || isEditing}
          visible={tool.visible !== false && (!tool.action || isMobileViewport)}
        />
      ))}
    </div>
  );
};

export default ButtonBar;
