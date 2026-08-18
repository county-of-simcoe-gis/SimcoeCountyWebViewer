"use client";

import React, { ReactNode } from "react";
import { FaLevelUpAlt } from "react-icons/fa";

export interface InfoWindowRowProps {
  label: string;
  value?: string | number | ReactNode;
  /** When provided, rendered as the value content (overrides value prop) */
  children?: ReactNode;
  /** Table mode uses table-cell display like the old sc-info-window-label-table/value-table */
  mode?: "default" | "table";
  className?: string;
}

/**
 * Replaces legacy .sc-info-window-row, .sc-info-window-label, .sc-info-window-value
 * and their -table variants.
 *
 * Used in map popups, identify results, MPAC/Teranet reports.
 * For the sidebar InfoRow (with URL detection, date formatting etc.), use common/InfoRow instead.
 */
export const InfoWindowRow: React.FC<InfoWindowRowProps> = ({ label, value, children, mode = "default", className = "" }) => {
  const content = children ?? value;

  if (mode === "table") {
    return (
      <div className={`table-row w-full ${className}`}>
        <div className="table-cell font-bold text-base-content text-[11px] p-0.5 break-words border border-base-300 w-1/4">{label}</div>
        <div className="table-cell text-base-content/70 text-xs break-words p-0.5 w-3/4 border border-base-300">{content}</div>
      </div>
    );
  }

  return (
    <div data-testid="info-row" className={`w-full ${className}`}>
      <div className="font-bold text-base-content text-[11px]">{label}</div>
      <div className="flex items-start gap-1 text-base-content/70 border-b border-base-300 pb-0.5 text-[11px] break-words min-h-[10px] [overflow-wrap:anywhere]">
        <FaLevelUpAlt className="mt-0.5 text-base-content/70 shrink-0 rotate-90" size={10} />
        <span>{content}</span>
      </div>
    </div>
  );
};
