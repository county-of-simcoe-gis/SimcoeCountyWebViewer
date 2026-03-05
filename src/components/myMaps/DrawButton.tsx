"use client";

import React from "react";
import Image from "next/image";
import "@/components/myMaps/DrawButton.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

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

  // For unoptimized images (SVGs), the custom loader is bypassed so we need to manually prepend basePath
  const isUnoptimized = imageName.endsWith(".svg");
  const imageSrc = isUnoptimized ? `${basePath}${imageName}` : imageName;

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
      <Image src={imageSrc} alt={title} width={20} height={20} className="sc-mymaps-draw-button-image" unoptimized={isUnoptimized} />
    </div>
  );
};

export default DrawButton;
