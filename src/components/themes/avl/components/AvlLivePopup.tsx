"use client";

import React, { useState, useEffect } from "react";
import type { AvlLivePopupProps } from "../types/avl.types";
import "../styles/AvlLive.css";

// InfoRow component - matches the legacy app structure
function InfoRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="sc-info-window-row">
      <div className="sc-info-window-label">{label}</div>
      <div className="sc-info-window-value">{value}</div>
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
  onClose,
}: AvlLivePopupProps & { onClose?: () => void }) {
  const [isFollowing, setIsFollowing] = useState(followingVehicleName === info.vehicle_name);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef && onRef) {
      onRef(containerRef);
    }
  }, [containerRef, onRef]);

  useEffect(() => {
    // Update following state when prop changes
    setIsFollowing(followingVehicleName === info.vehicle_name);
  }, [followingVehicleName, info.vehicle_name]);

  const handleFollowClick = () => {
    if (isFollowing) {
      onFollowClick(null);
      setIsFollowing(false);
    } else {
      onFollowClick(info);
      setIsFollowing(true);
    }
  };

  const handleHistoryClick = () => {
    onHistoryClick();
  };

  const handleCloseClick = () => {
    if (onClose) {
      onClose();
    }
  };

  // Calculate "Last Reported" time difference
  const diff = Math.round((new Date().getTime() - new Date(info.date).getTime()) / 1000);
  const lastReportedClass = diff < 80000 ? "sc-theme-avl-last-reported green" : "sc-theme-avl-last-reported red";

  // Format spreader rate value with "Reported on" timestamp
  const formatSpreaderRate = (): string => {
    if (info.SpreaderRate === undefined) return "";
    if (typeof info.SpreaderRate === "string") return info.SpreaderRate;
    // If spreader is not active, show 0
    const rate = info.isSpreaderActive ? Math.round(info.SpreaderRate) : 0;
    return info.SpreaderRateReportedOn ? `${rate} (Reported on: ${info.SpreaderRateReportedOn})` : `${rate}`;
  };

  // Format material type with "Reported on" timestamp
  const formatMaterialType = (): string => {
    if (info.MaterialType === undefined) return "";
    if (info.MaterialType === "No Data Found" || info.MaterialType === "Getting Data...") {
      return info.MaterialType;
    }
    return info.MaterialTypeReportedOn ? `${info.MaterialType} (Reported on: ${info.MaterialTypeReportedOn})` : info.MaterialType;
  };

  // Format temperature with "Reported on" timestamp
  const formatTemperature = (temp: number | string | undefined, reportedOn: string | null | undefined): string => {
    if (temp === undefined) return "";
    if (typeof temp === "string") return temp;
    const formatted = `${Math.round(temp)}°C`;
    return reportedOn ? `${formatted} (Reported on: ${reportedOn})` : formatted;
  };

  return (
    <div className="sc-theme-avl-live-popup-content" ref={(ref) => setContainerRef(ref)}>
      <InfoRow label="Name" value={info.vehicle_name} />
      <InfoRow label="Group" value={info.subgrouping} />
      <InfoRow label="Description" value={info.vehicle_description || info.subgrouping} />

      {/* GeoTab Spreader Data - only for Plow vehicles with hasGeoTabSpreaderData */}
      {info.subgrouping === "Plow" && info.hasGeoTabSpreaderData && info.isPlowActive !== undefined && info.isSpreaderActive !== undefined && (
        <>
          <InfoRow label="Plow Active" value={info.isPlowActive ? "Yes" : "No"} />
          <InfoRow label="Wing Active" value={info.isWingActive ? "Yes" : "No"} />
          <InfoRow label="Spreader Active" value={info.isSpreaderActive ? "Yes" : "No"} />
          {info.SpreaderRate !== undefined && <InfoRow label="Spreader Rate" value={formatSpreaderRate()} />}
          {info.MaterialType !== undefined && <InfoRow label="Material Type" value={formatMaterialType()} />}
          {info.Blasting !== undefined && <InfoRow label="Blasting" value={info.Blasting ? "Yes" : "No"} />}
          {info.SurfaceTemperature !== undefined && <InfoRow label="Surface Temp" value={formatTemperature(info.SurfaceTemperature, info.SurfaceTemperatureReportedOn)} />}
          {info.AirTemperature !== undefined && <InfoRow label="Air Temp" value={formatTemperature(info.AirTemperature, info.AirTemperatureReportedOn)} />}
        </>
      )}

      <InfoRow label="Speed" value={info.velocity} />
      <InfoRow label="Date" value={info.dateFriendly} />

      <label className={lastReportedClass}>{info.lastReported}</label>

      <div className="sc-avl-live-popup-button-container">
        {showFollowButton && (
          <button className="sc-button sc-avl-live-popup-button" onClick={handleFollowClick} style={isFollowing ? { fontSize: "8pt" } : {}}>
            {isFollowing ? "Stop Following" : "Follow"}
          </button>
        )}
        {showHistoryButton && (
          <button className="sc-button sc-avl-live-popup-button" onClick={handleHistoryClick}>
            History
          </button>
        )}
        <button className="sc-button sc-avl-live-popup-button" style={{ marginRight: "0px" }} onClick={handleCloseClick}>
          Close
        </button>
      </div>
    </div>
  );
}
