"use client";

import React from "react";
import Image from "next/image";

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
      className={`flex items-center justify-center w-7 h-7 border border-[#ccc] bg-white rounded-[3px] cursor-pointer transition-all select-none hover:bg-[#f0f0f0] hover:border-[#999] focus:outline-2 focus:outline-[#007bff] focus:outline-offset-[1px] ${isActive ? "!bg-[#007bff] !border-[#0056b3] text-white hover:!bg-[#0056b3]" : ""} ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
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
      <Image src={imageSrc} alt={title} width={20} height={20} className={`w-4 h-4 object-contain ${isActive ? "brightness-0 invert" : ""}`} unoptimized={isUnoptimized} />
    </div>
  );
};

export default DrawButton;
