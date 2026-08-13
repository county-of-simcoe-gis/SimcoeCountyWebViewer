"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";

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
    [onClose],
  );

  const visibleItems = items.filter((item) => item.visible !== false);

  if (visibleItems.length === 0) {
    return null;
  }

  const menuContent = (
    <div
      ref={menuRef}
      data-testid="map-context-menu-container"
      className="fixed z-[10000] bg-base-100 border border-base-300 rounded shadow-[0_2px_8px_rgba(0,0,0,0.15)] min-w-[180px] overflow-hidden"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {showHeader && (
        <div className="w-full h-[18px] py-[5px] px-2 text-neutral bg-base-300 border-b border-neutral flex items-center justify-between">
          <div className="font-bold text-center text-neutral text-ellipsis whitespace-nowrap overflow-hidden flex-1 text-[11px]">{title}</div>
          <div
            className="w-4 h-4 font-bold text-center p-0.5 text-white bg-secondary rounded-[3px] cursor-pointer text-[10px] leading-3 shrink-0 ml-2 hover:bg-[#5a92b8] flex items-center justify-center"
            onClick={onClose}
            title="Close"
          >
            <FaTimes />
          </div>
        </div>
      )}
      <ul className="list-none m-0 p-0">
        {visibleItems.map((item) => {
          if (item.separator) {
            return <li key={item.id} data-testid="map-context-menu-separator" className="h-px bg-[#e0e0e0] my-1" />;
          }

          return (
            <li
              key={item.id}
              className={`py-2 px-3 cursor-pointer flex items-center gap-2 text-[10pt] border-b border-base-200 select-none last:border-b-0 hover:bg-base-200 ${item.disabled ? "opacity-50 cursor-not-allowed hover:bg-transparent" : ""}`}
              data-testid={`map-context-menu-item${item.disabled ? " disabled" : ""}`}
              onClick={() => handleItemClick(item)}
              title={item.disabled ? "This option is not available" : undefined}
            >
              {item.icon && (
                <div className="w-4 h-4 shrink-0 flex items-center justify-center text-base text-neutral [&_img]:max-w-full [&_img]:max-h-full [&_img]:align-middle [&_svg]:w-4 [&_svg]:h-4">
                  {typeof item.icon === "string" ? <img src={item.icon} alt="" /> : item.icon}
                </div>
              )}
              <div className="flex-1 whitespace-nowrap">{item.label}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );

  // Render to portal at document body
  return typeof document !== "undefined" ? createPortal(menuContent, document.body) : null;
};
