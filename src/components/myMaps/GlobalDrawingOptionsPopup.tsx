"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useEventStore } from "@/stores/eventStore";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import { useReportsStore } from "@/stores/reportsStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import DrawingOptionsPopup from "@/components/myMaps/DrawingOptionsPopup";
import MyMapsItemPopup from "@/components/myMaps/MyMapsItemPopup";
import ShowGeometryModal from "@/components/myMaps/ShowGeometryModal";
import URLModal from "@/components/common/URLModal";
import Identify from "@/components/Identify/Identify";
import { getMapScale, getMapExtent, getMapCenter, buildFeedbackUrl } from "@/utils/mapHelpers";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { GeoJSON } from "ol/format";
import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
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

  // Show Geometry Modal state
  const [geometryModalItem, setGeometryModalItem] = useState<MyMapsItemType | null>(null);
  const [isGeometryModalOpen, setIsGeometryModalOpen] = useState(false);

  // Report Problem Modal state
  const [reportProblemUrl, setReportProblemUrl] = useState<string>("");
  const [isReportProblemModalOpen, setIsReportProblemModalOpen] = useState(false);

  const { emit, addListener, removeListener } = useEventStore();
  const { items, removeItem, updateItemLabel, updateItemLabelVisibility, updateItemLabelRotation, saveToApi } = useMyMapsStore();
  const { map } = useMapStore();
  const { config } = useAppStore();
  const { setReport } = useReportsStore();
  const { openSidebar, setActiveTab } = useSidebarStore();

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
    // Clean up buffer preview layers via LayerManager
    // Look for buffer preview layers by scanning all managed layers
    const allLayers = LayerManager.getAllLayers();
    for (const managedLayer of allLayers) {
      const olLayer = managedLayer.layer;
      if (olLayer.get("id") === "buffer-preview-layer" || olLayer.get("id") === "drawing-options-buffer-preview") {
        LayerManager.removeLayer(managedLayer.id);
      }
    }

    // Fallback: also scan map directly for any unmanaged buffer layers
    if (map) {
      const bufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "buffer-preview-layer");
      if (bufferLayer) {
        map.removeLayer(bufferLayer);
      }

      const drawingBufferLayer = map.getAllLayers().find((layer) => layer.get("id") === "drawing-options-buffer-preview");
      if (drawingBufferLayer) {
        map.removeLayer(drawingBufferLayer);
      }
    }

    // Also emit cleanup event for buffer component (for MyMapsBuffer layer)
    emit("drawing-options-popup-close");

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
    [removeItem, handleCloseDrawingOptions, emit],
  );

  const handleDrawingOptionsLabelChange = React.useCallback(
    (id: string, label: string) => {
      updateItemLabel(id, label);
      emit("mymap-label-change", { id, label });
    },
    [updateItemLabel, emit],
  );

  const handleDrawingOptionsLabelVisibilityChange = React.useCallback(
    (id: string, visible: boolean) => {
      // Update store immediately for React state sync (same pattern as handleDrawingOptionsLabelChange)
      updateItemLabelVisibility(id, visible);

      // Then emit event for map rendering
      emit("mymap-label-visibility-change", { id, visible });
    },
    [updateItemLabelVisibility, emit],
  );

  const handleDrawingOptionsLabelRotationChange = React.useCallback(
    (id: string, rotation: number) => {
      // Update store immediately for React state sync
      updateItemLabelRotation(id, rotation);

      // Then emit event for map rendering
      emit("mymap-label-rotation-change", { id, rotation });
    },
    [updateItemLabelRotation, emit],
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
    [map],
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
    [map],
  );

  // Measure handler for MyMaps list (should open Drawing Options popup)
  const handleMeasureFromMyMapsList = useCallback(
    (item: MyMapsItemType) => {
      console.log("Opening measure tool for item from MyMaps list:", item.id);

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
          console.error("Error parsing geometry for measure positioning:", error);
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

              // Open drawing options popup with measure tool active
              setDrawingOptionsItemId(item.id);
              setDrawingOptionsPosition({ x: coordinate[0], y: coordinate[1] });
              setIsDrawingOptionsOpen(true);
              setActiveTool("measure");
              return;
            }
          }

          // Fallback if map center still not available
          console.log("Using fallback coordinate");
          coordinate = [-8500000, 5600000]; // Approximate Ontario center in Web Mercator

          setDrawingOptionsItemId(item.id);
          setDrawingOptionsPosition({ x: coordinate[0], y: coordinate[1] });
          setIsDrawingOptionsOpen(true);
          setActiveTool("measure");
        }, 100);

        return; // Exit early, popup will open in setTimeout
      }

      console.log("Using valid feature coordinate:", coordinate);

      // Open drawing options popup with measure tool active immediately
      setDrawingOptionsItemId(item.id);
      setDrawingOptionsPosition({ x: coordinate[0], y: coordinate[1] });
      setIsDrawingOptionsOpen(true);
      setActiveTool("measure");
    },
    [map],
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
    [handleToolsPopupClose],
  );

  const handleSymbolize = useCallback(
    (item: MyMapsItemType) => {
      console.log("Symbolize feature:", item.id);
      emit("mymap-symbolize", { item });
      handleToolsPopupClose();

      // Set the active tool to show the symbolizer component
      setActiveTool("symbolize");
    },
    [emit, handleToolsPopupClose],
  );

  const handleMeasure = useCallback(
    (item: MyMapsItemType) => {
      console.log("Measure feature:", item.id);
      emit("mymap-measure", { item });
      handleToolsPopupClose();

      // Set the active tool to show the measure component
      setActiveTool("measure");
    },
    [emit, handleToolsPopupClose],
  );

  const handleZoomTo = useCallback(
    (item: MyMapsItemType) => {
      console.log("Zoom to item:", item.id);
      emit("mymap-zoom-to", { item });
      handleToolsPopupClose();
    },
    [emit, handleToolsPopupClose],
  );

  const handleDeleteFromToolsPopup = useCallback(
    (item: MyMapsItemType) => {
      removeItem(item.id);
      emit("mymap-item-deleted", { id: item.id });
      handleToolsPopupClose();
    },
    [removeItem, emit, handleToolsPopupClose],
  );

  const handleShowGeometry = useCallback(
    (item: MyMapsItemType) => {
      console.log("Show geometry for item:", item.id);

      // Check if is_open_data allows showing coordinates (like the old app)
      try {
        const feature = JSON.parse(item.featureGeoJSON || "{}");
        const showCoordinates = feature.properties?.is_open_data;

        // If is_open_data is false, don't show geometry
        if (showCoordinates === false) {
          console.log("Geometry viewing not allowed for this feature");
          return;
        }
      } catch (error) {
        console.warn("Could not parse feature for coordinate check:", error);
      }

      setGeometryModalItem(item);
      setIsGeometryModalOpen(true);
      emit("mymap-show-geometry", { item });
      handleToolsPopupClose();
    },
    [emit, handleToolsPopupClose],
  );

  const handleCloseGeometryModal = useCallback(() => {
    setIsGeometryModalOpen(false);
    setGeometryModalItem(null);
  }, []);

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
    [handleToolsPopupClose],
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

      try {
        // Parse the GeoJSON to get the feature
        const geoJsonFormat = new GeoJSON({
          dataProjection: "EPSG:3857",
          featureProjection: "EPSG:3857",
        });

        const featureResult = geoJsonFormat.readFeature(item.featureGeoJSON) as Feature<Geometry> | Feature<Geometry>[];

        // readFeature can return either a Feature or Feature[], ensure we have a single feature
        const feature: Feature<Geometry> = Array.isArray(featureResult) ? featureResult[0] : featureResult;

        if (!feature) {
          console.error("No feature parsed from GeoJSON:", item.id);
          return;
        }

        const geometry = feature.getGeometry();

        if (!geometry) {
          console.error("No geometry found for feature:", item.id);
          return;
        }

        // Generate report content
        const reportId = `identify-mymaps-${item.id}-${Date.now()}`;
        setReport({
          id: reportId,
          title: `Identify Results - ${item.label || "MyMaps Feature"}`,
          content: <Identify geometry={geometry} />,
          createdAt: new Date(),
        });

        // Open sidebar and switch to reports tab
        openSidebar();
        setActiveTab(4); // Reports tab is index 4

        // Emit event for backward compatibility
        emit("mymap-identify", { item });
      } catch (error) {
        console.error("Error identifying MyMaps feature:", error);
      }

      handleToolsPopupClose();
    },
    [emit, handleToolsPopupClose, setReport, openSidebar, setActiveTab],
  );

  const handleReportProblem = useCallback(
    async (item: MyMapsItemType) => {
      console.log("Report problem for feature:", item.id);

      if (!map || !config) {
        console.error("Map or config not available");
        return;
      }

      try {
        // Get map data (like the old app)
        const scale = getMapScale(map);
        const extent = getMapExtent(map);
        const center = getMapCenter(map);

        const [xmin, ymin, xmax, ymax] = extent;
        const [centerx, centery] = center;

        // Export MyMaps to get an ID (like the old app)
        const exportResult = await saveToApi();

        if (!exportResult.success || !exportResult.id) {
          console.error("Failed to export MyMaps for report problem");
          alert("Failed to prepare report. Please try again.");
          return;
        }

        // Build the feedback URL with all parameters (matching old app exactly)
        const feedbackUrl = buildFeedbackUrl({
          feedbackUrl: config.feedbackUrl || "https://opengis.simcoe.ca/feedback",
          xmin,
          xmax,
          ymin,
          ymax,
          centerx,
          centery,
          scale,
          myMapsId: exportResult.id,
          featureId: item.id,
          mapId: config.mapId,
        });

        // Open in modal (like the old app's showURLWindow)
        setReportProblemUrl(feedbackUrl);
        setIsReportProblemModalOpen(true);

        emit("mymap-report-problem", { item, url: feedbackUrl });
        handleToolsPopupClose();
      } catch (error) {
        console.error("Error preparing report problem:", error);
        alert("Error occurred while preparing the report. Please try again.");
      }
    },
    [map, config, saveToApi, emit, handleToolsPopupClose],
  );

  const handleCloseReportProblemModal = useCallback(() => {
    setIsReportProblemModalOpen(false);
    setReportProblemUrl("");
  }, []);

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

    const handleMeasureFromMyMaps = (data?: { [key: string]: unknown }) => {
      if (data && data.item) {
        const item = data.item as MyMapsItemType;
        handleMeasureFromMyMapsList(item);
      } else {
        console.warn("❌ Invalid data received for measure:", data);
      }
    };

    const drawingOptionsListenerId = addListener("mymap-show-drawing-options", handleShowDrawingOptions);
    const bufferListenerId = addListener("mymap-buffer", handleBufferFromMyMaps);
    const symbolizeListenerId = addListener("mymap-symbolize", handleSymbolizeFromMyMaps);
    const measureListenerId = addListener("mymap-measure", handleMeasureFromMyMaps);

    return () => {
      removeListener(drawingOptionsListenerId);
      removeListener(bufferListenerId);
      removeListener(symbolizeListenerId);
      removeListener(measureListenerId);
    };
  }, [addListener, removeListener, activeTool, handleBufferFromMyMapsList, handleSymbolizeFromMyMapsList, handleMeasureFromMyMapsList]); // Include activeTool to capture current state

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
        onMeasure={handleMeasure}
        onZoomTo={handleZoomTo}
        onDelete={handleDeleteFromToolsPopup}
        onShowGeometry={handleShowGeometry}
        onExport={handleExportFeature}
        onIdentify={handleIdentify}
        onReportProblem={handleReportProblem}
      />

      {/* Show Geometry Modal */}
      <ShowGeometryModal item={geometryModalItem} isOpen={isGeometryModalOpen} onClose={handleCloseGeometryModal} />

      {/* Report Problem Modal */}
      <URLModal url={reportProblemUrl} title="Report a Problem" isOpen={isReportProblemModalOpen} onClose={handleCloseReportProblemModal} width="90vw" height="80vh" />
    </>
  );
}
