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
      <div className="table mb-[3px] w-full">
        <div className={`mymaps-popup-checkbox relative top-[3px] table-cell w-[120px] left-[2px]${isCheckboxDisabled ? " pointer-events-none opacity-40" : ""}`}>
          <label className="text-[11px] font-[Arial,sans-serif] text-base-content cursor-pointer m-0 select-none">
            <input className="relative top-[1.5px] mr-1 ml-0" type="checkbox" checked={showLabel} onChange={handleLabelVisibilityChange} disabled={isCheckboxDisabled} />
            Show Label
          </label>
        </div>
        <div className="mymaps-popup-slider mymaps-slider text-[7pt] table-cell pl-5 align-top w-[130px]">
          <div className="flex flex-col items-center">
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
            <label className="text-[7pt] text-center">Rotate Label</label>
          </div>
        </div>
      </div>
      <div>
        <input
          className="mymaps-popup-label-input w-[246px] h-8 py-[5px] pr-[30px] pl-[5px] text-base text-primary rounded-[3px] outline-none border border-base-300 mt-[5px] box-border bg-[url('/images/edit.png')] bg-no-repeat bg-[position:calc(100%-8px)_center] bg-[length:16px_16px] bg-base-100 focus:border-primary"
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
