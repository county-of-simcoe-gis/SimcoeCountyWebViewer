"use client";

import React, { useCallback, useState } from "react";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { useEventStore } from "@/stores/eventStore";
import ButtonBar from "./ButtonBar";
import ColorBar from "./ColorBar";
import MyMapsItems from "./MyMapsItems";
import MyMapsAdvanced from "./MyMapsAdvanced";
import MyMapsItemPopup from "./MyMapsItemPopup";
import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import "./MyMaps.css";

interface MyMapsProps {
  visible?: boolean;
}

const MyMaps: React.FC<MyMapsProps> = ({ visible = true }) => {
  // Popup state
  const [popupItem, setPopupItem] = useState<MyMapsItemType | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Store hooks
  const { drawType, drawColor, isEditing, items, setDrawType, updateItemLabel, removeItem, setEditMode, toolTipId, toolTipClass, importItems, hasItems } = useMyMapsStore();

  const { emit } = useEventStore();

  // Handle showing item options popup
  const handleShowItemOptions = useCallback((item: MyMapsItemType, event?: React.MouseEvent) => {
    console.log("MyMaps: Show options for item", item.id);

    let x = 0;
    let y = 0;

    if (event) {
      x = event.clientX;
      y = event.clientY;
    } else {
      // Default position if no event (e.g., from map click)
      x = window.innerWidth / 2;
      y = window.innerHeight / 2;
    }

    // Adjust position to keep popup within viewport
    const popupWidth = 200;
    const popupHeight = 250; // Reduced from 300 as it was too large
    const margin = 10; // Minimum distance from viewport edges

    // Horizontal adjustment - prefer showing to the left if not enough space on the right
    if (x + popupWidth + margin > window.innerWidth) {
      x = Math.max(margin, x - popupWidth);
    }

    // Vertical adjustment - prefer showing above if not enough space below
    if (y + popupHeight + margin > window.innerHeight) {
      y = Math.max(margin, y - popupHeight);
    }

    // Ensure minimum margins from viewport edges
    x = Math.max(margin, Math.min(x, window.innerWidth - popupWidth - margin));
    y = Math.max(margin, Math.min(y, window.innerHeight - popupHeight - margin));

    setPopupItem(item);
    setPopupPosition({ x, y });
    setIsPopupOpen(true);
  }, []);

  // Popup action handlers
  const handleClosePopup = useCallback(() => {
    setIsPopupOpen(false);
    setPopupItem(null);
  }, []);

  const handleBuffer = useCallback(
    (item: MyMapsItemType) => {
      console.log("Buffer feature:", item.id);
      emit("mymap-buffer", { item });
    },
    [emit]
  );

  const handleSymbolize = useCallback(
    (item: MyMapsItemType) => {
      console.log("Symbolize feature:", item.id);
      emit("mymap-symbolize", { item });
    },
    [emit]
  );

  const handleZoomTo = useCallback(
    (item: MyMapsItemType) => {
      console.log("Zoom to item:", item.id);
      // Emit event for the service to handle the zoom operation
      emit("mymap-zoom-to", { item });
    },
    [emit]
  );

  const handleDeleteFromPopup = useCallback(
    (item: MyMapsItemType) => {
      console.log("Delete item from popup:", item.id);
      removeItem(item.id);
      handleClosePopup();
      emit("mymap-item-deleted", { id: item.id });
    },
    [removeItem, handleClosePopup, emit]
  );

  const handleShowGeometry = useCallback(
    (item: MyMapsItemType) => {
      console.log("Show geometry for item:", item.id);
      // TODO: Open geometry details dialog
      emit("mymap-show-geometry", { item });
    },
    [emit]
  );

  const handleExportFeature = useCallback(
    (item: MyMapsItemType, format: "geojson" | "kml" | "esrijson" = "geojson") => {
      console.log("Export feature:", item.id, "as", format);
      try {
        let exportData: string;
        let mimeType: string;
        let fileExtension: string;

        switch (format) {
          case "kml":
            // For KML, we need to create proper KML structure
            const kmlData = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name><![CDATA[${item.label || "Unnamed Feature"}]]></name>
      <description><![CDATA[Exported from SimcoeCounty WebViewer]]></description>
      ${item.featureGeoJSON ? convertGeoJSONToKMLGeometry(JSON.parse(item.featureGeoJSON).geometry) : ""}
    </Placemark>
  </Document>
</kml>`;
            exportData = kmlData;
            mimeType = "application/vnd.google-earth.kml+xml";
            fileExtension = "kml";
            break;

          case "esrijson":
            // For EsriJSON, convert from GeoJSON
            const esriData = {
              geometry: item.featureGeoJSON ? JSON.parse(item.featureGeoJSON).geometry : null,
              attributes: {
                id: item.id,
                label: item.label,
                drawType: item.drawType,
                geometryType: item.geometryType,
                visible: item.visible,
                labelVisible: item.labelVisible,
              },
            };
            exportData = JSON.stringify(esriData, null, 2);
            mimeType = "application/json";
            fileExtension = "json";
            break;

          default: // geojson
            const geoJsonData = {
              type: "Feature",
              properties: {
                id: item.id,
                label: item.label,
                drawType: item.drawType,
                geometryType: item.geometryType,
                visible: item.visible,
                labelVisible: item.labelVisible,
              },
              geometry: JSON.parse(item.featureGeoJSON),
            };
            exportData = JSON.stringify(geoJsonData, null, 2);
            mimeType = "application/json";
            fileExtension = "geojson";
            break;
        }

        const blob = new Blob([exportData], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${item.label.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${fileExtension}`;
        link.click();
        URL.revokeObjectURL(url);

        console.log(`Feature exported successfully as ${format.toUpperCase()}`);
      } catch (error) {
        console.error("Error exporting feature:", error);
      }
      emit("mymap-export-feature", { item, format });
    },
    [emit]
  );

  // Helper function to convert GeoJSON geometry to KML geometry
  const convertGeoJSONToKMLGeometry = (geometry: { type: string; coordinates: unknown }): string => {
    if (!geometry) return "";

    switch (geometry.type) {
      case "Point":
        const pointCoords = geometry.coordinates as number[];
        return `<Point><coordinates>${pointCoords.join(",")}</coordinates></Point>`;
      case "LineString":
        const lineCoords = geometry.coordinates as number[][];
        return `<LineString><coordinates>${lineCoords.map((coord: number[]) => coord.join(",")).join(" ")}</coordinates></LineString>`;
      case "Polygon":
        const polyCoords = geometry.coordinates as number[][][];
        const outerRing = polyCoords[0].map((coord: number[]) => coord.join(",")).join(" ");
        return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${outerRing}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
      default:
        return "";
    }
  };

  const handleIdentify = useCallback(
    (item: MyMapsItemType) => {
      console.log("Identify feature:", item.id);
      // TODO: Show feature identification details
      emit("mymap-identify", { item });
    },
    [emit]
  );

  const handleReportProblem = useCallback(
    (item: MyMapsItemType) => {
      console.log("Report problem for feature:", item.id);
      // TODO: Open problem report dialog
      emit("mymap-report-problem", { item });
    },
    [emit]
  );

  // Hover highlighting handlers - emit events for service to handle
  const handleItemHoverStart = useCallback(
    (item: MyMapsItemType) => {
      emit("mymap-item-hover-start", { item });
    },
    [emit]
  );

  const handleItemHoverEnd = useCallback(
    (item: MyMapsItemType) => {
      emit("mymap-item-hover-end", { item });
    },
    [emit]
  );

  // Handle item label changes
  const handleLabelChange = (id: string, label: string) => {
    updateItemLabel(id, label);
    emit("mymap-item-updated", { id, label });
  };

  // Handle item deletion
  const handleItemDelete = (id: string) => {
    removeItem(id);
    emit("mymap-item-deleted", { id });
  };

  // Handle edit mode toggle from Advanced panel
  const handleEditFeatures = (editing: boolean, mode = "vertices") => {
    setEditMode(editing, editing ? (mode as "vertices" | "translate") : null);
    if (editing) {
      setDrawType("Cancel"); // Cancel any active drawing
    }
    emit("mymap-edit-mode-changed", { editing, mode });
  };

  // Handle delete all from Advanced panel
  const handleDeleteAll = () => {
    const { clearAllItems } = useMyMapsStore.getState();
    clearAllItems();
    emit("mymap-all-items-deleted", {});
  };

  // Handle import from Advanced panel
  const handleMyMapsImport = (result: { id: string; json: string }) => {
    const success = importItems(result.json);
    if (success) {
      emit("mymap-items-imported", { count: items.length });
    }
  };

  // Handle Additional Tools menu actions
  const handleAdditionalToolsAction = (action: string) => {
    const { toggleAllVisibility, deleteSelected, showByType, zoomToSelected } = useMyMapsStore.getState();

    switch (action) {
      case "show-all":
        toggleAllVisibility(true);
        break;
      case "hide-all":
        toggleAllVisibility(false);
        break;
      case "delete-selected":
        if (window.confirm("Delete all visible items?")) {
          deleteSelected(true);
        }
        break;
      case "delete-unselected":
        if (window.confirm("Delete all hidden items?")) {
          deleteSelected(false);
        }
        break;
      case "show-points-only":
        showByType("Point");
        break;
      case "show-lines-only":
        showByType("LineString");
        break;
      case "show-polygons-only":
        showByType("Polygon");
        break;
      case "zoom-to-selected":
        zoomToSelected();
        console.log("MyMaps: Zoom to selected items");
        break;
      default:
        console.log("MyMaps: Additional tool action", action);
    }

    emit("mymap-additional-tool-action", { action });
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="sc-mymaps-container">
      {/* Drawing Tools */}
      <ButtonBar isEditing={isEditing} />

      {/* Color Picker */}
      <ColorBar isEditing={isEditing} />

      {/* Items List */}
      <MyMapsItems
        onLabelChange={handleLabelChange}
        onItemDelete={handleItemDelete}
        onShowItemOptions={handleShowItemOptions}
        onHoverStart={handleItemHoverStart}
        onHoverEnd={handleItemHoverEnd}
        isEditing={isEditing}
      />

      {/* Advanced Options Panel */}
      <MyMapsAdvanced
        onEditFeatures={handleEditFeatures}
        onDeleteAllClick={handleDeleteAll}
        onMyMapsImport={handleMyMapsImport}
        onAdditionalToolsAction={handleAdditionalToolsAction}
        hasItems={hasItems()}
      />

      {/* Item Options Popup */}
      <MyMapsItemPopup
        item={popupItem}
        position={popupPosition}
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        onBuffer={handleBuffer}
        onSymbolize={handleSymbolize}
        onZoomTo={handleZoomTo}
        onDelete={handleDeleteFromPopup}
        onShowGeometry={handleShowGeometry}
        onExport={handleExportFeature}
        onIdentify={handleIdentify}
        onReportProblem={handleReportProblem}
      />

      {/* Tooltip for bearing/measure tools */}
      <div id={toolTipId} className={toolTipClass} role="tooltip" />

      {/* Status info */}
      <div className="sc-mymaps-status">
        <div className="sc-mymaps-status-item">
          Active Tool: <strong>{drawType}</strong>
        </div>
        <div className="sc-mymaps-status-item">
          Color: <span className="sc-mymaps-status-color" style={{ backgroundColor: drawColor }} />
        </div>
      </div>
    </div>
  );
};

export default MyMaps;
