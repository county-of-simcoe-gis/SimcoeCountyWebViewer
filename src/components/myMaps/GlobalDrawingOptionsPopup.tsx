"use client";

import React, { useEffect, useState } from "react";
import { useEventStore } from "@/stores/eventStore";
import { useMyMapsStore } from "@/stores/myMapsStore";
import DrawingOptionsPopup from "./DrawingOptionsPopup";
import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";
import { useMapStore } from "@/stores/mapStore";
import type { Coordinate } from "ol/coordinate";

/**
 * GlobalDrawingOptionsPopup - Manages the drawing options popup globally
 * This allows the popup to be triggered even when the MyMaps panel is closed
 */
export default function GlobalDrawingOptionsPopup() {
  // Drawing Options Popup state - store item ID instead of full item to avoid stale data
  const [drawingOptionsItemId, setDrawingOptionsItemId] = useState<string | null>(null);
  const [drawingOptionsPosition, setDrawingOptionsPosition] = useState({ x: 0, y: 0 });
  const [isDrawingOptionsOpen, setIsDrawingOptionsOpen] = useState(false);

  const { emit, addListener, removeListener } = useEventStore();
  const { items, removeItem, updateItemLabel, updateItemLabelVisibility, updateItemLabelRotation } = useMyMapsStore();
  const map = useMapStore((state) => state.map);

  // Get fresh item data from store (reactive subscription)
  const drawingOptionsItem = drawingOptionsItemId ? items.find((item) => item.id === drawingOptionsItemId) || null : null;

  // Listen for changes in the myMapsStore and update the item state
  useEffect(() => {
    const unsubscribe = useMyMapsStore.subscribe((state, prevState) => {
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

  const handleDrawingOptionsTools = React.useCallback(
    (item: MyMapsItemType) => {
      emit("mymap-drawing-options-tools", { item });
    },
    [emit]
  );

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
  );
}
