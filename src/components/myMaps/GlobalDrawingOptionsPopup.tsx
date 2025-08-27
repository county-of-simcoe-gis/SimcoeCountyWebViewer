"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useEventStore } from "@/stores/eventStore";
import { useMyMapsStore } from "@/stores/myMapsStore";
import DrawingOptionsPopup from "./DrawingOptionsPopup";
import MyMapsItemPopup from "./MyMapsItemPopup";
import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";

/**
 * GlobalDrawingOptionsPopup - Manages the drawing options popup globally
 * This allows the popup to be triggered even when the MyMaps panel is closed
 */
export default function GlobalDrawingOptionsPopup() {
  // Drawing Options Popup state - store item ID instead of full item to avoid stale data
  const [drawingOptionsItemId, setDrawingOptionsItemId] = useState<string | null>(null);
  const [drawingOptionsPosition, setDrawingOptionsPosition] = useState({ x: 0, y: 0 });
  const [isDrawingOptionsOpen, setIsDrawingOptionsOpen] = useState(false);

  // Tools Popup state
  const [toolsPopupItem, setToolsPopupItem] = useState<MyMapsItemType | null>(null);
  const [toolsPopupPosition, setToolsPopupPosition] = useState({ x: 0, y: 0 });
  const [isToolsPopupOpen, setIsToolsPopupOpen] = useState(false);

  const { emit, addListener, removeListener } = useEventStore();
  const { items, removeItem, updateItemLabel, updateItemLabelVisibility, updateItemLabelRotation } = useMyMapsStore();

  // Get fresh item data from store (reactive subscription)
  const drawingOptionsItem = drawingOptionsItemId ? items.find((item) => item.id === drawingOptionsItemId) || null : null;

  // Listen for changes in the myMapsStore and update the item state
  useEffect(() => {
    const unsubscribe = useMyMapsStore.subscribe((state) => {
      if (drawingOptionsItemId) {
        const currentItems = state.items;
        const updatedItem = currentItems.find((i) => i.id === drawingOptionsItemId);
        if (updatedItem && JSON.stringify(updatedItem) !== JSON.stringify(drawingOptionsItem)) {
          console.log("🔄 GlobalDrawingOptionsPopup: Detected item change in store, updating local state.", {
            newItem: updatedItem,
          });
          setDrawingOptionsItemId(updatedItem.id);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [drawingOptionsItemId, drawingOptionsItem]);

  const handleCloseDrawingOptions = React.useCallback(() => {
    setIsDrawingOptionsOpen(false);
    setDrawingOptionsItemId(null);
  }, []);

  // Close popup if item no longer exists in store (e.g., was deleted)
  useEffect(() => {
    if (isDrawingOptionsOpen && drawingOptionsItemId && !drawingOptionsItem) {
      handleCloseDrawingOptions();
    }
  }, [drawingOptionsItemId, drawingOptionsItem, isDrawingOptionsOpen, handleCloseDrawingOptions]);

  const handleDrawingOptionsTools = React.useCallback((item: MyMapsItemType, event?: React.MouseEvent) => {
    // Show the tools popup instead of just emitting an event
    setToolsPopupItem(item);

    let x = 200;
    let y = 200;

    if (event) {
      x = event.clientX;
      y = event.clientY;
    }

    // Adjust position to keep popup within viewport (same logic as MyMaps.tsx)
    const popupWidth = 200;
    const popupHeight = 300;

    if (x + popupWidth > window.innerWidth) {
      x = window.innerWidth - popupWidth - 10;
    }

    if (y + popupHeight > window.innerHeight) {
      y = window.innerHeight - popupHeight - 10;
    }

    if (x < 10) x = 10;
    if (y < 10) y = 10;

    setToolsPopupPosition({ x, y });
    setIsToolsPopupOpen(true);
  }, []);

  const handleDrawingOptionsDelete = React.useCallback(
    (item: MyMapsItemType) => {
      removeItem(item.id);
      handleCloseDrawingOptions();
      emit("mymap-item-deleted", { id: item.id });
    },
    [removeItem, handleCloseDrawingOptions, emit]
  );

  const handleDrawingOptionsLabelChange = React.useCallback(
    (id: string, label: string) => {
      updateItemLabel(id, label);
      emit("mymap-label-change", { id, label });
    },
    [updateItemLabel, emit]
  );

  const handleDrawingOptionsLabelVisibilityChange = React.useCallback(
    (id: string, visible: boolean) => {
      // Update store immediately for React state sync (same pattern as handleDrawingOptionsLabelChange)
      updateItemLabelVisibility(id, visible);

      // Then emit event for map rendering
      emit("mymap-label-visibility-change", { id, visible });
    },
    [updateItemLabelVisibility, emit]
  );

  const handleDrawingOptionsLabelRotationChange = React.useCallback(
    (id: string, rotation: number) => {
      // Update store immediately for React state sync
      updateItemLabelRotation(id, rotation);

      // Then emit event for map rendering
      emit("mymap-label-rotation-change", { id, rotation });
    },
    [updateItemLabelRotation, emit]
  );

  // Tools popup action handlers (same as in MyMaps.tsx)
  const handleToolsPopupClose = useCallback(() => {
    setIsToolsPopupOpen(false);
    setToolsPopupItem(null);
  }, []);

  const handleBuffer = useCallback(
    (item: MyMapsItemType) => {
      console.log("Buffer feature:", item.id);
      emit("mymap-buffer", { item });
      handleToolsPopupClose();
    },
    [emit, handleToolsPopupClose]
  );

  const handleSymbolize = useCallback(
    (item: MyMapsItemType) => {
      console.log("Symbolize feature:", item.id);
      emit("mymap-symbolize", { item });
      handleToolsPopupClose();
    },
    [emit, handleToolsPopupClose]
  );

  const handleZoomTo = useCallback(
    (item: MyMapsItemType) => {
      console.log("Zoom to item:", item.id);
      emit("mymap-zoom-to", { item });
      handleToolsPopupClose();
    },
    [emit, handleToolsPopupClose]
  );

  const handleDeleteFromToolsPopup = useCallback(
    (item: MyMapsItemType) => {
      removeItem(item.id);
      emit("mymap-item-deleted", { id: item.id });
      handleToolsPopupClose();
    },
    [removeItem, emit, handleToolsPopupClose]
  );

  const handleShowGeometry = useCallback(
    (item: MyMapsItemType) => {
      console.log("Show geometry for item:", item.id);
      emit("mymap-show-geometry", { item });
      handleToolsPopupClose();
    },
    [emit, handleToolsPopupClose]
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
                label: item.label || "Unnamed Feature",
                geometryType: item.geometryType,
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
                label: item.label || "Unnamed Feature",
                geometryType: item.geometryType,
              },
              geometry: item.featureGeoJSON ? JSON.parse(item.featureGeoJSON).geometry : null,
            };
            exportData = JSON.stringify(geoJsonData, null, 2);
            mimeType = "application/json";
            fileExtension = "geojson";
            break;
        }

        const dataBlob = new Blob([exportData], { type: mimeType });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${item.label || "feature"}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`Feature exported successfully as ${format.toUpperCase()}`);
      } catch (error) {
        console.error("Export failed:", error);
      }
      handleToolsPopupClose();
    },
    [handleToolsPopupClose]
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
      emit("mymap-identify", { item });
      handleToolsPopupClose();
    },
    [emit, handleToolsPopupClose]
  );

  const handleReportProblem = useCallback(
    (item: MyMapsItemType) => {
      console.log("Report problem for feature:", item.id);
      emit("mymap-report-problem", { item });
      handleToolsPopupClose();
    },
    [emit, handleToolsPopupClose]
  );

  // Listen for requests to show the drawing options popup
  useEffect(() => {
    const handleShowDrawingOptions = (data?: { [key: string]: unknown }) => {
      if (data && data.item && data.coordinate) {
        const item = data.item as MyMapsItemType;
        const coordinate = data.coordinate as number[];

        setDrawingOptionsItemId(item.id);
        setDrawingOptionsPosition({ x: coordinate[0], y: coordinate[1] });
        setIsDrawingOptionsOpen(true);
      } else {
        console.warn("❌ Invalid data received for drawing options:", {
          hasData: !!data,
          hasItem: data?.item,
          hasCoordinate: data?.coordinate,
          data,
        });
      }
    };

    const listenerId = addListener("mymap-show-drawing-options", handleShowDrawingOptions);

    return () => {
      removeListener(listenerId);
    };
  }, [addListener, removeListener]);

  return (
    <>
      <DrawingOptionsPopup
        item={drawingOptionsItem}
        coordinate={drawingOptionsPosition ? [drawingOptionsPosition.x, drawingOptionsPosition.y] : null}
        isOpen={isDrawingOptionsOpen}
        onClose={handleCloseDrawingOptions}
        onTools={handleDrawingOptionsTools}
        onDelete={handleDrawingOptionsDelete}
        onLabelChange={handleDrawingOptionsLabelChange}
        onLabelVisibilityChange={handleDrawingOptionsLabelVisibilityChange}
        onLabelRotationChange={handleDrawingOptionsLabelRotationChange}
      />

      {/* Tools Popup */}
      <MyMapsItemPopup
        item={toolsPopupItem}
        position={toolsPopupPosition}
        isOpen={isToolsPopupOpen}
        onClose={handleToolsPopupClose}
        onBuffer={handleBuffer}
        onSymbolize={handleSymbolize}
        onZoomTo={handleZoomTo}
        onDelete={handleDeleteFromToolsPopup}
        onShowGeometry={handleShowGeometry}
        onExport={handleExportFeature}
        onIdentify={handleIdentify}
        onReportProblem={handleReportProblem}
      />
    </>
  );
}
