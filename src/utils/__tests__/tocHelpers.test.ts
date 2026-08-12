import { describe, it, expect, vi } from "vitest";
import { buildESRILayer, type BuildESRILayerOptions } from "@/utils/tocHelpers";
import type { TOCLayer } from "@/stores/tocStore";

// Mock LayerHelpers so buildESRILayer can run without OpenLayers dependencies.
vi.mock("@/utils/openlayers/LayerHelpers", () => ({
  LayerHelpers: {
    getLayer: (_options: unknown, callback: (layer: unknown) => void) => {
      callback({
        setVisible: vi.fn(),
        setOpacity: vi.fn(),
        setProperties: vi.fn(),
        setZIndex: vi.fn(),
      });
    },
  },
}));

// Mock LayerManager so we don't need a real map.
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "managed-layer-id"),
  },
}));

function buildLayer(options: BuildESRILayerOptions): Promise<TOCLayer> {
  return new Promise((resolve) => {
    buildESRILayer(options, (layer) => resolve(layer));
  });
}

const baseGroup: BuildESRILayerOptions["group"] = {
  value: "arcgis-group",
  label: "ArcGIS Group",
  defaultGroup: false,
  url: "https://example.com/arcgis/rest/services/Test/MapServer",
  prefix: "",
  visibleLayers: [],
  wmsGroupUrl: "",
  customRestUrl: "",
  layers: [],
  secured: false,
};

const baseLayer: BuildESRILayerOptions["layer"] = {
  name: "Test Layer",
  url: "https://example.com/arcgis/rest/services/Test/MapServer/0",
  id: 0,
  options: {
    isGroupOn: "false",
    isLiveLayer: false,
    isVisible: false,
    isOpen: false,
    sar: false,
    description: "",
    refreshInterval: "",
    modalURL: "",
    categories: ["Uncategorized"],
    title: "Test Layer",
    opacity: 1,
    minScale: 0,
    maxScale: 0,
    canDownload: false,
    identifyName: "",
    displayName: "Test Layer",
    noAttributeTable: false,
    identifyTitleColumn: "",
    identifyIdColumn: "",
  },
  hasAttachments: false,
  visible: false,
  queryable: false,
  opaque: false,
  grouped: false,
};

describe("buildESRILayer disclaimer", () => {
  it("returns undefined disclaimer when no disclaimer options are provided", async () => {
    const layer = await buildLayer({ group: baseGroup, layer: baseLayer, layerIndex: 0 });
    expect(layer.disclaimer).toBeUndefined();
  });

  it("returns a disclaimer object when disclaimerUrl is provided", async () => {
    const layerWithDisclaimer: BuildESRILayerOptions["layer"] = {
      ...baseLayer,
      options: {
        ...baseLayer.options,
        disclaimerUrl: "https://example.com/terms",
      },
    };

    const layer = await buildLayer({ group: baseGroup, layer: layerWithDisclaimer, layerIndex: 0 });
    expect(layer.disclaimer).toEqual({
      title: "",
      url: "https://example.com/terms",
      warning: "",
    });
  });

  it("returns a disclaimer object when disclaimerTitle is provided", async () => {
    const layerWithDisclaimer: BuildESRILayerOptions["layer"] = {
      ...baseLayer,
      options: {
        ...baseLayer.options,
        disclaimerTitle: "Important Terms",
      },
    };

    const layer = await buildLayer({ group: baseGroup, layer: layerWithDisclaimer, layerIndex: 0 });
    expect(layer.disclaimer).toEqual({
      title: "Important Terms",
      url: "",
      warning: "",
    });
  });

  it("returns a disclaimer object when disclaimerWarning is provided", async () => {
    const layerWithDisclaimer: BuildESRILayerOptions["layer"] = {
      ...baseLayer,
      options: {
        ...baseLayer.options,
        disclaimerWarning: "Use with caution.",
      },
    };

    const layer = await buildLayer({ group: baseGroup, layer: layerWithDisclaimer, layerIndex: 0 });
    expect(layer.disclaimer).toEqual({
      title: "",
      url: "",
      warning: "Use with caution.",
    });
  });
});
