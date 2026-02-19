"use client";

import { useState, useEffect } from "react";
import AvlLivePopup from "./AvlLivePopup";
import type { AvlVehicle, AvlGroup } from "../types/avl.types";

interface AvlLivePopupWrapperProps {
  vehicleInfo: AvlVehicle;
  configGroups: AvlGroup[];
  followingVehicleName: string;
  onFollowClick: (vehicle: AvlVehicle | null) => void;
  onHistoryClick: () => void;
  onClose: () => void;
  showFollowButton: boolean;
  showHistoryButton: boolean;
  fetchGeoTabDiagnostics: (vehicle: AvlVehicle) => Promise<Partial<AvlVehicle> | null>;
}

/**
 * Wrapper that handles async GeoTab spreader data fetching within the popup.
 * Used when AVL results are displayed inside the unified ResultsPopup.
 */
export default function AvlLivePopupWrapper({
  vehicleInfo,
  configGroups,
  followingVehicleName,
  onFollowClick,
  onHistoryClick,
  onClose,
  showFollowButton,
  showHistoryButton,
  fetchGeoTabDiagnostics,
}: AvlLivePopupWrapperProps) {
  const [info, setInfo] = useState<AvlVehicle>(vehicleInfo);

  useEffect(() => {
    // Check if this is a plow vehicle and if the group has spreader data enabled
    const groupFromConfig = configGroups.find((g) => g.name === vehicleInfo.grouping);
    const hasGeoTabSpreaderData = groupFromConfig?.hasGeoTabSpreaderData === true;

    if (vehicleInfo.subgrouping === "Plow" && hasGeoTabSpreaderData) {
      // Set initial info with placeholders
      setInfo({
        ...vehicleInfo,
        hasGeoTabSpreaderData: true,
        isPlowActive: vehicleInfo.isPlowActive ?? false,
        isSpreaderActive: vehicleInfo.isSpreaderActive ?? false,
        isWingActive: vehicleInfo.isWingActive ?? false,
        SpreaderRate: vehicleInfo.SpreaderRate ?? "Getting Data...",
        SurfaceTemperature: vehicleInfo.SurfaceTemperature ?? "Getting Data...",
        AirTemperature: vehicleInfo.AirTemperature ?? "Getting Data...",
        MaterialType: vehicleInfo.MaterialType ?? "Getting Data...",
      });

      // Fetch diagnostic data asynchronously
      fetchGeoTabDiagnostics(vehicleInfo).then((diagnosticData) => {
        if (diagnosticData) {
          setInfo((prev) => ({
            ...prev,
            ...diagnosticData,
            hasGeoTabSpreaderData: true,
            isPlowActive: vehicleInfo.isPlowActive ?? false,
            isSpreaderActive: vehicleInfo.isSpreaderActive ?? false,
            isWingActive: vehicleInfo.isWingActive ?? false,
          }));
        }
      });
    } else {
      setInfo({
        ...vehicleInfo,
        hasGeoTabSpreaderData: hasGeoTabSpreaderData || false,
      });
    }
  }, [vehicleInfo, configGroups, fetchGeoTabDiagnostics]);

  return (
    <AvlLivePopup
      info={info}
      followingVehicleName={followingVehicleName}
      onFollowClick={onFollowClick}
      onHistoryClick={onHistoryClick}
      onClose={onClose}
      showFollowButton={showFollowButton}
      showHistoryButton={showHistoryButton}
    />
  );
}
