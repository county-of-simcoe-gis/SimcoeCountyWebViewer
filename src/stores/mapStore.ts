import { create } from "zustand";
import Map from "ol/Map";

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
}

const STORAGE_KEY_MAP_CONTROLS = "Map_Control_Settings";

// Map interaction states that were previously window variables
interface MapState {
  // Core map instance
  map: Map | null; // OpenLayers Map instance

  // Popup state
  popup: unknown | null; // Popup instance

  // Unified active tool tracking — replaces scattered disable flags
  // When a tool is active (non-null), map click handlers are suppressed
  activeToolId: string | null;

  // Legacy interaction flags (deprecated — use activeToolId instead)
  // Kept for backward compatibility with OL layer property checks
  disableParcelClick: boolean;
  disableIdentifyClick: boolean;
  isDrawingOrEditing: boolean;
  isCoordinateToolOpen: boolean;
  isMeasuring: boolean;

  // Map controls configuration
  mapControls: Record<string, unknown> | null;

  // Control visibility (runtime state)
  controlVisibility: ControlVisibility;

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
  /** Returns true if any tool is currently active (click handlers should be suppressed) */
  isToolActive: () => boolean;
  /** Centralized disable check for InteractionManager conditions — returns true when disabled */
  checkGlobalDisable: () => boolean;

  // Legacy setters (deprecated — use setActiveToolId instead)
  setDisableParcelClick: (disabled: boolean) => void;
  setDisableIdentifyClick: (disabled: boolean) => void;
  setIsDrawingOrEditing: (isDrawing: boolean) => void;
  setIsCoordinateToolOpen: (isOpen: boolean) => void;
  setIsMeasuring: (isMeasuring: boolean) => void;
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
  };
};

// Helper function to load control visibility from localStorage
const loadControlVisibilityFromStorage = (config?: { controls?: Partial<ControlVisibility> }): ControlVisibility => {
  if (typeof window === "undefined") {
    return getDefaultControlVisibility(config);
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY_MAP_CONTROLS);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ControlVisibility>;
      // Merge with defaults to ensure all keys exist
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
  disableParcelClick: false,
  disableIdentifyClick: false,
  isDrawingOrEditing: false,
  isCoordinateToolOpen: false,
  isMeasuring: false,
  mapControls: null,
  controlVisibility: getDefaultControlVisibility(),
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

  // Active tool management
  setActiveToolId: (toolId) => {
    set({
      activeToolId: toolId,
      // Keep legacy flags in sync
      disableParcelClick: toolId !== null,
      isMeasuring: toolId === "measure",
      isCoordinateToolOpen: toolId === "coordinates",
      isDrawingOrEditing: toolId === "mymaps-draw" || toolId === "mymaps-edit",
    });
  },
  isToolActive: () => get().activeToolId !== null,
  checkGlobalDisable: () => get().activeToolId !== null || get().disableParcelClick,

  // Legacy setters (deprecated — kept for backward compatibility)
  setDisableParcelClick: (disabled) => set({ disableParcelClick: disabled }),
  setDisableIdentifyClick: (disabled) => set({ disableIdentifyClick: disabled }),
  setIsDrawingOrEditing: (isDrawing) => set({ isDrawingOrEditing: isDrawing }),
  setIsCoordinateToolOpen: (isOpen) => set({ isCoordinateToolOpen: isOpen }),
  setIsMeasuring: (isMeasuring) => set({ isMeasuring }),
  setMapControls: (controls) => set({ mapControls: controls }),

  // Control visibility actions
  setControlVisibility: (key, value) => {
    set((state) => {
      const newVisibility = { ...state.controlVisibility, [key]: value };

      // Save to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_MAP_CONTROLS, JSON.stringify(newVisibility));
        } catch (e) {
          console.warn("Failed to save control settings to localStorage", e);
        }
      }

      return { controlVisibility: newVisibility };
    });
  },

  resetControlVisibilityToDefaults: (config) => {
    const defaults = getDefaultControlVisibility(config);
    set({ controlVisibility: defaults });

    // Save to localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_MAP_CONTROLS, JSON.stringify(defaults));
      } catch (e) {
        console.warn("Failed to save control settings to localStorage", e);
      }
    }
  },

  initControlVisibility: (config) => {
    const visibility = loadControlVisibilityFromStorage(config);
    set({ controlVisibility: visibility });
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
