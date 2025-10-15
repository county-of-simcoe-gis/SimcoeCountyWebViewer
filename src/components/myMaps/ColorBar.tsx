"use client";

import React from "react";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { MYMAPS_CONSTANTS } from "@/types/myMaps";
import "@/components/myMaps/ColorBar.css";

interface ColorBarProps {
  isEditing?: boolean;
}

const ColorBar: React.FC<ColorBarProps> = ({ isEditing = false }) => {
  const { drawColor, setDrawColor } = useMyMapsStore();

  const handleColorClick = (color: string) => {
    if (!isEditing) {
      setDrawColor(color);
    }
  };

  return (
    <div className={`sc-mymaps-color-bar ${isEditing ? "sc-disabled" : ""}`}>
      {MYMAPS_CONSTANTS.DEFAULT_COLORS.map((color) => (
        <div
          key={color}
          className={`sc-mymaps-color-item ${drawColor === color ? "active" : ""}`}
          style={{ backgroundColor: color }}
          title={`Select color ${color}`}
          onClick={() => handleColorClick(color)}
          role="button"
          tabIndex={isEditing ? -1 : 0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !isEditing) {
              e.preventDefault();
              handleColorClick(color);
            }
          }}
        >
          {drawColor === color && <div className="sc-mymaps-color-checkmark">✓</div>}
        </div>
      ))}
    </div>
  );
};

export default ColorBar;
