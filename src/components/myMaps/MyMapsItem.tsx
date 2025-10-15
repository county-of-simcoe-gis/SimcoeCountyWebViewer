"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useMyMapsStore } from "@/stores/myMapsStore";
import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import "@/components/myMaps/MyMapsItem.css";

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
    <div className={`sc-mymaps-item ${!item.visible ? "hidden" : ""} ${isEditing ? "editing" : ""} ${isDeleting ? "deleting" : ""}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Visibility checkbox */}
      <div className="sc-mymaps-item-checkbox">
        <input type="checkbox" checked={item.visible} onChange={handleVisibilityToggle} title={item.visible ? "Hide item" : "Show item"} />
      </div>

      {/* Geometry type icon */}
      <div className="sc-mymaps-item-icon">
        <Image src={`/images/measure/${getGeometryIcon()}`} alt={item.geometryType} width={16} height={16} />
      </div>

      {/* Label */}
      <div className="sc-mymaps-item-label" onClick={handleLabelClick}>
        {isEditingLabel ? (
          <div className="sc-mymaps-item-label-input-container">
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
              className="sc-mymaps-item-label-input"
              autoFocus
            />
            <div className="sc-mymaps-item-label-pencil-icon">
              <Image src="/images/edit.png" alt="Edit" width={12} height={12} />
            </div>
          </div>
        ) : (
          <div className="sc-mymaps-item-label-text-container">
            <span className="sc-mymaps-item-label-text" title={item.label}>
              {item.label}
            </span>
            <div className="sc-mymaps-item-label-pencil-icon">
              <Image src="/images/edit.png" alt="Edit" width={12} height={12} />
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="sc-mymaps-item-actions">
        {/* Delete button */}
        <button className="sc-mymaps-item-action-btn" onClick={handleDeleteClick} title="Delete item" type="button">
          <Image src="/images/myMaps/eraser.png" alt="Delete" width={16} height={16} />
        </button>

        {/* Toolbox button */}
        <button className="sc-mymaps-item-action-btn" onClick={handleOptionsClick} title="Drawing options" type="button">
          <Image src="/images/toolbox.png" alt="Toolbox" width={16} height={16} />
        </button>
      </div>

      {/* Label visibility indicator */}
      {item.labelVisible && (
        <div className="sc-mymaps-item-label-indicator" title="Label is visible">
          <Image src="/images/toc/label.png" alt="Label visible" width={12} height={12} />
        </div>
      )}
    </div>
  );
};

export default MyMapsItem;
