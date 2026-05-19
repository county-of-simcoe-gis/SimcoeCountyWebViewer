"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import { MyMapsItem } from "@/types/myMaps";
import { useMyMapsExtensionStore, type MyMapsExtensionItem } from "@/stores/myMapsExtensionStore";
import { useAppStore } from "@/stores/appStore";
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
  const [openExtSubmenu, setOpenExtSubmenu] = useState<string | null>(null);
  const extensionItemsMap = useMyMapsExtensionStore((s) => s.items);
  const drawingVis = useAppStore((s) => s.config?.drawingOptionsToolsMenuVisibility);

  // Helper: returns false only when config explicitly sets a key to false
  const isMenuItemVisible = (key: string): boolean => {
    if (!drawingVis) return true;
    return drawingVis[key] !== false;
  };

  // Derive visible items and group them — both computed from the stable `items` Map reference
  const extensionGroups = useMemo(() => {
    const visible = Array.from(extensionItemsMap.values())
      .filter((item) => !item.isVisible || item.isVisible())
      .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
    const groups = new Map<string, MyMapsExtensionItem[]>();
    visible.forEach((ext) => {
      const group = ext.group ?? "";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(ext);
    });
    return groups;
  }, [extensionItemsMap]);

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
      setShowExportSubmenu(false);
      setOpenExtSubmenu(null);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[99998]" />

      {/* Popup Menu */}
      <div
        ref={popupRef}
        className="popup-container animate-mymapsPopupFadeIn md:max-md:min-w-[160px] md:max-md:text-sm"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div className="py-1">
          {/* Buffer */}
          {onBuffer && isMenuItemVisible("sc-floating-menu-buffer") && (
            <div className="popup-menu-item" onClick={() => handleMenuItemClick(() => onBuffer(item))} title="Create buffer around feature">
              <Image src="/images/buffer.png" alt="Buffer" width={16} height={16} />
              <span>Buffer</span>
            </div>
          )}

          {/* Symbolize */}
          {onSymbolize && isMenuItemVisible("sc-floating-menu-symbolizer") && (
            <div className="popup-menu-item" onClick={() => handleMenuItemClick(() => onSymbolize(item))} title="Change feature symbolization">
              <Image src="/images/symbolize.png" alt="Symbolize" width={16} height={16} />
              <span>Symbolize</span>
            </div>
          )}

          {/* Measure */}
          {onMeasure &&
            isMenuItemVisible("sc-floating-menu-measure") &&
            (item.geometryType === "LineString" || item.geometryType === "MultiLineString" || item.geometryType === "Polygon" || item.geometryType === "MultiPolygon") && (
              <div className="popup-menu-item" onClick={() => handleMenuItemClick(() => onMeasure(item))} title="Measure feature dimensions">
                <Image src="/images/measure.png" alt="Measure" width={16} height={16} />
                <span>Measure</span>
              </div>
            )}

          {/* Zoom To */}
          {onZoomTo && isMenuItemVisible("sc-floating-menu-zoomto") && (
            <div className="popup-menu-item" onClick={() => handleMenuItemClick(() => onZoomTo(item))} title="Zoom map to this feature">
              <Image src="/images/zoom.png" alt="Zoom To" width={16} height={16} />
              <span>Zoom To</span>
            </div>
          )}

          {/* Delete */}
          {onDelete && isMenuItemVisible("sc-floating-menu-delete") && (
            <div className="popup-menu-item-danger" onClick={() => handleMenuItemClick(() => onDelete(item))} title="Delete this feature">
              <Image src="/images/eraser.png" alt="Delete" width={16} height={16} />
              <span>Delete</span>
            </div>
          )}

          {/* Show Geometry */}
          {onShowGeometry && isMenuItemVisible("sc-floating-menu-geometry") && (
            <div className="popup-menu-item" onClick={() => handleMenuItemClick(() => onShowGeometry(item))} title="Show geometry details">
              <Image src="/images/edit-vertices.png" alt="Show Geometry" width={16} height={16} />
              <span>Show Geometry</span>
            </div>
          )}

          <div className="h-px bg-base-300 my-1" />

          {/* Export to */}
          {onExport && isMenuItemVisible("sc-floating-menu-export") && (
            <div className="popup-menu-item-parent" onMouseEnter={() => setShowExportSubmenu(true)} onMouseLeave={() => setShowExportSubmenu(false)} title="Export this feature">
              <Image src="/images/toc/download.png" alt="Export" width={16} height={16} />
              <span>Export to ...</span>
              <span className="text-[10px] text-base-content/70 ml-auto pl-2">▶</span>

              {/* Export Submenu */}
              {showExportSubmenu && (
                <div className="popup-submenu-container animate-submenuFadeIn">
                  {isMenuItemVisible("sc-floating-menu-export-to-geojson") && (
                    <div className="popup-submenu-item" onClick={() => handleMenuItemClick(() => onExport(item, "geojson"))} title="Export as GeoJSON">
                      <span>GeoJSON</span>
                    </div>
                  )}
                  {isMenuItemVisible("sc-floating-menu-export-to-kml") && (
                    <div className="popup-submenu-item" onClick={() => handleMenuItemClick(() => onExport(item, "kml"))} title="Export as KML">
                      <span>KML</span>
                    </div>
                  )}
                  {isMenuItemVisible("sc-floating-menu-export-to-esrijson") && (
                    <div className="popup-submenu-item" onClick={() => handleMenuItemClick(() => onExport(item, "esrijson"))} title="Export as EsriJSON">
                      <span>EsriJSON</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Identify */}
          {onIdentify && isMenuItemVisible("sc-floating-menu-identify") && (
            <div className="popup-menu-item" onClick={() => handleMenuItemClick(() => onIdentify(item))} title="Identify feature properties">
              <Image src="/images/identify.png" alt="Identify" width={16} height={16} />
              <span>Identify</span>
            </div>
          )}

          {/* Extension Items — render each group as a submenu */}
          {extensionGroups.size > 0 && <div className="h-px bg-base-300 my-1" />}
          {Array.from(extensionGroups.entries()).map(([groupName, groupItems]) => {
            // Items without a group name render inline (flat)
            if (!groupName) {
              return groupItems.map((ext) => (
                <div key={ext.id} className="popup-menu-item" onClick={() => handleMenuItemClick(() => ext.onClick(item))} title={ext.label}>
                  {ext.icon && <span className="inline-flex items-center justify-center w-4 h-4 shrink-0 text-base-content/70">{ext.icon}</span>}
                  <span>{ext.label}</span>
                </div>
              ));
            }

            // Named groups render as hoverable submenus (same pattern as "Export to ...")
            return (
              <div key={`ext-group-${groupName}`} className="popup-menu-item-parent" onMouseEnter={() => setOpenExtSubmenu(groupName)} onMouseLeave={() => setOpenExtSubmenu(null)} title={groupName}>
                <span>{groupName}</span>
                <span className="text-[10px] text-base-content/70 ml-auto pl-2">▶</span>

                {openExtSubmenu === groupName && (
                  <div className="popup-submenu-container animate-submenuFadeIn">
                    {groupItems.map((ext) => (
                      <div key={ext.id} className="popup-submenu-item" onClick={() => handleMenuItemClick(() => ext.onClick(item))} title={ext.label}>
                        {ext.icon && <span className="inline-flex items-center justify-center w-4 h-4 shrink-0 text-base-content/70">{ext.icon}</span>}
                        <span>{ext.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Report a Problem */}
          {onReportProblem && isMenuItemVisible("sc-floating-menu-report-problem") && (
            <div className="popup-menu-item" onClick={() => handleMenuItemClick(() => onReportProblem(item))} title="Report a problem with this feature">
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
