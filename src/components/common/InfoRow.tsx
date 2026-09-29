"use client";

import React, { ReactNode } from "react";
import { formatFieldName, formatFieldValue } from "@/utils/identifyHelpers";

export interface InfoRowProps {
  label: string;
  /** Exact label text to display instead of `formatFieldName(label)` (e.g. an ArcGIS field alias). */
  labelOverride?: string;
  value?: string | number | boolean | ReactNode;
  className?: string;
  children?: ReactNode;
  imageData?: boolean;
  styleMode?: "default" | "table";
}

const LABEL_CLASSES = {
  default: "font-semibold text-base-content min-w-[110px] shrink-0 pr-1.5",
  table: "font-semibold text-base-content min-w-[160px] shrink-0 p-2 bg-base-200 border border-base-300 border-r-0",
} as const;

const VALUE_CLASSES = {
  default: "text-base-content/70 flex-1 break-words [&_a]:text-primary [&_a]:no-underline [&_a:hover]:text-primary/80 [&_a:hover]:underline",
  table: "text-base-content/70 flex-1 p-2 border border-base-300 break-words [&_a]:text-primary [&_a]:no-underline [&_a:hover]:text-primary/80 [&_a:hover]:underline",
} as const;

export const InfoRow: React.FC<InfoRowProps> = ({ label, labelOverride, value, className = "", children, imageData = false, styleMode = "default" }) => {
  // Use centralized field formatting which handles HTML, URLs, dates, etc.
  const formattedValue = formatFieldValue(label, value);
  const formattedLabel = labelOverride ?? formatFieldName(label);

  return (
    <div className={`flex mb-1.5 items-start text-xs ${className}`} data-testid="info-row">
      <div className={LABEL_CLASSES[styleMode]}>{formattedLabel}:</div>
      <div className={imageData ? "hidden" : VALUE_CLASSES[styleMode]}>
        {formattedValue}
        {children}
      </div>
    </div>
  );
};

export interface InfoRowValueProps {
  value?: string | ReactNode;
  className?: string;
  children?: ReactNode;
  onClick?: (feature?: unknown) => void;
  feature?: unknown;
}

export const InfoRowValue: React.FC<InfoRowValueProps> = ({ value, className = "", children, onClick, feature }) => {
  return (
    <div
      className={`text-gray-600 flex-1 break-words ${className}`}
      data-testid="info-row-value"
      onClick={() => {
        if (onClick) onClick(feature);
      }}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      {value}
      {children}
    </div>
  );
};

export default InfoRow;
