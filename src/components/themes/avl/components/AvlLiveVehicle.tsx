"use client";

import React from "react";
import type { AvlLiveVehicleProps } from "../types/avl.types";

// Image helper
const getImagePath = (imageName: string): string => `/images/avl/${imageName}`;

export default function AvlLiveVehicle({ info, onVechileClick }: AvlLiveVehicleProps) {
  const handleClick = () => {
    onVechileClick(info);
  };

  // Determine the icon based on plow status
  const getPlowIcon = (): string => {
    // Use the image from config
    let iconName = info.imageName || "default.png";

    // For Plow subgroup with GeoTab spreader data, determine icon color
    if (info.subgrouping === "Plow" && info.hasGeoTabSpreaderData) {
      const isPlowOrWingActive = info.isPlowActive || info.isWingActive;

      if (isPlowOrWingActive && info.isSpreaderActive) {
        // Red: Plow Down & Spreading
        iconName = "plow_red.png";
      } else if (isPlowOrWingActive && !info.isSpreaderActive) {
        // Green: Plow Down Only
        iconName = "plow_green.png";
      } else if (!isPlowOrWingActive && info.isSpreaderActive) {
        // Orange: Spreading Only
        iconName = "plow_orange.png";
      } else {
        // Default: No active status
        iconName = "plow.png";
      }
    }

    return getImagePath(iconName);
  };

  if (info.vehicle_name === undefined) return null;

  return (
    <div className="sc-theme-avl-live-vehicle-container sc-container" onClick={handleClick} title={`Click to zoom to ${info.vehicle_name}`}>
      <img className="sc-theme-avl-live-vehicle-info-img" src={getPlowIcon()} alt={info.vehicle_name} />
      <label className="sc-theme-avl-live-vehicle-info-name">
        {info.vehicle_name} - {info.grouping}
      </label>
      <label className="sc-theme-avl-live-vehicle-info-speed">Speed: {Math.round(info.velocity || 0)} Kph</label>
      <label className="sc-theme-avl-live-vehicle-info-date">{info.dateFriendly}</label>
      <label className={`sc-theme-avl-live-vehicle-info-last-reported ${info.cssClass}`}>{info.lastReported}</label>
    </div>
  );
}
