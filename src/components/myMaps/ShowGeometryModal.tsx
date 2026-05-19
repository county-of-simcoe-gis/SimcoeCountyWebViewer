"use client";

import React from "react";
import { MyMapsItem } from "@/types/myMaps";
import { Modal } from "@/components/ui/Modal";

interface ShowGeometryModalProps {
  item: MyMapsItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const ShowGeometryModal: React.FC<ShowGeometryModalProps> = ({ item, isOpen, onClose }) => {
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

  if (!item) return null;

  const geometryContent = getCleanedGeometry(item);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] max-h-[80vh] p-0 flex flex-col overflow-hidden animate-popupFadeIn">
      <div className="flex justify-between items-center py-4 px-5 border-b border-base-300 bg-base-200">
        <h3 className="m-0 text-lg font-semibold text-base-content">Geometry (JSON)</h3>
        <button
          className="bg-transparent border-none text-2xl cursor-pointer text-base-content/60 p-0 w-8 h-8 flex items-center justify-center rounded transition-all hover:bg-base-300 hover:text-base-content"
          onClick={onClose}
          title="Close"
          type="button"
        >
          &times;
        </button>
      </div>
      <div className="p-5 flex-1 overflow-y-auto">
        <div className="mb-4 text-base-content/70 text-sm leading-relaxed">Below is a JSON representation of the geometry selected.</div>
        <textarea
          className="w-full min-h-[200px] p-3 border border-base-300 rounded font-mono text-xs leading-[1.4] resize-y bg-base-200 text-base-content overflow-auto whitespace-pre focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(0,123,255,0.25)]"
          value={geometryContent}
          readOnly
          rows={12}
          cols={50}
        />
      </div>
      <div className="py-4 px-5 border-t border-base-300 bg-base-200 flex justify-end">
        <button
          className="py-2 px-4 border-none rounded cursor-pointer text-sm font-medium transition-all min-w-[80px] bg-primary text-primary-content hover:bg-primary/80 focus:outline-none focus:shadow-[0_0_0_2px_rgba(0,123,255,0.5)]"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default ShowGeometryModal;
