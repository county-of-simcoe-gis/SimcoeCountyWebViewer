"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useMyMapsStore } from "@/stores/myMapsStore";
import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";

interface MyMapsItemProps {
  item: MyMapsItemType;
  onLabelChange: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onShowOptions?: (item: MyMapsItemType, event?: React.MouseEvent) => void;
  onHoverStart?: (item: MyMapsItemType) => void;
  onHoverEnd?: (item: MyMapsItemType) => void;
  isEditing?: boolean;
}

const MyMapsItem: React.FC<MyMapsItemProps> = ({ item, onLabelChange, onDelete, onShowOptions, onHoverStart, onHoverEnd, isEditing = false }) => {
  const { toggleItemVisibility } = useMyMapsStore();
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState(item.label);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync tempLabel with item.label when it changes from external updates
  useEffect(() => {
    if (!isEditingLabel) {
      setTempLabel(item.label);
    }
  }, [item.label, isEditingLabel]);

  const handleVisibilityToggle = () => {
    toggleItemVisibility(item.id);
  };

  const handleLabelClick = () => {
    if (!isEditing) {
      setIsEditingLabel(true);
      setTempLabel(item.label);
    }
  };

  const handleLabelSubmit = () => {
    onLabelChange(item.id, tempLabel);
    setIsEditingLabel(false);
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLabelSubmit();
    } else if (e.key === "Escape") {
      setTempLabel(item.label);
      setIsEditingLabel(false);
    }
  };

  const handleDeleteClick = () => {
    if (isDeleting) return; // Prevent multiple clicks during animation

    setIsDeleting(true);

    // Delay the actual deletion to allow fade-out animation
    setTimeout(() => {
      onDelete(item.id);
    }, 400); // Match the CSS transition duration
  };

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShowOptions) {
      onShowOptions(item, e);
    }
  };

  const handleMouseEnter = () => {
    if (onHoverStart) {
      onHoverStart(item);
    }
  };

  const handleMouseLeave = () => {
    if (onHoverEnd) {
      onHoverEnd(item);
    }
  };

  const getGeometryIcon = () => {
    switch (item.geometryType) {
      case "Point":
        return "point.png";
      case "LineString":
        return "polyline.png";
      case "Polygon":
        return "polygon.png";
      case "Circle":
        return "circle.png";
      default:
        return "default.png";
    }
  };

  return (
    <div
      className={`flex items-center gap-1.5 py-1.5 px-2 border-b border-base-300 border-l-2 border-l-transparent bg-base-100 transition-all relative hover:bg-primary/5 hover:border-l-primary hover:translate-x-[2px] max-[768px]:py-1 max-[768px]:px-1.5 max-[768px]:gap-1 ${!item.visible ? "opacity-50" : ""} ${isEditing ? "bg-primary/10 !border-l-[3px] !border-l-primary" : ""} ${isDeleting ? "opacity-0 translate-x-2.5 scale-95 transition-[opacity,transform] duration-[400ms] ease-in-out pointer-events-none" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Visibility checkbox */}
      <div className="shrink-0">
        <input type="checkbox" checked={item.visible} onChange={handleVisibilityToggle} title={item.visible ? "Hide item" : "Show item"} className="w-3.5 h-3.5 cursor-pointer" />
      </div>

      {/* Geometry type icon */}
      <div className="shrink-0 flex items-center justify-center w-5 h-5">
        <Image src={`/images/measure/${getGeometryIcon()}`} alt={item.geometryType} width={16} height={16} />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0 cursor-pointer mr-[2px]" onClick={handleLabelClick}>
        {isEditingLabel ? (
          <div className="relative flex items-center border border-base-300 rounded-sm bg-base-100 p-0 focus-within:border-primary focus-within:shadow-[0_0_0_1px_rgba(0,123,255,0.25)]">
            <input
              type="text"
              value={tempLabel}
              onChange={(e) => {
                const newValue = e.target.value;
                setTempLabel(newValue);
                // Live sync - MyMaps list works fine with immediate updates
                onLabelChange(item.id, newValue);
              }}
              onBlur={handleLabelSubmit}
              onKeyDown={handleLabelKeyDown}
              className="w-full text-xs border-none bg-transparent py-[2px] px-1 pr-5 focus:outline-none"
              autoFocus
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 opacity-60 pointer-events-none">
              <Image src="/images/edit.png" alt="Edit" width={12} height={12} />
            </div>
          </div>
        ) : (
          <div className="relative flex items-center border border-base-300 rounded-sm bg-base-100 py-[2px] px-1 min-h-[20px]">
            <span className="flex-1 text-xs text-base-content whitespace-nowrap overflow-hidden text-ellipsis pr-4 max-[768px]:text-[11px]" title={item.label}>
              {item.label}
            </span>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 opacity-60 pointer-events-none">
              <Image src="/images/edit.png" alt="Edit" width={12} height={12} />
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 shrink-0 ml-[2px]">
        {/* Delete button */}
        <button
          className="w-6 h-6 border-none bg-transparent rounded-[3px] cursor-pointer flex items-center justify-center transition-all p-0 shrink-0 hover:bg-base-200 hover:scale-105 active:scale-95 max-[768px]:w-[18px] max-[768px]:h-[18px]"
          onClick={handleDeleteClick}
          title="Delete item"
          type="button"
        >
          <Image src="/images/myMaps/eraser.png" alt="Delete" width={16} height={16} />
        </button>

        {/* Toolbox button */}
        <button
          className="w-6 h-6 border-none bg-transparent rounded-[3px] cursor-pointer flex items-center justify-center transition-all p-0 shrink-0 hover:bg-base-200 hover:scale-105 active:scale-95 max-[768px]:w-[18px] max-[768px]:h-[18px]"
          onClick={handleOptionsClick}
          title="Drawing options"
          type="button"
        >
          <Image src="/images/toolbox.png" alt="Toolbox" width={16} height={16} />
        </button>
      </div>

      {/* Label visibility indicator */}
      {item.labelVisible && (
        <div className="absolute top-[2px] right-[2px] w-3 h-3 opacity-60" title="Label is visible">
          <Image src="/images/toc/label.png" alt="Label visible" width={12} height={12} />
        </div>
      )}
    </div>
  );
};

export default MyMapsItem;
