"use client";

import React, { useState, useEffect } from "react";
import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import "@/components/myMaps/MyMapsPopupLabel.css";

interface MyMapsPopupLabelProps {
  item: MyMapsItemType;
  onLabelChange?: (id: string, label: string) => void;
  onLabelVisibilityChange?: (id: string, visible: boolean) => void;
  onLabelRotationChange?: (id: string, rotation: number) => void;
}

const MyMapsPopupLabel: React.FC<MyMapsPopupLabelProps> = ({ item, onLabelChange, onLabelVisibilityChange, onLabelRotationChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLabel, setTempLabel] = useState(item.label);
  const [labelRotation, setLabelRotation] = useState(item.labelRotation || 0);
  const [showLabel, setShowLabel] = useState(item.labelVisible || false);

  // Only sync when not editing to prevent infinite loops
  useEffect(() => {
    if (!isEditing) {
      setTempLabel(item.label);
      setLabelRotation(item.labelRotation || 0);
    }
    setShowLabel(item.labelVisible || false);
  }, [item.label, item.labelRotation, item.labelVisible, isEditing]);

  const handleLabelSubmit = () => {
    if (onLabelChange) {
      onLabelChange(item.id, tempLabel.trim());
    }
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      handleLabelSubmit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setTempLabel(item.label);
    }
  };

  const handleLabelBlur = () => {
    handleLabelSubmit();
  };

  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRotation = parseInt(e.target.value);
    setLabelRotation(newRotation);
    if (onLabelRotationChange) {
      onLabelRotationChange(item.id, newRotation);
    }
  };

  const handleLabelVisibilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const visible = e.target.checked;
    setShowLabel(visible);
    if (onLabelVisibilityChange) {
      onLabelVisibilityChange(item.id, visible);
    }
  };

  // Check if checkbox should be disabled (Text and Callout types always have labels visible)
  const isCheckboxDisabled = item.drawType === "Text" || item.drawType === "Callout";

  return (
    <div>
      <div className="sc-mymaps-popup-label-toggler">
        <div className={isCheckboxDisabled ? "sc-mymaps-popup-checkbox disabled" : "sc-mymaps-popup-checkbox"}>
          <label
            style={{
              WebkitTouchCallout: "none",
              WebkitUserSelect: "none",
              KhtmlUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
              userSelect: "none",
            }}
          >
            <input style={{ position: "relative", top: "1.5px" }} type="checkbox" checked={showLabel} onChange={handleLabelVisibilityChange} disabled={isCheckboxDisabled} />
            Show Label
          </label>
        </div>
        <div className="sc-mymaps-popup-slider">
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={labelRotation}
            onChange={handleRotationChange}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          />
          <label className="sc-mymaps-popup-slider-label">Rotate Label</label>
        </div>
      </div>
      <div>
        <input
          className="sc-mymaps-popup-label-input sc-editable"
          type="text"
          value={tempLabel}
          onChange={(e) => {
            setTempLabel(e.target.value);
            setIsEditing(true);
          }}
          onFocus={() => setIsEditing(true)}
          onBlur={() => {
            setIsEditing(false);
            handleLabelBlur();
          }}
          onKeyDown={handleLabelKeyDown}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

export default MyMapsPopupLabel;
