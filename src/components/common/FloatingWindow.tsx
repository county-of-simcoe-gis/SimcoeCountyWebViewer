"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaExpand, FaCompress } from "react-icons/fa";

/**
 * Track the map element's bounding rect so the window sits over
 * the map area without covering the sidebar.
 */
function useMapRect(isOpen: boolean) {
  const [rect, setRect] = useState({ left: 0, top: 62, width: typeof window !== "undefined" ? window.innerWidth : 0, bottom: 0 });

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    const update = () => {
      const r = mapEl.getBoundingClientRect();
      setRect({
        left: Math.round(r.left),
        top: Math.round(r.top),
        width: Math.round(r.width),
        bottom: Math.round(window.innerHeight - r.bottom),
      });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(mapEl);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  return rect;
}

interface FloatingWindowProps {
  /** Whether the window is visible */
  isOpen: boolean;
  /** Title shown in the header bar */
  title: string;
  /** Called when the user closes the window */
  onClose: () => void;
  /** Content to render inside the window */
  children: React.ReactNode;
  /** Optional extra buttons to render in the header (before maximize/close) */
  headerButtons?: React.ReactNode;
}

/**
 * Shared floating window component positioned over the map area.
 * Features a gradient header bar with maximize/restore and close controls.
 * Supports ESC to close.
 */
export default function FloatingWindow({ isOpen, title, onClose, children, headerButtons }: FloatingWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const mapRect = useMapRect(isOpen);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Reset maximized state when window closes
  useEffect(() => {
    if (!isOpen) {
      setIsMaximized(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed z-[200000] bg-base-100 flex flex-col shadow-[0_0_12px_2px_rgba(0,0,0,0.25)] transition-all duration-300 ease-in-out print:static print:shadow-none print:rounded-none print:block print:inset-0 ${
        isMaximized ? "!top-0 !left-0 !right-0 !bottom-0 rounded-none" : "rounded-t-[5px]"
      }`}
      style={
        isMaximized
          ? undefined
          : {
              top: `${mapRect.top}px`,
              left: `${mapRect.left + 10}px`,
              width: `${mapRect.width - 20}px`,
              bottom: `${mapRect.bottom + 10}px`,
            }
      }
    >
      {/* Header bar */}
      <div className={`h-11 min-h-[44px] bg-[image:var(--sc-gradient-header)] flex items-center px-2 text-white select-none print:hidden ${isMaximized ? "" : "rounded-t-[5px]"}`}>
        <span className="flex-1 text-sm font-medium">{title}</span>

        {headerButtons}

        {/* Maximize / Restore button */}
        <button
          onClick={() => setIsMaximized((prev) => !prev)}
          title={isMaximized ? "Restore" : "Maximize"}
          className="w-8 h-[30px] mr-2 border border-[#3672b1] rounded-[3px] bg-white/15 text-white cursor-pointer flex items-center justify-center text-base"
        >
          {isMaximized ? <FaCompress /> : <FaExpand />}
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          title="Close (ESC)"
          className="w-8 h-[30px] border border-[#3672b1] rounded-[3px] bg-white/15 text-white cursor-pointer flex items-center justify-center text-base font-bold"
        >
          <FaTimes />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto print:overflow-visible">{children}</div>
    </div>,
    document.body,
  );
}
