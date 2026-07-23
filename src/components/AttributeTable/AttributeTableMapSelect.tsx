"use client";

/**
 * AttributeTableMapSelect
 * ----------------------------------------------------------------------------
 * Headless component that enables map-based feature selection for the
 * attribute table. When rendered, it registers:
 *   1. A singleclick handler to select individual features
 *   2. A DragBox interaction for Shift+drag box selection
 *
 * Features selected on the map are matched against the loaded store.fids
 * and added to the tab's selection.
 */

import { useEffect, useCallback } from "react";
import { DragBox } from "ol/interaction";
import { shiftKeyOnly } from "ol/events/condition";
import type { MapBrowserEvent } from "ol";
import { useMapStore } from "@/stores/mapStore";
import { useAttributeTableStore, type AttributeTableTab } from "@/stores/attributeTableStore";
import { useInteractionManagerStore } from "@/stores/interactionManagerStore";
import { selectFeaturesByExtent } from "@/lib/attributeTable/mapIntegration";

const HANDLER_ID = "attribute-table-select";
const DRAGBOX_ID = "attribute-table-box-select";
const OWNER = "attributeTable";

// Pixel tolerance for click selection (converted to map units based on resolution)
const CLICK_TOLERANCE_PX = 5;

interface Props {
  tab: AttributeTableTab;
}

export default function AttributeTableMapSelect({ tab }: Props) {
  const map = useMapStore((s) => s.map);
  const setActiveToolId = useMapStore((s) => s.setActiveToolId);
  const toggleSelection = useAttributeTableStore((s) => s.toggleSelection);
  const setSelection = useAttributeTableStore((s) => s.setSelection);

  const registerHandler = useInteractionManagerStore((s) => s.registerHandler);
  const unregisterHandler = useInteractionManagerStore((s) => s.unregisterHandler);
  const registerInteraction = useInteractionManagerStore((s) => s.registerInteraction);
  const unregisterInteraction = useInteractionManagerStore((s) => s.unregisterInteraction);

  // Build a small extent around a coordinate for point-click selection
  const coordToExtent = useCallback(
    (coord: number[]): [number, number, number, number] | null => {
      if (!map) return null;
      const resolution = map.getView().getResolution() ?? 1;
      const tolerance = CLICK_TOLERANCE_PX * resolution;
      return [coord[0] - tolerance, coord[1] - tolerance, coord[0] + tolerance, coord[1] + tolerance];
    },
    [map],
  );

  // --- Singleclick handler ---
  useEffect(() => {
    if (!map) return;

    // Set active tool to suppress property report and other click handlers
    setActiveToolId(HANDLER_ID);

    const handler = (coordinate: number[], _pixel: number[], event: MapBrowserEvent<PointerEvent>) => {
      const extent = coordToExtent(coordinate);
      if (!extent) return [];

      const fids = selectFeaturesByExtent(tab, extent);
      const additive = event.originalEvent.shiftKey || event.originalEvent.ctrlKey || event.originalEvent.metaKey;

      if (fids.length === 0) {
        // Clicked empty space — clear selection unless additive
        if (!additive) {
          setSelection(tab.layerId, []);
        }
      } else if (fids.length === 1) {
        // Single feature — replace selection unless a modifier is held
        if (additive) {
          // Toggle/add the single feature
          toggleSelection(tab.layerId, fids[0], true);
        } else {
          // Replace selection with the single clicked feature
          setSelection(tab.layerId, [fids[0]]);
        }
      } else {
        // Multiple features at click point — select all (additive merges)
        if (additive) {
          // Add to existing selection
          const current = useAttributeTableStore.getState().tabs.find((t) => t.layerId === tab.layerId)?.selection ?? new Set<string>();
          const merged = new Set(current);
          for (const fid of fids) merged.add(fid);
          setSelection(tab.layerId, Array.from(merged));
        } else {
          setSelection(tab.layerId, fids);
        }
      }

      // Return empty to suppress popup
      return [];
    };

    registerHandler({
      id: HANDLER_ID,
      eventType: "singleclick",
      priority: 5, // higher priority than property report (10)
      handler,
    });

    return () => {
      unregisterHandler(HANDLER_ID);
      setActiveToolId(null);
    };
  }, [map, tab, coordToExtent, registerHandler, unregisterHandler, setActiveToolId, toggleSelection, setSelection]);

  // --- DragBox interaction for Shift+drag box selection ---
  useEffect(() => {
    if (!map) return;

    const dragBox = new DragBox({
      condition: shiftKeyOnly,
      className: "ol-dragbox", // default styling
    });

    dragBox.on("boxend", () => {
      const extent = dragBox.getGeometry().getExtent() as [number, number, number, number];
      const fids = selectFeaturesByExtent(tab, extent);
      // Box select replaces the current selection
      setSelection(tab.layerId, fids);
    });

    registerInteraction(DRAGBOX_ID, dragBox, OWNER);

    return () => {
      unregisterInteraction(DRAGBOX_ID);
    };
  }, [map, tab, registerInteraction, unregisterInteraction, setSelection]);

  // This is a headless component — no UI
  return null;
}
