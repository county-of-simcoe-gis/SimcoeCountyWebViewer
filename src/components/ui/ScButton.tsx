"use client";

import React from "react";

export interface ScButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Active/selected state (replaces .sc-button.active) */
  active?: boolean;
  /** Button variant */
  variant?: "default" | "orange" | "blue";
}

/**
 * Replaces legacy .sc-button CSS class and its variants.
 * Uses the Simcoe County gradient style with DaisyUI theme colors.
 */
export const ScButton: React.FC<ScButtonProps> = ({ active = false, variant = "default", className = "", children, ...props }) => {
  const baseClasses =
    "select-none text-xs px-1.5 py-1 rounded-sm min-h-[32px] border border-base-300 font-normal cursor-pointer inline-flex items-center justify-center gap-1 transition-all duration-150";

  const variantClasses = {
    default: active ? "text-black bg-gradient-to-b from-[#f0f9ff] to-[#bfd6e4] border-[#90b5d5]" : "text-base-content bg-gradient-to-b from-white to-base-300",
    orange: "text-white bg-orange-500 border-orange-600 hover:bg-orange-600",
    blue: "text-white bg-blue-600 border-blue-700 hover:bg-blue-700",
  };

  const hoverClasses = variant === "default" && !active ? "hover:border-[#80b9ff] hover:shadow-[0_0_5px_#80b9ff]" : "";
  const focusClasses = "focus:border-[#2074b7] active:border-[#2074b7]";

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${focusClasses} ${className}`} {...props}>
      {children}
    </button>
  );
};
