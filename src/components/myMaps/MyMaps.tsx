"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { useEventStore } from "@/stores/eventStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import { useReportsStore } from "@/stores/reportsStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import ButtonBar from "@/components/myMaps/ButtonBar";
import ColorBar from "@/components/myMaps/ColorBar";
import MyMapsItems from "@/components/myMaps/MyMapsItems";
import MyMapsAdvanced from "@/components/myMaps/MyMapsAdvanced";
import MyMapsItemPopup from "@/components/myMaps/MyMapsItemPopup";
import ShowGeometryModal from "@/components/myMaps/ShowGeometryModal";
import URLModal from "@/components/common/URLModal";
import Identify from "@/components/Identify/Identify";
import { getMapScale, getMapExtent, getMapCenter, buildFeedbackUrl } from "@/utils/mapHelpers";
import { exportFeatures } from "@/utils/myMapsHelpers";
import { useToast } from "@/hooks/useToast";
import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import { Feature } from "ol";
import GeoJSON from "ol/format/GeoJSON";
import Geometry from "ol/geom/Geometry";

interface MyMapsProps {
  visible?: boolean;
}

const MyMaps: React.FC<MyMapsProps> = ({ visible = true }) => {
  // Popup state
  const [popupItem, setPopupItem] = useState<MyMapsItemType | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Show Geometry Modal state
  const [geometryModalItem, setGeometryModalItem] = useState<MyMapsItemType | null>(null);
  const [isGeometryModalOpen, setIsGeometryModalOpen] = useState(false);

  // Report Problem Modal state
  const [reportProblemUrl, setReportProblemUrl] = useState<string>("");
  const [isReportProblemModalOpen, setIsReportProblemModalOpen] = useState(false);

  // Store hooks
  const { drawType, drawColor, isEditing, setDrawType, updateItemLabel, removeItem, setEditMode, toolTipId, toolTipClass, hasItems, saveToApi, importFromApi } = useMyMapsStore();
  const { map } = useMapStore();
  const { config } = useAppStore();
  const urlParameters = useAppStore((state) => state.urlParameters);
  const { emit } = useEventStore();
  const { setReport } = useReportsStore();
  const { openSidebar, setActiveTabByName } = useSidebarStore();
  const toast = useToast();

  // Handle showing item options popup
  const handleShowItemOptions = useCallback((item: MyMapsItemType, event?: React.MouseEvent) => {
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
      emit("mymap-buffer", { item });
    },
    [emit],
  );

  const handleSymbolize = useCallback(
    (item: MyMapsItemType) => {
      emit("mymap-symbolize", { item });
    },
    [emit],
  );

  const handleMeasure = useCallback(
    (item: MyMapsItemType) => {
      emit("mymap-measure", { item });
    },
    [emit],
  );

  const handleZoomTo = useCallback(
    (item: MyMapsItemType) => {
      // Emit event for the service to handle the zoom operation
      emit("mymap-zoom-to", { item });
    },
    [emit],
  );

  const handleDeleteFromPopup = useCallback(
    (item: MyMapsItemType) => {
      removeItem(item.id);
      handleClosePopup();
      emit("mymap-item-deleted", { id: item.id });
    },
    [removeItem, handleClosePopup, emit],
  );

  const handleShowGeometry = useCallback(
    (item: MyMapsItemType) => {
      // Check if is_open_data allows showing coordinates (like the old app)
      try {
        const feature = JSON.parse(item.featureGeoJSON || "{}");
        const showCoordinates = feature.properties?.is_open_data;

        // If is_open_data is false, don't show geometry
        if (showCoordinates === false) {
          return;
        }
      } catch (error) {
        console.warn("Could not parse feature for coordinate check:", error);
      }

      setGeometryModalItem(item);
      setIsGeometryModalOpen(true);
      emit("mymap-show-geometry", { item });
    },
    [emit],
  );

  const handleCloseGeometryModal = useCallback(() => {
    setIsGeometryModalOpen(false);
    setGeometryModalItem(null);
  }, []);

  const handleExportFeature = useCallback(
    (item: MyMapsItemType, format: "geojson" | "kml" | "esrijson" = "geojson") => {
      exportFeatures([item], format);
      emit("mymap-export-feature", { item, format });
    },
    [emit],
  );

  const handleIdentify = useCallback(
    (item: MyMapsItemType) => {
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
        setActiveTabByName("reports");

        // Emit event for backward compatibility
        emit("mymap-identify", { item });
      } catch (error) {
        console.error("Error identifying MyMaps feature:", error);
      }
    },
    [emit, setReport, openSidebar, setActiveTabByName],
  );

  const handleReportProblem = useCallback(
    async (item: MyMapsItemType) => {
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
          toast.error("Failed to prepare report. Please try again.");
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
      } catch (error) {
        console.error("Error preparing report problem:", error);
        toast.error("Error occurred while preparing the report. Please try again.");
      }
    },
    [map, config, saveToApi, emit, toast],
  );

  const handleCloseReportProblemModal = useCallback(() => {
    setIsReportProblemModalOpen(false);
    setReportProblemUrl("");
  }, []);

  // Hover highlighting handlers - emit events for service to handle
  const handleItemHoverStart = useCallback(
    (item: MyMapsItemType) => {
      emit("mymap-item-hover-start", { item });
    },
    [emit],
  );

  const handleItemHoverEnd = useCallback(
    (item: MyMapsItemType) => {
      emit("mymap-item-hover-end", { item });
    },
    [emit],
  );

  // Handle item label changes
  const handleLabelChange = (id: string, label: string) => {
    updateItemLabel(id, label);
    emit("mymap-label-change", { id, label });
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
  const handleMyMapsImport = useCallback(
    (_result: { id: string; json: string }) => {
      // importFromApi already adds items to the store with deduplication.
      // Calling importItems here again was causing duplicate keys when both
      // set() calls raced against each other in React 18 concurrent mode.
      emit("mymap-items-imported", { count: useMyMapsStore.getState().items?.length ?? 0 });
    },
    [emit],
  );

  // Utility function to create feature from GeoJSON
  const getFeatureFromGeoJSON = useCallback((geoJsonString: string): Feature | null => {
    try {
      const geoJsonFormat = new GeoJSON();
      const geoJsonObject = JSON.parse(geoJsonString);
      const result = geoJsonFormat.readFeature(geoJsonObject) as Feature | Feature[];

      // readFeature can return a single feature or array of features
      if (Array.isArray(result)) {
        return result.length > 0 ? result[0] : null;
      }

      return result;
    } catch (error) {
      console.error("Error creating feature from GeoJSON:", error);
      return null;
    }
  }, []);

  // Utility function to zoom to a feature
  const zoomToFeature = useCallback(
    (feature: Feature) => {
      if (!map) return;

      const geometry = feature.getGeometry();
      if (geometry) {
        map.getView().fit(geometry.getExtent(), {
          size: map.getSize(),
          duration: 1000,
          padding: [20, 20, 20, 20],
        });
      }
    },
    [map],
  );

  // Show message function (simplified version)
  const showMessage = useCallback(
    (title: string, message: string, isError = false) => {
      // This is a simplified version - in a real app you might want to use a toast library
      // or integrate with your existing notification system
      if (isError) {
        toast.error(`${title}: ${message}`);
      }
    },
    [toast],
  );

  // Handle URL parameters for MyMaps import
  const handleURLParameters = useCallback(async () => {
    const myMapsId = urlParameters.MY_MAPS_ID;

    if (myMapsId) {
      try {
        const result = await importFromApi(myMapsId);

        if (result.success && result.data) {
          // Import was successful
          showMessage("MyMaps Import", "Success! MyMaps imported.");

          // If we have the data, import it
          if (typeof result.data === "object" && "json" in result.data) {
            const importResult = result.data as { id: string; json: string };
            handleMyMapsImport(importResult);

            // Check for feature ID to zoom to specific feature
            const featureId = urlParameters.MY_MAPS_FEATURE_ID;
            if (featureId) {
              // Read items directly from store to avoid stale closure
              const item = useMyMapsStore.getState().items.find((item) => item.id === featureId);

              if (item) {
                const feature = getFeatureFromGeoJSON(item.featureGeoJSON);
                if (feature) {
                  zoomToFeature(feature);
                }
              }
            }
          }
        } else {
          // Import failed
          showMessage("MyMaps Import", result.message || "That MyMaps ID was NOT found!", true);
        }
      } catch (error) {
        console.error("Error importing MyMaps:", error);
        showMessage("MyMaps Import", "Error occurred while importing MyMaps. Please try again.", true);
      }
    }
  }, [urlParameters, importFromApi, showMessage, handleMyMapsImport, getFeatureFromGeoJSON, zoomToFeature]);

  // Handle URL parameters after component is loaded
  useEffect(() => {
    if (Object.keys(urlParameters).length > 0) {
      // Add a small delay to ensure component is fully initialized
      setTimeout(() => {
        handleURLParameters();
      }, 100);
    }
  }, [urlParameters, handleURLParameters]);

  // Handle export to different formats
  const exportToFormat = (format: "KML" | "GeoJSON" | "EsriJSON") => {
    const { exportToFile } = useMyMapsStore.getState();

    try {
      const result = exportToFile(format);
      if (result.success) {
      } else {
        toast.error(result.message || `Unable to export to ${format}. Please ensure you have visible features to export.`);
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      toast.error(`Error occurred while exporting to ${format}. Please try again.`);
    }
  };

  // Handle Additional Tools menu actions
  const handleAdditionalToolsAction = (action: string) => {
    const { toggleAllVisibility, deleteSelected, showByType, zoomToSelected, mergePolygons } = useMyMapsStore.getState();

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
      case "merge-polygons":
        const result = mergePolygons();
        if (result.success) {
        } else {
          toast.warning(result.message || "Unable to merge polygons. Please ensure you have at least 2 visible polygon features.");
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
        break;
      case "export-kml":
        exportToFormat("KML");
        break;
      case "export-esri-json":
        exportToFormat("EsriJSON");
        break;
      case "export-geo-json":
        exportToFormat("GeoJSON");
        break;
    }

    emit("mymap-additional-tool-action", { action });
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-base-100 rounded overflow-visible relative z-[10000]">
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
        onMeasure={handleMeasure}
        onZoomTo={handleZoomTo}
        onDelete={handleDeleteFromPopup}
        onShowGeometry={handleShowGeometry}
        onExport={handleExportFeature}
        onIdentify={handleIdentify}
        onReportProblem={handleReportProblem}
      />

      {/* Tooltip for bearing/measure tools */}
      <div id={toolTipId} className={toolTipClass} role="tooltip" />

      {/* Show Geometry Modal */}
      <ShowGeometryModal item={geometryModalItem} isOpen={isGeometryModalOpen} onClose={handleCloseGeometryModal} />

      {/* Report Problem Modal */}
      <URLModal url={reportProblemUrl} title="Report a Problem" isOpen={isReportProblemModalOpen} onClose={handleCloseReportProblemModal} width="90vw" height="80vh" />

      {/* Status info */}
      <div className="flex flex-wrap gap-3 py-1.5 px-3 bg-base-200 border-t border-base-300 text-[11px] text-base-content/60 mt-auto">
        <div className="flex items-center gap-1">
          Active Tool: <strong>{drawType === "Cancel" ? "None" : drawType}</strong>
        </div>
        <div className="flex items-center gap-1">
          Color: <span className="w-3 h-3 border border-base-300 rounded-sm inline-block" style={{ backgroundColor: drawColor }} />
        </div>
      </div>
    </div>
  );
};

export default MyMaps;
