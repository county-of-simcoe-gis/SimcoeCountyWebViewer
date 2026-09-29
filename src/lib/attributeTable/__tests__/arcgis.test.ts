import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchArcgisFeatureById } from "@/lib/attributeTable/arcgis";

const SERVICE_URL = "https://example.com/arcgis/rest/services/Operations/Roads/MapServer";
const LAYER_URL = `${SERVICE_URL}/588`;

// Approximate Simcoe County MTM zone 9 square, then reprojected to Web Mercator.
// We use a simple rectangle in EPSG:32190 and assert the returned GeoJSON
// coordinates are transformed (large Web Mercator values, not raw MTM metres).
const MTM_EXTENT = {
  xmin: 280000,
  ymin: 4945000,
  xmax: 281000,
  ymax: 4946000,
};

const FEATURE_ATTRIBUTES = {
  OBJECTID: 12345,
  BridgeName: "Test Bridge",
  BridgeType: "Road Bridge",
};

function polygonRingsFromExtent(extent: { xmin: number; ymin: number; xmax: number; ymax: number }) {
  return [
    [
      [extent.xmin, extent.ymin],
      [extent.xmax, extent.ymin],
      [extent.xmax, extent.ymax],
      [extent.xmin, extent.ymax],
      [extent.xmin, extent.ymin],
    ],
  ];
}

function createLayerMetadataResponse() {
  return {
    currentVersion: 11.5,
    id: 588,
    name: "Bridges",
    type: "Feature Layer",
    geometryType: "esriGeometryPolygon",
    sourceSpatialReference: { wkid: 32190, latestWkid: 32190 },
    spatialReference: { wkid: 32190, latestWkid: 32190 },
    objectIdField: "OBJECTID",
    fields: [
      { name: "OBJECTID", type: "esriFieldTypeOID" },
      { name: "BridgeName", type: "esriFieldTypeString", length: 255 },
      { name: "BridgeType", type: "esriFieldTypeString", length: 255 },
    ],
  };
}

function createSingleFeatureResponse() {
  return {
    feature: {
      attributes: FEATURE_ATTRIBUTES,
      geometry: {
        rings: polygonRingsFromExtent(MTM_EXTENT),
      },
    },
  };
}

function createQueryFeatureSetResponse() {
  return {
    objectIdFieldName: "OBJECTID",
    features: [
      {
        attributes: FEATURE_ATTRIBUTES,
        geometry: {
          rings: polygonRingsFromExtent(MTM_EXTENT),
        },
      },
    ],
    spatialReference: { wkid: 32190, latestWkid: 32190 },
  };
}

vi.mock("@/stores/mapStore", () => ({
  useMapStore: {
    getState: () => ({
      map: {
        getView: () => ({
          getProjection: () => ({ getCode: () => "EPSG:3857" }),
        }),
      },
    }),
  },
}));

vi.mock("@/stores/arcgisTokenStore", () => ({
  useArcGISTokenStore: {
    getState: () => ({
      getValidToken: vi.fn().mockResolvedValue(null),
    }),
  },
}));

describe("fetchArcgisFeatureById", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("reprojects a per-feature endpoint response from EPSG:32190 to EPSG:3857", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlString = url.toString();
      if (urlString.includes("/588?f=json")) {
        return new Response(JSON.stringify(createLayerMetadataResponse()), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlString.includes("/588/12345?f=json")) {
        return new Response(JSON.stringify(createSingleFeatureResponse()), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: { code: 404, message: "Not found" } }), { status: 200 });
    }) as unknown as typeof fetch;

    const endpoint = {
      serviceUrl: SERVICE_URL,
      layerId: 588,
      layerUrl: LAYER_URL,
      tokenFromUrl: null,
    };

    const result = await fetchArcgisFeatureById(endpoint, false, "OBJECTID", "12345");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("12345");
    expect(result?.properties).toEqual(FEATURE_ATTRIBUTES);

    const geometry = result?.geometry as {
      type: string;
      coordinates: number[][][];
    };
    expect(geometry.type).toBe("Polygon");

    // Raw MTM coordinates are ~280000 / ~4950000. After correct reprojection
    // to EPSG:3857 they should be large negative x and large positive y.
    const firstCoord = geometry.coordinates[0][0];
    expect(Math.abs(firstCoord[0])).toBeGreaterThan(1000000);
    expect(Math.abs(firstCoord[1])).toBeGreaterThan(1000000);
  });

  it("reprojects a /query fallback response from EPSG:32190 to EPSG:3857", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlString = url.toString();
      if (urlString.includes("/588?f=json")) {
        return new Response(JSON.stringify({ error: { code: 404, message: "Not found" } }), { status: 200 });
      }
      if (urlString.includes("/588/query?")) {
        return new Response(JSON.stringify(createQueryFeatureSetResponse()), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: { code: 404, message: "Not found" } }), { status: 200 });
    }) as unknown as typeof fetch;

    const endpoint = {
      serviceUrl: SERVICE_URL,
      layerId: 588,
      layerUrl: LAYER_URL,
      tokenFromUrl: null,
    };

    const result = await fetchArcgisFeatureById(endpoint, false, "OBJECTID", "12345");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("12345");

    const geometry = result?.geometry as {
      type: string;
      coordinates: number[][][];
    };
    expect(geometry.type).toBe("Polygon");
    const firstCoord = geometry.coordinates[0][0];
    expect(Math.abs(firstCoord[0])).toBeGreaterThan(1000000);
    expect(Math.abs(firstCoord[1])).toBeGreaterThan(1000000);
  });
});
