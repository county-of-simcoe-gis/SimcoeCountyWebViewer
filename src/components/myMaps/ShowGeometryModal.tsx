"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MyMapsItem } from "@/types/myMaps";
import "./ShowGeometryModal.css";

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
    <div className="sc-geometry-modal-overlay">
      <div className="sc-geometry-modal" ref={modalRef}>
        <div className="sc-geometry-modal-header">
          <h3 className="sc-geometry-modal-title">Geometry (JSON)</h3>
          <button className="sc-geometry-modal-close-btn" onClick={onClose} title="Close" type="button">
            ×
          </button>
        </div>
        <div className="sc-geometry-modal-body">
          <div className="sc-geometry-modal-description">Below is a JSON representation of the geometry selected.</div>
          <textarea className="sc-geometry-modal-textarea" value={geometryContent} readOnly rows={12} cols={50} />
        </div>
        <div className="sc-geometry-modal-footer">
          <button className="sc-geometry-modal-btn sc-geometry-modal-btn-primary" onClick={onClose} type="button">
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
