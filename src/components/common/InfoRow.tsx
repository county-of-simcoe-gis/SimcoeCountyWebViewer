"use client";

import React, { ReactNode } from "react";
import Attachments from "./Attachments";

export interface InfoRowProps {
  label: string;
  value?: string | number | boolean | ReactNode;
  className?: string;
  children?: ReactNode;
  imageData?: boolean;
  styleMode?: "default" | "table";
}

// Tailwind class maps for style modes
const LABEL_CLASSES = {
  default: "font-semibold text-base-content min-w-[110px] shrink-0 pr-1.5",
  table: "font-semibold text-base-content min-w-[160px] shrink-0 p-2 bg-base-200 border border-base-300 border-r-0",
} as const;

const VALUE_CLASSES = {
  default: "text-base-content/70 flex-1 break-words [&_a]:text-primary [&_a]:no-underline [&_a:hover]:text-primary/80 [&_a:hover]:underline",
  table: "text-base-content/70 flex-1 p-2 border border-base-300 break-words [&_a]:text-primary [&_a]:no-underline [&_a:hover]:text-primary/80 [&_a:hover]:underline",
} as const;

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, className = "", children, imageData = false, styleMode = "default" }) => {
  // Convert URLs to links and handle special cases
  let displayLabel = label;
  let displayValue: ReactNode = typeof value === "boolean" ? (value ? "Yes" : "No") : value;

  // Check if value is a string for URL/path detection
  const valueStr = typeof value === "string" ? value : "";

  // Handle HTTP URLs
  if (valueStr && valueStr.substring(0, 4).toUpperCase() === "HTTP") {
    if (label.toLowerCase() === "attachmenturl" || label.toLowerCase() === "attachment url") {
      displayLabel = "Attachments";
      displayValue = <Attachments attachmentUrl={valueStr} />;
    } else {
      displayValue = (
        <a href={valueStr} target="_blank" rel="noopener noreferrer">
          Click To Open
        </a>
      );
    }
  }
  // Handle UNC paths (\\server\path)
  else if (valueStr && valueStr.substring(0, 2).toUpperCase() === "\\\\") {
    displayValue = (
      <a href={valueStr} target="_blank" rel="noopener noreferrer">
        Click To Open
      </a>
    );
  }
  // Handle Windows drive paths (C:\path)
  else if (valueStr && valueStr.length > 2 && valueStr.substring(1, 3).toUpperCase() === ":\\") {
    displayValue = (
      <a href={valueStr} target="_blank" rel="noopener noreferrer">
        {valueStr}
      </a>
    );
  }
  // Handle date formatting — only strict ISO 8601 strings (e.g. "2024-03-15T10:30:00.000Z")
  else if (
    valueStr &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valueStr) &&
    !["NUMBER", "BYLAW", "WASTE COLLECTION DAY"].some((word) => label.toUpperCase().includes(word))
  ) {
    const date = new Date(valueStr);
    if (!isNaN(date.getTime())) {
      // Valid date - format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      displayValue = `${year}-${month}-${day}`;
    }
  }

  return (
    <div className={`flex mb-1.5 items-start text-xs ${className}`} data-testid="info-row">
      <div className={LABEL_CLASSES[styleMode]}>{displayLabel}:</div>
      <div className={imageData ? "hidden" : VALUE_CLASSES[styleMode]}>
        {displayValue}
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
















