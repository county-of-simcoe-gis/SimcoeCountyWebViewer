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

  return (
    <div
      className="sc-theme-avl-live-vehicle-container"
      onClick={handleClick}
      title={`Click to zoom to ${info.vehicle_name}`}
    >
      <img
        src={getPlowIcon()}
        alt={info.vehicle_name}
        style={{
          height: "30px",
          width: "auto",
          marginRight: "10px",
        }}
      />
      <div className="sc-theme-avl-live-vehicle-info">
        <div className="sc-theme-avl-live-vehicle-name">
          <label>{info.vehicle_name}</label>
          <label
            style={{
              fontSize: "9pt",
              fontWeight: "normal",
              marginLeft: "5px",
              color: "#999",
            }}
          >
            {info.grouping}
          </label>
        </div>
        <div className="sc-theme-avl-live-vehicle-details">
          <label
            className={"sc-theme-avl-live-vehicle-speed"}
            title="Current Speed"
          >
            {Math.round(info.velocity || 0)} km/h
          </label>
          <label
            style={{
              fontSize: "9pt",
              fontWeight: "normal",
              marginLeft: "10px",
            }}
            title="Date Reported"
          >
            {info.dateFriendly}
          </label>
        </div>
        <div className="sc-theme-avl-live-vehicle-last-reported">
          <label
            className={`sc-theme-avl-live-vehicle-last-reported-label ${info.cssClass}`}
          >
            {info.lastReported}
          </label>
        </div>
      </div>
    </div>
  );
}
