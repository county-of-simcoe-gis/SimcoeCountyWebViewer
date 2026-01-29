"use client";

import React from "react";
import { getFriendlyDateString } from "../utils/avlHelpers";
import type { AvlHistoryVehicleProps } from "../types/avl.types";

export default function AvlHistoryVehicle({ info, onVechileClick }: AvlHistoryVehicleProps) {
  if (!info.vehicle_name) return null;

  // Format the date with timezone offset adjustment (same as old app)
  const formattedDate = (() => {
    if (!info.date) return "";
    try {
      const date = new Date(info.date);
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const newDate = new Date(date.getTime() + userTimezoneOffset);
      return getFriendlyDateString(newDate);
    } catch {
      return info.date;
    }
  })();

  return (
    <div className="sc-theme-avl-history-vehicle-container sc-container" onClick={() => onVechileClick(info)}>
      <label className="sc-theme-avl-history-vehicle-info-name">{info.vehicle_name}</label>
      <label className="sc-theme-avl-history-vehicle-info-group">{info.grouping}</label>
      <label className="sc-theme-avl-history-vehicle-info-speed">{"Speed: " + (info.velocity || 0) + " Kph"}</label>
      <label className="sc-theme-avl-history-vehicle-info-date">{formattedDate}</label>
    </div>
  );
}
