/**
 * InteractionManager — single canonical entry point for all map-interaction concerns.
 *
 * Owns:
 *   • Handler registry (singleclick / contextmenu / pointermove / dblclick)
 *   • OL interaction lifecycle (Draw / Modify / Translate / Snap / Rotate, etc.)
 *   • Tool-active gating: when `mapStore.activeToolId` is set, singleclick is
 *     suppressed (with a `mymaps-eraser` exception so the eraser can detect
 *     which feature to remove).
 *   • Per-layer parcel-click suppression: synchronous vector hit-test reads the
 *     `suppressParcelClick` / `suppressParcelClickAlways` properties that
 *     `LayerManager.addLayer` mirrors onto each OL layer.
 *   • Post-aggregation suppression filter: after all singleclick handlers
 *     resolve, if any non-property-report result carries a `layerId` belonging
 *     to a layer with `suppressParcelClick === true`, the
 *     `property-report-click` results are dropped before the popup renders.
 *     This unifies the behaviour for synchronous vector layers and
 *     asynchronous WMS/ArcGIS identify layers.
 *   • Contextmenu dispatch with `preventDefault`.
 *
 * Replaces the previous trio of `UnifiedInteraction` (inline in MapContainer),
 * `ParcelClickInteraction.ts`, and `ContextMenuInteraction.ts`.
 */

import type Map from "ol/Map";
import { Interaction } from "ol/interaction";
import type { MapBrowserEvent } from "ol";
import VectorLayer from "ol/layer/Vector";

import type { Result } from "@/components/ResultsPopup";
import { useInteractionManagerStore, type InteractionEventType, type InteractionHandler, type InteractionResult } from "@/stores/interactionManagerStore";
import { useMapStore } from "@/stores/mapStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";

const PROPERTY_REPORT_HANDLER_ID = "property-report-click";
const MYMAPS_HANDLER_ID = "mymaps-feature-click";
const DOUBLE_CLICK_THRESHOLD_MS = 300;

/** ID of a logical handler (e.g. "property-report-click") that is currently disabled. */
type HandlerFilter = (handler: InteractionHandler, event: MapBrowserEvent<PointerEvent>) => boolean;

interface AggregationCallbacks {
  /** Called immediately when a singleclick begins handling, before handlers run. */
  onClickStart: (coordinate: number[]) => number; // returns the click "generation"
  /** Called when all handlers resolve and results are ready to render. */
  onClickResults: (results: Result[], generation: number) => void;
  /** Called when handlers fail and we want to clear the loading state. */
  onClickError: (generation: number) => void;
}

export class InteractionManager extends Interaction {
  private static instance: InteractionManager | null = null;
  private static handlerFilter: HandlerFilter | null = null;
  private static aggregationCallbacks: AggregationCallbacks | null = null;

  private lastClickTime = 0;

  /**
   * Attach the singleton InteractionManager to the given map. If an instance
   * already exists (e.g. across HMR), it is reused and re-attached.
   */
  static attach(map: Map): InteractionManager {
    if (!InteractionManager.instance) {
      InteractionManager.instance = new InteractionManager();
    }
    const existing = InteractionManager.instance;
    // If the map already has the instance, do nothing; otherwise add it.
    const present = map.getInteractions().getArray().includes(existing);
    if (!present) {
      map.addInteraction(existing);
    }
    return existing;
  }

  static getInstance(): InteractionManager | null {
    return InteractionManager.instance;
  }

  /**
   * Wire up the React-side callbacks used to render aggregated singleclick
   * results. Called once from MapContainer after the map mounts; refreshed if
   * deps change. Setting again replaces the previous callbacks.
   */
  static setAggregationCallbacks(callbacks: AggregationCallbacks): void {
    InteractionManager.aggregationCallbacks = callbacks;
  }

  /**
   * Wire up the per-handler condition filter (zoom/scale/disable-flags/layer
   * filters). The filter has access to map state that lives in React refs,
   * which is why it is supplied externally.
   */
  static setHandlerFilter(filter: HandlerFilter): void {
    InteractionManager.handlerFilter = filter;
  }

  // ---------------------------------------------------------------------------
  // Handler registry — mirrors the underlying Zustand store so callers have one
  // import. Same surface as `useInteractionManagerStore`.
  // ---------------------------------------------------------------------------

  static registerHandler(handler: InteractionHandler): void {
    useInteractionManagerStore.getState().registerHandler(handler);
  }

  static unregisterHandler(handlerId: string): void {
    useInteractionManagerStore.getState().unregisterHandler(handlerId);
  }

  static getHandlers(eventType?: InteractionEventType): InteractionHandler[] {
    return useInteractionManagerStore.getState().getHandlers(eventType);
  }

  static registerInteraction(id: string, interaction: Interaction, owner = "unknown"): void {
    useInteractionManagerStore.getState().registerInteraction(id, interaction, owner);
  }

  static unregisterInteraction(id: string): void {
    useInteractionManagerStore.getState().unregisterInteraction(id);
  }

  static unregisterAllByOwner(owner: string): void {
    useInteractionManagerStore.getState().unregisterAllByOwner(owner);
  }

  // ---------------------------------------------------------------------------
  // Layer hit-test helper (absorbed from former ParcelClickInteraction)
  // ---------------------------------------------------------------------------

  /**
   * Synchronous check: returns true if the property-report-click handler
   * should be suppressed for this event, based on:
   *   • Any registered layer carrying `suppressParcelClickAlways` (regardless
   *     of where the user clicked), OR
   *   • A vector layer at the clicked pixel carrying `suppressParcelClick` or
   *     the legacy `disableParcelClick` property.
   *
   * Asynchronous suppression for WMS/ArcGIS (raster) layers is handled by the
   * post-aggregation filter inside `handleEvent`.
   */
  static checkLayersForDisable(event: MapBrowserEvent<PointerEvent>): boolean {
    if (LayerManager.hasAlwaysSuppressLayer()) {
      return true;
    }

    const map = event.map;
    let shouldDisable = false;

    map.forEachFeatureAtPixel(
      event.pixel,
      (_feature, layer) => {
        if (layer && (layer.get("suppressParcelClick") === true || layer.get("suppressParcelClickAlways") === true || layer.get("disableParcelClick") === true)) {
          shouldDisable = true;
          return true;
        }
      },
      {
        layerFilter: (layer) =>
          layer instanceof VectorLayer &&
          layer.getVisible() &&
          (layer.get("suppressParcelClick") === true || layer.get("suppressParcelClickAlways") === true || layer.get("disableParcelClick") === true),
      },
    );

    return shouldDisable;
  }

  // ---------------------------------------------------------------------------
  // Dispatcher (absorbed from former UnifiedInteraction)
  // ---------------------------------------------------------------------------

  override handleEvent(event: MapBrowserEvent<PointerEvent>): boolean {
    const eventType = event.type as InteractionEventType;

    // Suppress the right-click context menu when any registered layer requests it.
    if (eventType === "contextmenu" && LayerManager.hasRightClickSuppressLayer()) {
      event.originalEvent.preventDefault();
      return false;
    }

    const handlerFilter = InteractionManager.handlerFilter ?? (() => true);
    const allHandlers = useInteractionManagerStore.getState().handlers;
    let applicableHandlers = allHandlers.filter((h) => h.eventType === eventType && handlerFilter(h, event));

    // Tool-gating: when a tool is active, singleclick is usually suppressed
    // so the tool's own OL interaction handles events. To support tools that
    // still rely on the singleclick pipeline (like the attribute-table select
    // handler), allow the handler whose `id` matches `activeToolId` to run.
    // The MyMaps eraser remains an exception and is allowed to run via the
    // original pipeline.
    if (eventType === "singleclick") {
      const toolId = useMapStore.getState().activeToolId;
      if (toolId && toolId !== "mymaps-eraser") {
        const matching = applicableHandlers.filter((h) => h.id === toolId);
        if (matching.length === 0) {
          // No handler registered for the active tool — suppress as before.
          return false;
        }
        // Only run the matching handler(s) for the active tool.
        applicableHandlers = matching;
      }
    }

    if (applicableHandlers.length === 0) {
      return true;
    }

    if (eventType === "singleclick") {
      const now = event.originalEvent.timeStamp;
      if (this.lastClickTime && now - this.lastClickTime < DOUBLE_CLICK_THRESHOLD_MS) {
        return false;
      }
      this.lastClickTime = now;
    }

    if (eventType === "contextmenu") {
      event.originalEvent.preventDefault();
    }

    if (eventType === "singleclick") {
      const callbacks = InteractionManager.aggregationCallbacks;
      const generation = callbacks?.onClickStart(event.coordinate) ?? 0;

      const handlerPromises = applicableHandlers.map(async (handler) => {
        try {
          const result = await Promise.resolve(handler.handler(event.coordinate, event.pixel, event));
          return { handler, result };
        } catch (error) {
          console.error(`Error executing handler "${handler.id}":`, error);
          return { handler, result: null };
        }
      });

      Promise.all(handlerPromises)
        .then((entries) => {
          const flat = InteractionManager.aggregateAndSuppress(entries);
          callbacks?.onClickResults(flat, generation);
        })
        .catch((error) => {
          console.error("Error collecting interaction results:", error);
          callbacks?.onClickError(generation);
        });

      return false;
    }

    // Non-singleclick events: fan out without aggregation.
    applicableHandlers.forEach((handler) => {
      try {
        handler.handler(event.coordinate, event.pixel, event);
      } catch (error) {
        console.error(`Error executing handler "${handler.id}":`, error);
      }
    });

    return false;
  }

  /**
   * Post-aggregation pipeline:
   *   1. Flatten all handler results.
   *   2. If any non-property-report result references a layer that has
   *      `suppressParcelClick === true`, drop every property-report-click
   *      result. This handles the async WMS/ArcGIS case where the suppressing
   *      layer doesn't return a hit until after the property-report handler
   *      has already been kicked off.
   *   3. Sort the survivors by layer z-index descending so the top-most layer
   *      appears first in the popup.
   *   4. Dev-mode warn when results lack `layerId` so we can incrementally
   *      tighten coverage of the new contract.
   */
  private static aggregateAndSuppress(entries: Array<{ handler: InteractionHandler; result: InteractionResult[] | void | null }>): Result[] {
    const suppressLayerIds = LayerManager.getSuppressLayerIds();
    let propertyReportSuppressed = false;
    let mymapsExclusive = false;
    const propertyReportResults: Result[] = [];
    const otherResults: Result[] = [];

    for (const { handler, result } of entries) {
      if (!Array.isArray(result) || result.length === 0) continue;
      // A MyMaps feature hit is exclusive: the MyMaps drawing popup renders
      // itself via the `mymap-show-drawing-options` event, so every identify /
      // property-report result for this click must be dropped to avoid a second
      // popup opening for an underlying TOC-layer feature. The MyMaps handler
      // returns a sentinel result purely to signal this hit; it is never
      // rendered through the aggregated results.
      if (handler.id === MYMAPS_HANDLER_ID) {
        mymapsExclusive = true;
        continue;
      }
      const isPropertyReport = handler.id === PROPERTY_REPORT_HANDLER_ID;
      for (const r of result) {
        if (process.env.NODE_ENV !== "production" && !r.layerId) {
          console.warn(`[InteractionManager] result from handler "${handler.id}" is missing layerId — suppression filter cannot match it`);
        }
        if (isPropertyReport) {
          propertyReportResults.push(r);
        } else {
          otherResults.push(r);
          if (r.layerId && suppressLayerIds.has(r.layerId)) {
            propertyReportSuppressed = true;
          }
        }
      }
    }

    if (mymapsExclusive) return [];

    const flat = propertyReportSuppressed ? otherResults : [...propertyReportResults, ...otherResults];
    flat.sort((a, b) => (b.layerZIndex ?? 0) - (a.layerZIndex ?? 0));
    return flat;
  }
}
