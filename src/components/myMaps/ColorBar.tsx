"use client";

import React from "react";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { MYMAPS_CONSTANTS } from "@/types/myMaps";

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
    <div
      data-testid="mymaps-color-bar"
      className={`flex flex-nowrap justify-center gap-[2px] p-1 pt-0 bg-base-200 border-b border-base-300 mb-2 ${isEditing ? "opacity-50 pointer-events-none" : ""}`}
    >
      {MYMAPS_CONSTANTS.DEFAULT_COLORS.map((color) => (
        <div
          key={color}
          data-testid="mymaps-color-item"
          className={`w-[18px] h-[18px] border border-base-300 rounded-[2px] cursor-pointer flex items-center justify-center transition-all relative hover:border-base-content/40 hover:scale-110 focus:outline-2 focus:outline-primary focus:outline-offset-1 ${drawColor === color ? "!border-primary !border-2" : ""}`}
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
          {drawColor === color && <div className="text-white font-bold text-[10px] leading-none [text-shadow:1px_1px_2px_rgba(0,0,0,0.7)]">✓</div>}
        </div>
      ))}
    </div>
  );
};

export default ColorBar;
