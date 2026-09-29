"use client";

import React from "react";

export interface MapControlButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Circular gradient button used for map toolbar controls (zoom, fullscreen, grid, etc.).
 */
export const MapControlButton: React.FC<MapControlButtonProps> = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`w-[38px] h-[38px] bg-gradient-to-b from-base-100 to-base-300 rounded-full shadow-md cursor-pointer btn btn-sm border-0 hover:shadow-lg transition-all duration-200 inline-flex items-center justify-center ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
