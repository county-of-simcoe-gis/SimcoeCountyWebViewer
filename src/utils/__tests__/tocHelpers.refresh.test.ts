import { describe, it, expect, vi } from "vitest";
import { buildESRILayer, buildLayerFromWMS, type BuildESRILayerOptions } from "@/utils/tocHelpers";
import type { TOCLayer } from "@/stores/tocStore";

vi.mock("@/utils/openlayers/LayerHelpers", () => ({
  LayerHelpers: {
    getLayer: (_options: unknown, callback: (layer: unknown) => void) => {
      callback({ setVisible: vi.fn(), setOpacity: vi.fn(), setProperties: vi.fn(), setZIndex: vi.fn() });
    },
  },
}));

vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "managed-layer-id"),
  },
}));

type WMSLayerInput = Parameters<typeof buildLayerFromWMS>[1];
type ConfigInput = Parameters<typeof buildLayerFromWMS>[3];

const config = {
  toc: {
    keywords: {
      REFRESH_INTERVAL: { keyword: "REFRESH_INTERVAL", type: "int", value: 0 },
    },
  },
} as unknown as ConfigInput;

const group = { value: "wms-group", label: "WMS Group", wmsGroupUrl: "https://example.com/geoserver/wms", visibleLayers: [] };

function buildWMSLayer(overrides: Partial<WMSLayerInput>): TOCLayer {
  const wmsLayer = { Name: "simcoe:roads", Title: "Roads", ...overrides } as WMSLayerInput;
  return buildLayerFromWMS(group, wmsLayer, 0, config);
}

describe("buildLayerFromWMS refresh metadata", () => {
  it("reads REFRESH_INTERVAL from the GeoServer keyword list", () => {
    const layer = buildWMSLayer({ KeywordList: ["REFRESH_INTERVAL=300"] });
    expect(layer.refreshInterval).toBe(300);
  });

  it("defaults to no refresh interval", () => {
    const layer = buildWMSLayer({});
    expect(layer.refreshInterval).toBe(0);
  });

  it("returns discrete WMS TIME values", () => {
    const layer = buildWMSLayer({
      Dimension: [{ name: "time", values: "2026-10-09T10:00:00.000Z, 2026-10-09T10:15:00.000Z" }],
    });
    expect(layer.timeValues).toEqual(["2026-10-09T10:00:00.000Z", "2026-10-09T10:15:00.000Z"]);
  });

  it("returns no TIME values for range-based extents", () => {
    const layer = buildWMSLayer({
      Dimension: [{ name: "time", values: "2026-10-09T10:00:00.000Z/2026-10-09T12:00:00.000Z/PT15M" }],
    });
    expect(layer.timeValues).toEqual([]);
  });

  it("returns no TIME values when there is no time dimension", () => {
    const layer = buildWMSLayer({ Dimension: [{ name: "elevation", values: "0,10" }] });
    expect(layer.timeValues).toEqual([]);
  });
});

describe("buildESRILayer refresh metadata", () => {
  const esriGroup = {
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
  } as BuildESRILayerOptions["group"];

  const esriLayer = {
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
      refreshInterval: "300",
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
  } as BuildESRILayerOptions["layer"];

  it("passes the #REFRESH= value through as seconds", async () => {
    const layer = await new Promise<TOCLayer>((resolve) => {
      buildESRILayer({ group: esriGroup, layer: esriLayer, layerIndex: 0 }, (built) => resolve(built));
    });
    expect(layer.refreshInterval).toBe(300);
  });
});
