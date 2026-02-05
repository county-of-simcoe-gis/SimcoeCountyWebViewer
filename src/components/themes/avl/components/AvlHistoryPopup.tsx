"use client";

import React, { useEffect } from "react";
import { getFriendlyDateString, getUID } from "../utils/avlHelpers";
import type { AvlHistoryPopupProps } from "../types/avl.types";

// Info row component - matches the legacy app structure
function InfoRow({ label, value }: { label: string; value: string | number | boolean | undefined | null }) {
  if (value === undefined || value === null || value === "") return null;

  // Handle boolean values
  let displayValue: string;
  if (typeof value === "boolean") {
    displayValue = value ? "Yes" : "No";
  } else {
    displayValue = String(value);
  }

  return (
    <div className="sc-info-window-row">
      <div className="sc-info-window-label">{label}</div>
      <div className="sc-info-window-value">{displayValue}</div>
    </div>
  );
}

export default function AvlHistoryPopup({ info, onRef }: AvlHistoryPopupProps) {
  const uniqueId = getUID();

  useEffect(() => {
    if (onRef) {
      const element = document.getElementById(`avl-history-popup-${uniqueId}`);
      if (element) {
        onRef(element);
      }
    }
  }, [onRef, uniqueId]);

  // Format the date
  const formattedDate = (() => {
    if (!info.date) return "";
    try {
      // Match legacy: remove Z from date string before parsing
      const dateStr = info.date.replace("Z", "");
      return getFriendlyDateString(new Date(dateStr));
    } catch {
      return info.date;
    }
  })();

  // Helper function to format value with "Reported on" timestamp (matching legacy)
  const formatWithReportedOn = (value: string | number | boolean | undefined | null, reportedOn: string | null | undefined): string => {
    if (value === "No Data" || value === null || value === undefined) return "No Data";
    if (reportedOn) return `${value} - Reported on: ${reportedOn}`;
    return String(value);
  };

  // Check if we have spreader data (PlowDown is the indicator)
  const isSpreader = info.PlowDown !== undefined;

  // Format spread rate with reported on (rounded to whole number)
  const spreadRateValue = typeof info.DryRateKilosPerLaneKilometer === "number" ? Math.round(info.DryRateKilosPerLaneKilometer) : info.DryRateKilosPerLaneKilometer;
  const spreadRateDisplay = info.DryRateKilosPerLaneKilometer === "No Data" ? "No Data" : info.DryRateKilosPerLaneKilometer === 0 ? "0" : formatWithReportedOn(spreadRateValue, info.DryRateReportedOn);

  // Format material type with reported on
  const materialTypeDisplay = formatWithReportedOn(info.MaterialType, info.MaterialTypeReportedOn);

  // Format wing down with reported on
  const wingDownDisplay = info.WingDown === "No Data" ? "No Data" : info.WingReportedOn ? `${info.WingDown ? "Yes" : "No"} - Reported on: ${info.WingReportedOn}` : info.WingDown ? "Yes" : "No";

  // Format temperatures with reported on (rounded to whole numbers)
  const airTempValue = typeof info.TemperatureAir === "number" ? Math.round(info.TemperatureAir) : info.TemperatureAir;
  const surfaceTempValue = typeof info.TemperatureSurface === "number" ? Math.round(info.TemperatureSurface) : info.TemperatureSurface;
  const airTempDisplay = formatWithReportedOn(airTempValue, info.TemperatureAirReportedOn);
  const surfaceTempDisplay = formatWithReportedOn(surfaceTempValue, info.TemperatureSurfaceReportedOn);

  return (
    <div className="sc-theme-avl-history-popup-content" id={`avl-history-popup-${uniqueId}`}>
      {/* General Information - matching legacy order */}
      <InfoRow label="Name" value={info.vehicle_name} />
      <InfoRow label="Description" value={info.vehicle_description} />
      <InfoRow label="Speed" value={info.velocity} />
      <InfoRow label="Date" value={formattedDate} />

      {/* Spreader Data Section - only shown when PlowDown is defined */}
      {isSpreader && (
        <>
          <InfoRow label="Spreader On" value={info.DryOn ? "Yes" : "No"} />
          <InfoRow label="Spread Rate" value={spreadRateDisplay} />
          <InfoRow label="Material Type" value={materialTypeDisplay} />
          <InfoRow label="Plow Down" value={info.PlowDown ? "Yes" : "No"} />
          <InfoRow label="Wing Down" value={wingDownDisplay} />
          <InfoRow label="Air Temperature" value={airTempDisplay} />
          <InfoRow label="Surface Temperature" value={surfaceTempDisplay} />
          <InfoRow label="Blasting" value={info.Blasting ? "Yes" : "No"} />
        </>
      )}
    </div>
  );
}
