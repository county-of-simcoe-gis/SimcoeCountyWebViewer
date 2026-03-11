"use client";

import React from "react";

export interface PopupHeaderProps {
  /** Title text */
  title: string;
  /** Called when close button is clicked */
  onClose?: () => void;
  /** Additional action buttons rendered before close (e.g. popout, prev/next) */
  actions?: React.ReactNode;
  /** Whether to apply rounded top corners (for standalone popups) */
  rounded?: boolean;
  className?: string;
}

/**
 * Replaces legacy .sc-map-popup-header and .sc-popup-header CSS classes.
 * Blue gradient header bar with gold bottom border, used on map popups and drawing option popups.
 */
export const PopupHeader: React.FC<PopupHeaderProps> = ({ title, onClose, actions, rounded = true, className = "" }) => {
  return (
    <div
      className={`flex items-center justify-between h-[25px] px-1.5 bg-gradient-to-b from-[#3980cc] to-[#2865a2] border-b-2 border-b-[#e7a614] text-white cursor-grab select-none text-[15px] active:cursor-grabbing ${rounded ? "rounded-t" : ""} ${className}`}
    >
      <span className="flex-1 min-w-0 truncate font-normal text-[15px] text-white">{title}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        {actions}
        {onClose && (
          <button
            onClick={onClose}
            className="bg-transparent border-none text-[22px] leading-none text-white cursor-pointer p-0 w-[22px] h-[22px] flex items-center justify-center rounded-sm transition-all duration-200 hover:bg-white/20"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
