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
