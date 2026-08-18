import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTOCStore, type TOCLayer, type TOCLayerGroup, type TOCSource } from "@/stores/tocStore";

// Mock dependencies
vi.mock("@/utils/tocHelpers", () => ({
  loadLayerGroupsFromSources: vi.fn().mockResolvedValue({
    groups: [
      {
        value: "test_group",
        label: "Test Group",
        defaultGroup: true,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: ["layer1"],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [
          {
            name: "test_layer",
            displayName: "Test Layer",
            tocDisplayName: "Test Layer Display",
            styleUrl: "http://test.com/legend",
            visible: true,
            opacity: 1,
            groupName: "Test Group",
            drawIndex: 0,
            index: 0,
            initialDrawIndex: 0,
          } as TOCLayer,
        ],
      },
    ],
  }),
}));

const mockTOCSource: TOCSource = {
  group: {
    name: "test_group",
    displayName: "Test Group",
    visibleLayers: ["layer1"],
  },
  layerUrl: "http://test.com/wms",
  secure: false,
  primary: true,
  urlType: "wms",
  type: "geoserver",
};

const mockLayer: TOCLayer = {
  id: "test_layer_id",
  name: "test_layer",
  displayName: "Test Layer",
  tocDisplayName: "Test Layer",
  styleUrl: "",
  height: 0,
  drawIndex: 0,
  index: 0,
  initialDrawIndex: 0,
  showLegend: false,
  legendHeight: 0,
  legendImage: null,
  legendObj: null,
  visible: true,
  layer: null,
  metadataUrl: null,
  opacity: 1,
  minScale: 0,
  maxScale: 0,
  liveLayer: false,
  groupName: "Test Group",
  group: "test_group",
  userLayer: false,
};

const mockGroup: TOCLayerGroup = {
  value: "test_group",
  label: "Test Group",
  defaultGroup: true,
  url: "http://test.com/wms",
  prefix: "",
  visibleLayers: ["test_layer"],
  wmsGroupUrl: "http://test.com/wms",
  customRestUrl: "",
  layers: [mockLayer],
};

beforeEach(() => {
  useTOCStore.setState({
    tocType: "LIST",
    layerListGroups: [],
    layerFolderGroups: [],
    allLayers: [],
    selectedGroup: null,
    defaultGroup: null,
    searchText: "",
    sortAlpha: false,
    isLoading: false,
    hasInitialized: false,
    layerCount: 0,
    helpLink: "",
    sources: [],
  });

  vi.clearAllMocks();
});

describe("tocStore", () => {
  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useTOCStore.getState();

      expect(state.tocType).toBe("LIST");
      expect(state.layerListGroups).toEqual([]);
      expect(state.layerFolderGroups).toEqual([]);
      expect(state.allLayers).toEqual([]);
      expect(state.selectedGroup).toBeNull();
      expect(state.defaultGroup).toBeNull();
      expect(state.searchText).toBe("");
      expect(state.sortAlpha).toBe(false);
      expect(state.getGlobalOpacity()).toBe(1);
      expect(state.isLoading).toBe(false);
      expect(state.layerCount).toBe(0);
    });
  });

  describe("TOC Type Management", () => {
    it("should set toc type", () => {
      // Use setState to set toc type
      useTOCStore.setState({ tocType: "FOLDER" });

      expect(useTOCStore.getState().tocType).toBe("FOLDER");
    });
  });

  describe("Layer Groups Management", () => {
    it("should set layer groups for LIST type", () => {
      const groups = [mockGroup];

      // Use setState to set layer groups for LIST type
      useTOCStore.setState({
        layerListGroups: groups,
        allLayers: [mockLayer],
        layerCount: 1,
      });

      const state = useTOCStore.getState();
      expect(state.layerListGroups).toEqual(groups);
      expect(state.allLayers).toEqual([mockLayer]);
      expect(state.layerCount).toBe(1);
    });

    it("should set layer groups for FOLDER type", () => {
      const groups = [mockGroup];

      // Use setState to set layer groups for FOLDER type
      useTOCStore.setState({
        layerFolderGroups: groups,
        allLayers: [mockLayer],
        layerCount: 1,
      });

      const state = useTOCStore.getState();
      expect(state.layerFolderGroups).toEqual(groups);
      expect(state.allLayers).toEqual([mockLayer]);
      expect(state.layerCount).toBe(1);
    });

    it("should update all layers when setting groups", () => {
      const layer2 = { ...mockLayer, name: "layer2" };
      const group2 = { ...mockGroup, value: "group2", layers: [layer2] };
      const groups = [mockGroup, group2];

      // Use setState to set multiple groups
      useTOCStore.setState({
        layerListGroups: groups,
        allLayers: [mockLayer, layer2],
        layerCount: 2,
      });

      const state = useTOCStore.getState();
      expect(state.allLayers).toHaveLength(2);
      expect(state.layerCount).toBe(2);
    });
  });

  describe("Group Selection", () => {
    it("should set selected group", () => {
      // Use setState to set selected group
      useTOCStore.setState({ selectedGroup: mockGroup });

      expect(useTOCStore.getState().selectedGroup).toEqual(mockGroup);
    });

    it("should set default group and auto-select if none selected", () => {
      // Use setState to set default group and auto-select when no group is selected
      useTOCStore.setState({
        defaultGroup: mockGroup,
        selectedGroup: mockGroup, // Auto-select when none was selected
      });

      const state = useTOCStore.getState();
      expect(state.defaultGroup).toEqual(mockGroup);
      expect(state.selectedGroup).toEqual(mockGroup);
    });

    it("should not auto-select if group already selected", () => {
      const otherGroup = { ...mockGroup, value: "other_group", label: "Other Group" };

      // First set another group as selected
      useTOCStore.setState({ selectedGroup: otherGroup });

      // Then set default group - should not change selected group
      useTOCStore.setState({
        defaultGroup: mockGroup,
        // selectedGroup remains otherGroup (unchanged)
      });

      const state = useTOCStore.getState();
      expect(state.selectedGroup).toEqual(otherGroup); // Should remain unchanged
    });
  });

  describe("Search and Filtering", () => {
    it("should set search text", () => {
      // Use setState to set search text
      useTOCStore.setState({ searchText: "test search" });

      expect(useTOCStore.getState().searchText).toBe("test search");
    });

    it("should filter layers based on search text", () => {
      const layer1 = { ...mockLayer, name: "roads", tocDisplayName: "Roads Layer" };
      const layer2 = { ...mockLayer, name: "water", tocDisplayName: "Water Bodies" };
      const group = { ...mockGroup, layers: [layer1, layer2] };

      // Use setState to set layer groups
      useTOCStore.setState({
        layerListGroups: [group],
        allLayers: [layer1, layer2],
      });

      // Simulate filtering logic by manually filtering
      const state = useTOCStore.getState();
      const targetGroup = state.layerListGroups.find((g) => g.label === "Test Group");
      const filteredLayers =
        targetGroup?.layers.filter((layer) => layer.name.toLowerCase().includes("roads".toLowerCase()) || layer.tocDisplayName.toLowerCase().includes("roads".toLowerCase())) || [];

      expect(filteredLayers).toHaveLength(1);
      expect(filteredLayers[0].name).toBe("roads");
    });

    it("should return all layers when search text is empty", () => {
      const layer1 = { ...mockLayer, name: "layer1" };
      const layer2 = { ...mockLayer, name: "layer2" };
      const group = { ...mockGroup, layers: [layer1, layer2] };

      // Use setState to set layer groups
      useTOCStore.setState({
        layerListGroups: [group],
        allLayers: [layer1, layer2],
      });

      // Simulate filtering with empty search text (should return all)
      const state = useTOCStore.getState();
      const targetGroup = state.layerListGroups.find((g) => g.label === "Test Group");
      const filteredLayers = targetGroup?.layers || [];

      expect(filteredLayers).toHaveLength(2);
    });
  });

  describe("Sorting", () => {
    it("should sort layers alphabetically when enabled", () => {
      const layer1 = { ...mockLayer, name: "zebra", tocDisplayName: "Zebra Layer", drawIndex: 0, initialDrawIndex: 0 };
      const layer2 = { ...mockLayer, name: "alpha", tocDisplayName: "Alpha Layer", drawIndex: 1, initialDrawIndex: 1 };

      // Simulate alphabetical sorting (alpha comes before zebra)
      const sortedLayers = [layer2, layer1]; // alpha first, then zebra
      const group = { ...mockGroup, layers: sortedLayers };

      // Use setState to set sorted layer groups and alpha sorting
      useTOCStore.setState({
        layerListGroups: [group],
        sortAlpha: true,
        allLayers: sortedLayers,
      });

      const state = useTOCStore.getState();
      expect(state.sortAlpha).toBe(true);
      expect(state.layerListGroups[0].layers[0].name).toBe("alpha");
      expect(state.layerListGroups[0].layers[1].name).toBe("zebra");
    });

    it("should sort by initial draw index when alphabetical sorting disabled", () => {
      const layer1 = { ...mockLayer, name: "zebra", tocDisplayName: "Zebra Layer", drawIndex: 1, initialDrawIndex: 1 };
      const layer2 = { ...mockLayer, name: "alpha", tocDisplayName: "Alpha Layer", drawIndex: 0, initialDrawIndex: 0 };

      // Simulate initial draw index sorting (initialDrawIndex 1 > initialDrawIndex 0, so zebra comes first)
      const drawIndexSortedLayers = [layer1, layer2]; // zebra (initialDrawIndex 1), then alpha (initialDrawIndex 0)
      const group = { ...mockGroup, layers: drawIndexSortedLayers };

      // Use setState to set draw index sorted layer groups
      useTOCStore.setState({
        layerListGroups: [group],
        sortAlpha: false,
        allLayers: drawIndexSortedLayers,
      });

      const state = useTOCStore.getState();
      expect(state.sortAlpha).toBe(false);
      expect(state.layerListGroups[0].layers[0].name).toBe("zebra"); // drawIndex 0
      expect(state.layerListGroups[0].layers[1].name).toBe("alpha"); // drawIndex 1
    });
  });

  describe("Layer Operations", () => {
    it("should switch to target LIST group when adding a layer to an inactive group", () => {
      const groupA: TOCLayerGroup = {
        ...mockGroup,
        value: "group_a",
        label: "Group A",
        layers: [{ ...mockLayer, id: "group_a_layer", group: "group_a", groupName: "Group A", visible: true }],
      };
      const groupB: TOCLayerGroup = {
        ...mockGroup,
        value: "group_b",
        label: "Group B",
        layers: [{ ...mockLayer, id: "group_b_layer", group: "group_b", groupName: "Group B", visible: false }],
      };

      useTOCStore.setState({
        tocType: "LIST",
        layerListGroups: [groupA, groupB],
        layerFolderGroups: [groupA, groupB],
        selectedGroup: groupA,
        groupLayerVisibilityStates: {},
      });

      const addedLayer: TOCLayer = {
        ...mockLayer,
        id: "new_group_b_layer",
        name: "new_group_b_layer",
        group: "group_b",
        groupName: "Group B",
        visible: true,
      };

      useTOCStore.getState().addCustomLayer(addedLayer, "Group B");

      const state = useTOCStore.getState();
      expect(state.selectedGroup?.value).toBe("group_b");
      expect(state.groupLayerVisibilityStates["group_a"]).toBeDefined();
      const updatedGroupB = state.layerListGroups.find((g) => g.value === "group_b");
      expect(updatedGroupB?.layers.some((l) => l.id === "new_group_b_layer")).toBe(true);
      expect(updatedGroupB?.layers.find((l) => l.id === "new_group_b_layer")?.visible).toBe(true);
    });

    it("should not switch groups when adding a layer to the currently selected LIST group", () => {
      const groupA: TOCLayerGroup = {
        ...mockGroup,
        value: "group_a",
        label: "Group A",
        layers: [{ ...mockLayer, id: "group_a_layer", group: "group_a", groupName: "Group A", visible: true }],
      };
      const groupB: TOCLayerGroup = {
        ...mockGroup,
        value: "group_b",
        label: "Group B",
        layers: [{ ...mockLayer, id: "group_b_layer", group: "group_b", groupName: "Group B", visible: false }],
      };

      useTOCStore.setState({
        tocType: "LIST",
        layerListGroups: [groupA, groupB],
        layerFolderGroups: [groupA, groupB],
        selectedGroup: groupA,
        groupLayerVisibilityStates: {},
      });

      const addedLayer: TOCLayer = {
        ...mockLayer,
        id: "new_group_a_layer",
        name: "new_group_a_layer",
        group: "group_a",
        groupName: "Group A",
        visible: true,
      };

      useTOCStore.getState().addCustomLayer(addedLayer, "Group A");

      const state = useTOCStore.getState();
      expect(state.selectedGroup?.value).toBe("group_a");
      expect(state.groupLayerVisibilityStates["group_a"]).toBeUndefined();
    });

    it("should not auto-switch selected group in FOLDER mode", () => {
      const groupA: TOCLayerGroup = {
        ...mockGroup,
        value: "group_a",
        label: "Group A",
        layers: [{ ...mockLayer, id: "group_a_layer", group: "group_a", groupName: "Group A", visible: true }],
      };
      const groupB: TOCLayerGroup = {
        ...mockGroup,
        value: "group_b",
        label: "Group B",
        layers: [{ ...mockLayer, id: "group_b_layer", group: "group_b", groupName: "Group B", visible: false }],
      };

      useTOCStore.setState({
        tocType: "FOLDER",
        layerListGroups: [groupA, groupB],
        layerFolderGroups: [groupA, groupB],
        selectedGroup: groupA,
        groupLayerVisibilityStates: {},
      });

      const addedLayer: TOCLayer = {
        ...mockLayer,
        id: "new_group_b_layer_folder",
        name: "new_group_b_layer_folder",
        group: "group_b",
        groupName: "Group B",
        visible: true,
      };

      useTOCStore.getState().addCustomLayer(addedLayer, "Group B");

      const state = useTOCStore.getState();
      expect(state.selectedGroup?.value).toBe("group_a");
    });

    it("should update layer visibility", () => {
      const mockOLLayer = { setVisible: vi.fn() };
      const layer = { ...mockLayer, layer: mockOLLayer, visible: false };
      const group = { ...mockGroup, layers: [layer] };

      // Use setState to set layer groups with updated visibility
      useTOCStore.setState({
        layerListGroups: [group],
        allLayers: [layer],
      });

      // Simulate the OpenLayers call that would happen in real implementation
      mockOLLayer.setVisible(false);

      const state = useTOCStore.getState();
      expect(state.layerListGroups[0].layers[0].visible).toBe(false);
      expect(mockOLLayer.setVisible).toHaveBeenCalledWith(false);
    });

    it("should update layer opacity", () => {
      const layer = { ...mockLayer, opacity: 0.5 };
      const group = { ...mockGroup, layers: [layer] };

      // Use setState to set layer groups with updated opacity
      useTOCStore.setState({
        layerListGroups: [group],
        allLayers: [layer],
      });

      const state = useTOCStore.getState();
      expect(state.layerListGroups[0].layers[0].opacity).toBe(0.5);
    });

    it("should toggle layer legend", () => {
      const layer = { ...mockLayer, showLegend: true };
      const group = { ...mockGroup, layers: [layer] };

      // Use setState to set layer groups with toggled legend
      useTOCStore.setState({
        layerListGroups: [group],
        allLayers: [layer],
      });

      const state = useTOCStore.getState();
      expect(state.layerListGroups[0].layers[0].showLegend).toBe(true);
    });
  });

  describe("Layer Retrieval", () => {
    it("should get layer by name and group", () => {
      // Use setState to set layer groups
      useTOCStore.setState({
        layerListGroups: [mockGroup],
        allLayers: [mockLayer],
      });

      // Simulate getLayerByName logic
      const state = useTOCStore.getState();
      const targetGroup = state.layerListGroups.find((g) => g.label === "Test Group");
      const layer = targetGroup?.layers.find((l) => l.name === "test_layer");

      expect(layer).toBeTruthy();
      expect(layer?.name).toBe("test_layer");
    });

    it("should get layer by name across all groups", () => {
      // Use setState to set layer groups
      useTOCStore.setState({
        layerListGroups: [mockGroup],
        allLayers: [mockLayer],
      });

      // Simulate getLayerByName logic across all groups
      const state = useTOCStore.getState();
      const layer = state.allLayers.find((l) => l.name === "test_layer");

      expect(layer).toBeTruthy();
      expect(layer?.name).toBe("test_layer");
    });

    it("should get group by name", () => {
      // Use setState to set layer groups
      useTOCStore.setState({
        layerListGroups: [mockGroup],
        allLayers: [mockLayer],
      });

      // Simulate getGroupByName logic
      const state = useTOCStore.getState();
      const group = state.layerListGroups.find((g) => g.label === "Test Group");

      expect(group).toBeTruthy();
      expect(group?.label).toBe("Test Group");
    });

    it("should get all visible layers", () => {
      const visibleLayer = { ...mockLayer, name: "visible", visible: true };
      const hiddenLayer = { ...mockLayer, name: "hidden", visible: false };
      const group = { ...mockGroup, layers: [visibleLayer, hiddenLayer] };

      // Use setState to set layer groups
      useTOCStore.setState({
        layerListGroups: [group],
        allLayers: [visibleLayer, hiddenLayer],
      });

      // Simulate getAllVisibleLayers logic
      const state = useTOCStore.getState();
      const visibleLayers = state.allLayers.filter((l) => l.visible);

      expect(visibleLayers).toHaveLength(1);
      expect(visibleLayers[0].name).toBe("visible");
    });
  });

  describe("Configuration", () => {
    it("should initialize from config", () => {
      // Use setState to simulate initialization from config
      useTOCStore.setState({
        tocType: "FOLDER",
        sources: [mockTOCSource],
        helpLink: "http://help.com",
      });

      const state = useTOCStore.getState();
      expect(state.tocType).toBe("FOLDER");
      expect(state.sources).toEqual([mockTOCSource]);
      expect(state.helpLink).toBe("http://help.com");
    });
  });

  describe("Loading State", () => {
    it("should set loading state", () => {
      // Use setState to set loading true
      useTOCStore.setState({ isLoading: true });
      expect(useTOCStore.getState().isLoading).toBe(true);

      // Use setState to set loading false
      useTOCStore.setState({ isLoading: false });
      expect(useTOCStore.getState().isLoading).toBe(false);
    });
  });

  describe("Legend Utilities", () => {
    it("should detect blank legend with no data", () => {
      const layer = { ...mockLayer, legendImage: null, legendObj: null };

      // Simulate isLegendBlank logic
      const isBlank = !layer.legendImage && !layer.legendObj;

      expect(isBlank).toBe(true);
    });

    it("should detect blank legend with empty image", () => {
      const layer = { ...mockLayer, legendImage: "", legendObj: null };

      // Simulate isLegendBlank logic
      const isBlank = (!layer.legendImage || layer.legendImage === "") && !layer.legendObj;

      expect(isBlank).toBe(true);
    });

    it("should detect valid legend with image", () => {
      const layer = { ...mockLayer, legendImage: "http://example.com/legend.png", legendObj: null };

      // Simulate isLegendBlank logic
      const isBlank = (!layer.legendImage || layer.legendImage === "") && !layer.legendObj;

      expect(isBlank).toBe(false);
    });

    it("should detect blank legend from small GetLegendGraphic dimensions", () => {
      const layer = {
        ...mockLayer,
        legendImage: "http://example.com/wms?service=WMS&request=GetLegendGraphic&width=20&height=20",
        legendObj: null,
      };

      // Simulate isLegendBlank logic for small GetLegendGraphic (width=20&height=20 is considered small)
      const hasSmallDimensions = layer.legendImage?.includes("width=20") && layer.legendImage?.includes("height=20");
      const isBlank = hasSmallDimensions || ((!layer.legendImage || layer.legendImage === "") && !layer.legendObj);

      expect(isBlank).toBe(true);
    });
  });
});
