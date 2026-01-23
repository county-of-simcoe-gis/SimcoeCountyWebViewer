"use client";

import React from "react";
import Collapsible from "react-collapsible";
import type { AvlLiveGroupProps, AvlGroup, AvlSubGroup } from "../types/avl.types";

export default function AvlLiveGroup({
  info,
  onInputChangeSubGroup,
  onInputChangeGroup,
  onPanelOpen,
}: AvlLiveGroupProps) {
  // Calculate count of visible vehicles
  const getVehicleCount = (): number => {
    if (!info.data || !Array.isArray(info.data)) return 0;
    let count = 0;
    for (const subGroup of info.subGroups) {
      if (subGroup.visible) {
        count += info.data.filter((v) => v.subgrouping === subGroup.name).length;
      }
    }
    return count;
  };

  const vehicleCount = getVehicleCount();

  // Label offset based on character count
  const getLabelOffset = (): number => {
    const charCount = String(vehicleCount).length;
    if (charCount === 1) return 18;
    if (charCount === 2) return 23;
    return 26;
  };

  // Handle group visibility change
  const handleGroupCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChangeGroup(info, e.target.checked);
  };

  // Handle panel open/close
  const handlePanelOpen = () => {
    onPanelOpen(info, !info.open);
  };

  // Checkbox style based on visibility
  const checkboxStyle: React.CSSProperties = {
    transform: "scale(1.2)",
    marginLeft: "5px",
    marginTop: "4px",
    float: "left",
  };

  return (
    <div className="sc-avl-live-group-container">
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          id={`group-checkbox-${info.name}`}
          type="checkbox"
          style={checkboxStyle}
          checked={info.visible}
          onChange={handleGroupCheckboxChange}
        />
        <span
          style={{
            position: "absolute",
            right: getLabelOffset() + "px",
            top: "3px",
            fontSize: "10pt",
          }}
        >
          {"(" + vehicleCount + ")"}
        </span>
      </div>
      <Collapsible
        trigger={info.name}
        open={info.open}
        onOpening={handlePanelOpen}
        onClosing={handlePanelOpen}
        transitionTime={100}
      >
        {info.subGroups.map((subGroup) => (
          <AvlLiveSubGroup
            key={subGroup.name}
            info={subGroup}
            group={info}
            onInputChange={onInputChangeSubGroup}
          />
        ))}
      </Collapsible>
    </div>
  );
}

// AvlLiveSubGroup Component
interface AvlLiveSubGroupProps {
  info: AvlSubGroup;
  group: AvlGroup;
  onInputChange: (subGroup: AvlSubGroup, group: AvlGroup, checked: boolean) => void;
}

function AvlLiveSubGroup({ info, group, onInputChange }: AvlLiveSubGroupProps) {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChange(info, group, e.target.checked);
  };

  const checkboxStyle: React.CSSProperties = {
    transform: "scale(1.2)",
    marginLeft: "5px",
    marginTop: "4px",
    float: "left",
    cursor: "pointer",
  };

  return (
    <div className="sc-avl-live-sub-group-container">
      <label style={{ cursor: "pointer" }}>
        <input
          id={`subgroup-checkbox-${group.name}-${info.name}`}
          type="checkbox"
          style={checkboxStyle}
          checked={info.visible}
          onChange={handleCheckboxChange}
        />
        <span style={{ marginLeft: "8px" }}>{info.name}</span>
      </label>
    </div>
  );
}
