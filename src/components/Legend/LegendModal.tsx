"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { useLegendStore } from "@/stores/legendStore";
import Legend from "@/components/Legend/Legend";

/**
 * LegendModal Component
 * Modal overlay that displays layer legends over the map
 */
export default function LegendModal() {
  const isOpen = useLegendStore((s) => s.isOpen);
  const closeLegend = useLegendStore((s) => s.closeLegend);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useLegendStore.getState().closeLegend();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Close if clicking the overlay (not the content)
    if (e.target === e.currentTarget) {
      closeLegend();
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-5 animate-fadeIn print:bg-white print:static print:p-0 print:block" onClick={handleOverlayClick}>
      <div className="bg-white rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.3)] max-w-[1400px] w-full max-h-[90vh] overflow-y-auto relative animate-slideUp print:max-w-full print:w-full print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:block print:static">
        <button
          className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-800 text-white border-none w-8 h-8 rounded-full flex items-center justify-center text-base cursor-pointer transition-all duration-200 z-20 p-0 hover:scale-110 active:scale-95 shadow-lg print:hidden"
          onClick={closeLegend}
          aria-label="Close legend"
          title="Close (ESC)"
        >
          <FaTimes />
        </button>
        <Legend />
      </div>
    </div>,
    document.body,
  );
}
