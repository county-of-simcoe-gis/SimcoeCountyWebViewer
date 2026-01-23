"use client";

import React, { useState, useEffect } from "react";
import type { AvlLivePopupProps } from "../types/avl.types";

// Image helper
const getImagePath = (imageName: string): string => `/images/avl/${imageName}`;

// Info row component
function InfoRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="sc-avl-live-popup-info-row">
      <span className="sc-avl-live-popup-info-label">{label}:</span>
      <span className="sc-avl-live-popup-info-value">{value}</span>
    </div>
  );
}

export default function AvlLivePopup({
  info,
  followingVehicleName,
  onFollowClick,
  onHistoryClick,
  showFollowButton = true,
  showHistoryButton = true,
  onRef,
}: AvlLivePopupProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef && onRef) {
      onRef(containerRef);
    }
  }, [containerRef, onRef]);

  const handleFollowClick = () => {
    if (followingVehicleName === info.vehicle_name) {
      // Stop following
      onFollowClick(null);
    } else {
      // Start following
      onFollowClick(info);
    }
  };

  const handleHistoryClick = () => {
    onHistoryClick();
  };

  const isFollowing = followingVehicleName === info.vehicle_name;

  // Get image icon based on plow status
  const getPlowIcon = (): string => {
    let iconName = info.imageName || "default.png";

    if (info.subgrouping === "Plow" && info.hasGeoTabSpreaderData) {
      const isPlowOrWingActive = info.isPlowActive || info.isWingActive;

      if (isPlowOrWingActive && info.isSpreaderActive) {
        iconName = "plow_red.png";
      } else if (isPlowOrWingActive && !info.isSpreaderActive) {
        iconName = "plow_green.png";
      } else if (!isPlowOrWingActive && info.isSpreaderActive) {
        iconName = "plow_orange.png";
      } else {
        iconName = "plow.png";
      }
    }

    return getImagePath(iconName);
  };

  // Format spreader rate
  const formatSpreaderRate = (value: number | string | undefined): string | null => {
    if (value === undefined || value === null) return null;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return null;
    return `${numValue.toFixed(1)} kg/km`;
  };

  // Format temperature
  const formatTemperature = (value: number | string | undefined): string | null => {
    if (value === undefined || value === null) return null;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return null;
    return `${numValue.toFixed(1)} °C`;
  };

  return (
    <div className="sc-avl-live-popup" ref={(ref) => setContainerRef(ref)}>
      <div className="sc-avl-live-popup-header">
        <img src={getPlowIcon()} alt={info.vehicle_name} style={{ height: "24px", marginRight: "10px" }} />
        <span className="sc-avl-live-popup-title">{info.vehicle_name}</span>
      </div>

      <div className="sc-avl-live-popup-content">
        <InfoRow label="Name" value={info.vehicle_name} />
        <InfoRow label="Group" value={info.grouping} />
        <InfoRow label="Type" value={info.subgrouping} />
        <InfoRow label="Speed" value={`${Math.round(info.velocity || 0)} km/h`} />
        <InfoRow label="Direction" value={info.direction ? `${Math.round(info.direction)}°` : undefined} />
        <InfoRow label="Date" value={info.dateFriendly} />
        <InfoRow label="Last Reported" value={info.lastReported?.replace("Last Reported: ", "")} />

        {/* GeoTab Spreader Data */}
        {info.hasGeoTabSpreaderData && (
          <>
            <div className="sc-avl-live-popup-section-header">Spreader Data</div>
            <InfoRow
              label="Plow"
              value={info.isPlowActive ? "Active" : "Inactive"}
            />
            <InfoRow
              label="Spreader"
              value={info.isSpreaderActive ? "Active" : "Inactive"}
            />
            <InfoRow
              label="Wing"
              value={info.isWingActive ? "Active" : "Inactive"}
            />
            <InfoRow label="Spreader Rate" value={formatSpreaderRate(info.SpreaderRate)} />
            <InfoRow label="Air Temp" value={formatTemperature(info.AirTemperature)} />
            <InfoRow label="Surface Temp" value={formatTemperature(info.SurfaceTemperature)} />
            <InfoRow label="Material" value={info.MaterialType} />
          </>
        )}
      </div>

      <div className="sc-avl-live-popup-buttons">
        {showFollowButton && (
          <button
            className="sc-button"
            onClick={handleFollowClick}
            title={isFollowing ? "Stop following this vehicle" : "Follow this vehicle on the map"}
          >
            {isFollowing ? "Stop Following" : "Follow"}
          </button>
        )}
        {showHistoryButton && (
          <button
            className="sc-button"
            onClick={handleHistoryClick}
            title="View history for this vehicle"
          >
            History
          </button>
        )}
      </div>
    </div>
  );
}
