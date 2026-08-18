"use client";

import React from "react";

export interface SectionTitleProps {
  children: React.ReactNode;
  /** Additional Tailwind classes */
  className?: string;
}

/**
 * Bold section heading with a bottom border divider.
 * Used for sidebar panels, report sections, and theme headings.
 */
export const SectionTitle: React.FC<SectionTitleProps> = ({ children, className = "" }) => {
  return <div className={`font-bold text-sm border-b border-base-300 pb-1 mb-2 ${className}`}>{children}</div>;
};
