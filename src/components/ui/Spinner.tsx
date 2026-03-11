"use client";

import React from "react";

export interface SpinnerProps {
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Optional label text below the spinner */
  label?: string;
  className?: string;
}

/**
 * Replaces legacy .sc-identify-spinner and other loading spinner patterns.
 */
export const Spinner: React.FC<SpinnerProps> = ({ size = "md", label, className = "" }) => {
  const sizeClasses = {
    sm: "w-5 h-5 border-2",
    md: "w-[30px] h-[30px] border-3",
    lg: "w-10 h-10 border-4",
  };

  return (
    <div className={`flex flex-col items-center justify-center p-5 text-gray-500 text-xs ${className}`}>
      <div className={`${sizeClasses[size]} border-gray-200 border-t-info rounded-full animate-spin mb-2.5`} />
      {label && <span>{label}</span>}
    </div>
  );
};
