import { create } from "zustand";
import { Style, Fill, Stroke, Circle as CircleStyle } from "ol/style";
import type { Feature } from "ol";
import { Feature as OLFeature } from "ol";
import type { Geometry } from "ol/geom";
import { styleToJSON } from "@/utils/myMapsHelpers";
import GeoJSON from "ol/format/GeoJSON";
import EsriJSON from "ol/format/EsriJSON";
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

// Download file helper function
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.setAttribute("rel", "noopener noreferrer");

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  window.URL.revokeObjectURL(url);
};

// Get OpenLayers features for export using proper coordinate transformations
const getOpenLayersFeaturesForExport = (items: MyMapsItem[]): OLFeature[] => {
  const geoJsonFormat = new GeoJSON({
    dataProjection: "EPSG:3857", // Data is stored in Web Mercator
    featureProjection: "EPSG:3857", // Map uses Web Mercator
  });

  const features: OLFeature[] = [];

  items.forEach((item) => {
    if (item.featureGeoJSON) {
      try {
        const feature = geoJsonFormat.readFeature(item.featureGeoJSON) as OLFeature;

        // Set essential properties for export
        feature.setProperties({
          id: item.id,
          name: item.label,
          label: item.label,
          drawType: item.drawType,
          visible: item.visible,
        });

        // Apply the item's style to the feature for proper KML export
        if (item.style && item.style instanceof Style) {
          feature.setStyle(item.style);
        } else if (item.style && typeof item.style === "object" && "fill" in item.style) {
          // Fallback: create a basic style from the style color
          const styleJSON = item.style as StyleJSON;
          const color = styleJSON.fill?.color || "#FF0000";
          const basicStyle = createBasicStyleFromColor(typeof color === "string" ? color : "#FF0000", item.drawType);
          feature.setStyle(basicStyle);
        }

        features.push(feature);
      } catch (error) {
        console.warn(`Failed to convert feature ${item.id} for export:`, error);
      }
    }
  });

  return features;
};

// Create a basic OpenLayers style from color and draw type
const createBasicStyleFromColor = (color: string, drawType: string): Style => {
  // Ensure color starts with # if it's a hex color
  const hexColor = color.startsWith("#") ? color : `#${color}`;

  // Convert hex to RGBA for better KML compatibility
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const fillColor = `rgba(${r}, ${g}, ${b}, 0.5)`; // 50% opacity for fills
  const strokeColor = `rgba(${r}, ${g}, ${b}, 1)`; // Full opacity for strokes

  const styleConfig: { image?: CircleStyle; fill?: Fill; stroke?: Stroke } = {};

  // Configure style based on geometry type
  if (drawType === "Point" || drawType === "Circle") {
    styleConfig.image = new CircleStyle({
      radius: 8,
      fill: new Fill({
        color: fillColor,
      }),
      stroke: new Stroke({
        color: strokeColor,
        width: 2,
      }),
    });
  } else {
    // For polygons and lines
    styleConfig.fill = new Fill({
      color: fillColor,
    });
    styleConfig.stroke = new Stroke({
      color: strokeColor,
      width: 3, // Make stroke more visible
    });
  }

  return new Style(styleConfig);
};

// Convert features to KML manually with proper styling (OpenLayers KML format doesn't handle styles well)
const convertToKMLWithProjection = (features: OLFeature[]): string => {
  let kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
  kml += "  <Document>\n";
  kml += "    <name>MyMaps Features</name>\n";
  kml += "    <open>1</open>\n";

  // Add styles section
  const styleMap = new Map<string, string>();
  let styleIdCounter = 0;

  features.forEach((feature) => {
    const properties = feature.getProperties();
    const drawColor = properties.drawColor || "#e809e5";
    const drawType = properties.drawType || "Polygon";

    // Create a unique style ID for this color/type combination
    const styleKey = `${drawColor}-${drawType}`;
    if (!styleMap.has(styleKey)) {
      const styleId = `style${styleIdCounter++}`;
      styleMap.set(styleKey, styleId);

      // Add style definition
      kml += createKMLStyle(styleId, drawColor, drawType);
    }

    // Transform geometry to WGS84 (clone first to avoid modifying original)
    const geometry = feature.getGeometry()?.clone();
    if (geometry) {
      geometry.transform("EPSG:3857", "EPSG:4326");

      // Add placemark
      kml += "    <Placemark>\n";
      kml += `      <name>${escapeXML(properties.name || properties.label || "Unnamed Feature")}</name>\n`;
      kml += `      <description>Type: ${drawType}, Color: ${drawColor}</description>\n`;
      kml += `      <styleUrl>#${styleMap.get(styleKey)}</styleUrl>\n`;

      // Add geometry
      interface GeometryInterface {
        getCoordinates(): number[] | number[][] | number[][][];
        getCenter?(): number[];
        getRadius?(): number;
      }

      kml += createKMLGeometry({
        getType: () => geometry.getType(),
        getCoordinates: () => (geometry as unknown as GeometryInterface).getCoordinates(),
        getCenter: geometry.getType() === "Circle" ? () => (geometry as unknown as GeometryInterface).getCenter?.() || [0, 0] : undefined,
        getRadius: geometry.getType() === "Circle" ? () => (geometry as unknown as GeometryInterface).getRadius?.() || 1000 : undefined,
      });

      kml += "    </Placemark>\n";
    }
  });

  kml += "  </Document>\n";
  kml += "</kml>";

  return kml;
};

// Create KML style definition
const createKMLStyle = (styleId: string, color: string, drawType: string): string => {
  // Ensure color starts with # if it's a hex color
  const hexColor = color.startsWith("#") ? color : `#${color}`;

  // Convert hex to KML color format (AABBGGRR instead of RRGGBB)
  const hex = hexColor.replace("#", "");
  const r = hex.substring(0, 2);
  const g = hex.substring(2, 4);
  const b = hex.substring(4, 6);
  const kmlColor = `80${b}${g}${r}`; // 80 = 50% opacity, reversed RGB order for KML
  const kmlStrokeColor = `ff${b}${g}${r}`; // ff = 100% opacity

  let style = `    <Style id="${styleId}">\n`;

  if (drawType === "Point" || drawType === "Circle") {
    style += "      <IconStyle>\n";
    style += `        <color>${kmlStrokeColor}</color>\n`;
    style += "        <scale>1.0</scale>\n";
    style += "        <Icon>\n";
    style += "          <href>http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href>\n";
    style += "        </Icon>\n";
    style += "      </IconStyle>\n";
  } else if (drawType === "LineString") {
    style += "      <LineStyle>\n";
    style += `        <color>${kmlStrokeColor}</color>\n`;
    style += "        <width>3</width>\n";
    style += "      </LineStyle>\n";
  } else if (drawType === "Polygon") {
    style += "      <PolyStyle>\n";
    style += `        <color>${kmlColor}</color>\n`;
    style += "        <fill>1</fill>\n";
    style += "        <outline>1</outline>\n";
    style += "      </PolyStyle>\n";
    style += "      <LineStyle>\n";
    style += `        <color>${kmlStrokeColor}</color>\n`;
    style += "        <width>2</width>\n";
    style += "      </LineStyle>\n";
  }

  style += "    </Style>\n";
  return style;
};

// Create KML geometry from OpenLayers geometry
const createKMLGeometry = (geometry: { getType(): string; getCoordinates(): number[] | number[][] | number[][][]; getCenter?: () => number[]; getRadius?: () => number }): string => {
  const type = geometry.getType();

  if (type === "Point") {
    const coords = geometry.getCoordinates() as number[];
    return `      <Point>\n        <coordinates>${coords[0]},${coords[1]},0</coordinates>\n      </Point>\n`;
  } else if (type === "LineString") {
    const coords = geometry.getCoordinates() as number[][];
    const coordStr = coords.map((coord: number[]) => `${coord[0]},${coord[1]},0`).join(" ");
    return `      <LineString>\n        <coordinates>${coordStr}</coordinates>\n      </LineString>\n`;
  } else if (type === "Polygon") {
    const coords = geometry.getCoordinates() as number[][][];
    const outerRing = coords[0];
    const coordStr = outerRing.map((coord: number[]) => `${coord[0]},${coord[1]},0`).join(" ");
    return `      <Polygon>\n        <outerBoundaryIs>\n          <LinearRing>\n            <coordinates>${coordStr}</coordinates>\n          </LinearRing>\n        </outerBoundaryIs>\n      </Polygon>\n`;
  } else if (type === "Circle") {
    // Convert circle to polygon approximation
    const center = geometry.getCenter?.() || [0, 0];
    const radius = geometry.getRadius?.() || 1000;
    const points = 32; // Number of points to approximate circle
    let coords = "";

    for (let i = 0; i <= points; i++) {
      const angle = (i * 2 * Math.PI) / points;
      const x = center[0] + radius * Math.cos(angle);
      const y = center[1] + radius * Math.sin(angle);
      coords += `${x},${y},0 `;
    }

    return `      <Polygon>\n        <outerBoundaryIs>\n          <LinearRing>\n            <coordinates>${coords.trim()}</coordinates>\n          </LinearRing>\n        </outerBoundaryIs>\n      </Polygon>\n`;
  }

  return "";
};

// Helper function to escape XML characters
const escapeXML = (str: string): string => {
  return str.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
};

// Convert features to GeoJSON using OpenLayers with proper coordinate transformation
const convertToGeoJSONWithProjection = (features: OLFeature[]): string => {
  const geoJSONFormat = new GeoJSON();

  const result = geoJSONFormat.writeFeatures(features, {
    dataProjection: "EPSG:4326", // GeoJSON typically uses WGS84
    featureProjection: "EPSG:3857", // Features are in Web Mercator
  });

  return result;
};

// Convert features to EsriJSON using OpenLayers with proper coordinate transformation
const convertToEsriJSONWithProjection = (features: OLFeature[]): string => {
  const esriJSONFormat = new EsriJSON();

  const result = esriJSONFormat.writeFeatures(features, {
    dataProjection: "EPSG:4326", // EsriJSON typically uses WGS84
    featureProjection: "EPSG:3857", // Features are in Web Mercator
  });

  return result;
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

      // Remove original polygons and add merged polygon
      set((state) => ({
        items: [...state.items.filter((item) => !visiblePolygons.some((vp) => vp.id === item.id)), mergedItem],
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

    // Get all visible items
    const visibleItems = state.items.filter((item) => item.visible);

    if (visibleItems.length === 0) {
      return {
        success: false,
        message: "No visible features to export. Please make sure some features are turned on in your MyMaps list.",
        count: 0,
      };
    }

    try {
      // Get OpenLayers features with proper coordinate handling
      const features = getOpenLayersFeaturesForExport(visibleItems);

      if (features.length === 0) {
        return {
          success: false,
          message: "No valid features could be converted for export.",
          count: 0,
        };
      }

      // Use OpenLayers format writers with proper projection transformation
      let content = "";
      let filename = "";
      let mimeType = "";

      switch (format) {
        case "KML":
          content = convertToKMLWithProjection(features);
          filename = "features.kml";
          mimeType = "application/vnd.google-earth.kml+xml";
          break;
        case "GeoJSON":
          content = convertToGeoJSONWithProjection(features);
          filename = "features.geojson";
          mimeType = "application/geo+json";
          break;
        case "EsriJSON":
          content = convertToEsriJSONWithProjection(features);
          filename = "features.json";
          mimeType = "application/json";
          break;
        default:
          return {
            success: false,
            message: `Unsupported export format: ${format}`,
            count: 0,
          };
      }

      // Download the file
      downloadFile(content, filename, mimeType);

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
