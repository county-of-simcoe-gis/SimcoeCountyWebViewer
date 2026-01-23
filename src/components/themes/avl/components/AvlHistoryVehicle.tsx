"use client";

import React from "react";
import { getFriendlyDateString } from "../utils/avlHelpers";
import type { AvlHistoryVehicleProps } from "../types/avl.types";

export default function AvlHistoryVehicle({ info, onVechileClick }: AvlHistoryVehicleProps) {
  const handleClick = () => {
    onVechileClick(info);
  };

  // Format the date
  const formattedDate = (() => {
    if (!info.date) return "";
    try {
      return getFriendlyDateString(new Date(info.date));
    } catch {
      return info.date;
    }
  })();

  return (
    <div
      className="sc-theme-avl-history-vehicle-container"
      onClick={handleClick}
      title={`Click to zoom to ${info.vehicle_name}`}
    >
      <div className="sc-theme-avl-history-vehicle-info">
        <div className="sc-theme-avl-history-vehicle-name">
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
        <div className="sc-theme-avl-history-vehicle-details">
          <label className="sc-theme-avl-history-vehicle-speed" title="Speed">
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
            {formattedDate}
          </label>
        </div>
      </div>
    </div>
  );
}
