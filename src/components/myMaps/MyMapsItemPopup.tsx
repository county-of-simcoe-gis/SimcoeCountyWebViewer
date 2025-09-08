"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MyMapsItem } from "@/types/myMaps";
import "./MyMapsItemPopup.css";

export interface MyMapsItemPopupProps {
  item: MyMapsItem | null;
  position: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
  onBuffer?: (item: MyMapsItem) => void;
  onSymbolize?: (item: MyMapsItem) => void;
  onMeasure?: (item: MyMapsItem) => void;
  onZoomTo?: (item: MyMapsItem) => void;
  onDelete?: (item: MyMapsItem) => void;
  onShowGeometry?: (item: MyMapsItem) => void;
  onExport?: (item: MyMapsItem, format: "geojson" | "kml" | "esrijson") => void;
  onIdentify?: (item: MyMapsItem) => void;
  onReportProblem?: (item: MyMapsItem) => void;
}

const MyMapsItemPopup: React.FC<MyMapsItemPopupProps> = ({
  item,
  position,
  isOpen,
  onClose,
  onBuffer,
  onSymbolize,
  onMeasure,
  onZoomTo,
  onDelete,
  onShowGeometry,
  onExport,
  onIdentify,
  onReportProblem,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) {
    return null;
  }

  const handleMenuItemClick = (action: () => void, closeAfter = true) => {
    action();
    if (closeAfter) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="sc-mymaps-popup-backdrop" />

      {/* Popup Menu */}
      <div
        ref={popupRef}
        className="sc-mymaps-item-popup"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div className="sc-mymaps-popup-menu">
          {/* Buffer */}
          {onBuffer && (
            <div className="sc-mymaps-popup-item" onClick={() => handleMenuItemClick(() => onBuffer(item))} title="Create buffer around feature">
              <Image src="/images/buffer.png" alt="Buffer" width={16} height={16} />
              <span>Buffer</span>
            </div>
          )}

          {/* Symbolize */}
          {onSymbolize && (
            <div className="sc-mymaps-popup-item" onClick={() => handleMenuItemClick(() => onSymbolize(item))} title="Change feature symbolization">
              <Image src="/images/symbolize.png" alt="Symbolize" width={16} height={16} />
              <span>Symbolize</span>
            </div>
          )}

          {/* Measure */}
          {onMeasure && (item.geometryType === "LineString" || item.geometryType === "MultiLineString" || item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") && (
            <div className="sc-mymaps-popup-item" onClick={() => handleMenuItemClick(() => onMeasure(item))} title="Measure feature dimensions">
              <Image src="/images/measure.png" alt="Measure" width={16} height={16} />
              <span>Measure</span>
            </div>
          )}

          {/* Zoom To */}
          {onZoomTo && (
            <div className="sc-mymaps-popup-item" onClick={() => handleMenuItemClick(() => onZoomTo(item))} title="Zoom map to this feature">
              <Image src="/images/zoom.png" alt="Zoom To" width={16} height={16} />
              <span>Zoom To</span>
            </div>
          )}

          {/* Delete */}
          {onDelete && (
            <div className="sc-mymaps-popup-item danger" onClick={() => handleMenuItemClick(() => onDelete(item))} title="Delete this feature">
              <Image src="/images/eraser.png" alt="Delete" width={16} height={16} />
              <span>Delete</span>
            </div>
          )}

          {/* Show Geometry */}
          {onShowGeometry && (
            <div className="sc-mymaps-popup-item" onClick={() => handleMenuItemClick(() => onShowGeometry(item))} title="Show geometry details">
              <Image src="/images/edit-vertices.png" alt="Show Geometry" width={16} height={16} />
              <span>Show Geometry</span>
            </div>
          )}

          <div className="sc-mymaps-popup-separator" />

          {/* Export to */}
          {onExport && (
            <div
              className="sc-mymaps-popup-item sc-mymaps-popup-submenu-parent"
              onMouseEnter={() => setShowExportSubmenu(true)}
              onMouseLeave={() => setShowExportSubmenu(false)}
              title="Export this feature"
            >
              <Image src="/images/toc/download.png" alt="Export" width={16} height={16} />
              <span>Export to ...</span>
              <span className="sc-mymaps-popup-arrow">▶</span>

              {/* Export Submenu */}
              {showExportSubmenu && (
                <div className="sc-mymaps-popup-submenu">
                  <div className="sc-mymaps-popup-item sc-mymaps-popup-submenu-item" onClick={() => handleMenuItemClick(() => onExport(item, "geojson"))} title="Export as GeoJSON">
                    <span>GeoJSON</span>
                  </div>
                  <div className="sc-mymaps-popup-item sc-mymaps-popup-submenu-item" onClick={() => handleMenuItemClick(() => onExport(item, "kml"))} title="Export as KML">
                    <span>KML</span>
                  </div>
                  <div className="sc-mymaps-popup-item sc-mymaps-popup-submenu-item" onClick={() => handleMenuItemClick(() => onExport(item, "esrijson"))} title="Export as EsriJSON">
                    <span>EsriJSON</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Identify */}
          {onIdentify && (
            <div className="sc-mymaps-popup-item" onClick={() => handleMenuItemClick(() => onIdentify(item))} title="Identify feature properties">
              <Image src="/images/identify.png" alt="Identify" width={16} height={16} />
              <span>Identify</span>
            </div>
          )}

          {/* Report a Problem */}
          {onReportProblem && (
            <div className="sc-mymaps-popup-item" onClick={() => handleMenuItemClick(() => onReportProblem(item))} title="Report a problem with this feature">
              <Image src="/images/error.png" alt="Report Problem" width={16} height={16} />
              <span>Report a Problem</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MyMapsItemPopup;
