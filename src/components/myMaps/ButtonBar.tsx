"use client";

import React from "react";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { DrawType } from "@/types/myMaps";
import myMapsConfig from "@/config/myMapsConfig.json";
import DrawButton from "@/components/myMaps/DrawButton";

interface ButtonBarProps {
  isEditing?: boolean;
}

const ButtonBar: React.FC<ButtonBarProps> = ({ isEditing = false }) => {
  const { drawType, setDrawType } = useMyMapsStore();

  const handleButtonClick = (buttonDrawType: DrawType) => {
    setDrawType(buttonDrawType);
  };

  return (
    <div
      className={`flex flex-wrap gap-1 p-2 bg-[#f8f9fa] border-b border-[#dee2e6] mb-2 max-[768px]:justify-center max-[768px]:gap-[3px] max-[768px]:p-1.5 ${isEditing ? "opacity-50 pointer-events-none" : ""}`}
    >
      {myMapsConfig.drawingTools.map((tool) => (
        <DrawButton
          key={tool.id}
          title={tool.title}
          imageName={tool.imageName}
          onClick={() => handleButtonClick(tool.drawType as DrawType)}
          isActive={drawType === tool.drawType}
          disabled={!tool.enabled || isEditing}
          visible={tool.visible !== false}
        />
      ))}
    </div>
  );
};

export default ButtonBar;
