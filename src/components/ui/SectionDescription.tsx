"use client";

import React from "react";

export interface SectionDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Replaces legacy .sc-description CSS class.
 */
export const SectionDescription: React.FC<SectionDescriptionProps> = ({ children, className = "" }) => {
  return <div className={`text-[11px] text-gray-500 p-1.5 ${className}`}>{children}</div>;
};
