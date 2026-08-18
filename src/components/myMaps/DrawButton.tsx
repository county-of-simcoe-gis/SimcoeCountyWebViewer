"use client";

import React from "react";
import Image from "next/image";

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
      className={`flex items-center justify-center w-7 h-7 border border-base-300 bg-base-100 rounded-[3px] cursor-pointer transition-all select-none hover:bg-base-200 hover:border-base-content/40 focus:outline-2 focus:outline-primary focus:outline-offset-[1px] ${isActive ? "!bg-primary !border-primary text-white hover:!bg-primary/80" : ""} ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
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
      <Image src={imageName} alt={title} width={20} height={20} className={`w-4 h-4 object-contain ${isActive ? "brightness-0 invert" : ""}`} />
    </div>
  );
};

export default DrawButton;
