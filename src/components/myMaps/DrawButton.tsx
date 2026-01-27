"use client";

import React from "react";
import Image from "next/image";
import "@/components/myMaps/DrawButton.css";

interface DrawButtonProps {
  title: string;
  imageName: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  visible?: boolean;
}

const DrawButton: React.FC<DrawButtonProps> = ({ title, imageName, onClick, isActive = false, disabled = false, visible = true }) => {
  if (!visible) return null;

  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  return (
    <div
      className={`sc-mymaps-draw-button ${isActive ? "active" : ""} ${disabled ? "disabled" : ""}`}
      title={title}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <Image src={imageName} alt={title} width={20} height={20} className="sc-mymaps-draw-button-image" unoptimized={imageName.endsWith(".svg")} />
    </div>
  );
};

export default DrawButton;
