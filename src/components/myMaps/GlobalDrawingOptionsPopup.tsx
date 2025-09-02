"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useEventStore } from "@/stores/eventStore";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { useMapStore } from "@/stores/mapStore";
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
  const [activeTool, setActiveTool] = useState<string | undefined>(undefined);

  // Tools Popup state
  const [toolsPopupItem, setToolsPopupItem] = useState<MyMapsItemType | null>(null);
  const [toolsPopupPosition, setToolsPopupPosition] = useState({ x: 0, y: 0 });
  const [isToolsPopupOpen, setIsToolsPopupOpen] = useState(false);

  const { emit, addListener, removeListener } = useEventStore();
  const { items, removeItem, updateItemLabel, updateItemLabelVisibility, updateItemLabelRotation } = useMyMapsStore();
  const { map } = useMapStore();

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
    console.log("🧹 Closing Drawing Options popup - triggering cleanup");

    // Clean up the buffer preview layer from DrawingOptionsPopup
    if (map) {
      const bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");
      if (bufferLayer) {
        console.log("🧹 Found and clearing drawing-options-buffer-preview layer");
        const source = bufferLayer.getSource();
        if (source && "clear" in source) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (source as any).clear();
          console.log("🧹 Buffer preview layer cleared");
        }
      } else {
        console.log("🧹 No drawing-options-buffer-preview layer found");
      }
    }

    // Also emit cleanup event for buffer component (for MyMapsBuffer layer)
    console.log("🧹 About to emit drawing-options-popup-close event");
    emit("drawing-options-popup-close");
    console.log("🧹 Emitted drawing-options-popup-close event");

    setIsDrawingOptionsOpen(false);
    setDrawingOptionsItemId(null);
    setActiveTool(undefined);
  }, [emit, map]);

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

  // Helper function to calculate polygon centroid
  const calculatePolygonCentroid = (coordinates: number[][]): [number, number] => {
    let x = 0;
    let y = 0;
    const length = coordinates.length;

    for (let i = 0; i < length; i++) {
      x += coordinates[i][0];
      y += coordinates[i][1];
    }

    return [x / length, y / length];
  };

  // Helper function to calculate LineString point at 50% distance
  const calculateLineStringMidpoint = (coordinates: number[][]): [number, number] => {
    if (coordinates.length < 2) return [0, 0];
    if (coordinates.length === 2) {
      // Simple midpoint for 2 points
      return [(coordinates[0][0] + coordinates[1][0]) / 2, (coordinates[0][1] + coordinates[1][1]) / 2];
    }

    // Calculate total line length
    let totalLength = 0;
    const segments: { length: number; start: number[]; end: number[] }[] = [];

    for (let i = 0; i < coordinates.length - 1; i++) {
      const start = coordinates[i];
      const end = coordinates[i + 1];
      const segmentLength = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
      segments.push({ length: segmentLength, start, end });
      totalLength += segmentLength;
    }

    // Find point at 50% of total length
    const targetLength = totalLength / 2;
    let accumulatedLength = 0;

    for (const segment of segments) {
      if (accumulatedLength + segment.length >= targetLength) {
        // Point is in this segment
        const remainingLength = targetLength - accumulatedLength;
        const ratio = remainingLength / segment.length;
        return [segment.start[0] + (segment.end[0] - segment.start[0]) * ratio, segment.start[1] + (segment.end[1] - segment.start[1]) * ratio];
      }
      accumulatedLength += segment.length;
    }

    // Fallback to last point
    return coordinates[coordinates.length - 1] as [number, number];
  };

  // Buffer handler for MyMaps list (should open Drawing Options popup)
  const handleBufferFromMyMapsList = useCallback(
    (item: MyMapsItemType) => {
      console.log("Opening buffer tool for item from MyMaps list:", item.id);

      // For Drawing Options popup, we need map coordinates, not screen coordinates
      // Try to get the feature's map coordinates first, fallback to map center
      let coordinate = [0, 0];

      if (item.featureGeoJSON) {
        try {
          console.log("Raw featureGeoJSON for item:", item.id, ":", item.featureGeoJSON);
          const feature = JSON.parse(item.featureGeoJSON);
          console.log("Parsed feature:", feature);

          // Handle GeoJSON Feature format
          const geometry = feature.type === "Feature" ? feature.geometry : feature;
          console.log("Extracted geometry:", geometry);

          if (geometry && geometry.coordinates) {
            // Calculate center coordinates for each geometry type
            switch (geometry.type) {
              case "Point":
                coordinate = geometry.coordinates;
                console.log("Point coordinates extracted:", coordinate);
                break;
              case "LineString":
                // Find point at 50% distance along the line
                coordinate = calculateLineStringMidpoint(geometry.coordinates);
                console.log("LineString 50% distance point extracted:", coordinate);
                break;
              case "Polygon":
                // Calculate proper centroid of polygon
                coordinate = calculatePolygonCentroid(geometry.coordinates[0]); // Use outer ring
                console.log("Polygon centroid coordinates extracted:", coordinate);
                break;
              default:
                console.log("Unknown geometry type:", geometry.type);
                coordinate = [0, 0];
            }
          } else {
            console.log("No coordinates found in geometry");
            coordinate = [0, 0];
          }
        } catch (error) {
          console.error("Error parsing geometry for buffer positioning:", error);
          coordinate = [0, 0];
        }
      } else {
        console.log("No featureGeoJSON found for item:", item.id);
      }

      // If coordinates are invalid (0,0 or undefined), use map center as fallback
      if (!coordinate || coordinate.length < 2 || (coordinate[0] === 0 && coordinate[1] === 0)) {
        console.log("Invalid/zero coordinates detected, using map center as fallback");

        // Try to get map center with a slight delay to ensure map is ready
        setTimeout(() => {
          if (map) {
            const view = map.getView();
            const center = view.getCenter();
            if (center) {
              coordinate = center;
              console.log("Using delayed map center coordinate:", coordinate);

              // Open drawing options popup with buffer tool active
              setDrawingOptionsItemId(item.id);
              setDrawingOptionsPosition({ x: coordinate[0], y: coordinate[1] });
              setIsDrawingOptionsOpen(true);
              setActiveTool("buffer");
              return;
            }
          }

          // Fallback if map center still not available
          console.log("Using fallback coordinate");
          coordinate = [-8500000, 5600000]; // Approximate Ontario center in Web Mercator

          setDrawingOptionsItemId(item.id);
          setDrawingOptionsPosition({ x: coordinate[0], y: coordinate[1] });
          setIsDrawingOptionsOpen(true);
          setActiveTool("buffer");
        }, 100);

        return; // Exit early, popup will open in setTimeout
      }

      console.log("Using valid feature coordinate:", coordinate);

      // Open drawing options popup with buffer tool active immediately
      setDrawingOptionsItemId(item.id);
      setDrawingOptionsPosition({ x: coordinate[0], y: coordinate[1] });
      setIsDrawingOptionsOpen(true);
      setActiveTool("buffer");
    },
    [map]
  );

  // Symbolize handler for MyMaps list (should open Drawing Options popup)
  const handleSymbolizeFromMyMapsList = useCallback(
    (item: MyMapsItemType) => {
      console.log("Opening symbolize tool for item from MyMaps list:", item.id);

      // For Drawing Options popup, we need map coordinates, not screen coordinates
      // Try to get the feature's map coordinates first, fallback to map center
      let coordinate = [0, 0];

      if (item.featureGeoJSON) {
        try {
          console.log("Raw featureGeoJSON for item:", item.id, ":", item.featureGeoJSON);
          const feature = JSON.parse(item.featureGeoJSON);
          console.log("Parsed feature:", feature);

          // Handle GeoJSON Feature format
          const geometry = feature.type === "Feature" ? feature.geometry : feature;
          console.log("Extracted geometry:", geometry);

          if (geometry && geometry.coordinates) {
            // Calculate center coordinates for each geometry type
            switch (geometry.type) {
              case "Point":
                coordinate = geometry.coordinates;
                console.log("Point coordinates extracted:", coordinate);
                break;
              case "LineString":
                // Find point at 50% distance along the line
                coordinate = calculateLineStringMidpoint(geometry.coordinates);
                console.log("LineString 50% distance point extracted:", coordinate);
                break;
              case "Polygon":
                // Calculate proper centroid of polygon
                coordinate = calculatePolygonCentroid(geometry.coordinates[0]); // Use outer ring
                console.log("Polygon centroid coordinates extracted:", coordinate);
                break;
              default:
                console.log("Unknown geometry type:", geometry.type);
                coordinate = [0, 0];
            }
          } else {
            console.log("No coordinates found in geometry");
            coordinate = [0, 0];
          }
        } catch (error) {
          console.error("Error parsing geometry for symbolize positioning:", error);
          coordinate = [0, 0];
        }
      } else {
        console.log("No featureGeoJSON found for item:", item.id);
      }

      // If coordinates are invalid (0,0 or undefined), use map center as fallback
      if (!coordinate || coordinate.length < 2 || (coordinate[0] === 0 && coordinate[1] === 0)) {
        console.log("Invalid/zero coordinates detected, using map center as fallback");

        // Try to get map center with a slight delay to ensure map is ready
        setTimeout(() => {
          if (map) {
            const view = map.getView();
            const center = view.getCenter();
            if (center) {
              coordinate = center;
              console.log("Using delayed map center coordinate:", coordinate);

              // Open drawing options popup with symbolize tool active
              setDrawingOptionsItemId(item.id);
              setDrawingOptionsPosition({ x: coordinate[0], y: coordinate[1] });
              setIsDrawingOptionsOpen(true);
              setActiveTool("symbolize");
              return;
            }
          }

          // Fallback if map center still not available
          console.log("Using fallback coordinate");
          coordinate = [-8500000, 5600000]; // Approximate Ontario center in Web Mercator

          setDrawingOptionsItemId(item.id);
          setDrawingOptionsPosition({ x: coordinate[0], y: coordinate[1] });
          setIsDrawingOptionsOpen(true);
          setActiveTool("symbolize");
        }, 100);

        return; // Exit early, popup will open in setTimeout
      }

      console.log("Using valid feature coordinate:", coordinate);

      // Open drawing options popup with symbolize tool active immediately
      setDrawingOptionsItemId(item.id);
      setDrawingOptionsPosition({ x: coordinate[0], y: coordinate[1] });
      setIsDrawingOptionsOpen(true);
      setActiveTool("symbolize");
    },
    [map]
  );

  // Buffer handler for Drawing Options tools popup (should just activate buffer tool)
  const handleBufferFromDrawingOptions = useCallback(
    (item: MyMapsItemType) => {
      console.log("Activating buffer tool for item from Drawing Options:", item.id);

      // Close the tools popup
      handleToolsPopupClose();

      // Just activate the buffer tool since Drawing Options popup is already open
      setActiveTool("buffer");
    },
    [handleToolsPopupClose]
  );

  const handleSymbolize = useCallback(
    (item: MyMapsItemType) => {
      console.log("Symbolize feature:", item.id);
      emit("mymap-symbolize", { item });
      handleToolsPopupClose();

      // Set the active tool to show the symbolizer component
      setActiveTool("symbolize");
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

  // Listen for requests to show the drawing options popup and buffer events
  useEffect(() => {
    const handleShowDrawingOptions = (data?: { [key: string]: unknown }) => {
      if (data && data.item && data.coordinate) {
        const item = data.item as MyMapsItemType;
        const coordinate = data.coordinate as number[];

        setDrawingOptionsItemId(item.id);
        setDrawingOptionsPosition({ x: coordinate[0], y: coordinate[1] });
        setIsDrawingOptionsOpen(true);
        // ✅ CRITICAL: Reset activeTool when switching to a new feature
        setActiveTool(undefined);

        console.log("🔄 Switching to new feature - reset activeTool to default popup", {
          newFeatureId: item.id,
          previousTool: activeTool,
        });
      } else {
        console.warn("❌ Invalid data received for drawing options:", {
          hasData: !!data,
          hasItem: data?.item,
          hasCoordinate: data?.coordinate,
          data,
        });
      }
    };

    const handleBufferFromMyMaps = (data?: { [key: string]: unknown }) => {
      if (data && data.item) {
        const item = data.item as MyMapsItemType;
        handleBufferFromMyMapsList(item);
      } else {
        console.warn("❌ Invalid data received for buffer:", data);
      }
    };

    const handleSymbolizeFromMyMaps = (data?: { [key: string]: unknown }) => {
      if (data && data.item) {
        const item = data.item as MyMapsItemType;
        handleSymbolizeFromMyMapsList(item);
      } else {
        console.warn("❌ Invalid data received for symbolize:", data);
      }
    };

    const drawingOptionsListenerId = addListener("mymap-show-drawing-options", handleShowDrawingOptions);
    const bufferListenerId = addListener("mymap-buffer", handleBufferFromMyMaps);
    const symbolizeListenerId = addListener("mymap-symbolize", handleSymbolizeFromMyMaps);

    return () => {
      removeListener(drawingOptionsListenerId);
      removeListener(bufferListenerId);
      removeListener(symbolizeListenerId);
    };
  }, [addListener, removeListener, activeTool, handleBufferFromMyMapsList, handleSymbolizeFromMyMapsList]); // Include activeTool to capture current state

  return (
    <>
      <DrawingOptionsPopup
        item={drawingOptionsItem}
        coordinate={drawingOptionsPosition ? [drawingOptionsPosition.x, drawingOptionsPosition.y] : null}
        isOpen={isDrawingOptionsOpen}
        activeTool={activeTool}
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
        onBuffer={handleBufferFromDrawingOptions}
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
