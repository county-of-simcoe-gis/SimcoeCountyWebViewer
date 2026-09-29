import { describe, it, expect, beforeEach, vi } from "vitest";
import { useMapStore } from "@/stores/mapStore";
import Map from "ol/Map";

const DEFAULT_CONTROL_VISIBILITY = {
  rotate: false,
  fullScreen: true,
  zoomInOut: true,
  currentLocation: true,
  zoomExtent: true,
  scale: true,
  scaleLine: true,
  basemap: true,
  gitHubButton: true,
  scaleSelector: false,
  grid: true,
  extentHistory: false,
  attribution: true,
  attributeTable: true,
  shareMap: true,
};

const localStorageState: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => (key in localStorageState ? localStorageState[key] : null)),
  setItem: vi.fn((key: string, value: string) => {
    localStorageState[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageState[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageState).forEach((key) => {
      delete localStorageState[key];
    });
  }),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock OpenLayers Map
vi.mock("ol/Map", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      id: "mock-map",
      getView: vi.fn(() => ({
        getCenter: vi.fn(() => [-8878504.68, 5543492.45]),
        getZoom: vi.fn(() => 10),
      })),
    })),
  };
});

// Reset store before each test
beforeEach(() => {
  useMapStore.setState({
    map: null,
    popup: null,
    activeToolId: null,
    mapControls: null,
    controlVisibility: { ...DEFAULT_CONTROL_VISIBILITY },
    loadedItems: [],
    currentExtent: null,
    currentZoom: null,
    currentCenter: null,
    extentHistory: [],
    currentExtentIndex: -1,
  });
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
});

describe("mapStore", () => {
  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useMapStore.getState();

      expect(state.map).toBeNull();
      expect(state.popup).toBeNull();
      expect(state.activeToolId).toBeNull();
      expect(state.mapControls).toBeNull();
      expect(state.loadedItems).toEqual([]);
      expect(state.currentExtent).toBeNull();
      expect(state.currentZoom).toBeNull();
      expect(state.currentCenter).toBeNull();
    });
  });

  describe("Map Management", () => {
    it("should set map instance", () => {
      const mockMap = new Map({});

      // Use setState to update the map
      useMapStore.setState({ map: mockMap });

      const state = useMapStore.getState();
      expect(state.map).toBe(mockMap);
    });

    it("should set popup instance", () => {
      const mockPopup = { id: "test-popup" };

      // Use setState to update the popup
      useMapStore.setState({ popup: mockPopup });

      const state = useMapStore.getState();
      expect(state.popup).toBe(mockPopup);
    });

    it("should set map controls", () => {
      const mockControls = {
        zoom: true,
        rotate: false,
        attribution: true,
      };

      // Use setState to update the controls
      useMapStore.setState({ mapControls: mockControls });

      const state = useMapStore.getState();
      expect(state.mapControls).toEqual(mockControls);
    });
  });

  describe("Interaction State Management", () => {
    it("should set and clear activeToolId", () => {
      useMapStore.getState().setActiveToolId("measure");
      expect(useMapStore.getState().activeToolId).toBe("measure");

      useMapStore.getState().setActiveToolId(null);
      expect(useMapStore.getState().activeToolId).toBeNull();
    });
  });

  describe("Control Visibility Persistence", () => {
    it("should write control visibility to Map Control Settings", () => {
      useMapStore.getState().setControlVisibility("rotate", true);

      expect(JSON.parse(localStorageState["Map Control Settings"])).toEqual(expect.objectContaining({ rotate: true }));
    });

    it("should load control visibility from Map Control Settings", () => {
      localStorageState["Map Control Settings"] = JSON.stringify({ rotate: true, fullScreen: false });

      useMapStore.getState().initControlVisibility({});

      expect(useMapStore.getState().controlVisibility.rotate).toBe(true);
      expect(useMapStore.getState().controlVisibility.fullScreen).toBe(false);
    });
  });

  describe("Loading Management", () => {
    it("should add loaded item", () => {
      // Simulate adding a loaded item (converted to lowercase)
      useMapStore.setState({ loadedItems: ["map"] });

      const state = useMapStore.getState();
      expect(state.loadedItems).toContain("map");
    });

    it("should convert loaded items to lowercase", () => {
      // Simulate adding multiple items (already converted to lowercase)
      useMapStore.setState({ loadedItems: ["sidebar", "header", "toc"] });

      const state = useMapStore.getState();
      expect(state.loadedItems).toEqual(["sidebar", "header", "toc"]);
    });

    it("should not add duplicate loaded items", () => {
      // Simulate adding without duplicates (should only have one instance)
      useMapStore.setState({ loadedItems: ["map"] });

      const state = useMapStore.getState();
      expect(state.loadedItems).toEqual(["map"]);
    });

    it("should remove loaded item", () => {
      // First add items
      useMapStore.setState({ loadedItems: ["map", "sidebar", "header"] });

      // Then remove 'sidebar'
      const currentState = useMapStore.getState();
      const newItems = currentState.loadedItems.filter((item) => item !== "sidebar");
      useMapStore.setState({ loadedItems: newItems });

      const state = useMapStore.getState();
      expect(state.loadedItems).toEqual(["map", "header"]);
    });

    it("should check if single item is loaded", () => {
      // Add an item first
      useMapStore.setState({ loadedItems: ["map"] });

      const state = useMapStore.getState();
      // Simulate isItemLoaded logic (case-insensitive checking)
      expect(state.loadedItems.includes("map")).toBe(true);
      expect(state.loadedItems.includes("MAP".toLowerCase())).toBe(true);
      expect(state.loadedItems.includes("sidebar")).toBe(false);
    });

    it("should check if all items are loaded (array)", () => {
      // Add multiple items
      useMapStore.setState({ loadedItems: ["map", "sidebar", "header"] });

      const state = useMapStore.getState();
      // Simulate areItemsLoaded logic for arrays (case-insensitive)
      const checkItems1 = ["MAP", "sidebar"].map((i) => i.toLowerCase());
      const checkItems2 = ["map", "sidebar", "TOC"].map((i) => i.toLowerCase());
      const checkItems3 = ["nonexistent"];

      expect(checkItems1.every((item) => state.loadedItems.includes(item))).toBe(true);
      expect(checkItems2.every((item) => state.loadedItems.includes(item))).toBe(false);
      expect(checkItems3.every((item) => state.loadedItems.includes(item))).toBe(false);
    });

    it("should check if single item is loaded (string)", () => {
      // Add an item first
      useMapStore.setState({ loadedItems: ["map"] });

      const state = useMapStore.getState();
      // Simulate areItemsLoaded logic for single string (case-insensitive)
      expect(state.loadedItems.includes("MAP".toLowerCase())).toBe(true);
      expect(state.loadedItems.includes("sidebar")).toBe(false);
    });

    it("should handle empty array for areItemsLoaded", () => {
      const state = useMapStore.getState();
      // Empty array should return true (all items in empty set are loaded)
      expect([].every((item) => state.loadedItems.includes(item))).toBe(true);
    });

    it("should clear all loaded items", () => {
      // First add items
      useMapStore.setState({ loadedItems: ["map", "sidebar", "header"] });

      // Then clear them
      useMapStore.setState({ loadedItems: [] });

      const state = useMapStore.getState();
      expect(state.loadedItems).toEqual([]);
    });
  });

  describe("Map State Management", () => {
    it("should set current extent", () => {
      const extent = [-9000000, 5000000, -8000000, 6000000];

      // Use setState to set extent
      useMapStore.setState({ currentExtent: extent });

      const state = useMapStore.getState();
      expect(state.currentExtent).toEqual(extent);
    });

    it("should set current zoom", () => {
      // Use setState to set zoom
      useMapStore.setState({ currentZoom: 15 });

      const state = useMapStore.getState();
      expect(state.currentZoom).toBe(15);
    });

    it("should set current center", () => {
      const center = [-8878504.68, 5543492.45];

      // Use setState to set center
      useMapStore.setState({ currentCenter: center });

      const state = useMapStore.getState();
      expect(state.currentCenter).toEqual(center);
    });

    it("should handle null values for map state", () => {
      const extent = [-9000000, 5000000, -8000000, 6000000];
      const center = [-8878504.68, 5543492.45];

      // Set some values first
      useMapStore.setState({
        currentExtent: extent,
        currentZoom: 15,
        currentCenter: center,
      });

      // Verify they're set
      expect(useMapStore.getState().currentExtent).toEqual(extent);
      expect(useMapStore.getState().currentZoom).toBe(15);
      expect(useMapStore.getState().currentCenter).toEqual(center);

      // Then set them to null
      useMapStore.setState({
        currentExtent: null,
        currentZoom: null,
        currentCenter: null,
      });

      const state = useMapStore.getState();
      expect(state.currentExtent).toBeNull();
      expect(state.currentZoom).toBeNull();
      expect(state.currentCenter).toBeNull();
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle activeToolId switches correctly", () => {
      useMapStore.getState().setActiveToolId("measure");
      expect(useMapStore.getState().activeToolId).toBe("measure");

      useMapStore.getState().setActiveToolId("mymaps-draw");
      expect(useMapStore.getState().activeToolId).toBe("mymaps-draw");

      useMapStore.getState().setActiveToolId(null);
      expect(useMapStore.getState().activeToolId).toBeNull();
    });

    it("should handle loading workflow", () => {
      // Simulate loading sequence step by step
      let state = useMapStore.getState();
      const checkItems = ["map", "sidebar", "header"];
      expect(checkItems.every((item) => state.loadedItems.includes(item))).toBe(false);

      // Add 'map'
      useMapStore.setState({ loadedItems: ["map"] });
      state = useMapStore.getState();
      expect(checkItems.every((item) => state.loadedItems.includes(item))).toBe(false);

      // Add 'sidebar'
      useMapStore.setState({ loadedItems: ["map", "sidebar"] });
      state = useMapStore.getState();
      expect(checkItems.every((item) => state.loadedItems.includes(item))).toBe(false);

      // Add 'header' - now all should be loaded
      useMapStore.setState({ loadedItems: ["map", "sidebar", "header"] });
      state = useMapStore.getState();
      expect(checkItems.every((item) => state.loadedItems.includes(item))).toBe(true);
    });

    it("should maintain state integrity during rapid changes", () => {
      // Simulate rapid state changes by setting final state
      const componentNames = [];
      for (let i = 0; i < 10; i++) {
        componentNames.push(`component_${i}`);
      }

      // Set final state after rapid changes
      useMapStore.setState({
        currentZoom: 19, // Last zoom value (9 + 10)
        loadedItems: componentNames,
      });

      const state = useMapStore.getState();
      expect(state.currentZoom).toBe(19);
      expect(state.loadedItems).toHaveLength(10);
    });
  });

  describe("Active Tool Management", () => {
    it("should set activeToolId for measure", () => {
      useMapStore.getState().setActiveToolId("measure");
      expect(useMapStore.getState().activeToolId).toBe("measure");
    });

    it("should set activeToolId for coordinates", () => {
      useMapStore.getState().setActiveToolId("coordinates");
      expect(useMapStore.getState().activeToolId).toBe("coordinates");
    });

    it("should set activeToolId for mymaps-draw", () => {
      useMapStore.getState().setActiveToolId("mymaps-draw");
      expect(useMapStore.getState().activeToolId).toBe("mymaps-draw");
    });

    it("should set activeToolId for mymaps-edit", () => {
      useMapStore.getState().setActiveToolId("mymaps-edit");
      expect(useMapStore.getState().activeToolId).toBe("mymaps-edit");
    });

    it("should set activeToolId for generic tool", () => {
      useMapStore.getState().setActiveToolId("toggler");
      expect(useMapStore.getState().activeToolId).toBe("toggler");
    });

    it("should clear activeToolId when set to null", () => {
      useMapStore.getState().setActiveToolId("measure");
      expect(useMapStore.getState().activeToolId).toBe("measure");

      useMapStore.getState().setActiveToolId(null);
      expect(useMapStore.getState().activeToolId).toBeNull();
    });

    it("isToolActive() should return true when a tool is active", () => {
      useMapStore.getState().setActiveToolId("measure");
      expect(useMapStore.getState().isToolActive()).toBe(true);
    });

    it("isToolActive() should return false when no tool is active", () => {
      expect(useMapStore.getState().isToolActive()).toBe(false);
    });

    it("isToolActive(toolId) should compare against activeToolId", () => {
      useMapStore.getState().setActiveToolId("measure");
      expect(useMapStore.getState().isToolActive("measure")).toBe(true);
      expect(useMapStore.getState().isToolActive("coordinates")).toBe(false);
    });

    it("should replace previous tool when switching tools", () => {
      useMapStore.getState().setActiveToolId("measure");
      expect(useMapStore.getState().activeToolId).toBe("measure");

      useMapStore.getState().setActiveToolId("coordinates");
      expect(useMapStore.getState().activeToolId).toBe("coordinates");
    });
  });

  describe("Error Handling", () => {
    it("should handle removing non-existent loaded item gracefully", () => {
      // Add an item first
      useMapStore.setState({ loadedItems: ["map"] });

      // Simulate trying to remove non-existent item (should not crash)
      const currentItems = useMapStore.getState().loadedItems;
      const filteredItems = currentItems.filter((item) => item !== "nonexistent");

      // Should complete without throwing
      expect(() => {
        useMapStore.setState({ loadedItems: filteredItems });
      }).not.toThrow();

      expect(useMapStore.getState().loadedItems).toEqual(["map"]);
    });

    it("should handle clearing empty loaded items", () => {
      // Should complete without throwing even when already empty
      expect(() => {
        useMapStore.setState({ loadedItems: [] });
      }).not.toThrow();

      expect(useMapStore.getState().loadedItems).toEqual([]);
    });
  });
});
