"use client";

import React from "react";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { DrawType } from "@/types/myMaps";
import myMapsConfig from "@/config/myMapsConfig.json";
import DrawButton from "./DrawButton";
import "./ButtonBar.css";

interface ButtonBarProps {
  isEditing?: boolean;
}

const ButtonBar: React.FC<ButtonBarProps> = ({ isEditing = false }) => {
  const { drawType, setDrawType } = useMyMapsStore();

  const handleButtonClick = (buttonDrawType: DrawType) => {
    setDrawType(buttonDrawType);
  };

  return (
    <div className={`sc-mymaps-button-bar ${isEditing ? "sc-disabled" : ""}`}>
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
