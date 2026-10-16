import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/testServer";
import { describeArcgisLayer, fetchArcgisFeatureById, fetchArcgisRelatedRecords, getArcgisObjectId, getRelatedTableUrl } from "@/lib/attributeTable/arcgis";

const SERVICE_URL = "https://example.com/arcgis/rest/services/Operations/Roads/MapServer";
const LAYER_URL = `${SERVICE_URL}/588`;

describe("getRelatedTableUrl", () => {
  it("builds the related table URL on the same service", () => {
    expect(getRelatedTableUrl(LAYER_URL, 67)).toBe(`${SERVICE_URL}/67`);
  });
});

describe("getArcgisObjectId", () => {
  it("reads OBJECTID case-insensitively", () => {
    expect(getArcgisObjectId({ objectid: 42 })).toBe("42");
  });

  it("returns null when OBJECTID is absent", () => {
    expect(getArcgisObjectId({ NAME: "x" })).toBeNull();
  });
});

describe("fetchArcgisRelatedRecords", () => {
  it("queries related rows for one origin feature", async () => {
    const seen: string[] = [];
    server.use(
      http.get(`${LAYER_URL}/queryRelatedRecords`, ({ request }) => {
        seen.push(request.url);
        return HttpResponse.json({
          relatedRecordGroups: [{ objectId: 12345, relatedRecords: [{ attributes: { OBJECTID: 1, LINK: "https://example.com/v.mp4" } }] }],
        });
      }),
    );

    const rows = await fetchArcgisRelatedRecords({ layerUrl: LAYER_URL, secured: false, objectId: "12345", relationshipId: 5 });

    expect(rows).toEqual([{ OBJECTID: 1, LINK: "https://example.com/v.mp4" }]);
    const url = new URL(seen[0]);
    expect(url.searchParams.get("relationshipId")).toBe("5");
    expect(url.searchParams.get("objectIds")).toBe("12345");
    expect(url.searchParams.get("token")).toBeNull();
  });

  it("returns no rows when the response has no group for the object id", async () => {
    server.use(http.get(`${LAYER_URL}/queryRelatedRecords`, () => HttpResponse.json({ relatedRecordGroups: [] })));

    expect(await fetchArcgisRelatedRecords({ layerUrl: LAYER_URL, secured: false, objectId: "7", relationshipId: 5 })).toEqual([]);
  });

  it("throws on ArcGIS error bodies", async () => {
    server.use(http.get(`${LAYER_URL}/queryRelatedRecords`, () => HttpResponse.json({ error: { code: 400, message: "Invalid relationship" } })));

    await expect(fetchArcgisRelatedRecords({ layerUrl: LAYER_URL, secured: false, objectId: "7", relationshipId: 9 })).rejects.toThrow("ArcGIS error 400");
  });
});

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

describe("describeArcgisLayer", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  function createLayerMetadataWithSystemFieldsResponse() {
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
        { name: "Shape", type: "esriFieldTypeGeometry" },
        { name: "Shape_Length", type: "esriFieldTypeDouble" },
        { name: "Shape_Area", type: "esriFieldTypeDouble" },
        { name: "st_length", type: "esriFieldTypeDouble" },
        { name: "st_area", type: "esriFieldTypeDouble" },
      ],
    };
  }

  it("marks geometry fields as isGeometry and keeps length/area fields in the schema", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlString = url.toString();
      if (urlString.includes("/588?f=json")) {
        return new Response(JSON.stringify(createLayerMetadataWithSystemFieldsResponse()), {
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

    const result = await describeArcgisLayer(endpoint, false);

    const fieldNames = result.fields.map((f) => f.name);
    expect(fieldNames).toContain("OBJECTID");
    expect(fieldNames).toContain("BridgeName");
    expect(fieldNames).toContain("Shape_Length");
    expect(fieldNames).toContain("Shape_Area");
    expect(fieldNames).toContain("st_length");
    expect(fieldNames).toContain("st_area");

    // Geometry field stays in raw schema but is marked for downstream filtering.
    const shapeField = result.fields.find((f) => f.name === "Shape");
    expect(shapeField).toBeDefined();
    expect(shapeField!.isGeometry).toBe(true);

    // Length/area fields are not geometry and are now filtered by isExcludedKey instead.
    expect(result.fields.find((f) => f.name === "Shape_Length")!.isGeometry).toBe(false);
    expect(result.fields.find((f) => f.name === "st_length")!.isGeometry).toBe(false);
  });
});
