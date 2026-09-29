import { Layer } from "ol/layer";
import Overlay from "ol/Overlay";
import { useLayerManagerStore, type LayerCategory } from "@/stores/layerManagerStore";
import { useMapStore } from "@/stores/mapStore";

export interface AddLayerOptions {
  index?: number;
  id?: string;
  metadata?: Record<string, unknown>;
  visible?: boolean;
  opacity?: number;
  /** Whether this layer participates in map click identification/popups */
  clickable?: boolean;
  /**
   * Per-feature parcel-click suppression. When a click hits one of this layer's features
   * (sync vector hit-test) OR an aggregated handler result is tagged with this layer's id,
   * the property-report-click result is filtered out before the popup renders.
   */
  suppressParcelClick?: boolean;
  /**
   * Always-on parcel-click suppression. While the layer is registered, the property-report
   * click handler is short-circuited unconditionally. Replaces the legacy
   * `useDisableParcelClick(true)` pattern.
   */
  suppressParcelClickAlways?: boolean;
  /**
   * While the layer is registered, contextmenu (right-click) events are suppressed so the
   * map context menu does not appear. Useful for tools that add their own click handler and
   * want a clean map canvas.
   */
  suppressRightClick?: boolean;
}

/**
 * LayerManager - Central utility for managing map layers with proper categorization and z-index ordering
 */
export class LayerManager {
  // Track managed overlays by ID
  private static overlays = new Map<string, Overlay>();

  /**
   * Add an OL Overlay to the map, tracked by a unique ID.
   * @param id - Unique identifier for the overlay
   * @param overlay - OpenLayers Overlay instance
   * @returns true if added successfully
   */
  static addOverlay(id: string, overlay: Overlay): boolean {
    const map = useMapStore.getState().map;
    if (!map) {
      console.error("❌ Map not available - cannot add overlay");
      return false;
    }
    if (LayerManager.overlays.has(id)) {
      console.warn(`⚠️ Overlay "${id}" already managed — removing old one first`);
      LayerManager.removeOverlay(id);
    }
    map.addOverlay(overlay);
    LayerManager.overlays.set(id, overlay);
    return true;
  }

  /**
   * Remove a managed overlay from the map.
   * @param id - Overlay ID previously passed to addOverlay
   * @returns true if the overlay was found and removed
   */
  static removeOverlay(id: string): boolean {
    const overlay = LayerManager.overlays.get(id);
    if (!overlay) return false;

    const map = useMapStore.getState().map;
    if (map) {
      map.removeOverlay(overlay);
    }
    LayerManager.overlays.delete(id);
    return true;
  }

  /**
   * Get a managed overlay by ID.
   */
  static getOverlay(id: string): Overlay | undefined {
    return LayerManager.overlays.get(id);
  }
  /**
   * Add a layer to the map with proper category management and z-index ordering
   * @param layer - OpenLayers layer instance
   * @param category - Layer category (BaseMap, TOC, MyMaps, Tools, Graphics, Popup)
   * @param name - Human-readable layer name
   * @param options - Additional options for layer configuration
   * @returns Layer ID for future reference
   */
  static addLayer(layer: Layer, category: LayerCategory, name: string, options: AddLayerOptions = {}): string | null {
    // Get the map instance
    const map = useMapStore.getState().map;
    if (!map) {
      console.error("❌ Map not available - cannot add layer");
      return null;
    }

    // Guard: prevent adding the same OL layer object twice
    const existingMapLayers = map.getLayers().getArray();
    if (existingMapLayers.includes(layer)) {
      console.warn(`⚠️ Layer "${name}" already exists on map - skipping duplicate add`);
      // Check if it's already registered in the store
      const store = useLayerManagerStore.getState();
      const allManaged = store.getAllLayers();
      const existing = allManaged.find((m) => m.layer === layer);
      return existing?.id ?? null;
    }

    // Set layer properties if provided
    if (options.visible !== undefined) {
      layer.setVisible(options.visible);
    }

    if (options.opacity !== undefined) {
      layer.setOpacity(options.opacity);
    }

    // Add layer to map first
    map.addLayer(layer);

    // Register with layer manager
    const layerId = useLayerManagerStore.getState().addLayer(layer, category, name, {
      index: options.index,
      id: options.id,
      metadata: options.metadata,
      clickable: options.clickable,
      suppressParcelClick: options.suppressParcelClick,
      suppressParcelClickAlways: options.suppressParcelClickAlways,
      suppressRightClick: options.suppressRightClick,
    });

    return layerId;
  }

  /**
   * Remove a layer from the map and layer manager
   * @param layerId - Layer ID returned from addLayer
   * @returns Success status
   */
  static removeLayer(layerId: string): boolean {
    const layerManager = useLayerManagerStore.getState();
    const managedLayer = layerManager.getLayer(layerId);

    if (!managedLayer) {
      console.warn(`⚠️ Layer ${layerId} not found in layer manager`);
      return false;
    }

    // Get the map instance
    const map = useMapStore.getState().map;
    if (map) {
      // Remove from map
      map.removeLayer(managedLayer.layer);
    }

    // Remove from layer manager
    const success = layerManager.removeLayer(layerId);

    if (success) {
      // console.log(`🗑️ Removed layer "${managedLayer.name}" from map (ID: ${layerId})`);
    }

    return success;
  }

  /**
   * Move a layer to a different category or position
   * @param layerId - Layer ID
   * @param newCategory - Target category
   * @param newIndex - Target index within category (optional)
   * @returns Success status
   */
  static moveLayer(layerId: string, newCategory: LayerCategory, newIndex?: number): boolean {
    const layerManager = useLayerManagerStore.getState();
    return layerManager.moveLayer(layerId, newCategory, newIndex);
  }

  /**
   * Update layer visibility
   * @param layerId - Layer ID
   * @param visible - Visibility state
   * @returns Success status
   */
  static setLayerVisibility(layerId: string, visible: boolean): boolean {
    const layerManager = useLayerManagerStore.getState();
    return layerManager.updateLayerVisibility(layerId, visible);
  }

  /**
   * Update layer opacity
   * @param layerId - Layer ID
   * @param opacity - Opacity value (0-1)
   * @returns Success status
   */
  static setLayerOpacity(layerId: string, opacity: number): boolean {
    const layerManager = useLayerManagerStore.getState();
    return layerManager.updateLayerOpacity(layerId, opacity);
  }

  /**
   * Get all layers in a specific category
   * @param category - Layer category
   * @returns Array of managed layers
   */
  static getLayersByCategory(category: LayerCategory) {
    const layerManager = useLayerManagerStore.getState();
    return layerManager.getLayersByCategory(category);
  }

  /**
   * Get a specific layer by ID
   * @param layerId - Layer ID
   * @returns Managed layer or null
   */
  static getLayer(layerId: string) {
    const layerManager = useLayerManagerStore.getState();
    return layerManager.getLayer(layerId);
  }

  /**
   * Get all layers across all categories, sorted by z-index
   * @returns Array of all managed layers
   */
  static getAllLayers() {
    const layerManager = useLayerManagerStore.getState();
    return layerManager.getAllLayers();
  }

  /**
   * Clear all layers in a specific category
   * @param category - Layer category to clear
   */
  static clearCategory(category: LayerCategory): void {
    const layerManager = useLayerManagerStore.getState();
    const layersToRemove = layerManager.getLayersByCategory(category);

    // Remove from map first
    const map = useMapStore.getState().map;
    if (map) {
      layersToRemove.forEach((managedLayer) => {
        map.removeLayer(managedLayer.layer);
      });
    }

    // Clear from layer manager
    layerManager.clearCategory(category);

    // console.log(`🧹 Cleared ${layersToRemove.length} layers from category: ${category}`)
  }

  /**
   * Clear all layers from all categories
   */
  static clearAllLayers(): void {
    const layerManager = useLayerManagerStore.getState();
    const allLayers = layerManager.getAllLayers();

    // Remove from map first
    const map = useMapStore.getState().map;
    if (map) {
      allLayers.forEach((managedLayer) => {
        map.removeLayer(managedLayer.layer);
      });
    }

    // Clear from layer manager
    layerManager.clearAllLayers();

    // console.log(`🧹 Cleared ${allLayers.length} layers from all categories`);
  }

  /**
   * Returns true if any registered layer has `suppressParcelClickAlways === true`.
   * Used by the InteractionManager to short-circuit the property-report click handler.
   */
  static hasAlwaysSuppressLayer(): boolean {
    const all = useLayerManagerStore.getState().getAllLayers();
    return all.some((l) => l.suppressParcelClickAlways);
  }

  /**
   * Returns true if any registered layer has `suppressRightClick === true`.
   * Used by the InteractionManager to suppress contextmenu events.
   */
  static hasRightClickSuppressLayer(): boolean {
    const all = useLayerManagerStore.getState().getAllLayers();
    return all.some((l) => l.suppressRightClick);
  }

  /**
   * IDs of currently-registered layers with `suppressParcelClick === true`. Used by the
   * post-aggregation filter to drop the property-report result when one of these layers
   * produced a hit.
   */
  static getSuppressLayerIds(): Set<string> {
    const all = useLayerManagerStore.getState().getAllLayers();
    return new Set(all.filter((l) => l.suppressParcelClick).map((l) => l.id));
  }

  /**
   * Debug helper to log current layer order
   */
  static logLayerOrder(): void {
    const layerManager = useLayerManagerStore.getState();
    layerManager.logLayerOrder();
  }

  /**
   * Get the next available z-index for a category
   * @param category - Layer category
   * @param index - Specific index within category (optional)
   * @returns Z-index value
   */
  static getNextZIndex(category: LayerCategory, index?: number): number {
    const layerManager = useLayerManagerStore.getState();
    return layerManager.getNextZIndex(category, index);
  }

  /**
   * Reorder all layers in a category to fix z-index gaps
   * @param category - Layer category to reorder
   */
  static reorderCategory(category: LayerCategory): void {
    const layerManager = useLayerManagerStore.getState();
    layerManager.reorderCategory(category);
  }
}

// Convenience functions for common operations
export const addLayer = LayerManager.addLayer.bind(LayerManager);
export const removeLayer = LayerManager.removeLayer.bind(LayerManager);
export const moveLayer = LayerManager.moveLayer.bind(LayerManager);
export const setLayerVisibility = LayerManager.setLayerVisibility.bind(LayerManager);
export const setLayerOpacity = LayerManager.setLayerOpacity.bind(LayerManager);
export const getLayersByCategory = LayerManager.getLayersByCategory.bind(LayerManager);
export const getLayer = LayerManager.getLayer.bind(LayerManager);
export const getAllLayers = LayerManager.getAllLayers.bind(LayerManager);
export const clearCategory = LayerManager.clearCategory.bind(LayerManager);
export const clearAllLayers = LayerManager.clearAllLayers.bind(LayerManager);
export const logLayerOrder = LayerManager.logLayerOrder.bind(LayerManager);

// Export types for convenience
export type { LayerCategory, ManagedLayer } from "@/stores/layerManagerStore";
