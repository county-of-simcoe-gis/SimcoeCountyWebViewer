"use client";

import React, { useEffect } from "react";
import { getFriendlyDateString, getUID } from "../utils/avlHelpers";
import type { AvlHistoryPopupProps } from "../types/avl.types";

// Info row component
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | undefined | null;
}) {
  if (value === undefined || value === null || value === "") return null;

  // Handle boolean values
  let displayValue: string;
  if (typeof value === "boolean") {
    displayValue = value ? "Yes" : "No";
  } else {
    displayValue = String(value);
  }

  return (
    <div className="sc-theme-avl-history-popup-info-row">
      <span className="sc-theme-avl-history-popup-info-label">{label}:</span>
      <span className="sc-theme-avl-history-popup-info-value">{displayValue}</span>
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
      return getFriendlyDateString(new Date(info.date));
    } catch {
      return info.date;
    }
  })();

  // Format spreader rate value
  const formatSpreaderRate = (value: number | string | undefined): string | null => {
    if (value === undefined || value === null) return null;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return null;
    return `${numValue.toFixed(1)} kg/km`;
  };

  // Format temperature value
  const formatTemperature = (value: number | string | undefined): string | null => {
    if (value === undefined || value === null) return null;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return null;
    return `${numValue.toFixed(1)} °C`;
  };

  // Check if we have spreader data
  const hasSpreaderData =
    info.PlowDown !== undefined ||
    info.DryOn !== undefined ||
    info.DryRateKilosPerLaneKilometer !== undefined ||
    info.TemperatureAir !== undefined ||
    info.TemperatureSurface !== undefined;

  return (
    <div className="sc-theme-avl-history-popup-content" id={`avl-history-popup-${uniqueId}`}>
      {/* General Information */}
      <InfoRow label="Name" value={info.vehicle_name} />
      <InfoRow label="Group" value={info.grouping} />
      <InfoRow label="Type" value={info.subgrouping} />
      <InfoRow label="Speed" value={`${Math.round(info.velocity || 0)} km/h`} />
      <InfoRow
        label="Direction"
        value={info.direction ? `${Math.round(info.direction)}°` : undefined}
      />
      <InfoRow label="Date" value={formattedDate} />
      <InfoRow label="Latitude" value={info.latitude?.toFixed(6)} />
      <InfoRow label="Longitude" value={info.longitude?.toFixed(6)} />

      {/* Spreader Data Section */}
      {hasSpreaderData && (
        <>
          <div className="sc-theme-avl-history-popup-section-header">Spreader Data</div>
          <InfoRow label="Plow Down" value={info.PlowDown} />
          <InfoRow label="Spreader On" value={info.DryOn} />
          <InfoRow label="Blasting" value={info.Blasting} />
          <InfoRow
            label="Spreader Rate"
            value={formatSpreaderRate(info.DryRateKilosPerLaneKilometer)}
          />
          <InfoRow label="Air Temperature" value={formatTemperature(info.TemperatureAir)} />
          <InfoRow
            label="Surface Temperature"
            value={formatTemperature(info.TemperatureSurface)}
          />
          {info.DryRateReportedOn && (
            <InfoRow
              label="Rate Reported"
              value={(() => {
                try {
                  return getFriendlyDateString(new Date(info.DryRateReportedOn));
                } catch {
                  return info.DryRateReportedOn;
                }
              })()}
            />
          )}
        </>
      )}

      {/* Wing Data (GeoTab specific) */}
      {info.WingDown !== undefined && (
        <>
          <div className="sc-theme-avl-history-popup-section-header">Wing Data</div>
          <InfoRow
            label="Wing"
            value={
              typeof info.WingDown === "boolean"
                ? info.WingDown
                  ? "Down"
                  : "Up"
                : info.WingDown
            }
          />
          {info.WingReportedOn && (
            <InfoRow
              label="Reported"
              value={(() => {
                try {
                  return getFriendlyDateString(new Date(info.WingReportedOn));
                } catch {
                  return info.WingReportedOn;
                }
              })()}
            />
          )}
        </>
      )}
    </div>
  );
}
