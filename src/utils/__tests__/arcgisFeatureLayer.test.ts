import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { get as getProjection } from "ol/proj";
import { createArcGISFeatureLayer } from "@/utils/openlayers/arcgisFeatureLayer";
import type { EsriRenderer } from "@/utils/esriSymbology";
import { TIME_VALUE_APPLIER_PROPERTY, type TimeValueApplier } from "@/utils/timeDimension";

const LAYER_URL = "https://services.example.com/arcgis/rest/services/Wildfire/FeatureServer/0";
const EXTENT = [-8900000, 5500000, -8800000, 5600000];
const OTHER_EXTENT = [-8800000, 5500000, -8700000, 5600000];

const simpleRenderer: EsriRenderer = {
  type: "simple",
  symbol: { type: "esriSFS", color: [76, 129, 205, 191] },
};

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, statusText: "OK", json: async () => body };
}

function esriFeature(objectId: number) {
  return {
    attributes: { OBJECTID: objectId },
    geometry: {
      rings: [
        [
          [0, 0],
          [1000, 0],
          [1000, 1000],
          [0, 0],
        ],
      ],
    },
  };
}

const esriPage = (features: unknown[], exceededTransferLimit = false) => ({
  spatialReference: { wkid: 102100, latestWkid: 3857 },
  features,
  exceededTransferLimit,
});

function loadExtent(olLayer: ReturnType<typeof createArcGISFeatureLayer>, extent: number[]) {
  olLayer.getSource()!.loadFeatures(extent, 100, getProjection("EPSG:3857")!);
}

describe("createArcGISFeatureLayer", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("queries features intersecting the map envelope in EPSG:3857", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(esriPage([esriFeature(1)])) as unknown as Response);
    const olLayer = createArcGISFeatureLayer(LAYER_URL, false, { objectIdField: "OBJECTID", renderer: simpleRenderer });

    loadExtent(olLayer, EXTENT);

    await vi.waitFor(() => expect(olLayer.getSource()?.getFeatures()).toHaveLength(1));
    const requestedUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(requestedUrl.pathname.endsWith("/FeatureServer/0/query")).toBe(true);
    expect(requestedUrl.searchParams.get("geometry")).toBe(EXTENT.join(","));
    expect(requestedUrl.searchParams.get("geometryType")).toBe("esriGeometryEnvelope");
    expect(requestedUrl.searchParams.get("spatialRel")).toBe("esriSpatialRelIntersects");
    expect(requestedUrl.searchParams.get("inSR")).toBe("3857");
    expect(requestedUrl.searchParams.get("outSR")).toBe("3857");
  });

  it("pages through features using the raw feature count as the offset", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(esriPage([esriFeature(1)], true)) as unknown as Response)
      .mockResolvedValueOnce(jsonResponse(esriPage([esriFeature(2)])) as unknown as Response);
    const olLayer = createArcGISFeatureLayer(LAYER_URL, false, { objectIdField: "OBJECTID" });

    loadExtent(olLayer, EXTENT);

    await vi.waitFor(() => expect(olLayer.getSource()?.getFeatures()).toHaveLength(2));
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("resultOffset=1");
  });

  it("does not duplicate features that appear in overlapping extents", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(esriPage([esriFeature(1), esriFeature(2)])) as unknown as Response)
      .mockResolvedValueOnce(jsonResponse(esriPage([esriFeature(2), esriFeature(3)])) as unknown as Response);
    const olLayer = createArcGISFeatureLayer(LAYER_URL, false, { objectIdField: "OBJECTID" });

    loadExtent(olLayer, EXTENT);
    await vi.waitFor(() => expect(olLayer.getSource()?.getFeatures()).toHaveLength(2));
    loadExtent(olLayer, OTHER_EXTENT);
    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));

    await vi.waitFor(() => expect(olLayer.getSource()?.getFeatures()).toHaveLength(3));
    const ids = olLayer
      .getSource()!
      .getFeatures()
      .map((feature) => feature.getId())
      .sort();
    expect(ids).toEqual([1, 2, 3]);
  });

  it("reads the object id field from layer metadata when none is configured", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ objectIdField: "FID", drawingInfo: { renderer: simpleRenderer } }) as unknown as Response)
      .mockResolvedValueOnce(jsonResponse(esriPage([{ attributes: { FID: 7 }, geometry: esriFeature(7).geometry }])) as unknown as Response);
    const olLayer = createArcGISFeatureLayer(LAYER_URL, false);

    loadExtent(olLayer, EXTENT);

    await vi.waitFor(() => expect(olLayer.getSource()?.getFeatures()).toHaveLength(1));
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe(`${LAYER_URL}?f=json`);
    expect(new URL(String(vi.mocked(fetch).mock.calls[1][0])).searchParams.get("orderByFields")).toBe("FID");
    expect(olLayer.getSource()?.getFeatures()[0].getId()).toBe(7);
    expect(olLayer.getStyleFunction()).toBeDefined();
  });

  it("filters the query to the initial time value", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ objectIdField: "OBJECTID", timeInfo: { startTimeField: "timestamp" } }) as unknown as Response)
      .mockResolvedValueOnce(jsonResponse(esriPage([esriFeature(1)])) as unknown as Response);
    const olLayer = createArcGISFeatureLayer(LAYER_URL, false, { timeValue: "2026-10-14T09:00:00.000Z" });

    loadExtent(olLayer, EXTENT);

    await vi.waitFor(() => expect(olLayer.getSource()?.getFeatures()).toHaveLength(1));
    expect(new URL(String(vi.mocked(fetch).mock.calls[1][0])).searchParams.get("where")).toBe("timestamp = TIMESTAMP '2026-10-14 09:00:00'");
  });

  it("reloads features for the new time value when the time applier is called", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ objectIdField: "OBJECTID", timeInfo: { startTimeField: "timestamp" } }) as unknown as Response)
      .mockResolvedValueOnce(jsonResponse(esriPage([esriFeature(1)])) as unknown as Response)
      .mockResolvedValueOnce(jsonResponse(esriPage([esriFeature(2)])) as unknown as Response);
    const olLayer = createArcGISFeatureLayer(LAYER_URL, false);
    loadExtent(olLayer, EXTENT);
    await vi.waitFor(() => expect(olLayer.getSource()?.getFeatures()).toHaveLength(1));

    (olLayer.get(TIME_VALUE_APPLIER_PROPERTY) as TimeValueApplier)("2026-10-14T10:00:00.000Z");
    loadExtent(olLayer, EXTENT);

    await vi.waitFor(() =>
      expect(
        olLayer
          .getSource()
          ?.getFeatures()
          .map((feature) => feature.getId()),
      ).toEqual([2]),
    );
    expect(new URL(String(vi.mocked(fetch).mock.calls[2][0])).searchParams.get("where")).toBe("timestamp = TIMESTAMP '2026-10-14 10:00:00'");
  });

  it("styles features from a simple renderer", () => {
    const olLayer = createArcGISFeatureLayer(LAYER_URL, false, { objectIdField: "OBJECTID", renderer: simpleRenderer });

    expect(olLayer.getStyleFunction()).toBeDefined();
  });

  it("falls back to the default style for unsupported renderers", () => {
    const olLayer = createArcGISFeatureLayer(LAYER_URL, false, {
      objectIdField: "OBJECTID",
      renderer: { type: "classBreaks" } as unknown as EsriRenderer,
    });

    expect(olLayer.getStyleFunction()).toBeDefined();
  });
});
