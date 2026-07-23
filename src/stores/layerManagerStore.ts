import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Layer } from "ol/layer";
import LayerOrderConfig from "@/utils/openlayers/LayerOrderConfig.json";
import { calculateZIndex } from "@/stores/tocStore";
import { reprojectExtentToWebMercator } from "@/utils/coordinateConversion";

// Layer category types
export type LayerCategory = "BaseMap" | "TOC" | "MyMaps" | "Themes" | "Tools" | "Graphics" | "Overlay" | "Popup";

// Image cache interface for legend images
export interface ImageCacheEntry {
  url: string;
  width: number;
  height: number;
  loadedAt: Date;
  isLoading: boolean;
  error?: string;
}

// Managed layer interface
export interface ManagedLayer {
  id: string;
  name: string;
  category: LayerCategory;
  layer: Layer;
  zIndex: number;
  visible: boolean;
  opacity: number;
  /** Whether this layer participates in map click identification/popups */
  clickable: boolean;
  /**
   * Per-feature suppression: when a click hits one of this layer's features (sync vector hit-test)
   * OR this layer returns a result from an async identify handler, drop the property-report-click
   * result before the unified popup is shown.
   */
  suppressParcelClick: boolean;
  /**
   * Always-on suppression: while this layer is registered, the property-report click handler is
   * short-circuited unconditionally. Replaces the legacy `useDisableParcelClick(true)` pattern.
   */
  suppressParcelClickAlways: boolean;
  /**
   * While this layer is registered, contextmenu (right-click) events are suppressed.
   */
  suppressRightClick: boolean;
  metadata?: Record<string, unknown>;
  addedAt: Date;
}

// Layer manager state
interface LayerManagerState {
  // All managed layers organized by category
  layers: Record<LayerCategory, ManagedLayer[]>;

  // Next available z-index for each category
  nextZIndex: Record<LayerCategory, number>;

  // Global opacity multiplier (0.0 to 1.0)
  globalOpacity: number;

  // Image cache for legend images
  imageCache: Record<string, ImageCacheEntry>;

  // Actions
  addLayer: (
    layer: Layer,
    category: LayerCategory,
    name: string,
    options?: {
      index?: number;
      id?: string;
      metadata?: Record<string, unknown>;
      /** Whether this layer participates in map click identification/popups */
      clickable?: boolean;
      /** Per-feature parcel-click suppression — see ManagedLayer.suppressParcelClick */
      suppressParcelClick?: boolean;
      /** Always-on parcel-click suppression — see ManagedLayer.suppressParcelClickAlways */
      suppressParcelClickAlways?: boolean;
      /** Right-click suppression — see ManagedLayer.suppressRightClick */
      suppressRightClick?: boolean;
    },
  ) => string;

  removeLayer: (layerId: string) => boolean;

  moveLayer: (layerId: string, newCategory: LayerCategory, newIndex?: number) => boolean;

  updateLayerVisibility: (layerId: string, visible: boolean) => boolean;

  updateLayerOpacity: (layerId: string, opacity: number) => boolean;

  getLayer: (layerId: string) => ManagedLayer | null;

  getLayersByCategory: (category: LayerCategory) => ManagedLayer[];

  getAllLayers: () => ManagedLayer[];

  /** Get all clickable and visible layers, sorted by z-index descending (top-most first) */
  getClickableLayers: () => ManagedLayer[];

  /** Update the clickable property of a managed layer */
  updateLayerClickable: (layerId: string, clickable: boolean) => boolean;

  reorderCategory: (category: LayerCategory) => void;

  getNextZIndex: (category: LayerCategory, index?: number) => number;

  // Get layer extent
  getLayerExtent: (layerId: string) => number[] | { needsCapabilities: boolean; wmsUrl: string; layerName: string } | { needsArcGISExtent: boolean; metadataUrl: string } | null;

  // Global opacity methods
  setGlobalOpacity: (opacity: number) => void;
  getGlobalOpacity: () => number;

  // Image cache methods
  getCachedImage: (url: string) => ImageCacheEntry | null;
  cacheImage: (url: string) => Promise<ImageCacheEntry>;
  clearImageCache: () => void;

  // Debug helpers
  logLayerOrder: () => void;

  // Cleanup
  clearCategory: (category: LayerCategory) => void;
  clearAllLayers: () => void;
}

// Helper function to generate unique layer ID
function generateLayerId(category: LayerCategory, name: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${category}_${name.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}_${random}`;
}

export const useLayerManagerStore = create<LayerManagerState>()(
  immer((set, get) => ({
    // Initial state
    layers: {
      BaseMap: [],
      TOC: [],
      MyMaps: [],
      Themes: [],
      Tools: [],
      Graphics: [],
      Overlay: [],
      Popup: [],
    },

    nextZIndex: {
      BaseMap: LayerOrderConfig.categories.BaseMap.zIndexRange.min,
      TOC: LayerOrderConfig.categories.TOC.zIndexRange.min,
      MyMaps: LayerOrderConfig.categories.MyMaps.zIndexRange.min,
      Themes: LayerOrderConfig.categories.Themes.zIndexRange.min,
      Tools: LayerOrderConfig.categories.Tools.zIndexRange.min,
      Graphics: LayerOrderConfig.categories.Graphics.zIndexRange.min,
      Overlay: LayerOrderConfig.categories.Overlay.zIndexRange.min,
      Popup: LayerOrderConfig.categories.Popup.zIndexRange.min,
    },

    // Global opacity multiplier (1.0 = full opacity)
    globalOpacity: 1.0,

    // Image cache for legend images
    imageCache: {},

    // Add a layer to the specified category
    addLayer: (layer, category, name, options = {}) => {
      const state = get();
      const categoryLayers = state.layers[category];

      // Guard: check if this exact OL layer object is already registered in any category
      const allCategories = Object.keys(state.layers) as LayerCategory[];
      for (const cat of allCategories) {
        const existing = state.layers[cat].find((m) => m.layer === layer);
        if (existing) {
          console.warn(`⚠️ Layer "${name}" (OL ref) already registered as "${existing.name}" in category "${cat}" — returning existing ID`);
          return existing.id;
        }
      }

      // Generate unique ID
      const id = options.id || generateLayerId(category, name);

      // Determine insertion index
      const insertIndex = options.index !== undefined ? Math.min(options.index, categoryLayers.length) : categoryLayers.length;

      // Calculate z-index
      const zIndex = calculateZIndex(category, insertIndex);

      const suppressParcelClick = options.suppressParcelClick ?? false;
      const suppressParcelClickAlways = options.suppressParcelClickAlways ?? false;
      const suppressRightClick = options.suppressRightClick ?? false;

      // Create managed layer object
      const managedLayer: ManagedLayer = {
        id,
        name,
        category,
        layer,
        zIndex,
        visible: layer.getVisible(),
        opacity: layer.getOpacity(),
        clickable: options.clickable ?? false,
        suppressParcelClick,
        suppressParcelClickAlways,
        suppressRightClick,
        metadata: options.metadata || {},
        addedAt: new Date(),
      };

      // Mirror suppression flags onto the OL layer instance so that synchronous
      // hit-tests (forEachFeatureAtPixel) can read them without going through the store.
      layer.set("suppressParcelClick", suppressParcelClick);
      layer.set("suppressParcelClickAlways", suppressParcelClickAlways);
      layer.set("suppressRightClick", suppressRightClick);

      // Set the z-index on the actual OpenLayers layer
      layer.setZIndex(zIndex);

      // New layers use their own configured opacity (global slider only affects layers present at the time it is moved)

      set((draft) => {
        // Insert layer at the specified index
        draft.layers[category].splice(insertIndex, 0, managedLayer);

        // Reorder all layers in this category to ensure proper z-indexing
        draft.layers[category].forEach((layer, idx) => {
          const newZIndex = calculateZIndex(category, idx);
          layer.zIndex = newZIndex;
          layer.layer.setZIndex(newZIndex);
        });

        // Update next available z-index
        draft.nextZIndex[category] = calculateZIndex(category, draft.layers[category].length);
      });

      return id;
    },

    // Remove a layer by ID
    removeLayer: (layerId) => {
      // First check if the layer exists without triggering set()
      const state = get();
      let layerExists = false;
      let targetCategory: LayerCategory | null = null;

      Object.keys(state.layers).forEach((category) => {
        const categoryKey = category as LayerCategory;
        const index = state.layers[categoryKey].findIndex((l) => l.id === layerId);
        if (index !== -1) {
          layerExists = true;
          targetCategory = categoryKey;
        }
      });

      // Only call set() if the layer actually exists
      if (!layerExists || !targetCategory) {
        return false;
      }

      set((draft) => {
        const categoryKey = targetCategory as LayerCategory;
        const index = draft.layers[categoryKey].findIndex((l) => l.id === layerId);
        if (index !== -1) {
          draft.layers[categoryKey].splice(index, 1);

          // Reorder remaining layers in this category
          draft.layers[categoryKey].forEach((layer, idx) => {
            const newZIndex = calculateZIndex(categoryKey, idx);
            layer.zIndex = newZIndex;
            layer.layer.setZIndex(newZIndex);
          });

          // Update next available z-index
          draft.nextZIndex[categoryKey] = calculateZIndex(categoryKey, draft.layers[categoryKey].length);
        }
      });

      return true;
    },

    // Move a layer to a different category or position
    moveLayer: (layerId, newCategory, newIndex) => {
      const state = get();
      let sourceCategory: LayerCategory | null = null;
      let managedLayer: ManagedLayer | null = null;

      // Find the layer
      Object.keys(state.layers).forEach((category) => {
        const categoryKey = category as LayerCategory;
        const layer = state.layers[categoryKey].find((l) => l.id === layerId);
        if (layer) {
          sourceCategory = categoryKey;
          managedLayer = layer;
        }
      });

      if (!managedLayer || !sourceCategory) {
        return false;
      }

      set((draft) => {
        // Remove from source category and take a draft copy
        const sourceIndex = draft.layers[sourceCategory!].findIndex((l) => l.id === layerId);
        const [removedLayer] = draft.layers[sourceCategory!].splice(sourceIndex, 1);

        // Update category on the draft object
        removedLayer.category = newCategory;

        // Insert into new category
        const insertIndex = newIndex !== undefined ? Math.min(newIndex, draft.layers[newCategory].length) : draft.layers[newCategory].length;

        draft.layers[newCategory].splice(insertIndex, 0, removedLayer);

        // Reorder both categories
        draft.layers[sourceCategory!].forEach((layer, idx) => {
          const newZIndex = calculateZIndex(sourceCategory!, idx);
          layer.zIndex = newZIndex;
          layer.layer.setZIndex(newZIndex);
        });

        draft.layers[newCategory].forEach((layer, idx) => {
          const newZIndex = calculateZIndex(newCategory, idx);
          layer.zIndex = newZIndex;
          layer.layer.setZIndex(newZIndex);
        });

        // Update next available z-index for both categories
        draft.nextZIndex[sourceCategory!] = calculateZIndex(sourceCategory!, draft.layers[sourceCategory!].length);
        draft.nextZIndex[newCategory] = calculateZIndex(newCategory, draft.layers[newCategory].length);
      });

      return true;
    },

    // Update layer visibility
    updateLayerVisibility: (layerId, visible) => {
      const state = get();
      const layer = state.getLayer(layerId);
      if (!layer) return false;

      // Update the OpenLayers layer directly (outside of Immer)
      if (layer.layer) {
        layer.layer.setVisible(visible);
      }

      set((draft) => {
        // Find and update the layer in the appropriate category
        Object.keys(draft.layers).forEach((category) => {
          const categoryKey = category as LayerCategory;
          const layerIndex = draft.layers[categoryKey].findIndex((l) => l.id === layerId);
          if (layerIndex !== -1) {
            draft.layers[categoryKey][layerIndex].visible = visible;
          }
        });
      });

      return true;
    },

    // Update layer opacity
    updateLayerOpacity: (layerId, opacity) => {
      const state = get();
      const layer = state.getLayer(layerId);
      if (!layer) return false;

      // Update the OpenLayers layer directly (outside of Immer)
      if (layer.layer) {
        layer.layer.setOpacity(opacity);
      }

      set((draft) => {
        // Find and update the layer in the appropriate category
        Object.keys(draft.layers).forEach((category) => {
          const categoryKey = category as LayerCategory;
          const layerIndex = draft.layers[categoryKey].findIndex((l) => l.id === layerId);
          if (layerIndex !== -1) {
            draft.layers[categoryKey][layerIndex].opacity = opacity;
          }
        });
      });

      return true;
    },

    // Get a specific layer by ID
    getLayer: (layerId) => {
      const state = get();
      for (const category of Object.keys(state.layers) as LayerCategory[]) {
        const layer = state.layers[category].find((l) => l.id === layerId);
        if (layer) return layer;
      }
      return null;
    },

    // Get all layers in a specific category
    getLayersByCategory: (category) => {
      return get().layers[category];
    },

    // Get all layers across all categories
    getAllLayers: () => {
      const state = get();
      const allLayers: ManagedLayer[] = [];
      Object.values(state.layers).forEach((categoryLayers) => {
        allLayers.push(...categoryLayers);
      });
      return allLayers.sort((a, b) => a.zIndex - b.zIndex);
    },

    // Get all clickable and visible layers, sorted by z-index descending (top-most first)
    getClickableLayers: () => {
      const state = get();
      const clickableLayers: ManagedLayer[] = [];
      Object.values(state.layers).forEach((categoryLayers) => {
        categoryLayers.forEach((layer) => {
          if (layer.clickable && layer.visible) {
            clickableLayers.push(layer);
          }
        });
      });
      return clickableLayers.sort((a, b) => b.zIndex - a.zIndex);
    },

    // Update the clickable property of a managed layer
    updateLayerClickable: (layerId, clickable) => {
      const state = get();
      let found = false;

      Object.keys(state.layers).forEach((category) => {
        const categoryKey = category as LayerCategory;
        const index = state.layers[categoryKey].findIndex((l) => l.id === layerId);
        if (index !== -1) {
          found = true;
        }
      });

      if (!found) return false;

      set((draft) => {
        Object.keys(draft.layers).forEach((category) => {
          const categoryKey = category as LayerCategory;
          const layer = draft.layers[categoryKey].find((l) => l.id === layerId);
          if (layer) {
            layer.clickable = clickable;
          }
        });
      });

      return true;
    },

    // Reorder all layers in a category
    reorderCategory: (category) => {
      set((draft) => {
        draft.layers[category].forEach((layer, idx) => {
          const newZIndex = calculateZIndex(category, idx);
          layer.zIndex = newZIndex;
          layer.layer.setZIndex(newZIndex);
        });

        draft.nextZIndex[category] = calculateZIndex(category, draft.layers[category].length);
      });
    },

    // Get the next z-index for a category
    getNextZIndex: (category, index) => {
      const state = get();
      const categoryLayers = state.layers[category];
      const insertIndex = index !== undefined ? index : categoryLayers.length;
      return calculateZIndex(category, insertIndex);
    },

    // Get layer extent using OpenLayers getExtent method
    getLayerExtent: (layerId) => {
      const state = get();
      const managedLayer = state.getLayer(layerId);

      if (!managedLayer || !managedLayer.layer) {
        return null;
      }

      try {
        const olLayer = managedLayer.layer;

        // ArcGIS layers: extent (if known) and spatial reference are captured at layer-build
        // time in tocHelpers.ts (buildESRILayer), since ImageArcGISRest/TileArcGISRest sources
        // don't expose usable extent info of their own. Handle this before the generic source
        // checks below so ArcGIS layers never fall into the WMS GetCapabilities path (Method 2),
        // which misfires for them (ImageArcGISRest also implements getParams()/getUrl()).
        if (managedLayer.metadata?.isArcGIS) {
          const rawExtent = managedLayer.metadata.extent as number[] | undefined;
          const extentWkid = managedLayer.metadata.extentWkid as number | string | undefined;

          if (rawExtent) {
            const reprojected = reprojectExtentToWebMercator(rawExtent, extentWkid);
            if (reprojected) {
              return reprojected;
            }
          }

          // No usable extent stored - signal the UI to fetch it from the ArcGIS REST
          // metadata endpoint (?f=json), which exposes extent/fullExtent + spatialReference.
          const arcgisMetadataUrl = managedLayer.metadata.arcgisMetadataUrl as string | undefined;
          if (arcgisMetadataUrl) {
            return { needsArcGISExtent: true, metadataUrl: arcgisMetadataUrl };
          }
        }

        // Method 1: Try to get extent from the layer source
        if ("getSource" in olLayer && typeof olLayer.getSource === "function") {
          const source = olLayer.getSource();

          if (source && "getExtent" in source && typeof source.getExtent === "function") {
            const extent = source.getExtent();

            // Validate the extent is not infinite or invalid
            if (extent && Array.isArray(extent) && extent.length === 4) {
              const [minX, minY, maxX, maxY] = extent;
              const isValidExtent =
                isFinite(minX) &&
                isFinite(minY) &&
                isFinite(maxX) &&
                isFinite(maxY) &&
                minX !== -Infinity &&
                minY !== -Infinity &&
                maxX !== Infinity &&
                maxY !== Infinity &&
                minX < maxX &&
                minY < maxY;

              if (isValidExtent) {
                // Check if extent seems to be in geographic coordinates (EPSG:4326)
                // If coordinates are in the range of lat/lon, we'll handle transformation in the UI layer
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const isGeographic = minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90;

                return extent;
              }
            } else {
            }
          }

          // Method 2: For WMS layers, try to get extent from source params or capabilities
          if (!managedLayer.metadata?.isArcGIS && source && "getParams" in source && typeof source.getParams === "function") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const params = (source as any).getParams();

            // Check if we have layer-specific extent information in metadata
            if (managedLayer.metadata && managedLayer.metadata.extent) {
              return managedLayer.metadata.extent as number[];
            }

            // Try to get the WMS URL from the source and make a GetCapabilities request
            if (source && "getUrl" in source && typeof source.getUrl === "function") {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const wmsUrl = (source as any).getUrl();

                if (wmsUrl && typeof wmsUrl === "string") {
                  const layerName = params.LAYERS;
                  if (layerName) {
                    // Make a synchronous attempt to get capabilities
                    // Note: This is a fallback - the UI layer will handle this better with async
                    // Return a special marker that indicates we should try GetCapabilities
                    return { needsCapabilities: true, wmsUrl, layerName };
                  }
                }
              } catch (error) {
                console.warn(`Failed to get WMS URL from source:`, error);
              }
            }
          }

          // Method 3: For Image sources, try to get projection extent
          if (source && "getProjection" in source && typeof source.getProjection === "function") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const projection = (source as any).getProjection();
            if (projection && "getExtent" in projection && typeof projection.getExtent === "function") {
              const projExtent = projection.getExtent();
              if (projExtent && Array.isArray(projExtent) && projExtent.length === 4) {
                // This might be the full projection extent, which could be too large
                // But it's better than nothing
                return projExtent;
              }
            }
          }
        }

        // Method 4: Fallback - try to get extent directly from the layer if it has the method
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ("getExtent" in olLayer && typeof (olLayer as any).getExtent === "function") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const extent = (olLayer as any).getExtent();

          if (extent && Array.isArray(extent) && extent.length === 4) {
            const [minX, minY, maxX, maxY] = extent;
            const isValidExtent =
              isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY) && minX !== -Infinity && minY !== -Infinity && maxX !== Infinity && maxY !== Infinity && minX < maxX && minY < maxY;

            if (isValidExtent) {
              return extent;
            }
          }
        }

        return null;
      } catch (error) {
        console.warn(`Failed to get extent for layer ${layerId}:`, error);
        return null;
      }
    },

    // Set global opacity – only stores the slider value. Per-layer opacity is
    // overwritten by tocStore.setGlobalOpacity via updateLayerOpacityById.
    setGlobalOpacity: (opacity) => {
      const clampedOpacity = Math.max(0, Math.min(1, opacity));
      set((draft) => {
        draft.globalOpacity = clampedOpacity;
      });
    },

    // Get current global opacity
    getGlobalOpacity: () => {
      return get().globalOpacity;
    },

    // Get cached image entry
    getCachedImage: (url) => {
      const state = get();
      return state.imageCache[url] || null;
    },

    // Cache an image and return its dimensions
    cacheImage: async (url) => {
      const state = get();

      // Check if already cached and not loading
      if (state.imageCache[url] && !state.imageCache[url].isLoading) {
        return state.imageCache[url];
      }

      // If already loading, wait for it to complete instead of starting a new request
      if (state.imageCache[url] && state.imageCache[url].isLoading) {
        // Wait for the existing request to complete
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            const currentCache = get().imageCache[url];
            if (currentCache && !currentCache.isLoading) {
              clearInterval(checkInterval);
              resolve(currentCache);
            }
          }, 50);

          // Timeout after 10 seconds to prevent infinite waiting
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve(
              get().imageCache[url] || {
                url,
                width: 0,
                height: 0,
                loadedAt: new Date(),
                isLoading: false,
                error: "Timeout waiting for image to load",
              },
            );
          }, 10000);
        });
      }

      // Set loading state
      set((draft) => {
        draft.imageCache[url] = {
          url,
          width: 0,
          height: 0,
          loadedAt: new Date(),
          isLoading: true,
        };
      });

      try {
        // Load the image to get dimensions
        const img = new Image();
        const loadPromise = new Promise<{ width: number; height: number }>((resolve, reject) => {
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        });

        img.src = url;
        const { width, height } = await loadPromise;

        // Update cache with loaded data
        const cacheEntry: ImageCacheEntry = {
          url,
          width,
          height,
          loadedAt: new Date(),
          isLoading: false,
        };

        set((draft) => {
          draft.imageCache[url] = cacheEntry;
        });

        return cacheEntry;
      } catch (error) {
        // Update cache with error
        const errorEntry: ImageCacheEntry = {
          url,
          width: 0,
          height: 0,
          loadedAt: new Date(),
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };

        set((draft) => {
          draft.imageCache[url] = errorEntry;
        });

        return errorEntry;
      }
    },

    // Clear image cache
    clearImageCache: () => {
      set((draft) => {
        draft.imageCache = {};
      });
    },

    // Debug helper to log current layer order
    logLayerOrder: () => {
      const state = get();
      // console.log("📊 Layer Manager - Current Layer Order:");

      Object.keys(state.layers).forEach((category) => {
        const categoryKey = category as LayerCategory;
        const categoryLayers = state.layers[categoryKey];

        if (categoryLayers.length > 0) {
          console.log(`\n  ${categoryKey} (${categoryLayers.length} layers):`);
          categoryLayers.forEach((layer, idx) => {
            console.log(`    [${idx}] z:${layer.zIndex} - ${layer.name} (visible: ${layer.visible}, opacity: ${layer.opacity})`, layer.metadata);
          });
        }
      });

      console.log("\n");
    },

    // Clear all layers in a category
    clearCategory: (category) => {
      set((draft) => {
        draft.layers[category] = [];
        draft.nextZIndex[category] = LayerOrderConfig.categories[category].zIndexRange.min;
      });
    },

    // Clear all layers
    clearAllLayers: () => {
      set((draft) => {
        Object.keys(draft.layers).forEach((category) => {
          const categoryKey = category as LayerCategory;
          draft.layers[categoryKey] = [];
          draft.nextZIndex[categoryKey] = LayerOrderConfig.categories[categoryKey].zIndexRange.min;
        });
      });
    },
  })),
);
