"use client";

import React, { ReactNode } from "react";
import "./InfoRow.css";

export interface InfoRowProps {
  label: string;
  value?: string | number | ReactNode;
  className?: string;
  children?: ReactNode;
  imageData?: boolean;
  styleMode?: "default" | "table";
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, className = "", children, imageData = false, styleMode = "default" }) => {
  // Convert URLs to links and handle special cases
  let displayLabel = label;
  let displayValue = value;

  // Check if value is a string for URL/path detection
  const valueStr = typeof value === "string" ? value : "";

  // Handle HTTP URLs
  if (valueStr && valueStr.substring(0, 4).toUpperCase() === "HTTP") {
    if (label === "Attachment Url") {
      displayLabel = "Attachments";
      // You can add Attachments component logic here if needed
      displayValue = (
        <a href={valueStr} target="_blank" rel="noopener noreferrer">
          View Attachments
        </a>
      );
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
  // Handle date formatting
  else if (valueStr && valueStr.length >= 8 && !["NUMBER", "BYLAW", "WASTE COLLECTION DAY"].some((word) => label.toUpperCase().includes(word))) {
    // Try to parse as ISO date
    const date = new Date(valueStr);
    if (!isNaN(date.getTime())) {
      // Valid date - format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      displayValue = `${year}-${month}-${day}`;
    }
  }

  const labelClass = styleMode === "table" ? "sc-info-row-label-table" : "sc-info-row-label";
  const valueClass = styleMode === "table" ? "sc-info-row-value-table" : "sc-info-row-value";
  return (
    <div className={`sc-info-row ${className}`}>
      <div className={labelClass}>{displayLabel}:</div>
      <div className={imageData ? "sc-hidden" : valueClass}>
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
      className={`sc-info-row-value ${className}`}
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
















