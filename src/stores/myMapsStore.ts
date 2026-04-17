import { create } from "zustand";
import { Style } from "ol/style";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import { styleToJSON, exportFeatures as exportFeaturesToFile } from "@/utils/myMapsHelpers";
import { v4 as uuidv4 } from "uuid";

// Label style JSON representation for callouts and labels
export interface LabelStyleJSON {
  textColor?: string;
  textSize?: string;
  outlineColor?: string;
  outlineWidth?: number;
  // Callout-specific properties
  backgroundColor?: string;
  borderColor?: string;
  lineColor?: string;
  anchorColor?: string;
}

// OpenLayers style JSON representation
export interface StyleJSON {
  fill?: {
    color: string | number[];
  };
  stroke?: {
    color: string | number[];
    width?: number;
    lineDash?: number[];
  };
  image?: {
    type: "circle" | "icon" | "regularShape";
    radius?: number;
    fill?: { color: string | number[] };
    stroke?: { color: string | number[]; width?: number; lineDash?: number[] };
    src?: string;
    scale?: number;
    // RegularShape specific properties
    points?: number;
    radius2?: number;
    angle?: number;
    rotation?: number;
  };
  text?: {
    text: string;
    font?: string;
    fill?: { color: string | number[] };
    stroke?: { color: string | number[]; width?: number };
    offsetX?: number;
    offsetY?: number;
    rotation?: number;
  };
}

// Types for MyMaps functionality
export type DrawType = "Cancel" | "Point" | "LineString" | "Polygon" | "Circle" | "Rectangle" | "Arrow" | "Text" | "Callout" | "Bearing" | "Measure" | "Eraser" | "Buffer";

export type GeometryType = "Point" | "LineString" | "Polygon" | "MultiPoint" | "MultiLineString" | "MultiPolygon" | "Circle";

export type EditMode = "vertices" | "translate" | null;

export interface MyMapsItem {
  id: string;
  label: string;
  labelVisible: boolean;
  labelRotation: number;
  labelStyle?: Style | LabelStyleJSON | null;
  featureGeoJSON: string; // Serialized GeoJSON
  style: Style | StyleJSON; // OpenLayers style object (new approach) or JSON representation (legacy)
  visible: boolean;
  drawType: DrawType;
  geometryType: GeometryType;
  isParcel?: boolean; // For property features
  pointType?: string; // For point styling
  strokeType?: string; // For line styling
  fillAlpha?: number; // For style opacity slider persistence
  strokeAlpha?: number; // For outline opacity slider persistence
  hasChanged?: boolean; // For tracking modifications
}

export interface MyMapsConfig {
  showBearingButton: boolean;
  showMeasureButton: boolean;
  nonPointCursorSize: number;
}

export interface MyMapsState {
  // Drawing state
  drawType: DrawType;
  drawColor: string;
  drawOpacity: number;
  drawStyle: Style | null;

  // Items management
  items: MyMapsItem[];
  drawingCounter: number; // Counter for auto-naming drawings

  // Edit state
  isEditing: boolean;
  editMode: EditMode;

  // UI state
  toolTipClass: string;
  toolTipId: string;
  showAdvanced: boolean;

  // Import/Export
  importText: string;
  lastSavedId: string | null;

  // Configuration
  config: MyMapsConfig;

  // Actions - Drawing
  setDrawType: (drawType: DrawType) => void;
  setDrawColor: (color: string) => void;
  setDrawOpacity: (opacity: number) => void;
  setDrawStyle: (style: Style | null) => void;

  // Actions - Items
  addItem: (item: MyMapsItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<MyMapsItem>) => void;
  toggleItemVisibility: (id: string) => void;
  updateItemLabel: (id: string, label: string) => void;
  updateItemLabelVisibility: (id: string, visible: boolean) => void;
  updateItemLabelRotation: (id: string, rotation: number) => void;
  updateItemStyle: (id: string, style: StyleJSON, pointType?: string, strokeType?: string) => void;
  clearAllItems: () => void;

  // Actions - Counter
  getNextDrawingNumber: () => number;
  resetDrawingCounter: () => void;

  // Actions - Bulk operations
  toggleAllVisibility: (visible: boolean) => void;
  deleteSelected: (selected: boolean) => void;
  showByType: (geometryType: GeometryType | "all") => void;
  zoomToSelected: () => void;
  mergePolygons: () => { success: boolean; message?: string };
  exportToFile: (format: "KML" | "GeoJSON" | "EsriJSON") => { success: boolean; message?: string; count?: number };
  saveToApi: () => Promise<{ success: boolean; message?: string; id?: string }>;
  importFromApi: (id: string) => Promise<{ success: boolean; message?: string; data?: unknown }>;

  // Actions - Edit mode
  setEditMode: (isEditing: boolean, mode?: EditMode) => void;

  // Actions - Import/Export
  setImportText: (text: string) => void;
  exportItems: () => string;
  importItems: (jsonData: string) => boolean;
  saveToStorage: () => void;
  loadFromStorage: () => void;

  // Actions - UI
  setToolTipClass: (className: string) => void;
  toggleAdvanced: () => void;

  // Getters
  getVisibleItems: () => MyMapsItem[];
  getItemById: (id: string) => MyMapsItem | undefined;
  getItemsByType: (geometryType: GeometryType) => MyMapsItem[];
  hasItems: () => boolean;
  hasVisibleItems: () => boolean;
}

// Default configuration
const DEFAULT_CONFIG: MyMapsConfig = {
  showBearingButton: true,
  showMeasureButton: false,
  nonPointCursorSize: 1,
};

// Storage key for persistence
const STORAGE_KEY = "simcoe-mymaps-data";

// Generate unique ID
const generateId = (): string => {
  return "mymaps_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
};


// Helper function to generate new GUID using same format as old app
const generateNewId = (): string => {
  return uuidv4();
};

export const useMyMapsStore = create<MyMapsState>((set, get) => ({
  // Initial state
  drawType: "Cancel",
  drawColor: "#e809e5",
  drawOpacity: 0.8,
  drawStyle: null,
  items: [],
  drawingCounter: 1,
  isEditing: false,
  editMode: null,
  toolTipClass: "sc-hidden",
  toolTipId: generateId(),
  showAdvanced: false,
  importText: "",
  lastSavedId: null,
  config: DEFAULT_CONFIG,

  // Drawing actions
  setDrawType: (drawType) => set({ drawType }),

  setDrawColor: (color) => {
    set({ drawColor: color });
    // Auto-save when color changes
    setTimeout(() => get().saveToStorage(), 100);
  },

  setDrawOpacity: (opacity) => set({ drawOpacity: opacity }),

  setDrawStyle: (style) => set({ drawStyle: style }),

  // Items actions
  addItem: (item) => {
    set((state) => ({
      items: [item, ...state.items], // Add to beginning like original
      drawType: "Cancel", // Reset draw type after adding
    }));
    get().saveToStorage();
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
    get().saveToStorage();
  },

  updateItem: (id, updates) => {
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
    get().saveToStorage();
  },

  toggleItemVisibility: (id) => {
    const item = get().getItemById(id);
    if (item) {
      get().updateItem(id, { visible: !item.visible });
    }
  },

  updateItemLabel: (id, label) => {
    get().updateItem(id, { label });
  },

  updateItemLabelVisibility: (id, visible) => {
    get().updateItem(id, { labelVisible: visible });
  },

  updateItemLabelRotation: (id, rotation) => {
    get().updateItem(id, { labelRotation: rotation });
  },

  updateItemStyle: (id, style, pointType, strokeType) => {
    const updates: Partial<MyMapsItem> = { style };
    if (pointType !== undefined) updates.pointType = pointType;
    if (strokeType !== undefined) updates.strokeType = strokeType;
    get().updateItem(id, updates);
  },

  clearAllItems: () => {
    set({ items: [], drawingCounter: 1 });
    get().saveToStorage();
  },

  // Counter actions
  getNextDrawingNumber: () => {
    const current = get().drawingCounter;
    set({ drawingCounter: current + 1 });
    return current;
  },

  resetDrawingCounter: () => {
    set({ drawingCounter: 1 });
  },

  // Bulk operations
  toggleAllVisibility: (visible) => {
    set((state) => ({
      items: state.items.map((item) => ({ ...item, visible })),
    }));
    get().saveToStorage();
  },

  deleteSelected: (selected) => {
    const state = get();
    const itemsToDelete = state.items.filter((item) => (selected ? item.visible : !item.visible));

    // Delete items with delay like original
    itemsToDelete.forEach((item, index) => {
      setTimeout(() => {
        get().removeItem(item.id);
      }, index * 200);
    });
  },

  showByType: (geometryType) => {
    if (geometryType === "all") {
      get().toggleAllVisibility(true);
    } else {
      set((state) => ({
        items: state.items.map((item) => ({
          ...item,
          visible: item.geometryType === geometryType,
        })),
      }));
      get().saveToStorage();
    }
  },

  zoomToSelected: () => {
    // This will be implemented when we integrate with map
    console.log("Zoom to selected items");
  },

  mergePolygons: () => {
    const state = get();

    // Get all visible polygon items
    const visiblePolygons = state.items.filter((item) => item.visible && item.geometryType === "Polygon");

    if (visiblePolygons.length < 2) {
      return {
        success: false,
        message: `Found ${visiblePolygons.length} visible polygon${visiblePolygons.length === 1 ? "" : "s"}. Need at least 2 polygons to merge.`,
      };
    }

    try {
      // Parse all polygon coordinates
      const polygonGeoJSONs = visiblePolygons.map((item) => {
        if (typeof item.featureGeoJSON === "string") {
          return JSON.parse(item.featureGeoJSON);
        }
        return item.featureGeoJSON;
      });

      // Simple merge: combine all coordinates into a MultiPolygon
      // For a proper merge, you'd use a library like Turf.js
      const mergedCoordinates = polygonGeoJSONs.map((geojson) => geojson.geometry.coordinates);

      // Create merged polygon GeoJSON
      const mergedGeoJSON = {
        type: "Feature",
        geometry: {
          type: "MultiPolygon",
          coordinates: mergedCoordinates,
        },
        properties: {},
      };

      // Create new merged item
      const mergedItem: MyMapsItem = {
        id: generateId(),
        label: `Merged Polygons (${visiblePolygons.length})`,
        visible: true,
        labelVisible: true,
        labelRotation: 0,
        geometryType: "Polygon",
        drawType: "Polygon",
        style: visiblePolygons[0].style, // Use style from first polygon
        pointType: "",
        strokeType: "",
        featureGeoJSON: JSON.stringify(mergedGeoJSON),
      };

      // Add merged polygon while keeping the original features intact
      // Hide labels on the source polygons so only the merged polygon's label shows
      const sourceIds = new Set(visiblePolygons.map((vp) => vp.id));
      set((state) => ({
        items: [
          mergedItem,
          ...state.items.map((item) => (sourceIds.has(item.id) ? { ...item, labelVisible: false } : item)),
        ],
      }));

      // Save to storage
      get().saveToStorage();

      return {
        success: true,
        message: `Successfully merged ${visiblePolygons.length} polygons into 1.`,
      };
    } catch (error) {
      console.error("Error merging polygons:", error);
      return {
        success: false,
        message: "Error occurred while merging polygons. Please try again.",
      };
    }
  },

  exportToFile: (format) => {
    const state = get();

    // Get all visible items (same as old app's onDownloadFeatures filtering by visible)
    const visibleItems = state.items.filter((item) => item.visible);

    if (visibleItems.length === 0) {
      return {
        success: false,
        message: "No visible features to export. Please make sure some features are turned on in your MyMaps list.",
        count: 0,
      };
    }

    try {
      // Use shared helper — matches old React app's onDownloadFeatures pattern:
      // FeatureHelpers.setFeatures(visibleFeatures, dataType) then helpers.export_file(...)
      exportFeaturesToFile(visibleItems, format);

      return {
        success: true,
        message: `Successfully exported ${visibleItems.length} features to ${format}`,
        count: visibleItems.length,
      };
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      return {
        success: false,
        message: `Error occurred while exporting to ${format}. Please try again.`,
        count: 0,
      };
    }
  },

  saveToApi: async () => {
    const state = get();

    try {
      // Using local API endpoint - no external config needed

      // Prepare data similar to old app format
      const dataToSave = {
        items: state.items.map((item) => {
          // Update any items that have changed to get new IDs like old app
          if (item.hasChanged || false) {
            const oldId = item.id;
            const newId = generateNewId();
            return {
              ...item,
              id: newId,
              hasChanged: false,
              featureGeoJSON: typeof item.featureGeoJSON === "string" ? item.featureGeoJSON.replace(oldId, newId) : JSON.stringify(item.featureGeoJSON).replace(oldId, newId),
            };
          }
          return item;
        }),
        drawType: state.drawType,
        drawColor: state.drawColor,
      };

      // Make API call to new local endpoint using axios
      const { getAxiosClient } = await import("@/lib/axiosInstance");
      const axiosClient = getAxiosClient("/api/mymaps");
      const response = await axiosClient.post("/mymaps", dataToSave);
      const result = response.data;

      if (result.id) {
        // Copy ID to clipboard
        try {
          await navigator.clipboard.writeText(result.id);
        } catch (clipboardError) {
          console.warn("Failed to copy to clipboard:", clipboardError);
        }

        return {
          success: true,
          message: "MyMaps have been saved! Your ID has been saved to clipboard.",
          id: result.id,
        };
      } else {
        return {
          success: false,
          message: "Save completed but no ID was returned",
        };
      }
    } catch (error) {
      console.error("Error saving MyMaps:", error);
      return {
        success: false,
        message: "Error occurred while saving MyMaps. Please try again.",
      };
    }
  },

  importFromApi: async (id: string) => {
    try {
      // Basic validation - should be 36 characters (UUID format)
      if (id.length !== 36) {
        return {
          success: false,
          message: "Invalid ID was entered. ID should be 36 characters long.",
        };
      }

      // Using local API endpoint - no external config needed

      // Make API call to new local endpoint using axios
      const { getAxiosClient } = await import("@/lib/axiosInstance");
      const apiUrl = `/api/mymaps/${id}`;
      const axiosClient = getAxiosClient(apiUrl);

      let result;
      try {
        const response = await axiosClient.get(`/mymaps/${id}`);
        result = response.data;
      } catch (error) {
        // Handle 404 error specifically
        if (error instanceof Error && error.message.includes("404")) {
          return {
            success: false,
            message: "That MyMaps ID was NOT found!",
          };
        }
        throw error;
      }

      if (result.error) {
        return {
          success: false,
          message: "That MyMaps ID was NOT found!",
        };
      }

      // Parse the JSON string from the API response (same format as old app)
      if (result.json) {
        let parsedData;
        try {
          // Parse the JSON string that contains the actual MyMaps data
          parsedData = JSON.parse(result.json);
        } catch (parseError) {
          console.error("Failed to parse JSON from API response:", parseError);
          return {
            success: false,
            message: "Invalid JSON format in imported MyMaps",
          };
        }

        if (parsedData.items && Array.isArray(parsedData.items)) {
          const currentState = get();

          // Filter out items that already exist (same logic as old app)
          const itemsToAdd: MyMapsItem[] = [];
          parsedData.items.forEach((item: unknown) => {
            // Type guard for MyMapsItem-like object
            if (typeof item === "object" && item !== null && "id" in item) {
              const typedItem = item as Partial<MyMapsItem> & { id?: string };

              const searchItem = currentState.items.filter((stateItem) => {
                return stateItem.id === typedItem.id;
              })[0];

              // Only add if item doesn't already exist
              if (searchItem === undefined) {
                itemsToAdd.push({
                  ...typedItem,
                  id: typedItem.id || generateNewId(),
                  visible: typedItem.visible !== undefined ? typedItem.visible : true,
                } as MyMapsItem);
              }
            }
          });

          if (itemsToAdd.length > 0) {
            // Add only new items to current state (same logic as old app)
            set({
              items: [...itemsToAdd, ...currentState.items],
            });

            // Save to localStorage
            get().saveToStorage();

            return {
              success: true,
              message: `Success! ${itemsToAdd.length} new MyMaps items imported.`,
              data: result,
            };
          } else {
            return {
              success: true,
              message: "No new items to import - all items already exist.",
              data: result,
            };
          }
        } else {
          return {
            success: false,
            message: "No valid items found in imported MyMaps",
          };
        }
      } else {
        return {
          success: false,
          message: "Invalid data format in imported MyMaps - no JSON field found",
        };
      }
    } catch (error) {
      console.error("Error importing MyMaps:", error);
      return {
        success: false,
        message: "Error occurred while importing MyMaps. Please try again.",
      };
    }
  },

  // Edit mode
  setEditMode: (isEditing, mode = "vertices") => {
    set({ isEditing, editMode: isEditing ? mode : null });
  },

  // Import/Export
  setImportText: (text) => set({ importText: text }),

  exportItems: () => {
    const state = get();
    return JSON.stringify({
      items: state.items,
      drawColor: state.drawColor,
      drawOpacity: state.drawOpacity,
      config: state.config,
    });
  },

  importItems: (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.items && Array.isArray(data.items)) {
        // Merge with existing items, avoiding duplicates
        set((state) => {
          const existingIds = new Set(state.items.map((item) => item.id));
          const newItems = data.items.filter((item: MyMapsItem) => !existingIds.has(item.id));
          return {
            items: [...newItems, ...state.items],
            drawColor: data.drawColor || state.drawColor,
            drawOpacity: data.drawOpacity || state.drawOpacity,
          };
        });
        get().saveToStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to import MyMaps data:", error);
      return false;
    }
  },

  saveToStorage: () => {
    try {
      const state = get();

      // Convert OpenLayers Style objects to JSON for proper serialization
      const serializedItems = state.items.map((item) => {
        if (item.style instanceof Style) {
          // Convert OpenLayers Style to JSON
          return {
            ...item,
            style: styleToJSON(item.style),
          };
        }
        // If style is already JSON or null, keep as-is
        return item;
      });

      const dataToSave = {
        items: serializedItems,
        drawColor: state.drawColor,
        drawOpacity: state.drawOpacity,
        drawingCounter: state.drawingCounter,
        config: state.config,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      // console.log("💾 MyMaps saved to storage:", { itemCount: serializedItems.length });
    } catch (error) {
      console.error("Failed to save MyMaps to storage:", error);
    }
  },

  loadFromStorage: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);

        // Calculate the next counter based on existing drawings if not saved
        let drawingCounter = data.drawingCounter || 1;
        if (!data.drawingCounter && data.items) {
          const existingNumbers = data.items
            .filter((item: MyMapsItem) => item.label.startsWith("Drawing "))
            .map((item: MyMapsItem) => {
              const match = item.label.match(/Drawing (\d+)/);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter((num: number) => num > 0);

          if (existingNumbers.length > 0) {
            drawingCounter = Math.max(...existingNumbers) + 1;
          }
        }

        set({
          items: data.items || [],
          drawColor: data.drawColor || "#e809e5",
          drawOpacity: data.drawOpacity || 0.8,
          drawingCounter,
          config: { ...DEFAULT_CONFIG, ...data.config },
        });

        // console.log("📥 MyMaps loaded from storage:", { itemCount: data.items?.length || 0 });
      }
    } catch (error) {
      console.error("Failed to load MyMaps from storage:", error);
    }
  },

  // UI actions
  setToolTipClass: (className) => set({ toolTipClass: className }),

  toggleAdvanced: () => set((state) => ({ showAdvanced: !state.showAdvanced })),

  // Getters
  getVisibleItems: () => get().items.filter((item) => item.visible),

  getItemById: (id) => get().items.find((item) => item.id === id),

  getItemsByType: (geometryType) => get().items.filter((item) => item.geometryType === geometryType),

  hasItems: () => get().items.length > 0,

  hasVisibleItems: () => get().items.some((item) => item.visible),
}));

// Helper function to create a new MyMaps item
export const createMyMapsItem = (feature: Feature<Geometry>, drawType: DrawType, label?: string, style?: StyleJSON): MyMapsItem => {
  const geometry = feature.getGeometry();
  if (!geometry) {
    throw new Error("Feature must have geometry");
  }

  const geometryType = geometry.getType() as GeometryType;
  const id = generateId();

  // Default labels based on draw type
  let defaultLabel = label;
  if (!defaultLabel) {
    switch (drawType) {
      case "Bearing":
        defaultLabel = "Bearing Line";
        break;
      case "Measure":
        defaultLabel = "Measure";
        break;
      case "Text":
        defaultLabel = "Enter Custom Text";
        break;
      case "Callout":
        defaultLabel = "Enter Callout Text";
        break;
      default:
        // This should not be used anymore as labels are generated in the component
        defaultLabel = `Drawing ${Date.now()}`;
    }
  }

  // Set label rotation to the actual bearing value for the slider
  let labelRotation = 0;
  if (drawType === "Bearing" || drawType === "Measure") {
    const bearing = feature.get("bearing");
    if (typeof bearing === "number") {
      // Store the raw bearing value for the rotation slider
      labelRotation = bearing;
    }
  }

  return {
    id,
    label: defaultLabel,
    labelVisible: drawType === "Text" || drawType === "Callout" || drawType === "Bearing" || drawType === "Measure",
    labelRotation,
    labelStyle: null,
    featureGeoJSON: "", // Will be set by calling code
    style: style || ({} as StyleJSON),
    visible: true,
    drawType,
    geometryType,
    isParcel: false,
    hasChanged: false,
  };
};
