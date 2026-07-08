"use client";

import React, { useEffect, useRef } from "react";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { useMapStore } from "@/stores/mapStore";
import { useEventStore } from "@/stores/eventStore";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import { useInteractionManagerStore } from "@/stores/interactionManagerStore";
import type { InteractionResult } from "@/stores/interactionManagerStore";
import { MyMapsDrawingManager } from "@/utils/openlayers/MyMapsDrawing";
import { Feature } from "ol";
import { getCenter } from "ol/extent";
import { Style, Text } from "ol/style";
import { featureToGeoJSON, styleToJSON } from "@/utils/myMapsHelpers";
import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import { createMyMapsItem } from "@/stores/myMapsStore";
import { usePopupStore } from "@/stores/popupStore";
import { userStorageReady } from "@/utils/userStorage";

/**
 * MyMapsService - Background service that manages MyMaps features on the map
 * This component runs independently of the UI panel and ensures MyMaps features
 * are always loaded and displayed on the map, regardless of sidebar state.
 */
export default function MyMapsService() {
  const drawingManagerRef = useRef<MyMapsDrawingManager | null>(null);
  const managedLayerIdRef = useRef<string | null>(null);
  const lastDrawEndTimeRef = useRef<number>(0);

  // Store hooks
  const drawType = useMyMapsStore((s) => s.drawType);
  const drawColor = useMyMapsStore((s) => s.drawColor);
  const drawStyle = useMyMapsStore((s) => s.drawStyle);
  const isEditing = useMyMapsStore((s) => s.isEditing);
  const editMode = useMyMapsStore((s) => s.editMode);
  const items = useMyMapsStore((s) => s.items);
  const setDrawType = useMyMapsStore((s) => s.setDrawType);
  const loadFromStorage = useMyMapsStore((s) => s.loadFromStorage);
  const saveToStorage = useMyMapsStore((s) => s.saveToStorage);
  const addItem = useMyMapsStore((s) => s.addItem);
  const updateItem = useMyMapsStore((s) => s.updateItem);
  const removeItem = useMyMapsStore((s) => s.removeItem);
  const getNextDrawingNumber = useMyMapsStore((s) => s.getNextDrawingNumber);

  const map = useMapStore((s) => s.map);
  const emit = useEventStore((s) => s.emit);
  const addLayer = useLayerManagerStore((s) => s.addLayer);
  const removeLayer = useLayerManagerStore((s) => s.removeLayer);

  const getPopupStyleFromFeature = React.useCallback((feature: Feature): Style | undefined => {
    const featureStyle = feature.getStyle();

    if (featureStyle instanceof Style) {
      return featureStyle;
    }

    if (Array.isArray(featureStyle) && featureStyle.length > 0) {
      const baseStyle = featureStyle.find((s) => s instanceof Style && (!!s.getImage() || !!s.getFill() || !!s.getStroke())) || featureStyle.find((s) => s instanceof Style);
      const textCarrier = featureStyle.find((s) => s instanceof Style && !!s.getText());

      if (baseStyle instanceof Style) {
        const mergedStyle = baseStyle.clone();
        const textStyle = textCarrier?.getText();
        if (textStyle) {
          mergedStyle.setText(textStyle);
        }
        return mergedStyle;
      }
    }

    return undefined;
  }, []);

  const extractLabelStyleFromFeature = React.useCallback((feature: Feature): Record<string, unknown> | undefined => {
    const featureStyle = feature.getStyle();

    const findTextStyle = (): Text | undefined => {
      if (featureStyle instanceof Style) {
        return featureStyle.getText() ?? undefined;
      }
      if (Array.isArray(featureStyle)) {
        const carrier = featureStyle.find((s) => s instanceof Style && !!s.getText());
        return carrier instanceof Style ? (carrier.getText() ?? undefined) : undefined;
      }
      return undefined;
    };

    const textStyle = findTextStyle();
    if (!textStyle) return undefined;

    const font = textStyle.getFont();
    const pxMatch = typeof font === "string" ? font.match(/(\d+(?:\.\d+)?)px/i) : null;
    const textSize = pxMatch ? `${pxMatch[1]}px` : undefined;

    const normalizeColor = (color: unknown): string | undefined => {
      if (!color) return undefined;
      if (Array.isArray(color) && color.length >= 3) {
        const toHex = (n: number) => {
          const hex = Math.round(Number(n)).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        };
        return `#${toHex(color[0] as number)}${toHex(color[1] as number)}${toHex(color[2] as number)}`;
      }
      if (typeof color !== "string") return undefined;
      return color;
    };

    const textColor = normalizeColor(textStyle.getFill()?.getColor());
    const outlineColor = normalizeColor(textStyle.getStroke()?.getColor());
    const outlineWidth = textStyle.getStroke()?.getWidth();

    const labelStyleSnapshot: Record<string, unknown> = {};
    if (textSize) labelStyleSnapshot.textSize = textSize;
    if (textColor) labelStyleSnapshot.textColor = textColor;
    if (outlineColor) labelStyleSnapshot.outlineColor = outlineColor;
    if (outlineWidth !== undefined) labelStyleSnapshot.outlineWidth = outlineWidth;

    return Object.keys(labelStyleSnapshot).length > 0 ? labelStyleSnapshot : undefined;
  }, []);

  // Helper function to convert OpenLayers geometry type to our GeometryType
  // const mapGeometryType = (olType: string): GeometryType => {
  //   switch (olType) {
  //     case "Point":
  //       return "Point";
  //     case "LineString":
  //     case "LinearRing":
  //       return "LineString";
  //     case "Polygon":
  //       return "Polygon";
  //     case "Circle":
  //       return "Circle";
  //     default:
  //       return "Point";
  //   }
  // };

  // Drawing manager callback handlers
  const handleFeatureDrawn = React.useCallback(
    (feature: Feature) => {
      const geometry = feature.getGeometry();
      if (!geometry) {
        return;
      }

      const featureDrawType = feature.get("drawType") || "Point";

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
      const myMapsItem = createMyMapsItem(feature, featureDrawType, label, featureStyle instanceof Style ? styleToJSON(featureStyle) : undefined);

      // Set the featureGeoJSON from the actual feature
      myMapsItem.featureGeoJSON = featureToGeoJSON(feature);

      // Add item to store
      addItem(myMapsItem);

      emit("mymap-item-created", { item: myMapsItem });

      // Auto-show label for Text features (like the old app)
      if (featureDrawType === "Text" && myMapsItem.labelVisible && myMapsItem.label) {
        setTimeout(() => {
          if (drawingManagerRef.current) {
            drawingManagerRef.current.setFeatureLabel(myMapsItem);
          }
        }, 100);
      }

      // Reset draw type to Cancel after drawing
      setDrawType("Cancel");
      lastDrawEndTimeRef.current = Date.now();

      // Open the feature popup after drawing completes so the user can
      // immediately rename, symbolize, or otherwise configure the feature.
      const coordinate = getCenter(geometry.getExtent());
      setTimeout(() => {
        const freshItem = useMyMapsStore.getState().items.find((i) => i.id === myMapsItem.id) || myMapsItem;
        emit("mymap-show-drawing-options", { item: freshItem, coordinate });
      }, 200);
    },
    [addItem, emit, setDrawType, getNextDrawingNumber],
  );

  const handleFeatureModified = React.useCallback(
    (feature: Feature) => {
      const id = feature.get("id");
      if (!id) return;

      const geoJSON = featureToGeoJSON(feature);
      updateItem(id, { featureGeoJSON: geoJSON });

      emit("mymap-item-modified", { id, geoJSON });
    },
    [updateItem, emit],
  );

  const handleFeatureClicked = React.useCallback(
    (feature: Feature, coordinate: number[]) => {
      // Get the current draw type from store to avoid stale closures
      const currentDrawType = useMyMapsStore.getState().drawType;

      const id = feature.get("id");

      if (currentDrawType === "Eraser") {
        // Remove feature when in eraser mode
        if (id) {
          removeItem(id);
          emit("mymap-item-deleted", { id });
        }
      } else {
        // Show drawing options popup when feature is clicked on map
        const currentItems = useMyMapsStore.getState().items;
        const item = currentItems.find((item) => item.id === id);

        if (item) {
          const liveFeatureStyle = getPopupStyleFromFeature(feature);
          const liveLabelStyle = extractLabelStyleFromFeature(feature);

          // Sync live label text style into the store so the popup (which re-reads from
          // the store by id) reflects actual rendered values like font size/color.
          if (liveLabelStyle) {
            const existingLabelStyle = item.labelStyle && typeof item.labelStyle === "object" && !(item.labelStyle instanceof Style) ? (item.labelStyle as Record<string, unknown>) : {};
            const mergedLabelStyle = { ...existingLabelStyle, ...liveLabelStyle };
            useMyMapsStore.getState().updateItem(item.id, { labelStyle: mergedLabelStyle });
          }

          const refreshedItem = useMyMapsStore.getState().items.find((i) => i.id === id) || item;
          const popupItem = liveFeatureStyle ? { ...refreshedItem, style: liveFeatureStyle } : refreshedItem;
          emit("mymap-show-drawing-options", { item: popupItem, coordinate });
        } else {
          console.warn("❌ No item found in store for clicked feature:", id);
        }
      }
    },
    [removeItem, emit, getPopupStyleFromFeature, extractLabelStyleFromFeature], // Remove drawType from dependencies to avoid stale closures
  );

  // Keep manager callbacks up to date without forcing manager re-initialization.
  const handleFeatureDrawnRef = useRef(handleFeatureDrawn);
  const handleFeatureModifiedRef = useRef(handleFeatureModified);

  useEffect(() => {
    handleFeatureDrawnRef.current = handleFeatureDrawn;
    handleFeatureModifiedRef.current = handleFeatureModified;
  }, [handleFeatureDrawn, handleFeatureModified]);

  // Initialize drawing manager when map is available
  useEffect(() => {
    if (!map || drawingManagerRef.current) return;

    // Load saved items from localStorage (wait for server restore to complete first)
    userStorageReady.then(() => loadFromStorage());

    // Initialize drawing manager with layer manager integration
    drawingManagerRef.current = new MyMapsDrawingManager(map, {
      onFeatureDrawn: (feature) => handleFeatureDrawnRef.current(feature),
      onFeatureModified: (feature) => handleFeatureModifiedRef.current(feature),
    });

    // Register the MyMaps layer with the layer manager for proper z-index ordering
    const vectorLayer = drawingManagerRef.current.getVectorLayer();
    if (vectorLayer) {
      const managedLayerId = addLayer(vectorLayer, "MyMaps", "MyMaps Drawing Layer", {
        id: "mymaps-drawing-layer",
        suppressParcelClick: true,
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
  }, [map, loadFromStorage, addLayer, removeLayer]);

  // Register MyMaps feature-click handler through the unified interaction system.
  // This replaces the old direct map.on("singleclick") in MyMapsDrawing so that the
  // MapContainer guard properly suppresses it during drawing/measuring/etc.
  useEffect(() => {
    if (!map) return;

    const registerHandler = useInteractionManagerStore.getState().registerHandler;
    const unregisterHandler = useInteractionManagerStore.getState().unregisterHandler;
    const handlerId = "mymaps-feature-click";

    registerHandler({
      id: handlerId,
      eventType: "singleclick",
      priority: 5,
      conditions: {
        checkDisableFlags: () => {
          const mapState = useMapStore.getState();
          // Eraser needs feature clicks to detect which feature to remove
          if (mapState.activeToolId === "mymaps-eraser") return false;
          if (mapState.activeToolId === "mymaps-draw" || mapState.activeToolId === "mymaps-edit") return true;
          // Ignore stale singleclick events that arrive after a drawing just finished
          if (Date.now() - lastDrawEndTimeRef.current < 500) return true;
          const popupActive = (window as unknown as { popupActive?: boolean }).popupActive;
          if (popupActive) return true;
          return false;
        },
      },
      handler: (coordinate, pixel) => {
        let clickedFeature: Feature | null = null;

        map.forEachFeatureAtPixel(
          pixel as [number, number],
          (feature) => {
            const hitFeature = feature as Feature;
            if (hitFeature.get("__mymapsPreview") === true) {
              return false;
            }
            clickedFeature = hitFeature;
            return true;
          },
          {
            layerFilter: (layer) => layer.get("name") === MyMapsDrawingManager.LAYER_NAME,
          },
        );

        if (clickedFeature) {
          handleFeatureClicked(clickedFeature, coordinate);
          // Return a sentinel result so the InteractionManager's aggregation can
          // recognise a MyMaps feature was hit and drop every identify /
          // property-report result for this click. The MyMaps drawing popup
          // renders itself via the `mymap-show-drawing-options` event above; this
          // result is never displayed, it only signals exclusivity.
          const hitFeature = clickedFeature as Feature;
          const sentinel: InteractionResult = {
            id: "mymaps-feature-hit",
            displayName: "MyMaps Feature",
            type: "identify",
            layerId: managedLayerIdRef.current ?? undefined,
            data: {
              layerName: MyMapsDrawingManager.LAYER_NAME,
              featureId: String(hitFeature.getId() ?? ""),
              attributes: {},
            },
          };
          return [sentinel];
        }
        return [];
      },
    });

    return () => {
      unregisterHandler(handlerId);
    };
  }, [map, handleFeatureClicked]);

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
      drawingManagerRef.current.clearDrawing();
      drawingManagerRef.current.startEraserPreview();
      useMapStore.getState().setActiveToolId("mymaps-eraser");
    } else {
      drawingManagerRef.current.startDrawing(drawType, drawColor, drawStyle || undefined);
    }

    // Dismiss any open identify/property popup so it doesn't obscure the drawing area.
    if (drawType !== "Cancel") {
      usePopupStore.getState().hide();
    }

    // Notify listeners (GlobalDrawingOptionsPopup closes its overlay on this event).
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

      // Update the store item first
      updateItem(featureId, { labelVisible: visible });

      // Use setTimeout to ensure store update has completed
      setTimeout(() => {
        // Get the fresh updated item from store
        const currentItems = useMyMapsStore.getState().items;
        const item = currentItems.find((item) => item.id === featureId);

        if (item && drawingManagerRef.current) {
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

      // Update the store item first
      updateItem(featureId, { labelRotation: rotation });

      // Use setTimeout to ensure store update has completed, then use setFeatureLabel
      // which properly applies all label style properties including rotation
      setTimeout(() => {
        const currentItems = useMyMapsStore.getState().items;
        const item = currentItems.find((item) => item.id === featureId);

        if (item && drawingManagerRef.current && item.labelVisible) {
          // Use setFeatureLabel which properly handles all label style properties
          drawingManagerRef.current.setFeatureLabel(item);
        }
      }, 0);
    };

    // Handle label style changes (for callouts and text labels)
    const handleLabelStyleChange = (data?: { [key: string]: unknown }) => {
      if (!data || !data.id || !data.labelStyle) {
        console.warn("❌ MyMapsService: Invalid data for label style change", {
          data,
          hasId: !!data?.id,
          hasLabelStyle: !!data?.labelStyle,
        });
        return;
      }

      const featureId = data.id as string;
      const labelStyle = data.labelStyle as Record<string, unknown>;

      // Update the store item first
      updateItem(featureId, { labelStyle });

      // Use setTimeout to ensure store update has completed
      setTimeout(() => {
        // Get the fresh updated item from store
        const currentItems = useMyMapsStore.getState().items;
        const item = currentItems.find((item) => item.id === featureId);

        if (item && drawingManagerRef.current && item.labelVisible) {
          drawingManagerRef.current.setFeatureLabel(item);
        }
      }, 0);
    };

    const handleStyleUpdate = (data?: { [key: string]: unknown }) => {
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

      if (drawingManagerRef.current) {
        // For now, we'll continue using the existing updateFeatureStyle method
        // but we should convert the style object to styleJSON if needed
        drawingManagerRef.current.updateFeatureStyle(featureId, style, pointType);
      } else {
        console.warn("❌ MyMapsService: Cannot update feature style - no drawing manager");
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
    const labelStyleId = addListener("mymap-label-style-change", handleLabelStyleChange);

    // Style event handler
    const styleUpdateId = addListener("mymap-style-updated", handleStyleUpdate);

    return () => {
      removeListener(hoverStartId);
      removeListener(hoverEndId);
      removeListener(zoomToId);
      removeListener(labelChangeId);
      removeListener(labelVisibilityId);
      removeListener(labelRotationId);
      removeListener(labelStyleId);
      removeListener(styleUpdateId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, addItem, emit]);

  // This component doesn't render anything - it's a service component
  return null;
}
