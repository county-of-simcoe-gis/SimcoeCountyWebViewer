"use client";

import React from "react";
import Image from "next/image";
import { FaTimes } from "react-icons/fa";

export interface PanelHeaderProps {
  /** Panel title text */
  title: string;
  /** Tool icon src (shown before title) */
  iconSrc?: string;
  /** React node icon (shown before title, takes precedence over iconSrc) */
  icon?: React.ReactNode;
  /** Called when close button is clicked */
  onClose?: () => void;
  /** Called when help button is clicked */
  onHelp?: () => void;
  /** Additional control buttons (rendered in the top-right area) */
  controls?: React.ReactNode;
  className?: string;
}

/**
 * Replaces legacy #sc-panel-component-header, #sc-panel-component-title, and related elements.
 */
export const PanelHeader: React.FC<PanelHeaderProps> = ({ title, iconSrc, icon, onClose, onHelp, controls, className = "" }) => {
  return (
    <div className={`w-full h-[43px] shrink-0 overflow-visible border-b border-base-300 ${className}`}>
      <div className="p-1.5 pt-1 mt-[3px] text-[17px] font-bold text-neutral bg-base-300 overflow-visible relative min-h-[29px] [text-shadow:0.5px_0.5px_#fff] dark:[text-shadow:none]">
        <div className="w-full flex items-center gap-1.5 max-h-[29px]">
          {(icon || iconSrc) && <div className="w-9 shrink-0 flex items-center justify-center">{icon || <Image src={iconSrc!} alt="" width={32} height={32} />}</div>}

          {onHelp && (
            <button onClick={onHelp} className="bg-secondary border border-gray-300/70 p-px rounded-sm h-6 w-6 shrink-0 cursor-pointer" aria-label="Help">
              <svg className="text-white h-[18px] w-[18px] p-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}

          <span className="flex-1 min-w-0 pt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{title}</span>

          <div className="shrink-0 cursor-pointer h-[29px] text-center flex items-center gap-0.5">
            {controls}
            {onClose && (
              <button
                onClick={onClose}
                className="bg-secondary border border-secondary p-1 rounded-sm cursor-pointer inline-flex items-center justify-center align-top w-6 h-6 text-white"
                aria-label="Close panel"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
