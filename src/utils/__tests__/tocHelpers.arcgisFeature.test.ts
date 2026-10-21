import { describe, it, expect, vi, afterEach } from "vitest";
import { Vector as VectorLayer } from "ol/layer";
import { getGroupsFromArcGISFeature, loadLayerGroupsFromSources } from "@/utils/tocHelpers";
import type { TOCSource } from "@/stores/tocStore";

vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "managed-layer-id"),
  },
}));

const FEATURE_URL = "https://services.example.com/arcgis/rest/services/Wildfire/FeatureServer/0";

function featureMetadata(overrides: Record<string, unknown> = {}) {
  return {
    id: 0,
    name: "perimeters",
    type: "Feature Layer",
    description: "",
    defaultVisibility: true,
    minScale: 36978596,
    maxScale: 18055,
    capabilities: "Query",
    objectIdField: "OBJECTID",
    drawingInfo: {
      renderer: {
        type: "simple",
        symbol: { type: "esriSFS", style: "esriSFSSolid", color: [76, 129, 205, 191] },
      },
      transparency: 0,
    },
    ...overrides,
  };
}

function stubMetadata(metadata: unknown) {
  const fetchMock = vi.fn(async (_url: string) => ({ ok: true, status: 200, statusText: "OK", json: async () => metadata }) as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sourceFor(layerUrl: string, description?: string): TOCSource {
  return {
    layerUrl,
    secure: false,
    primary: false,
    urlType: "",
    type: "arcgisFeature",
    descriptionOverride: description,
  } as TOCSource;
}

describe("type layer entries with sourceType FeatureArcGISRest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a feature layer from the service root and layerName", async () => {
    stubMetadata(featureMetadata());
    const config = { toc: { keywords: {}, default_group: "" }, geoserverPath: "geoserver" } as unknown as Parameters<typeof loadLayerGroupsFromSources>[1];
    const serviceRoot = "https://services.arcgis.com/wjcPoefzjpzCgffS/arcgis/rest/services/Active_Fire_Danger_Map_of_Canada/FeatureServer";

    const { groups } = await loadLayerGroupsFromSources(
      [
        {
          type: "layer",
          layerUrl: serviceRoot,
          secure: false,
          primary: false,
          urlType: "",
          name: "Fire Danger Map",
          layerName: "0",
          sourceType: "FeatureArcGISRest",
          source: "rest",
          projection: "EPSG:3857",
          groups: ["Hazard Layers"],
        } as TOCSource,
      ],
      config,
    );

    expect(groups.map((group) => group.label)).toEqual(["Hazard Layers"]);
    const [layer] = groups[0].layers;
    expect(layer.name).toBe("0");
    expect(layer.displayName).toBe("Fire Danger Map");
    expect(layer.layerUrl).toBe(`${serviceRoot}/0`);
    expect(layer.sourceType).toBe("FeatureArcGISRest");
    expect(layer.isQueryable).toBe(true);
  });

  it("loads the time slider values from the layer's time field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const body = String(url).includes("/query")
          ? { features: [{ attributes: { timestamp: 1791968400000 } }, { attributes: { timestamp: 1791972000000 } }] }
          : featureMetadata({ timeInfo: { startTimeField: "timestamp" } });
        return { ok: true, status: 200, statusText: "OK", json: async () => body } as Response;
      }),
    );
    const config = { toc: { keywords: {}, default_group: "" }, geoserverPath: "geoserver" } as unknown as Parameters<typeof loadLayerGroupsFromSources>[1];

    const { groups } = await loadLayerGroupsFromSources(
      [
        {
          type: "layer",
          layerUrl: "https://services.arcgis.com/wjcPoefzjpzCgffS/arcgis/rest/services/Wildfire/FeatureServer",
          secure: false,
          primary: false,
          urlType: "",
          name: "Smoke Forecast",
          layerName: "0",
          sourceType: "FeatureArcGISRest",
          source: "rest",
          groups: ["Hazard Layers"],
        } as TOCSource,
      ],
      config,
    );

    expect(groups[0].layers[0].timeDimension).toMatchObject({
      kind: "list",
      values: ["2026-10-14T09:00:00.000Z", "2026-10-14T10:00:00.000Z"],
    });
  });
});

describe("getGroupsFromArcGISFeature", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests only the layer metadata, never the service layer list", async () => {
    const fetchMock = stubMetadata(featureMetadata());

    await getGroupsFromArcGISFeature(sourceFor(FEATURE_URL));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requested = String(fetchMock.mock.calls[0][0]);
    expect(requested).toContain("/FeatureServer/0?f=json");
    expect(requested).not.toContain("/layers");
  });

  it("builds a visible vector layer with the inverted ArcGIS scale range swapped", async () => {
    stubMetadata(featureMetadata());

    const groups = await getGroupsFromArcGISFeature(sourceFor(FEATURE_URL));

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Uncategorized");
    const [layer] = groups[0].layers;
    expect(layer.name).toBe("perimeters");
    expect(layer.visible).toBe(true);
    expect(layer.minScale).toBe(18055);
    expect(layer.maxScale).toBe(36978596);
    expect(layer.layer).toBeInstanceOf(VectorLayer);
    expect((layer.layer as unknown as { get: (key: string) => unknown }).get("wfsUrl")).toBeUndefined();
  });

  it("groups the layer by its CATEGORY tag", async () => {
    stubMetadata(featureMetadata({ description: "#Category=Wildfire" }));

    const groups = await getGroupsFromArcGISFeature(sourceFor(FEATURE_URL));

    expect(groups.map((group) => group.label)).toEqual(["Wildfire"]);
  });

  it("keeps a token already present in the configured URL", async () => {
    const fetchMock = stubMetadata(featureMetadata());

    await getGroupsFromArcGISFeature(sourceFor(`${FEATURE_URL}?token=abc123`));

    expect(String(fetchMock.mock.calls[0][0])).toContain("token=abc123");
  });

  it("throws when the layer endpoint returns an ArcGIS error", async () => {
    stubMetadata({ error: { code: 400, message: "Invalid layer" } });

    await expect(getGroupsFromArcGISFeature(sourceFor(FEATURE_URL))).rejects.toThrow("Invalid layer");
  });
});

describe("legends for single-layer sources", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Picture markers are used because their swatch is the raw imageData, which works without a canvas in jsdom.
  const pictureRenderer = { type: "simple", symbol: { type: "esriPMS", imageData: "AAAA", contentType: "image/png", width: 20, height: 20 } };
  const config = { toc: { keywords: {}, default_group: "" }, geoserverPath: "geoserver" } as unknown as Parameters<typeof loadLayerGroupsFromSources>[1];
  const FEATURE_SERVICE = "https://services.example.com/arcgis/rest/services/Wildfire/FeatureServer";

  function directSource(overrides: Partial<TOCSource>): TOCSource {
    return {
      type: "layer",
      layerUrl: FEATURE_SERVICE,
      secure: false,
      primary: false,
      urlType: "",
      name: "Perimeters",
      layerName: "0",
      source: "rest",
      groups: ["Hazard Layers"],
      ...overrides,
    } as TOCSource;
  }

  it("builds a legend object from a feature layer's renderer", async () => {
    stubMetadata(featureMetadata({ drawingInfo: { renderer: pictureRenderer } }));

    const groups = await getGroupsFromArcGISFeature(sourceFor(FEATURE_URL));

    const legendObj = groups[0].layers[0].legendObj as { legend: Array<Record<string, unknown>> };
    expect(legendObj.legend).toEqual([expect.objectContaining({ imageData: "AAAA", contentType: "image/png" })]);
  });

  it("leaves the legend empty for a feature layer without a renderer", async () => {
    stubMetadata(featureMetadata({ drawingInfo: undefined }));

    const groups = await getGroupsFromArcGISFeature(sourceFor(FEATURE_URL));

    expect(groups[0].layers[0].legendObj).toBeNull();
  });

  it("uses the configured legendUrl as the legend image for a direct layer", async () => {
    stubMetadata(featureMetadata());
    const legendUrl = "https://maps.example.com/legend.png";

    const { groups } = await loadLayerGroupsFromSources([directSource({ type: "layer", layerUrl: "https://tiles.example.com/wmts", sourceType: "WMTS", layerName: "basemap", legendUrl })], config);

    expect(groups[0].layers[0].styleUrl).toBe(legendUrl);
    expect(groups[0].layers[0].legendObj).toBeNull();
  });

  it("builds a legend object for a direct feature layer from its renderer", async () => {
    stubMetadata(featureMetadata({ drawingInfo: { renderer: pictureRenderer } }));

    const { groups } = await loadLayerGroupsFromSources([directSource({ sourceType: "FeatureArcGISRest" })], config);

    expect(groups[0].layers[0].legendObj).toEqual({ legend: [expect.objectContaining({ imageData: "AAAA" })] });
  });

  // classBreaks renderers with fill symbols get one swatch per class.
  const classBreaksRenderer = {
    type: "classBreaks",
    field: "value",
    classBreakInfos: [{ classMaxValue: 10, label: "1 - 10", symbol: { type: "esriSFS", style: "esriSFSSolid", color: [55, 247, 189, 255] } }],
  };

  it("builds a legend for a classBreaks feature layer", async () => {
    stubMetadata(featureMetadata({ drawingInfo: { renderer: classBreaksRenderer } }));

    const groups = await getGroupsFromArcGISFeature(sourceFor(FEATURE_URL));

    expect(groups[0].layers[0].legendObj).toEqual(expect.objectContaining({ legend: [expect.objectContaining({ label: "1 - 10" })] }));
  });

  it("builds a legend for a direct classBreaks feature layer", async () => {
    stubMetadata(featureMetadata({ drawingInfo: { renderer: classBreaksRenderer } }));

    const { groups } = await loadLayerGroupsFromSources([directSource({ sourceType: "FeatureArcGISRest" })], config);

    expect(groups[0].layers[0].legendObj).toEqual(expect.objectContaining({ legend: [expect.objectContaining({ label: "1 - 10" })] }));
  });

  it("loads a direct MapServer layer legend from the service legend endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const body = String(url).includes("/legend")
          ? { layers: [{ layerId: 76, layerName: "Floodplain", layerType: "Feature Layer", legend: [{ label: "", url: "", imageData: "BBBB", contentType: "image/png", height: 20, width: 20 }] }] }
          : {};
        return { ok: true, status: 200, statusText: "OK", json: async () => body } as Response;
      }),
    );

    const { groups } = await loadLayerGroupsFromSources(
      [directSource({ layerUrl: "https://maps.example.com/arcgis/rest/services/Floodplain/MapServer", sourceType: "ImageArcGISRest", layerName: "76" })],
      config,
    );

    expect(groups[0].layers[0].legendObj).toEqual(expect.objectContaining({ layerName: "Floodplain" }));
  });

  it("falls back to the MapServer layer renderer when the service legend has no entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        let body: unknown = {};
        if (url.includes("/legend")) body = { layers: [] };
        if (url.includes("/layers")) body = { layers: [{ id: 76, name: "Floodplain", type: "Feature Layer", drawingInfo: { renderer: pictureRenderer } }] };
        return { ok: true, status: 200, statusText: "OK", json: async () => body } as Response;
      }),
    );

    const { groups } = await loadLayerGroupsFromSources(
      [directSource({ layerUrl: "https://maps.example.com/arcgis/rest/services/Floodplain/MapServer", sourceType: "ImageArcGISRest", layerName: "76" })],
      config,
    );

    expect(groups[0].layers[0].legendObj).toEqual({
      layerId: 76,
      layerName: "Floodplain",
      layerType: "Feature Layer",
      legend: [expect.objectContaining({ imageData: "AAAA" })],
    });
  });

  it("builds a GetLegendGraphic style URL and REST metadata URL for a direct GeoServer WMS layer", async () => {
    stubMetadata(featureMetadata());

    const { groups } = await loadLayerGroupsFromSources(
      [directSource({ layerUrl: "https://cwfis.cfs.nrcan.gc.ca/geoserver/public/dsr/ows?service=wms&version=1.3.0&request=GetCapabilities", sourceType: "ImageWMS", source: "WMS", layerName: "dsr" })],
      config,
    );

    expect(groups[0].layers[0].styleUrl).toBe("https://cwfis.cfs.nrcan.gc.ca/geoserver/public/dsr/ows?service=WMS&version=1.3.0&request=GetLegendGraphic&format=image%2Fpng&layer=dsr");
    expect(groups[0].layers[0].metadataUrl).toBe("https://cwfis.cfs.nrcan.gc.ca/geoserver/rest/layers/public%3Adsr.json");
  });

  it("builds a legend from classBreaks picture-marker symbols", async () => {
    stubMetadata(
      featureMetadata({
        drawingInfo: {
          renderer: {
            type: "classBreaks",
            field: "WIND_SPEED",
            classBreakInfos: [{ classMaxValue: 12, label: "< 12 km/h", symbol: { type: "esriPMS", imageData: "AAAA", contentType: "image/png", width: 16, height: 8 } }],
          },
        },
      }),
    );

    const { groups } = await loadLayerGroupsFromSources([directSource({ sourceType: "FeatureArcGISRest" })], config);

    expect(groups[0].layers[0].legendObj).toEqual({ legend: [expect.objectContaining({ imageData: "AAAA", label: "< 12 km/h" })] });
  });

  it("resolves the MapServer service root when the configured URL ends with a layer id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const body = url.startsWith("https://gis.lsrca.on.ca/gis/rest/services/OpenData/MapServer/legend")
          ? { layers: [{ layerId: 76, layerName: "Floodplain", layerType: "Feature Layer", legend: [{ label: "", url: "", imageData: "CCCC", contentType: "image/png", height: 20, width: 20 }] }] }
          : {};
        return { ok: true, status: 200, statusText: "OK", json: async () => body } as Response;
      }),
    );

    const { groups } = await loadLayerGroupsFromSources(
      [directSource({ layerUrl: "https://gis.lsrca.on.ca/gis/rest/services/OpenData/MapServer/76", sourceType: "ImageArcGISRest", layerName: "76" })],
      config,
    );

    expect(groups[0].layers[0].legendObj).toEqual(expect.objectContaining({ layerName: "Floodplain" }));
  });
});
