"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MyMapsItem } from "@/types/myMaps";

interface ShowGeometryModalProps {
  item: MyMapsItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const ShowGeometryModal: React.FC<ShowGeometryModalProps> = ({ item, isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key and click outside to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Extract and clean geometry data
  const getCleanedGeometry = (item: MyMapsItem): string => {
    if (!item.featureGeoJSON) {
      return "{}";
    }

    try {
      const feature = JSON.parse(item.featureGeoJSON);

      // Create a clean feature with only essential properties
      const cleanFeature = {
        type: "Feature",
        geometry: feature.geometry,
        properties: {},
      };

      // Add essential properties (like the old app logic)
      if (item.label) {
        cleanFeature.properties.name = item.label;
        cleanFeature.properties.label = item.label;
      }

      return JSON.stringify(cleanFeature, null, 2);
    } catch (error) {
      console.error("Error parsing geometry:", error);
      return item.featureGeoJSON || "{}";
    }
  };

  if (!isOpen || !item) {
    return null;
  }

  const geometryContent = getCleanedGeometry(item);

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[10000] p-5">
      <div className="bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.3)] w-full max-w-[500px] max-h-[80vh] flex flex-col relative overflow-hidden animate-popupFadeIn" ref={modalRef}>
        <div className="flex justify-between items-center py-4 px-5 border-b border-[#e0e0e0] bg-[#f8f9fa]">
          <h3 className="m-0 text-lg font-semibold text-[#333]">Geometry (JSON)</h3>
          <button
            className="bg-transparent border-none text-2xl cursor-pointer text-[#666] p-0 w-8 h-8 flex items-center justify-center rounded transition-all hover:bg-[#e9ecef] hover:text-[#333]"
            onClick={onClose}
            title="Close"
            type="button"
          >
            &times;
          </button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="mb-4 text-[#555] text-sm leading-relaxed">Below is a JSON representation of the geometry selected.</div>
          <textarea
            className="w-full min-h-[200px] p-3 border border-[#ddd] rounded font-mono text-xs leading-[1.4] resize-y bg-[#f8f9fa] text-[#333] overflow-auto whitespace-pre focus:outline-none focus:border-[#007bff] focus:shadow-[0_0_0_2px_rgba(0,123,255,0.25)]"
            value={geometryContent}
            readOnly
            rows={12}
            cols={50}
          />
        </div>
        <div className="py-4 px-5 border-t border-[#e0e0e0] bg-[#f8f9fa] flex justify-end">
          <button
            className="py-2 px-4 border-none rounded cursor-pointer text-sm font-medium transition-all min-w-[80px] bg-[#007bff] text-white hover:bg-[#0056b3] focus:outline-none focus:shadow-[0_0_0_2px_rgba(0,123,255,0.5)]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document root (like the old app's showWindow)
  if (typeof window !== "undefined") {
    const portalRoot = document.getElementById("portal-root");
    if (portalRoot) {
      return createPortal(modalContent, portalRoot);
    }
  }

  return modalContent;
};

export default ShowGeometryModal;
