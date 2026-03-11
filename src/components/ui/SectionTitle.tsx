"use client";

import React from "react";
import Image from "next/image";

export interface SectionTitleProps {
  children: React.ReactNode;
  /** Show bottom border (replaces sc-border-bottom) */
  bordered?: boolean;
  /** Show underline (replaces sc-underline) */
  underline?: boolean;
  /** Additional Tailwind classes */
  className?: string;
  /** Hide the title icon */
  hideIcon?: boolean;
}

/**
 * Replaces legacy .sc-title CSS class.
 * Renders an uppercase section label with an optional icon, border, and underline.
 */
export const SectionTitle: React.FC<SectionTitleProps> = ({ children, bordered = false, underline = false, className = "", hideIcon = false }) => {
  return (
    <div className={`flex items-center gap-1.5 text-sm text-neutral uppercase select-none my-1 ${bordered ? "border-b border-base-300 pb-1" : ""} ${underline ? "underline" : ""} ${className}`}>
      {!hideIcon && <Image src="/images/title-icon.png" alt="" width={16} height={16} className="w-4 h-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
};
