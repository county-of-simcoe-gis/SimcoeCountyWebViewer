import { describe, it, expect, beforeEach } from "vitest";
import { useTOCStore, type TOCLayer, type TOCLayerGroup } from "@/stores/tocStore";

/**
 * Tests for LIST view layer deduplication with secured-priority.
 *
 * Context: The same physical layer can be published under multiple workspace
 * prefixes (e.g. "simcoe:Bruce_Trail" and "simcoe-secured:Bruce_Trail"), or
 * appear in multiple config groups. The LIST view's virtual "All Layers" group
 * must show each layer ONCE, with the secured variant (then primary group)
 * winning when duplicates exist. This mirrors the legacy app's
 * mergeGroupsTogether() behavior.
 */
describe("tocStore - LIST view deduplication", () => {
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
  });

  describe("Secured layer priority", () => {
    it("should keep secured layer and drop unsecured when duplicate names exist", () => {
      // Two layers with same tocDisplayName but different secured state
      const unsecuredLayer: TOCLayer = {
        id: "unsecured_id",
        name: "simcoe:Bruce_Trail",
        displayName: "Bruce Trail",
        tocDisplayName: "Bruce Trail",
        styleUrl: "",
        height: 0,
        drawIndex: 0,
        index: 0,
        initialDrawIndex: 0,
        showLegend: false,
        legendHeight: 0,
        legendImage: null,
        legendObj: null,
        visible: false,
        defaultVisible: false,
        layer: null,
        metadataUrl: null,
        opacity: 1,
        minScale: 0,
        maxScale: 0,
        liveLayer: false,
        groupName: "Trails",
        group: "simcoe:Trails",
        userLayer: false,
        secured: false,
      };

      const securedLayer: TOCLayer = {
        ...unsecuredLayer,
        id: "secured_id",
        name: "simcoe-secured:Bruce_Trail",
        group: "simcoe-secured:Trails",
        secured: true,
        visible: true,
      };

      const group1: TOCLayerGroup = {
        value: "simcoe:Trails",
        label: "Trails",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "simcoe:",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [unsecuredLayer],
        primary: false,
      };

      const group2: TOCLayerGroup = {
        value: "simcoe-secured:Trails",
        label: "Trails (Secured)",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "simcoe-secured:",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [securedLayer],
        primary: false,
      };

      // Call setLayerGroups for LIST type
      useTOCStore.getState().setLayerGroups("LIST", [group1, group2]);

      const state = useTOCStore.getState();
      const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");

      expect(allLayersGroup).toBeDefined();
      expect(allLayersGroup!.layers).toHaveLength(1);
      expect(allLayersGroup!.layers[0].id).toBe("secured_id");
      expect(allLayersGroup!.layers[0].secured).toBe(true);
      expect(allLayersGroup!.layers[0].visible).toBe(true);
    });

    it("should keep first unsecured layer when multiple unsecured duplicates exist", () => {
      const layer1: TOCLayer = {
        id: "layer1_id",
        name: "simcoe:Roads",
        displayName: "Roads",
        tocDisplayName: "Roads",
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
        defaultVisible: true,
        layer: null,
        metadataUrl: null,
        opacity: 1,
        minScale: 0,
        maxScale: 0,
        liveLayer: false,
        groupName: "Transportation",
        group: "Transportation",
        userLayer: false,
        secured: false,
      };

      const layer2: TOCLayer = {
        ...layer1,
        id: "layer2_id",
        groupName: "Infrastructure",
        group: "Infrastructure",
        visible: false,
      };

      const group1: TOCLayerGroup = {
        value: "Transportation",
        label: "Transportation",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [layer1],
        primary: false,
      };

      const group2: TOCLayerGroup = {
        value: "Infrastructure",
        label: "Infrastructure",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [layer2],
        primary: false,
      };

      useTOCStore.getState().setLayerGroups("LIST", [group1, group2]);

      const state = useTOCStore.getState();
      const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");

      expect(allLayersGroup!.layers).toHaveLength(1);
      // sortGroups alphabetizes, so Infrastructure comes before Transportation
      expect(allLayersGroup!.layers[0].id).toBe("layer2_id");
      expect(allLayersGroup!.layers[0].visible).toBe(false);
    });
  });

  describe("Primary group priority", () => {
    it("should keep primary group layer over secondary when both unsecured", () => {
      const secondaryLayer: TOCLayer = {
        id: "secondary_id",
        name: "Parcels",
        displayName: "Parcels",
        tocDisplayName: "Assessment Parcels",
        styleUrl: "",
        height: 0,
        drawIndex: 0,
        index: 0,
        initialDrawIndex: 0,
        showLegend: false,
        legendHeight: 0,
        legendImage: null,
        legendObj: null,
        visible: false,
        defaultVisible: false,
        layer: null,
        metadataUrl: null,
        opacity: 0.8,
        minScale: 0,
        maxScale: 0,
        liveLayer: false,
        groupName: "Property",
        group: "Property",
        userLayer: false,
        secured: false,
      };

      const primaryLayer: TOCLayer = {
        ...secondaryLayer,
        id: "primary_id",
        groupName: "Assessment",
        group: "Assessment",
        visible: true,
        opacity: 1,
      };

      const secondaryGroup: TOCLayerGroup = {
        value: "Property",
        label: "Property",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [secondaryLayer],
        primary: false,
      };

      const primaryGroup: TOCLayerGroup = {
        value: "Assessment",
        label: "Assessment",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [primaryLayer],
        primary: true,
      };

      useTOCStore.getState().setLayerGroups("LIST", [secondaryGroup, primaryGroup]);

      const state = useTOCStore.getState();
      const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");

      expect(allLayersGroup!.layers).toHaveLength(1);
      expect(allLayersGroup!.layers[0].id).toBe("primary_id");
      expect(allLayersGroup!.layers[0].visible).toBe(true);
      expect(allLayersGroup!.layers[0].opacity).toBe(1);
    });

    it("should prioritize secured over primary when both present", () => {
      // Secured from secondary group should beat unsecured from primary group
      const primaryUnsecured: TOCLayer = {
        id: "primary_unsecured",
        name: "Water",
        displayName: "Water Bodies",
        tocDisplayName: "Water Bodies",
        styleUrl: "",
        height: 0,
        drawIndex: 0,
        index: 0,
        initialDrawIndex: 0,
        showLegend: false,
        legendHeight: 0,
        legendImage: null,
        legendObj: null,
        visible: false,
        defaultVisible: false,
        layer: null,
        metadataUrl: null,
        opacity: 1,
        minScale: 0,
        maxScale: 0,
        liveLayer: false,
        groupName: "Hydro",
        group: "Hydro",
        userLayer: false,
        secured: false,
      };

      const secondarySecured: TOCLayer = {
        ...primaryUnsecured,
        id: "secondary_secured",
        group: "Environment",
        groupName: "Environment",
        secured: true,
        visible: true,
      };

      const primaryGroup: TOCLayerGroup = {
        value: "Hydro",
        label: "Hydro",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [primaryUnsecured],
        primary: true,
      };

      const secondaryGroup: TOCLayerGroup = {
        value: "Environment",
        label: "Environment",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [secondarySecured],
        primary: false,
      };

      useTOCStore.getState().setLayerGroups("LIST", [primaryGroup, secondaryGroup]);

      const state = useTOCStore.getState();
      const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");

      expect(allLayersGroup!.layers).toHaveLength(1);
      expect(allLayersGroup!.layers[0].id).toBe("secondary_secured");
      expect(allLayersGroup!.layers[0].secured).toBe(true);
      expect(allLayersGroup!.layers[0].visible).toBe(true);
    });
  });

  describe("Dedup key matching", () => {
    it("should use tocDisplayName for matching duplicates", () => {
      const layer1: TOCLayer = {
        id: "layer1",
        name: "different_name_1",
        displayName: "Display 1",
        tocDisplayName: "Shared TOC Display Name",
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
        defaultVisible: true,
        layer: null,
        metadataUrl: null,
        opacity: 1,
        minScale: 0,
        maxScale: 0,
        liveLayer: false,
        groupName: "Group1",
        group: "Group1",
        userLayer: false,
        secured: false,
      };

      const layer2: TOCLayer = {
        ...layer1,
        id: "layer2",
        name: "different_name_2",
        displayName: "Display 2",
        groupName: "Group2",
        group: "Group2",
        visible: false,
      };

      const group1: TOCLayerGroup = {
        value: "Group1",
        label: "Group1",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [layer1],
      };

      const group2: TOCLayerGroup = {
        value: "Group2",
        label: "Group2",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [layer2],
      };

      useTOCStore.getState().setLayerGroups("LIST", [group1, group2]);

      const state = useTOCStore.getState();
      const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");

      // Should dedupe based on tocDisplayName despite different name/displayName
      expect(allLayersGroup!.layers).toHaveLength(1);
      expect(allLayersGroup!.layers[0].id).toBe("layer1");
    });

    it("should fallback to displayName then name when tocDisplayName missing", () => {
      const layer1: TOCLayer = {
        id: "layer1",
        name: "SharedName",
        displayName: "SharedName",
        tocDisplayName: "",
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
        defaultVisible: true,
        layer: null,
        metadataUrl: null,
        opacity: 1,
        minScale: 0,
        maxScale: 0,
        liveLayer: false,
        groupName: "Group1",
        group: "Group1",
        userLayer: false,
        secured: false,
      };

      const layer2: TOCLayer = {
        ...layer1,
        id: "layer2",
        groupName: "Group2",
        group: "Group2",
        visible: false,
      };

      const group1: TOCLayerGroup = {
        value: "Group1",
        label: "Group1",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [layer1],
      };

      const group2: TOCLayerGroup = {
        value: "Group2",
        label: "Group2",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [layer2],
      };

      useTOCStore.getState().setLayerGroups("LIST", [group1, group2]);

      const state = useTOCStore.getState();
      const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");

      // Should dedupe using displayName fallback
      expect(allLayersGroup!.layers).toHaveLength(1);
    });

    it("should keep a user-added layer separate from a published layer with the same TOC name", () => {
      const publishedLayer: TOCLayer = {
        id: "published_layer",
        name: "simcoe:Roads",
        displayName: "Roads",
        tocDisplayName: "Roads",
        styleUrl: "",
        height: 0,
        drawIndex: 0,
        index: 0,
        initialDrawIndex: 0,
        showLegend: false,
        legendHeight: 0,
        legendImage: null,
        legendObj: null,
        visible: false,
        defaultVisible: false,
        layer: null,
        metadataUrl: null,
        opacity: 1,
        minScale: 0,
        maxScale: 0,
        liveLayer: false,
        groupName: "Transportation",
        group: "Transportation",
        userLayer: false,
        secured: false,
      };

      const userLayer: TOCLayer = {
        ...publishedLayer,
        id: "user_layer",
        name: "user:roads",
        groupName: "Custom Layers",
        group: "Custom Layers",
        userLayer: true,
        visible: true,
      };

      const publishedGroup: TOCLayerGroup = {
        value: "Transportation",
        label: "Transportation",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [publishedLayer],
      };

      const userGroup: TOCLayerGroup = {
        value: "Custom Layers",
        label: "Custom Layers",
        defaultGroup: false,
        url: "",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "",
        customRestUrl: "",
        layers: [userLayer],
      };

      useTOCStore.getState().setLayerGroups("LIST", [publishedGroup, userGroup]);

      const state = useTOCStore.getState();
      const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");

      expect(allLayersGroup).toBeDefined();
      expect(allLayersGroup!.layers).toHaveLength(2);
      expect(allLayersGroup!.layers.map((layer) => layer.id)).toEqual(expect.arrayContaining(["published_layer", "user_layer"]));
    });

    it("should keep multiple user-added layers with the same TOC name in one LIST group", () => {
      const firstUserLayer: TOCLayer = {
        id: "user_layer_1",
        name: "user:roads:1",
        displayName: "Roads",
        tocDisplayName: "Roads",
        styleUrl: "",
        height: 0,
        drawIndex: 1,
        index: 1,
        initialDrawIndex: 1,
        showLegend: false,
        legendHeight: 0,
        legendImage: null,
        legendObj: null,
        visible: true,
        defaultVisible: true,
        layer: null,
        metadataUrl: null,
        opacity: 1,
        minScale: 0,
        maxScale: 0,
        liveLayer: false,
        groupName: "Custom Layers",
        group: "Custom Layers",
        userLayer: true,
        secured: false,
      };

      const secondUserLayer: TOCLayer = {
        ...firstUserLayer,
        id: "user_layer_2",
        name: "user:roads:2",
        visible: false,
        drawIndex: 0,
        index: 0,
        initialDrawIndex: 0,
      };

      const userGroup: TOCLayerGroup = {
        value: "Custom Layers",
        label: "Custom Layers",
        defaultGroup: false,
        url: "",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "",
        customRestUrl: "",
        layers: [firstUserLayer, secondUserLayer],
      };

      useTOCStore.getState().setLayerGroups("LIST", [userGroup]);

      const state = useTOCStore.getState();
      const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");
      const customGroup = state.layerListGroups.find((g) => g.value === "Custom Layers");

      expect(allLayersGroup).toBeDefined();
      expect(allLayersGroup!.layers).toHaveLength(2);
      expect(customGroup).toBeDefined();
      expect(customGroup!.layers).toHaveLength(2);
      expect(customGroup!.layers.map((layer) => layer.id)).toEqual(["user_layer_1", "user_layer_2"]);
    });
  });

  describe("FOLDER view dedup behavior", () => {
    it("should NOT dedupe layers in FOLDER view", () => {
      const layer1: TOCLayer = {
        id: "layer1",
        name: "Roads",
        displayName: "Roads",
        tocDisplayName: "Roads",
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
        defaultVisible: true,
        layer: null,
        metadataUrl: null,
        opacity: 1,
        minScale: 0,
        maxScale: 0,
        liveLayer: false,
        groupName: "Transportation",
        group: "Transportation",
        userLayer: false,
        secured: false,
      };

      const layer2: TOCLayer = {
        ...layer1,
        id: "layer2",
        groupName: "Infrastructure",
        group: "Infrastructure",
        secured: true,
      };

      const group1: TOCLayerGroup = {
        value: "Transportation",
        label: "Transportation",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [layer1],
      };

      const group2: TOCLayerGroup = {
        value: "Infrastructure",
        label: "Infrastructure",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [layer2],
      };

      useTOCStore.getState().setLayerGroups("FOLDER", [group1, group2]);

      const state = useTOCStore.getState();

      // FOLDER view should have both groups unchanged with their layers
      expect(state.layerFolderGroups).toHaveLength(2);
      expect(state.layerFolderGroups[0].layers).toHaveLength(1);
      expect(state.layerFolderGroups[1].layers).toHaveLength(1);
      // sortGroups alphabetizes, so Infrastructure comes before Transportation
      expect(state.layerFolderGroups[0].layers[0].id).toBe("layer2");
      expect(state.layerFolderGroups[1].layers[0].id).toBe("layer1");
    });
  });

  describe("Real-world scenario: Bruce Trail cross-workspace duplicates", () => {
    it("should handle Bruce Trail scenario correctly", () => {
      // Scenario from debugging: Bruce Trail exists as both simcoe:Bruce_Trail
      // (visible:false in two unsecured groups) and simcoe-secured:Bruce_Trail
      // (visible:true in saved data). The secured one should win.
      const bruceTrailForests: TOCLayer = {
        id: "bruce_forests_id",
        name: "simcoe:Bruce_Trail",
        displayName: "Bruce Trail",
        tocDisplayName: "Bruce Trail",
        styleUrl: "",
        height: 0,
        drawIndex: 450,
        index: 450,
        initialDrawIndex: 450,
        showLegend: false,
        legendHeight: 0,
        legendImage: null,
        legendObj: null,
        visible: false,
        defaultVisible: false,
        layer: null,
        metadataUrl: null,
        opacity: 1,
        minScale: 0,
        maxScale: 0,
        liveLayer: false,
        groupName: "Forests Recreation and Trails",
        group: "simcoe:Forests_Recreation_and_Trails",
        userLayer: false,
        secured: false,
      };

      const bruceTrailTransit: TOCLayer = {
        ...bruceTrailForests,
        id: "bruce_transit_id",
        groupName: "Transit and Transportation",
        group: "simcoe:Transit_and_Transportation",
      };

      const bruceTrailSecured: TOCLayer = {
        ...bruceTrailForests,
        id: "bruce_secured_id",
        name: "simcoe-secured:Bruce_Trail",
        groupName: "Planning",
        group: "simcoe-secured:Planning",
        secured: true,
        visible: true,
      };

      const forestsGroup: TOCLayerGroup = {
        value: "simcoe:Forests_Recreation_and_Trails",
        label: "Forests Recreation and Trails",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "simcoe:",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [bruceTrailForests],
        primary: false,
      };

      const transitGroup: TOCLayerGroup = {
        value: "simcoe:Transit_and_Transportation",
        label: "Transit and Transportation",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "simcoe:",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [bruceTrailTransit],
        primary: false,
      };

      const planningGroup: TOCLayerGroup = {
        value: "simcoe-secured:Planning",
        label: "Planning",
        defaultGroup: false,
        url: "http://test.com/wms",
        prefix: "simcoe-secured:",
        visibleLayers: [],
        wmsGroupUrl: "http://test.com/wms",
        customRestUrl: "",
        layers: [bruceTrailSecured],
        primary: false,
      };

      useTOCStore.getState().setLayerGroups("LIST", [forestsGroup, transitGroup, planningGroup]);

      const state = useTOCStore.getState();
      const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");

      // Should have exactly ONE Bruce Trail entry (the secured one)
      expect(allLayersGroup!.layers).toHaveLength(1);
      expect(allLayersGroup!.layers[0].id).toBe("bruce_secured_id");
      expect(allLayersGroup!.layers[0].secured).toBe(true);
      expect(allLayersGroup!.layers[0].visible).toBe(true);
      expect(allLayersGroup!.layers[0].name).toBe("simcoe-secured:Bruce_Trail");
    });
  });
});
