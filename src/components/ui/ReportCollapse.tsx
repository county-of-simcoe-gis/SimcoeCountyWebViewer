"use client";

import React from "react";

export interface ReportCollapseProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Branded collapsible section for MPAC/Teranet reports.
 * Gray header with white content area, using DaisyUI collapse (details/summary).
 */
export const ReportCollapse: React.FC<ReportCollapseProps> = ({ title, children, defaultOpen = true, className = "" }) => {
  return (
    <details className={`collapse collapse-arrow w-[337px] m-[5px] bg-base-300 border-none rounded-none select-none ${className}`} open={defaultOpen || undefined}>
      <summary className="collapse-title font-bold text-[10pt] leading-[30px] min-h-[30px] py-[3px] px-[10px] cursor-pointer">{title}</summary>
      <div className="collapse-content bg-base-100 p-[5px] select-text cursor-default">{children}</div>
    </details>
  );
};
