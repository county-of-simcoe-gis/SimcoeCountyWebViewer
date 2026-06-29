import { create } from "zustand";
import Map from "ol/Map";
import { setStorageItem, getStorageItem } from "@/utils/storage";

// Control visibility configuration
export interface ControlVisibility {
  rotate: boolean;
  fullScreen: boolean;
  zoomInOut: boolean;
  currentLocation: boolean;
  zoomExtent: boolean;
  scale: boolean;
  scaleLine: boolean;
  basemap: boolean;
  gitHubButton: boolean;
  scaleSelector: boolean;
  grid: boolean;
  extentHistory: boolean;
  attribution: boolean;
  attributeTable: boolean;
  shareMap: boolean;
}

const STORAGE_KEY_MAP_CONTROLS = "Map Control Settings";

// Map interaction states that were previously window variables
interface MapState {
  // Core map instance
  map: Map | null; // OpenLayers Map instance

  // Popup state
  popup: unknown | null; // Popup instance

  // Unified active tool tracking — single source of truth for "is some tool
  // currently owning the map click pipeline?" Replaces the previous mix of
  // disableParcelClick / disableIdentifyClick / isDrawingOrEditing /
  // isCoordinateToolOpen / isMeasuring booleans.
  activeToolId: string | null;

  // Map controls configuration
  mapControls: Record<string, unknown> | null;

  // Control visibility (runtime state)
  controlVisibility: ControlVisibility;

  // Control visibility defaults (captured at map initialization)
  // Used when "Reset to Defaults" is clicked — ensures reset uses the actual loaded map config
  mapControlDefaults: ControlVisibility | null;

  // Loading tracking (previously window.loaded array)
  loadedItems: string[];

  // Map state
  currentExtent: number[] | null;
  currentZoom: number | null;
  currentCenter: number[] | null;

  // Enhanced extent history
  extentHistory: Array<{ center: number[]; zoom: number }>;
  currentExtentIndex: number;

  // Actions
  setMap: (map: Map) => void;
  setPopup: (popup: unknown) => void;

  // Active tool management
  setActiveToolId: (toolId: string | null) => void;
  /**
   * Returns true if some tool is currently active. Pass an explicit `toolId`
   * to test for a specific tool (e.g. `isToolActive("mymaps-eraser")`).
   */
  isToolActive: (toolId?: string) => boolean;
  setMapControls: (controls: Record<string, unknown>) => void;

  // Control visibility actions
  setControlVisibility: (key: keyof ControlVisibility, value: boolean) => void;
  resetControlVisibilityToDefaults: (config: { controls?: Partial<ControlVisibility> }) => void;
  initControlVisibility: (config: { controls?: Partial<ControlVisibility> }) => void;

  // Loading management (replaces window.loaded array)
  addLoadedItem: (item: string) => void;
  removeLoadedItem: (item: string) => void;
  isItemLoaded: (item: string) => boolean;
  areItemsLoaded: (items: string | string[]) => boolean;
  clearLoadedItems: () => void;

  // Map state management
  setCurrentExtent: (extent: number[]) => void;
  setCurrentZoom: (zoom: number) => void;
  setCurrentCenter: (center: number[]) => void;

  // Enhanced extent history management
  initExtentHistory: (center: number[], zoom: number) => void;
  saveCurrentExtentToHistory: () => void;
  addToExtentHistory: (center: number[], zoom: number) => void;
  setCurrentExtentIndex: (index: number) => void;
}

// Helper function to get default control visibility from config
const getDefaultControlVisibility = (config?: { controls?: Partial<ControlVisibility> }): ControlVisibility => {
  return {
    rotate: config?.controls?.rotate ?? false,
    fullScreen: config?.controls?.fullScreen ?? true,
    zoomInOut: config?.controls?.zoomInOut ?? true,
    currentLocation: config?.controls?.currentLocation ?? true,
    zoomExtent: config?.controls?.zoomExtent ?? true,
    scale: config?.controls?.scale ?? true,
    scaleLine: config?.controls?.scaleLine ?? true,
    basemap: config?.controls?.basemap ?? true,
    gitHubButton: config?.controls?.gitHubButton ?? true,
    scaleSelector: config?.controls?.scaleSelector ?? false,
    grid: config?.controls?.grid ?? true,
    extentHistory: config?.controls?.extentHistory ?? false,
    attribution: config?.controls?.attribution ?? true,
    attributeTable: config?.controls?.attributeTable ?? true,
    shareMap: config?.controls?.shareMap ?? true,
  };
};

// Helper function to load control visibility from localStorage
const loadControlVisibilityFromStorage = (config?: { controls?: Partial<ControlVisibility> }): ControlVisibility => {
  if (typeof window === "undefined") {
    return getDefaultControlVisibility(config);
  }

  try {
    const stored = getStorageItem(STORAGE_KEY_MAP_CONTROLS);

    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ControlVisibility>;
      return { ...getDefaultControlVisibility(config), ...parsed };
    }
  } catch (e) {
    console.warn("Failed to parse stored control settings", e);
  }

  return getDefaultControlVisibility(config);
};

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  map: null,
  popup: null,
  activeToolId: null,
  mapControls: null,
  controlVisibility: getDefaultControlVisibility(),
  mapControlDefaults: null,
  loadedItems: [],
  currentExtent: null,
  currentZoom: null,
  currentCenter: null,

  // Enhanced extent history initial state
  extentHistory: [],
  currentExtentIndex: -1,

  // Actions
  setMap: (map) => set({ map }),
  setPopup: (popup) => set({ popup }),

  // Active tool management — sole source of truth for tool gating.
  setActiveToolId: (toolId) => set({ activeToolId: toolId }),
  isToolActive: (toolId?: string) => {
    const active = get().activeToolId;
    return toolId === undefined ? active !== null : active === toolId;
  },
  setMapControls: (controls) => set({ mapControls: controls }),

  // Control visibility actions
  setControlVisibility: (key, value) => {
    set((state) => {
      const newVisibility = { ...state.controlVisibility, [key]: value };

      // Save to localStorage
      if (typeof window !== "undefined") {
        try {
          setStorageItem(STORAGE_KEY_MAP_CONTROLS, JSON.stringify(newVisibility));
        } catch (e) {
          console.warn("Failed to save control settings to localStorage", e);
        }
      }

      return { controlVisibility: newVisibility };
    });
  },

  resetControlVisibilityToDefaults: () => {
    const state = get();
    // Use stored map defaults (captured at map initialization)
    // Falls back to config-based defaults if not yet initialized
    const defaults = state.mapControlDefaults || getDefaultControlVisibility();

    set({ controlVisibility: defaults });

    // Save to localStorage
    if (typeof window !== "undefined") {
      try {
        setStorageItem(STORAGE_KEY_MAP_CONTROLS, JSON.stringify(defaults));
      } catch (e) {
        console.warn("Failed to save control settings to localStorage", e);
      }
    }
  },

  initControlVisibility: (config) => {
    const defaults = getDefaultControlVisibility(config);
    const visibility = loadControlVisibilityFromStorage(config);
    set({ controlVisibility: visibility, mapControlDefaults: defaults });
  },

  // Loading management
  addLoadedItem: (item) => {
    const state = get();
    const itemLower = item.toLowerCase();
    if (!state.loadedItems.includes(itemLower)) {
      set({ loadedItems: [...state.loadedItems, itemLower] });
    }
  },

  removeLoadedItem: (item) => {
    const state = get();
    const itemLower = item.toLowerCase();
    set({
      loadedItems: state.loadedItems.filter((loadedItem) => loadedItem !== itemLower),
    });
  },

  isItemLoaded: (item) => {
    const state = get();
    return state.loadedItems.includes(item.toLowerCase());
  },

  areItemsLoaded: (items) => {
    const state = get();
    if (Array.isArray(items)) {
      return items.every((item) => state.loadedItems.includes(item.toLowerCase()));
    } else {
      return state.loadedItems.includes(items.toLowerCase());
    }
  },

  clearLoadedItems: () => set({ loadedItems: [] }),

  // Map state management
  setCurrentExtent: (extent) => set({ currentExtent: extent }),
  setCurrentZoom: (zoom) => set({ currentZoom: zoom }),
  setCurrentCenter: (center) => set({ currentCenter: center }),

  // Enhanced extent history management
  initExtentHistory: (center, zoom) => {
    set({
      extentHistory: [{ center, zoom }],
      currentExtentIndex: 0,
      currentCenter: center,
      currentZoom: zoom,
    });
  },

  saveCurrentExtentToHistory: () => {
    const state = get();
    if (!state.map) return;

    const view = state.map.getView();
    const center = view.getCenter();
    const zoom = view.getZoom();

    if (!center || zoom === undefined) return;

    const currentItem = state.extentHistory[state.currentExtentIndex];

    // Check if the extent has actually changed
    if (currentItem && currentItem.zoom === zoom && currentItem.center[0] === center[0] && currentItem.center[1] === center[1]) {
      return; // No change, don't add to history
    }

    // Remove any history items after the current index (when going back and then adding new)
    const newHistory = state.extentHistory.slice(0, state.currentExtentIndex + 1);
    newHistory.push({ center, zoom });

    set({
      extentHistory: newHistory,
      currentExtentIndex: newHistory.length - 1,
      currentCenter: center,
      currentZoom: zoom,
    });
  },

  addToExtentHistory: (center, zoom) => {
    const state = get();
    const currentItem = state.extentHistory[state.currentExtentIndex];

    // Check if the extent has actually changed
    if (currentItem && currentItem.zoom === zoom && currentItem.center[0] === center[0] && currentItem.center[1] === center[1]) {
      return; // No change, don't add to history
    }

    // Remove any history items after the current index (when going back and then adding new)
    const newHistory = state.extentHistory.slice(0, state.currentExtentIndex + 1);
    newHistory.push({ center, zoom });

    set({
      extentHistory: newHistory,
      currentExtentIndex: newHistory.length - 1,
      currentCenter: center,
      currentZoom: zoom,
    });
  },

  setCurrentExtentIndex: (index) => {
    const state = get();
    const extent = state.extentHistory[index];
    if (extent) {
      set({
        currentExtentIndex: index,
        currentCenter: extent.center,
        currentZoom: extent.zoom,
      });
    }
  },
}));
