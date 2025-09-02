"use client";

import React, { useEffect, useRef } from "react";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { useMapStore } from "@/stores/mapStore";
import { useEventStore } from "@/stores/eventStore";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import { MyMapsDrawingManager } from "@/utils/openlayers/MyMapsDrawing";
import { Feature } from "ol";
import { featureToGeoJSON, styleToJSON } from "@/utils/myMapsHelpers";
import type { MyMapsItem as MyMapsItemType, GeometryType } from "@/types/myMaps";
import { createMyMapsItem } from "@/stores/myMapsStore";

/**
 * MyMapsService - Background service that manages MyMaps features on the map
 * This component runs independently of the UI panel and ensures MyMaps features
 * are always loaded and displayed on the map, regardless of sidebar state.
 */
export default function MyMapsService() {
  const drawingManagerRef = useRef<MyMapsDrawingManager | null>(null);
  const managedLayerIdRef = useRef<string | null>(null);

  // Store hooks
  const { drawType, drawColor, drawStyle, isEditing, editMode, items, setDrawType, loadFromStorage, saveToStorage, addItem, updateItem, removeItem, getNextDrawingNumber } = useMyMapsStore();

  const { map } = useMapStore();
  const { emit } = useEventStore();
  const { addLayer, removeLayer } = useLayerManagerStore();

  // Helper function to convert OpenLayers geometry type to our GeometryType
  const mapGeometryType = (olType: string): GeometryType => {
    switch (olType) {
      case "Point":
        return "Point";
      case "LineString":
      case "LinearRing":
        return "LineString";
      case "Polygon":
        return "Polygon";
      case "Circle":
        return "Circle";
      default:
        return "Point";
    }
  };

  // Drawing manager callback handlers
  const handleFeatureDrawn = React.useCallback(
    (feature: Feature) => {
      const geometry = feature.getGeometry();
      if (!geometry) {
        return;
      }

      const featureDrawType = feature.get("drawType") || drawType;

      // Generate label based on draw type
      let label = "";
      switch (featureDrawType) {
        case "Text":
          label = "Enter Custom Text";
          break;
        case "Bearing":
          label = `Bearing: ${feature.get("bearing") || "0°"}`;
          break;
        case "Measure":
          label = feature.get("length") || "0 m";
          break;
        default:
          label = `Drawing ${getNextDrawingNumber()}`;
      }

      // Create MyMaps item using standalone function
      const featureStyle = feature.getStyle();
      const myMapsItem = createMyMapsItem(feature, featureDrawType, label, featureStyle ? styleToJSON(featureStyle as any) : undefined);

      // Set the featureGeoJSON from the actual feature
      myMapsItem.featureGeoJSON = featureToGeoJSON(feature);

      // Add item to store
      addItem(myMapsItem);

      emit("mymap-item-created", { item: myMapsItem });

      // Auto-show label for Text features (like the old app)
      if (featureDrawType === "Text" && myMapsItem.labelVisible && myMapsItem.label) {
        console.log("🏷️ Auto-applying label to Text feature:", myMapsItem.label);
        setTimeout(() => {
          if (drawingManagerRef.current) {
            drawingManagerRef.current.setFeatureLabel(myMapsItem);
          }
        }, 100);
      }

      // Reset draw type to Cancel after drawing
      setDrawType("Cancel");
    },
    [drawType, addItem, emit, setDrawType, getNextDrawingNumber]
  );

  const handleFeatureModified = React.useCallback(
    (feature: Feature) => {
      const id = feature.get("id");
      if (!id) return;

      const geoJSON = featureToGeoJSON(feature);
      updateItem(id, { featureGeoJSON: geoJSON });

      emit("mymap-item-modified", { id, geoJSON });
    },
    [updateItem, emit]
  );

  const handleFeatureClicked = React.useCallback(
    (feature: Feature, coordinate: number[]) => {
      console.log("🎯 MyMapsService: Feature clicked!", {
        featureId: feature.get("id"),
        label: feature.get("label"),
        labelVisible: feature.get("labelVisible"),
        drawType: feature.get("drawType"),
        coordinate,
      });

      const id = feature.get("id");

      if (drawType === "Eraser") {
        console.log("🗑️ Removing feature in eraser mode:", id);
        // Remove feature when in eraser mode
        if (id) {
          removeItem(id);
          emit("mymap-item-deleted", { id });
        }
      } else {
        // Show drawing options popup when feature is clicked on map
        const currentItems = useMyMapsStore.getState().items;
        const item = currentItems.find((item) => item.id === id);

        console.log("🔍 Found item in store:", {
          itemId: id,
          itemExists: !!item,
          itemLabel: item?.label,
          itemLabelVisible: item?.labelVisible,
        });

        if (item) {
          console.log("✅ Emitting mymap-show-drawing-options event", { item, coordinate });
          emit("mymap-show-drawing-options", { item, coordinate });
        } else {
          console.warn("❌ No item found in store for clicked feature:", id);
        }
      }
    },
    [drawType, removeItem, emit]
  );

  // Initialize drawing manager when map is available
  useEffect(() => {
    if (!map || drawingManagerRef.current) return;

    // Load saved items from localStorage
    loadFromStorage();

    // Initialize drawing manager with layer manager integration
    drawingManagerRef.current = new MyMapsDrawingManager(map, {
      onFeatureDrawn: handleFeatureDrawn,
      onFeatureModified: handleFeatureModified,
      onFeatureClicked: handleFeatureClicked,
    });

    // Register the MyMaps layer with the layer manager for proper z-index ordering
    const vectorLayer = drawingManagerRef.current.getVectorLayer();
    if (vectorLayer) {
      const managedLayerId = addLayer(vectorLayer, "MyMaps", "MyMaps Drawing Layer", {
        id: "mymaps-drawing-layer",
        metadata: {
          description: "User drawings and custom map features",
          category: "MyMaps",
        },
      });
      managedLayerIdRef.current = managedLayerId;

      // Force layer to be visible and ensure it renders
      vectorLayer.setVisible(true);
      vectorLayer.setOpacity(1);
    }

    // Cleanup function
    return () => {
      if (drawingManagerRef.current) {
        drawingManagerRef.current.cleanup();
        drawingManagerRef.current = null;
      }

      // Remove layer from layer manager
      if (managedLayerIdRef.current) {
        removeLayer(managedLayerIdRef.current);
        managedLayerIdRef.current = null;
      }
    };
  }, [map, loadFromStorage, handleFeatureDrawn, handleFeatureModified, handleFeatureClicked, addLayer, removeLayer]);

  // Load features into drawing manager when items change (but avoid reloading on label-only changes)
  const lastItemsRef = useRef<MyMapsItemType[]>([]);
  useEffect(() => {
    if (!drawingManagerRef.current) return;

    // Check if this is a structural change (add/remove/visibility) vs just label change
    const currentItems = items;
    const previousItems = lastItemsRef.current;

    const structuralChange =
      currentItems.length !== previousItems.length ||
      currentItems.some((item, index) => {
        const prevItem = previousItems[index];
        return !prevItem || item.id !== prevItem.id || item.visible !== prevItem.visible || item.featureGeoJSON !== prevItem.featureGeoJSON;
      });

    if (structuralChange) {
      drawingManagerRef.current.loadFeatures(items);

      // Save to storage when items change structurally
      if (items.length > 0) {
        saveToStorage();
      }
    }

    lastItemsRef.current = [...items];
  }, [items, saveToStorage]);

  // Handle draw type changes
  useEffect(() => {
    if (!drawingManagerRef.current) return;

    if (drawType === "Cancel") {
      drawingManagerRef.current.clearDrawing();
    } else if (drawType === "Eraser") {
      // Eraser is handled via feature clicks
      drawingManagerRef.current.clearDrawing();
    } else {
      drawingManagerRef.current.startDrawing(drawType, drawColor, drawStyle || undefined);
    }

    emit("mymap-draw-type-changed", { drawType });
  }, [drawType, drawColor, drawStyle, emit]);

  // Handle editing mode
  useEffect(() => {
    if (!drawingManagerRef.current) return;

    if (isEditing && editMode) {
      drawingManagerRef.current.startEditing(editMode);
    } else {
      drawingManagerRef.current.clearEditing();
    }
  }, [isEditing, editMode]);

  // Handle events from UI panel
  useEffect(() => {
    const handleItemHoverStart = (data?: { [key: string]: unknown }) => {
      if (data && data.item && drawingManagerRef.current) {
        const item = data.item as MyMapsItemType;
        drawingManagerRef.current.highlightFeature(item.id);
      }
    };

    const handleItemHoverEnd = (data?: { [key: string]: unknown }) => {
      if (data && data.item && drawingManagerRef.current) {
        const item = data.item as MyMapsItemType;
        drawingManagerRef.current.unhighlightFeature(item.id);
      }
    };

    const handleZoomToItem = (data?: { [key: string]: unknown }) => {
      if (!data || !data.item) return;
      const item = data.item as MyMapsItemType;
      console.log("MyMapsService: Zoom to item:", item.id);
      if (drawingManagerRef.current && item.featureGeoJSON && map) {
        try {
          // Get the feature from the drawing manager
          const features = drawingManagerRef.current.getVectorSource().getFeatures();
          const feature = features.find((f) => f.get("id") === item.id);

          if (feature) {
            const geometry = feature.getGeometry();
            if (geometry) {
              const extent = geometry.getExtent();
              map.getView().fit(extent, {
                padding: [50, 50, 50, 50],
                maxZoom: 16,
                duration: 500,
              });
            }
          }
        } catch (error) {
          console.error("Error zooming to feature:", error);
        }
      }
    };

    // Handle label changes from Drawing Options Popup
    const handleLabelChange = (data?: { [key: string]: unknown }) => {
      if (!data || !data.id || typeof data.label !== "string") return;
      const featureId = data.id as string;
      const newLabel = data.label;

      if (drawingManagerRef.current) {
        drawingManagerRef.current.updateFeatureLabel(featureId, newLabel);
      }

      // Update the store item
      updateItem(featureId, { label: newLabel });
    };

    const handleLabelVisibilityChange = (data?: { [key: string]: unknown }) => {
      console.log("🎯 MyMapsService: handleLabelVisibilityChange called", {
        data,
        timestamp: Date.now(),
        hasDrawingManager: !!drawingManagerRef.current,
      });

      if (!data || !data.id || typeof data.visible !== "boolean") {
        console.warn("❌ MyMapsService: Invalid data for label visibility change", {
          data,
          hasId: !!data?.id,
          hasVisible: data?.visible !== undefined,
          visibleType: typeof data?.visible,
        });
        return;
      }

      const featureId = data.id as string;
      const visible = data.visible;

      console.log("📝 MyMapsService: Updating label visibility", {
        featureId,
        visible,
        timestamp: Date.now(),
      });

      // Update the store item first
      updateItem(featureId, { labelVisible: visible });

      // Use setTimeout to ensure store update has completed
      setTimeout(() => {
        // Get the fresh updated item from store
        const currentItems = useMyMapsStore.getState().items;
        const item = currentItems.find((item) => item.id === featureId);

        console.log("🔍 MyMapsService: Found item after store update", {
          itemFound: !!item,
          item: item
            ? {
                id: item.id,
                labelVisible: item.labelVisible,
                label: item.label,
                labelRotation: item.labelRotation,
              }
            : null,
          hasDrawingManager: !!drawingManagerRef.current,
          timestamp: Date.now(),
        });

        if (item && drawingManagerRef.current) {
          console.log("✅ MyMapsService: Calling setFeatureLabel with updated item");
          drawingManagerRef.current.setFeatureLabel(item);
        } else {
          console.warn("❌ MyMapsService: Cannot set feature label", {
            hasItem: !!item,
            hasDrawingManager: !!drawingManagerRef.current,
          });
        }
      }, 0);
    };

    const handleLabelRotationChange = (data?: { [key: string]: unknown }) => {
      if (!data || !data.id || typeof data.rotation !== "number") return;
      const featureId = data.id as string;
      const rotation = data.rotation;

      if (drawingManagerRef.current) {
        drawingManagerRef.current.updateFeatureLabelRotation(featureId, rotation);
      }

      // Update the store item
      updateItem(featureId, { labelRotation: rotation });
    };

    const handleStyleUpdate = (data?: { [key: string]: unknown }) => {
      console.log("🎯 MyMapsService: handleStyleUpdate called", {
        data,
        timestamp: Date.now(),
        hasDrawingManager: !!drawingManagerRef.current,
      });

      if (!data || !data.itemId || !data.style) {
        console.warn("❌ MyMapsService: Invalid data for style update", {
          data,
          hasItemId: !!data?.itemId,
          hasStyle: !!data?.style,
        });
        return;
      }

      const featureId = data.itemId as string;
      const style = data.style; // Now using full OpenLayers style object
      const pointType = data.pointType as string;

      console.log("🎨 MyMapsService: Updating feature with OpenLayers style object", {
        featureId,
        style,
        pointType,
        timestamp: Date.now(),
      });

      if (drawingManagerRef.current) {
        // For now, we'll continue using the existing updateFeatureStyle method
        // but we should convert the style object to styleJSON if needed
        console.log("🔄 MyMapsService: Converting OpenLayers style object for compatibility");
        drawingManagerRef.current.updateFeatureStyle(featureId, style, pointType);
        console.log("✅ MyMapsService: Feature style updated successfully");
      } else {
        console.warn("❌ MyMapsService: Cannot update feature style - no drawing manager");
      }
    };

    // Buffer feature handler
    const handleAddMyMapsFeature = (data?: { [key: string]: unknown }) => {
      if (data && data.feature && data.label) {
        const feature = data.feature as Feature;
        const label = data.label as string;

        console.log("🎨 Processing buffer feature for MyMaps:", {
          label,
          hasStyle: !!feature.getStyle(),
        });

        // Create MyMaps item from the buffer feature (same pattern as regular drawings)
        const featureStyle = feature.getStyle();
        const myMapsItem = createMyMapsItem(feature, "Buffer", label, featureStyle ? styleToJSON(featureStyle as any) : undefined);

        // Set the featureGeoJSON from the actual feature
        myMapsItem.featureGeoJSON = featureToGeoJSON(feature);

        console.log("🎨 Buffer MyMaps item created:", {
          id: myMapsItem.id,
          label: myMapsItem.label,
          hasStyle: !!myMapsItem.style,
          styleInfo: myMapsItem.style,
        });

        // Add item to store
        addItem(myMapsItem);

        console.log("✅ Buffer feature added to MyMaps:", {
          id: myMapsItem.id,
          label: myMapsItem.label,
        });

        emit("mymap-item-created", { item: myMapsItem });
      }
    };

    // Subscribe to UI events
    const { addListener, removeListener } = useEventStore.getState();

    const hoverStartId = addListener("mymap-item-hover-start", handleItemHoverStart);
    const hoverEndId = addListener("mymap-item-hover-end", handleItemHoverEnd);
    const zoomToId = addListener("mymap-zoom-to", handleZoomToItem);

    // Label event handlers
    const labelChangeId = addListener("mymap-label-change", handleLabelChange);
    const labelVisibilityId = addListener("mymap-label-visibility-change", handleLabelVisibilityChange);
    const labelRotationId = addListener("mymap-label-rotation-change", handleLabelRotationChange);

    // Style event handler
    const styleUpdateId = addListener("mymap-style-updated", handleStyleUpdate);

    // Buffer event handler
    const addFeatureId = addListener("addMyMapsFeature", handleAddMyMapsFeature);

    return () => {
      removeListener(hoverStartId);
      removeListener(hoverEndId);
      removeListener(zoomToId);
      removeListener(labelChangeId);
      removeListener(labelVisibilityId);
      removeListener(labelRotationId);
      removeListener(styleUpdateId);
      removeListener(addFeatureId);
    };
  }, [map, addItem, emit]);

  // This component doesn't render anything - it's a service component
  return null;
}
