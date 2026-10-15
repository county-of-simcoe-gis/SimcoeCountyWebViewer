import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Feature from "ol/Feature";
import { createArcGISTimeLayer, fetchArcGISTimeValues, type ArcGISVectorTimeInfo } from "@/utils/openlayers/arcgisTimeLayer";
import { TIME_VALUE_APPLIER_PROPERTY, type TimeValueApplier } from "@/utils/timeDimension";

const LAYER_URL = "https://services.example.com/arcgis/rest/services/Wildfire/FeatureServer/0";

const timeInfo: ArcGISVectorTimeInfo = {
  timeField: "timestamp",
  objectIdField: "OBJECTID",
  drawingInfo: {
    renderer: {
      type: "classBreaks",
      field: "value",
      classBreakInfos: [
        { classMaxValue: 10, symbol: { color: [255, 0, 0, 255] } },
        { classMaxValue: 28, symbol: { color: [0, 255, 0, 255] } },
      ],
    },
  },
};

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, statusText: "OK", json: async () => body };
}

function esriFeature(objectId: number) {
  return {
    attributes: { OBJECTID: objectId, value: 5 },
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

describe("fetchArcGISTimeValues", () => {
  it("returns distinct timestamps as ascending ISO strings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ features: [{ attributes: { timestamp: 1791968400000 } }, { attributes: { timestamp: 1791972000000 } }] }));
    vi.stubGlobal("fetch", fetchMock);

    const values = await fetchArcGISTimeValues(LAYER_URL, "timestamp", false);

    expect(values).toEqual(["2026-10-14T09:00:00.000Z", "2026-10-14T10:00:00.000Z"]);
    expect(fetchMock.mock.calls[0][0]).toContain("returnDistinctValues=true");
  });
});

describe("createArcGISTimeLayer", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the features for a timestamp using a TIMESTAMP literal", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(esriPage([esriFeature(1), esriFeature(2)])) as unknown as Response);
    const olLayer = createArcGISTimeLayer(LAYER_URL, false, timeInfo);
    const applyTimeValue = olLayer.get(TIME_VALUE_APPLIER_PROPERTY) as TimeValueApplier;

    applyTimeValue("2026-10-14T09:00:00.000Z");

    await vi.waitFor(() => expect(olLayer.getSource()?.getFeatures()).toHaveLength(2));
    const requestedUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(requestedUrl.searchParams.get("where")).toBe("timestamp = TIMESTAMP '2026-10-14 09:00:00'");
  });

  it("pages through features while the server reports exceededTransferLimit", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(esriPage([esriFeature(1)], true)) as unknown as Response)
      .mockResolvedValueOnce(jsonResponse(esriPage([esriFeature(2)])) as unknown as Response);
    const olLayer = createArcGISTimeLayer(LAYER_URL, false, timeInfo);

    (olLayer.get(TIME_VALUE_APPLIER_PROPERTY) as TimeValueApplier)("2026-10-14T09:00:00.000Z");

    await vi.waitFor(() => expect(olLayer.getSource()?.getFeatures()).toHaveLength(2));
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("resultOffset=1");
  });

  it("reuses cached features when a time value is requested again", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(esriPage([esriFeature(1)])) as unknown as Response);
    const olLayer = createArcGISTimeLayer(LAYER_URL, false, timeInfo);
    const applyTimeValue = olLayer.get(TIME_VALUE_APPLIER_PROPERTY) as TimeValueApplier;

    applyTimeValue("2026-10-14T09:00:00.000Z");
    await vi.waitFor(() => expect(olLayer.getSource()?.getFeatures()).toHaveLength(1));
    applyTimeValue("2026-10-14T10:00:00.000Z");
    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));
    applyTimeValue("2026-10-14T09:00:00.000Z");

    expect(olLayer.getSource()?.getFeatures()).toHaveLength(1);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("styles features by the class break that contains their value", () => {
    const olLayer = createArcGISTimeLayer(LAYER_URL, false, timeInfo);
    const styleFunction = olLayer.getStyleFunction();
    if (!styleFunction) throw new Error("expected a style function");

    const lowStyle = styleFunction(new Feature({ value: 5 }), 1) as { getFill: () => { getColor: () => string } };
    const highStyle = styleFunction(new Feature({ value: 20 }), 1) as { getFill: () => { getColor: () => string } };
    const outOfRange = styleFunction(new Feature({ value: 40 }), 1);

    expect(lowStyle.getFill().getColor()).toBe("rgba(255, 0, 0, 1)");
    expect(highStyle.getFill().getColor()).toBe("rgba(0, 255, 0, 1)");
    expect(outOfRange).toBeUndefined();
  });
});
