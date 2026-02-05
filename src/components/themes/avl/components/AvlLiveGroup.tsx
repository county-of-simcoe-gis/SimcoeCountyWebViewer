"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import type { AvlLiveGroupProps, AvlGroup, AvlSubGroup } from "../types/avl.types";

// Get label offset based on group name (to position the count properly)
const getLabelOffset = (name: string): string => {
  if (name === "Roads") return "102px";
  if (name === "Roads GeoTab") return "170px";
  if (name === "Solid Waste") return "145px";
  if (name === "Solid Waste GeoTab") return "210px";
  if (name === "Waste Contractor") return "188px";
  if (name === "Severn") return "110px";
  if (name === "Innisfil") return "110px";
  return "200px";
};

export default function AvlLiveGroup({ info, onInputChangeSubGroup, onInputChangeGroup, onPanelOpen }: AvlLiveGroupProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Sync external open state changes to the details element
  useEffect(() => {
    if (detailsRef.current && detailsRef.current.open !== info.open) {
      detailsRef.current.open = info.open;
    }
  }, [info.open]);

  // Get vehicle count from data array
  const vehicleCount = Array.isArray(info.data) ? info.data.length : 0;

  // Hide the group if no data
  if (!Array.isArray(info.data) || info.data.length === 0) {
    return null;
  }

  // Handle group visibility change
  const handleGroupCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChangeGroup(info, e.target.checked);
  };

  // Get checkbox style adjustment for certain groups
  const getCheckboxStyle = (): React.CSSProperties => {
    if (info.name === "Waste Contractor" || info.name === "Innisfil") {
      return { left: "-1px" };
    }
    return {};
  };

  return (
    <div className="sc-theme-avl-live-group-container">
      <label className="sc-theme-avl-live-group-count sc-no-select" style={{ left: getLabelOffset(info.name) }}>
        ({vehicleCount})
      </label>
      <input type="checkbox" className="sc-theme-avl-group-input" style={getCheckboxStyle()} onChange={handleGroupCheckboxChange} checked={info.visible} />
      <details
        ref={detailsRef}
        className="sc-theme-avl-collapse"
        open={info.open}
        data-testid="collapsible"
        onToggle={(e) => {
          const isOpen = e.currentTarget.open;
          if (isOpen !== info.open) {
            onPanelOpen(info, isOpen);
          }
        }}
      >
        <summary
          className="sc-theme-avl-collapse-trigger"
          data-testid="collapsible-trigger"
          onClick={() => {
            onPanelOpen(info, !info.open);
          }}
        >
          {info.name}
        </summary>
        {info.open && (
          <div className="sc-theme-avl-collapse-content" data-testid="collapsible-content">
            <div className="sc-theme-avl-live-group-content">
              {info.subGroups.map((subGroup) => (
                <AvlLiveSubGroup key={subGroup.name} subGroup={subGroup} group={info} onInputChangeSubGroup={onInputChangeSubGroup} />
              ))}
            </div>
          </div>
        )}
      </details>
    </div>
  );
}

// AvlLiveSubGroup Component
interface AvlLiveSubGroupProps {
  subGroup: AvlSubGroup;
  group: AvlGroup;
  onInputChangeSubGroup: (subGroup: AvlSubGroup, group: AvlGroup, checked: boolean) => void;
}

function AvlLiveSubGroup({ subGroup, group, onInputChangeSubGroup }: AvlLiveSubGroupProps) {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChangeSubGroup(subGroup, group, e.target.checked);
  };

  // Get the image path from the public folder
  const imageSrc = `/images/avl/${subGroup.imageName || "default.png"}`;

  return (
    <div className="sc-theme-avl-live-subgroup sc-noselect">
      <div className="sc-theme-avl-icon">
        <Image src={imageSrc} alt={subGroup.name} width={30} height={30} />
      </div>
      <label className={subGroup.visible ? "sc-theme-avl-group-label on" : "sc-theme-avl-group-label"}>
        <input type="checkbox" className="sc-theme-avl-subgroup-input" onChange={handleCheckboxChange} checked={subGroup.visible} />
        {subGroup.name}
      </label>
    </div>
  );
}
