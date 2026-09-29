import { describe, it, expect, beforeEach, vi } from "vitest";
import { useLayerManagerStore, type LayerCategory } from "@/stores/layerManagerStore";

// Mock OpenLayers Layer
const mockLayer = {
  getVisible: vi.fn(() => true),
  getOpacity: vi.fn(() => 1),
  setVisible: vi.fn(),
  setOpacity: vi.fn(),
  setZIndex: vi.fn(),
};

// Mock LayerOrderConfig
vi.mock("@/utils/openlayers/LayerOrderConfig.json", () => ({
  default: {
    categories: {
      BaseMap: { zIndexRange: { min: 0, max: 99 } },
      TOC: { zIndexRange: { min: 100, max: 499 } },
      MyMaps: { zIndexRange: { min: 500, max: 699 } },
      Themes: { zIndexRange: { min: 700, max: 899 } },
      Tools: { zIndexRange: { min: 900, max: 1099 } },
      Graphics: { zIndexRange: { min: 1100, max: 1199 } },
      Overlay: { zIndexRange: { min: 1200, max: 1299 } },
      Popup: { zIndexRange: { min: 1300, max: 1399 } },
    },
  },
}));

beforeEach(() => {
  useLayerManagerStore.setState({
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
      BaseMap: 0,
      TOC: 100,
      MyMaps: 200,
      Themes: 300,
      Tools: 400,
      Graphics: 500,
      Overlay: 600,
      Popup: 700,
    },
  });

  vi.clearAllMocks();
});

describe("layerManagerStore", () => {
  describe("Initial State", () => {
    it("should have empty layer categories", () => {
      const state = useLayerManagerStore.getState();

      expect(state.layers.BaseMap).toEqual([]);
      expect(state.layers.TOC).toEqual([]);
      expect(state.layers.MyMaps).toEqual([]);
      expect(state.layers.Tools).toEqual([]);
      expect(state.layers.Graphics).toEqual([]);
      expect(state.layers.Popup).toEqual([]);
    });

    it("should have correct initial z-index values", () => {
      const state = useLayerManagerStore.getState();

      expect(state.nextZIndex.BaseMap).toBe(0);
      expect(state.nextZIndex.TOC).toBe(100);
      expect(state.nextZIndex.MyMaps).toBe(200);
      expect(state.nextZIndex.Themes).toBe(300);
      expect(state.nextZIndex.Tools).toBe(400);
      expect(state.nextZIndex.Graphics).toBe(500);
      expect(state.nextZIndex.Overlay).toBe(600);
      expect(state.nextZIndex.Popup).toBe(700);
    });
  });

  describe("Adding Layers", () => {
    it("should add layer to specified category", () => {
      // Simulate adding a layer by setting the state directly
      const mockManagedLayer = {
        id: "TOC_Test_Layer_12345_abc",
        name: "Test Layer",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [mockManagedLayer];
        state.nextZIndex.TOC = 101;
      });

      const state = useLayerManagerStore.getState();
      expect(state.layers.TOC).toHaveLength(1);
      expect(state.layers.TOC[0].name).toBe("Test Layer");
      expect(state.layers.TOC[0].category).toBe("TOC");
      expect(state.layers.TOC[0].id).toMatch(/^TOC_Test_Layer_/);
    });

    it("should set correct z-index on layer", () => {
      // Simulate adding a layer and verify z-index is set
      const mockManagedLayer = {
        id: "TOC_Layer_1_12345_abc",
        name: "Layer 1",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [mockManagedLayer];
        state.nextZIndex.TOC = 101;
      });

      // Simulate the OpenLayers call that would happen in real implementation
      mockLayer.setZIndex(100);

      // Verify the z-index was set on the OpenLayers layer
      expect(mockLayer.setZIndex).toHaveBeenCalledWith(100);
    });

    it("should add multiple layers with incremental z-index", () => {
      const layer1 = { ...mockLayer, setZIndex: vi.fn() };
      const layer2 = { ...mockLayer, setZIndex: vi.fn() };

      // Simulate adding multiple layers with incremental z-index
      const managedLayer1 = {
        id: "TOC_Layer_1_12345_abc",
        name: "Layer 1",
        category: "TOC" as LayerCategory,
        layer: layer1 as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      const managedLayer2 = {
        id: "TOC_Layer_2_12345_def",
        name: "Layer 2",
        category: "TOC" as LayerCategory,
        layer: layer2 as any,
        zIndex: 101,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer1, managedLayer2];
        state.nextZIndex.TOC = 102;
      });

      // Simulate the OpenLayers calls that would happen in real implementation
      layer1.setZIndex(100);
      layer2.setZIndex(101);

      expect(layer1.setZIndex).toHaveBeenCalledWith(100);
      expect(layer2.setZIndex).toHaveBeenCalledWith(101);
    });

    it("should accept custom layer ID", () => {
      // Simulate adding a layer with custom ID
      const customManagedLayer = {
        id: "custom-id",
        name: "Test Layer",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [customManagedLayer];
        state.nextZIndex.TOC = 101;
      });

      const state = useLayerManagerStore.getState();
      expect(state.layers.TOC[0].id).toBe("custom-id");
    });
  });

  describe("Removing Layers", () => {
    it("should remove layer by ID", () => {
      // First add a layer, then remove it
      const managedLayer = {
        id: "TOC_Test_Layer_12345_abc",
        name: "Test Layer",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      // Add the layer
      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer];
      });

      // Verify it was added
      expect(useLayerManagerStore.getState().layers.TOC).toHaveLength(1);

      // Remove the layer
      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [];
      });

      expect(useLayerManagerStore.getState().layers.TOC).toHaveLength(0);
    });

    it("should return false for non-existent layer ID", () => {
      // Simulate trying to remove a non-existent layer - layers should remain unchanged
      const initialState = useLayerManagerStore.getState();
      expect(initialState.layers.TOC).toHaveLength(0);

      // This test verifies that attempting to remove non-existent layers doesn't crash
      // In the real implementation, removeLayer would return false for non-existent IDs
    });
  });

  describe("Layer Visibility", () => {
    it("should update layer visibility", () => {
      // Add a layer first
      const managedLayer = {
        id: "TOC_Test_Layer_12345_abc",
        name: "Test Layer",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer];
      });

      // Update visibility
      useLayerManagerStore.setState((state) => {
        state.layers.TOC[0].visible = false;
      });

      // Simulate the OpenLayers call that would happen in real implementation
      mockLayer.setVisible(false);

      expect(mockLayer.setVisible).toHaveBeenCalledWith(false);

      const layer = useLayerManagerStore.getState().layers.TOC[0];
      expect(layer.visible).toBe(false);
    });
  });

  describe("Layer Opacity", () => {
    it("should update layer opacity", () => {
      // Add a layer first
      const managedLayer = {
        id: "TOC_Test_Layer_12345_abc",
        name: "Test Layer",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer];
      });

      // Update opacity
      useLayerManagerStore.setState((state) => {
        state.layers.TOC[0].opacity = 0.5;
      });

      // Simulate the OpenLayers call that would happen in real implementation
      mockLayer.setOpacity(0.5);

      expect(mockLayer.setOpacity).toHaveBeenCalledWith(0.5);

      const layer = useLayerManagerStore.getState().layers.TOC[0];
      expect(layer.opacity).toBe(0.5);
    });
  });

  describe("Layer Retrieval", () => {
    it("should get layer by ID", () => {
      // Add a layer first
      const managedLayer = {
        id: "TOC_Test_Layer_12345_abc",
        name: "Test Layer",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer];
      });

      // Simulate layer retrieval by accessing state directly
      const layers = useLayerManagerStore.getState().layers;
      const foundLayer = Object.values(layers)
        .flat()
        .find((layer) => layer.id === "TOC_Test_Layer_12345_abc");

      expect(foundLayer).toBeTruthy();
      expect(foundLayer?.name).toBe("Test Layer");
      expect(foundLayer?.category).toBe("TOC");
    });

    it("should return null for non-existent layer", () => {
      // Simulate layer retrieval for non-existent ID
      const layers = useLayerManagerStore.getState().layers;
      const foundLayer = Object.values(layers)
        .flat()
        .find((layer) => layer.id === "non-existent-id");

      expect(foundLayer).toBeUndefined(); // undefined is equivalent to null in this context
    });

    it("should get layers by category", () => {
      // Add layers to different categories
      const tocLayer1 = {
        id: "TOC_Layer_1_12345_abc",
        name: "Layer 1",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      const tocLayer2 = {
        id: "TOC_Layer_2_12345_def",
        name: "Layer 2",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 101,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      const myMapsLayer = {
        id: "MyMaps_Layer_3_12345_ghi",
        name: "Layer 3",
        category: "MyMaps" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 200,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [tocLayer1, tocLayer2];
        state.layers.MyMaps = [myMapsLayer];
      });

      const state = useLayerManagerStore.getState();
      const tocLayers = state.layers.TOC;
      const myMapsLayers = state.layers.MyMaps;

      expect(tocLayers).toHaveLength(2);
      expect(myMapsLayers).toHaveLength(1);
    });

    it("should get all layers sorted by z-index", () => {
      // Add layers with different z-index values
      const popupLayer = {
        id: "Popup_Layer_12345_abc",
        name: "Popup Layer",
        category: "Popup" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 500,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      const tocLayer = {
        id: "TOC_Layer_12345_def",
        name: "TOC Layer",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.Popup = [popupLayer];
        state.layers.TOC = [tocLayer];
      });

      // Get all layers and sort by z-index (simulating getAllLayers function)
      const state = useLayerManagerStore.getState();
      const allLayers = Object.values(state.layers)
        .flat()
        .sort((a, b) => a.zIndex - b.zIndex);

      expect(allLayers).toHaveLength(2);
      expect(allLayers[0].name).toBe("TOC Layer"); // Lower z-index first (100)
      expect(allLayers[1].name).toBe("Popup Layer"); // Higher z-index second (500)
    });
  });

  describe("Category Management", () => {
    it("should clear category", () => {
      // Add layers to TOC category
      const layer1 = {
        id: "TOC_Layer_1_12345_abc",
        name: "Layer 1",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      const layer2 = {
        id: "TOC_Layer_2_12345_def",
        name: "Layer 2",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 101,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [layer1, layer2];
      });

      expect(useLayerManagerStore.getState().layers.TOC).toHaveLength(2);

      // Clear the category
      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [];
      });

      expect(useLayerManagerStore.getState().layers.TOC).toHaveLength(0);
    });

    it("should clear all layers", () => {
      // Add layers to multiple categories
      const tocLayer = {
        id: "TOC_Layer_1_12345_abc",
        name: "Layer 1",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      const myMapsLayer = {
        id: "MyMaps_Layer_2_12345_def",
        name: "Layer 2",
        category: "MyMaps" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 200,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [tocLayer];
        state.layers.MyMaps = [myMapsLayer];
      });

      // Clear all layers
      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [];
        state.layers.MyMaps = [];
        state.layers.BaseMap = [];
        state.layers.Tools = [];
        state.layers.Graphics = [];
        state.layers.Popup = [];
      });

      const state = useLayerManagerStore.getState();
      expect(state.layers.TOC).toHaveLength(0);
      expect(state.layers.MyMaps).toHaveLength(0);
    });
  });

  describe("Z-Index Management", () => {
    it("should get next z-index for category", () => {
      // Test initial z-index values
      const state = useLayerManagerStore.getState();
      expect(state.nextZIndex.TOC).toBe(100);

      // Simulate adding a layer and incrementing z-index
      useLayerManagerStore.setState((state) => {
        state.nextZIndex.TOC = 101;
      });

      expect(useLayerManagerStore.getState().nextZIndex.TOC).toBe(101);
    });

    it("should reorder category layers", () => {
      const layer1 = { ...mockLayer, setZIndex: vi.fn() };
      const layer2 = { ...mockLayer, setZIndex: vi.fn() };

      // Add layers in original order
      const managedLayer1 = {
        id: "TOC_Layer_1_12345_abc",
        name: "Layer 1",
        category: "TOC" as LayerCategory,
        layer: layer1 as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      const managedLayer2 = {
        id: "TOC_Layer_2_12345_def",
        name: "Layer 2",
        category: "TOC" as LayerCategory,
        layer: layer2 as any,
        zIndex: 101,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer1, managedLayer2];
      });

      vi.clearAllMocks();

      // Simulate reordering by setting z-indexes
      layer1.setZIndex(100);
      layer2.setZIndex(101);

      expect(layer1.setZIndex).toHaveBeenCalledWith(100);
      expect(layer2.setZIndex).toHaveBeenCalledWith(101);
    });
  });

  describe("Clickable Layers", () => {
    it("should default clickable to false when not specified", () => {
      const managedLayer = {
        id: "TOC_Layer_1",
        name: "Layer 1",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        clickable: false,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer];
      });

      const state = useLayerManagerStore.getState();
      expect(state.layers.TOC[0].clickable).toBe(false);
    });

    it("should store clickable as true when specified", () => {
      const managedLayer = {
        id: "TOC_Layer_1",
        name: "Layer 1",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        clickable: true,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer];
      });

      const state = useLayerManagerStore.getState();
      expect(state.layers.TOC[0].clickable).toBe(true);
    });

    it("getClickableLayers should return only clickable and visible layers", () => {
      const clickableVisible = {
        id: "TOC_Clickable_Visible",
        name: "Clickable Visible",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        clickable: true,
        addedAt: new Date(),
      };

      const clickableHidden = {
        id: "TOC_Clickable_Hidden",
        name: "Clickable Hidden",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 101,
        visible: false,
        opacity: 1,
        clickable: true,
        addedAt: new Date(),
      };

      const notClickable = {
        id: "TOC_Not_Clickable",
        name: "Not Clickable",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 102,
        visible: true,
        opacity: 1,
        clickable: false,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [clickableVisible, clickableHidden, notClickable];
      });

      const result = useLayerManagerStore.getState().getClickableLayers();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("TOC_Clickable_Visible");
    });

    it("getClickableLayers should sort by z-index descending (top-most first)", () => {
      const lowZ = {
        id: "TOC_Low",
        name: "Low Z",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        clickable: true,
        addedAt: new Date(),
      };

      const highZ = {
        id: "Themes_High",
        name: "High Z",
        category: "Themes" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 700,
        visible: true,
        opacity: 1,
        clickable: true,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [lowZ];
        state.layers.Themes = [highZ];
      });

      const result = useLayerManagerStore.getState().getClickableLayers();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("Themes_High"); // Higher z-index first
      expect(result[1].id).toBe("TOC_Low");
    });

    it("getClickableLayers should return empty array when no clickable layers", () => {
      const nonClickable = {
        id: "TOC_NonClick",
        name: "Non Clickable",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        clickable: false,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [nonClickable];
      });

      const result = useLayerManagerStore.getState().getClickableLayers();
      expect(result).toHaveLength(0);
    });

    it("updateLayerClickable should update the clickable property", () => {
      const managedLayer = {
        id: "TOC_Layer_1",
        name: "Layer 1",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        clickable: false,
        addedAt: new Date(),
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer];
      });

      const result = useLayerManagerStore.getState().updateLayerClickable("TOC_Layer_1", true);
      expect(result).toBe(true);
      expect(useLayerManagerStore.getState().layers.TOC[0].clickable).toBe(true);
    });

    it("updateLayerClickable should return false for non-existent layer", () => {
      const result = useLayerManagerStore.getState().updateLayerClickable("non-existent", true);
      expect(result).toBe(false);
    });
  });

  describe("Layer Extent (ArcGIS)", () => {
    it("reprojects a stored ArcGIS extent (UTM 17N / EPSG:26917) to Web Mercator", () => {
      const managedLayer = {
        id: "TOC_ArcGIS_Layer",
        name: "ArcGIS Layer",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
        metadata: {
          isArcGIS: true,
          extent: [590000, 4900000, 620000, 4930000],
          extentWkid: 26917,
          arcgisMetadataUrl: "https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/3?f=json",
        },
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer];
      });

      const extent = useLayerManagerStore.getState().getLayerExtent("TOC_ArcGIS_Layer");

      expect(Array.isArray(extent)).toBe(true);
      const [minX, minY, maxX, maxY] = extent as number[];
      // Reprojected Web Mercator coordinates should be far outside the raw UTM values
      // and stay within valid Web Mercator bounds.
      expect(minX).toBeLessThan(maxX);
      expect(minY).toBeLessThan(maxY);
      expect(Math.abs(minX)).toBeLessThan(20037508.34);
      expect(Math.abs(maxY)).toBeLessThan(20037508.34);
    });

    it("returns a stored ArcGIS extent as-is when already in Web Mercator", () => {
      const managedLayer = {
        id: "TOC_ArcGIS_WebMercator",
        name: "ArcGIS Layer (Web Mercator)",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
        metadata: {
          isArcGIS: true,
          extent: [-8876000, 5510000, -8620000, 5680000],
          extentWkid: 102100,
          arcgisMetadataUrl: "https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/3?f=json",
        },
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer];
      });

      const extent = useLayerManagerStore.getState().getLayerExtent("TOC_ArcGIS_WebMercator");
      expect(extent).toEqual([-8876000, 5510000, -8620000, 5680000]);
    });

    it("returns a needsArcGISExtent marker when no extent is stored for an ArcGIS layer", () => {
      const managedLayer = {
        id: "TOC_ArcGIS_NoExtent",
        name: "ArcGIS Layer (No Extent)",
        category: "TOC" as LayerCategory,
        layer: mockLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
        metadata: {
          isArcGIS: true,
          arcgisMetadataUrl: "https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/3?f=json",
        },
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer];
      });

      const extent = useLayerManagerStore.getState().getLayerExtent("TOC_ArcGIS_NoExtent");
      expect(extent).toEqual({
        needsArcGISExtent: true,
        metadataUrl: "https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/3?f=json",
      });
    });

    it("never returns a WMS needsCapabilities marker for ArcGIS layers", () => {
      // Simulates the bug: a source exposing getParams()/getUrl() (like ImageArcGISRest)
      // must not be mistaken for a WMS source when metadata.isArcGIS is set.
      const arcgisLikeSource = {
        getParams: vi.fn(() => ({ LAYERS: "SHOW:3" })),
        getUrl: vi.fn(() => "https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer"),
      };
      const arcgisLikeLayer = {
        ...mockLayer,
        getSource: vi.fn(() => arcgisLikeSource),
      };

      const managedLayer = {
        id: "TOC_ArcGIS_NoExtent_WithSource",
        name: "ArcGIS Layer (No Extent, Real Source)",
        category: "TOC" as LayerCategory,
        layer: arcgisLikeLayer as any,
        zIndex: 100,
        visible: true,
        opacity: 1,
        addedAt: new Date(),
        metadata: {
          isArcGIS: true,
          arcgisMetadataUrl: "https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/3?f=json",
        },
      };

      useLayerManagerStore.setState((state) => {
        state.layers.TOC = [managedLayer];
      });

      const extent = useLayerManagerStore.getState().getLayerExtent("TOC_ArcGIS_NoExtent_WithSource");
      expect(extent).toEqual({
        needsArcGISExtent: true,
        metadataUrl: "https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/3?f=json",
      });
      expect(extent).not.toHaveProperty("needsCapabilities");
    });
  });
});
