"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import "./MapContextMenu.css";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string | React.ReactNode; // Support both image paths and React icons
  visible?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  separator?: boolean;
}

interface MapContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  showHeader?: boolean;
  title?: string;
}

export const MapContextMenu: React.FC<MapContextMenuProps> = ({ x, y, items, onClose, showHeader = false, title = "Map Menu" }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // Adjust X position if menu goes off right edge
      if (x + menuRect.width > viewportWidth) {
        adjustedX = Math.max(0, viewportWidth - menuRect.width - 10);
      }

      // Adjust Y position if menu goes off bottom edge
      if (y + menuRect.height > viewportHeight) {
        adjustedY = Math.max(0, viewportHeight - menuRect.height - 10);
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Add listeners after a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (!item.disabled && item.onClick) {
        item.onClick();
        onClose();
      }
    },
    [onClose]
  );

  const visibleItems = items.filter((item) => item.visible !== false);

  if (visibleItems.length === 0) {
    return null;
  }

  const menuContent = (
    <div ref={menuRef} className="map-context-menu-container" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
      {showHeader && (
        <div className="map-context-menu-header">
          <div className="title">{title}</div>
          <div className="close" onClick={onClose}>
            ×
          </div>
        </div>
      )}
      <ul className="map-context-menu-list">
        {visibleItems.map((item) => {
          if (item.separator) {
            return <li key={item.id} className="map-context-menu-separator" />;
          }

          return (
            <li
              key={item.id}
              className={`map-context-menu-item ${item.disabled ? "disabled" : ""}`}
              onClick={() => handleItemClick(item)}
              title={item.disabled ? "This option is not available" : undefined}
            >
              {item.icon && <div className="map-context-menu-item-icon">{typeof item.icon === "string" ? <img src={item.icon} alt="" /> : item.icon}</div>}
              <div className="map-context-menu-item-label">{item.label}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );

  // Render to portal at document body
  return typeof document !== "undefined" ? createPortal(menuContent, document.body) : null;
};
