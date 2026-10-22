import { describe, it, expect, vi } from "vitest";
import { buildESRILayer, buildLayerFromWMS, type BuildESRILayerOptions } from "@/utils/tocHelpers";
import type { TOCLayer } from "@/stores/tocStore";
import { createArcGISTimeLayer, fetchArcGISTimeValues } from "@/utils/openlayers/arcgisTimeLayer";

vi.mock("@/utils/openlayers/arcgisTimeLayer", () => ({
  createArcGISTimeLayer: vi.fn(),
  fetchArcGISTimeValues: vi.fn(),
}));

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

describe("buildLayerFromWMS legend and metadata URLs", () => {
  it("uses GetLegendGraphic when capabilities provide no LegendURL", () => {
    const layer = buildWMSLayer({ Name: "simcoe:Assessment Parcel" });

    expect(layer.styleUrl).toBe("https://example.com/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=simcoe%3AAssessment%20Parcel");
  });

  it("keeps the capabilities LegendURL when present", () => {
    const layer = buildWMSLayer({
      Name: "simcoe:roads",
      Style: [{ LegendURL: [{ OnlineResource: "https://example.com/legend.png", size: [20, 20] }] }],
    } as unknown as Partial<WMSLayerInput>);

    expect(layer.styleUrl).toBe("https://example.com/legend.png");
  });

  it("encodes special characters in the metadata layer name", () => {
    const layer = buildWMSLayer({ Name: "simcoe:Assessment & Parcel #1" });

    expect(layer.metadataUrl).toBe("https://example.com/geoserver/rest/layers/simcoe%3AAssessment%20%26%20Parcel%20%231.json");
  });
});

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
    expect(layer.timeDimension).toEqual({
      kind: "list",
      values: ["2026-10-09T10:00:00.000Z", "2026-10-09T10:15:00.000Z"],
      defaultIndex: 1,
    });
  });

  it("returns a stepped TIME range for start/end/period extents", () => {
    const layer = buildWMSLayer({
      Dimension: [{ name: "time", values: "2026-10-09T10:00:00.000Z/2026-10-09T12:00:00.000Z/PT15M" }],
    });
    expect(layer.timeDimension).toMatchObject({ kind: "range", periodMs: 900_000, count: 9 });
  });

  it("returns no time dimension when there is no time dimension", () => {
    const layer = buildWMSLayer({ Dimension: [{ name: "elevation", values: "0,10" }] });
    expect(layer.timeDimension).toBeUndefined();
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

  it("builds a stepped vector layer for time-enabled services without Map capability", async () => {
    const timeValues = ["2026-10-14T09:00:00.000Z", "2026-10-14T10:00:00.000Z"];
    const applyTimeValue = vi.fn();
    vi.mocked(fetchArcGISTimeValues).mockResolvedValue(timeValues);
    vi.mocked(createArcGISTimeLayer).mockReturnValue({
      setVisible: vi.fn(),
      setOpacity: vi.fn(),
      setProperties: vi.fn(),
      setZIndex: vi.fn(),
      get: vi.fn(() => applyTimeValue),
    } as unknown as ReturnType<typeof createArcGISTimeLayer>);

    const layer = await new Promise<TOCLayer>((resolve) => {
      buildESRILayer({ group: esriGroup, layer: { ...esriLayer, vectorTime: { timeField: "timestamp", objectIdField: "OBJECTID" } }, layerIndex: 0 }, resolve);
    });

    expect(layer.timeDimension).toMatchObject({ kind: "list", values: timeValues });
    expect(applyTimeValue).toHaveBeenCalledWith(timeValues[layer.timeDimension?.defaultIndex ?? 0]);
  });
});
