import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  queryFeature,
  queryFeatureByNG911ID,
  queryFeatureByARN,
  queryFeaturesByGeometry,
  queryFeaturesByAttribute,
  getFeatureCenter,
  getFeatureExtent,
  GeoServerError,
  handleGeoServerError,
} from "@/utils/geoServerClient";
import { server } from "@/test/testServer";
import { http, HttpResponse } from "msw";

// Mock auth utilities
vi.mock("@/utils/auth", () => ({
  getAccessToken: vi.fn().mockResolvedValue(null),
  isSecuredUrl: vi.fn().mockReturnValue(false),
}));

const mockFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-8843000, 5564000] },
      properties: { NAME: "Test Feature", ARN: "1234567890" },
      id: "feature.1",
    },
  ],
};

const emptyFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const GEO_URL = "https://geoserver.example.com/ows";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("geoServerClient", () => {
  describe("GeoServerError", () => {
    it("creates error with message, statusCode, and serviceUrl", () => {
      const error = new GeoServerError("Something failed", 500, "https://geoserver.example.com/ows");
      expect(error.message).toBe("Something failed");
      expect(error.statusCode).toBe(500);
      expect(error.serviceUrl).toBe("https://geoserver.example.com/ows");
      expect(error.name).toBe("GeoServerError");
    });
  });

  describe("handleGeoServerError", () => {
    it("handles GeoServerError with status codes", () => {
      expect(handleGeoServerError(new GeoServerError("not found", 404))).toBe("Feature not found");
      expect(handleGeoServerError(new GeoServerError("forbidden", 403))).toBe("Access denied to the requested resource");
      expect(handleGeoServerError(new GeoServerError("server err", 500))).toBe("Server error while fetching feature data");
    });

    it("handles GeoServerError without status code", () => {
      expect(handleGeoServerError(new GeoServerError("custom message"))).toBe("custom message");
    });

    it("handles generic Error with network hints", () => {
      expect(handleGeoServerError(new Error("fetch failed"))).toBe("Unable to connect to the mapping service");
      expect(handleGeoServerError(new Error("timeout reached"))).toBe("Request timed out while fetching feature data");
      expect(handleGeoServerError(new Error("other error"))).toBe("other error");
    });

    it("handles unknown error types", () => {
      expect(handleGeoServerError("string error")).toBe("An unknown error occurred");
      expect(handleGeoServerError(42)).toBe("An unknown error occurred");
    });
  });

  describe("queryFeature", () => {
    it("returns features on successful query", async () => {
      server.use(http.get(GEO_URL, () => HttpResponse.json(mockFeatureCollection)));

      const result = await queryFeature({
        serviceUrl: GEO_URL,
        layerName: "simcoe:parcels",
        cqlFilter: "ARN='1234567890'",
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.feature?.properties?.NAME).toBe("Test Feature");
      expect(result.features).toHaveLength(1);
    });

    it("returns no features found when response is empty", async () => {
      server.use(http.get(GEO_URL, () => HttpResponse.json(emptyFeatureCollection)));

      const result = await queryFeature({
        serviceUrl: GEO_URL,
        layerName: "simcoe:parcels",
      });

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(result.error).toBe("No features found");
    });

    it("throws GeoServerError on HTTP error response", async () => {
      server.use(http.get(GEO_URL, () => new HttpResponse(null, { status: 500, statusText: "Internal Server Error" })));

      await expect(
        queryFeature({
          serviceUrl: GEO_URL,
          layerName: "simcoe:parcels",
        }),
      ).rejects.toThrow(GeoServerError);
    });

    it("throws when serviceUrl is missing", async () => {
      await expect(
        queryFeature({
          serviceUrl: "",
          layerName: "simcoe:parcels",
        }),
      ).rejects.toThrow("Service URL is required");
    });

    it("throws when layerName is missing", async () => {
      await expect(
        queryFeature({
          serviceUrl: GEO_URL,
          layerName: "",
        }),
      ).rejects.toThrow("Layer name is required");
    });

    it("constructs correct WFS URL with parameters", async () => {
      let capturedUrl = "";
      server.use(
        http.get(GEO_URL, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(mockFeatureCollection);
        }),
      );

      await queryFeature({
        serviceUrl: GEO_URL,
        layerName: "simcoe:parcels",
        cqlFilter: "ARN='123'",
        maxFeatures: 5,
        srsName: "EPSG:4326",
      });

      expect(capturedUrl).toContain("service=WFS");
      expect(capturedUrl).toContain("version=2.0.0");
      expect(capturedUrl).toContain("request=GetFeature");
      expect(capturedUrl).toContain("typeNames=simcoe:parcels");
      expect(capturedUrl).toContain("count=5");
      expect(capturedUrl).toContain("CQL_FILTER=");
    });

    it("adds auth header for secured URLs", async () => {
      const { isSecuredUrl, getAccessToken } = await import("@/utils/auth");
      vi.mocked(isSecuredUrl).mockReturnValue(true);
      vi.mocked(getAccessToken).mockResolvedValue("test-token");

      let capturedAuth = "";
      server.use(
        http.get("https://secured.example.com/ows", ({ request }) => {
          capturedAuth = request.headers.get("Authorization") || "";
          return HttpResponse.json(mockFeatureCollection);
        }),
      );

      await queryFeature({
        serviceUrl: "https://secured.example.com/ows",
        layerName: "simcoe:parcels",
      });

      expect(capturedAuth).toBe("Bearer test-token");
    });
  });

  describe("queryFeatureByNG911ID", () => {
    it("returns empty result for empty nguid", async () => {
      const result = await queryFeatureByNG911ID(GEO_URL, "");
      expect(result.success).toBe(false);
      expect(result.error).toBe("NG911ID value is required");
    });

    it("returns empty result for whitespace-only nguid", async () => {
      const result = await queryFeatureByNG911ID(GEO_URL, "   ");
      expect(result.success).toBe(false);
    });

    it("queries with correct CQL filter", async () => {
      let capturedUrl = "";
      server.use(
        http.get(GEO_URL, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(mockFeatureCollection);
        }),
      );

      await queryFeatureByNG911ID(GEO_URL, "abc-123");

      expect(capturedUrl).toContain("NGUID%3D%27abc-123%27");
      expect(capturedUrl).toContain("simcoe:Civic_Address_Point_Lookup");
    });

    it("uses custom layer name when provided", async () => {
      let capturedUrl = "";
      server.use(
        http.get(GEO_URL, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(mockFeatureCollection);
        }),
      );

      await queryFeatureByNG911ID(GEO_URL, "abc", "custom:layer");

      expect(capturedUrl).toContain("typeNames=custom:layer");
    });
  });

  describe("queryFeatureByARN", () => {
    it("returns empty result for empty ARN", async () => {
      const result = await queryFeatureByARN(GEO_URL, "");
      expect(result.success).toBe(false);
      expect(result.error).toBe("ARN value is required");
    });

    it("cleans non-numeric characters from ARN", async () => {
      let capturedUrl = "";
      server.use(
        http.get(GEO_URL, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(mockFeatureCollection);
        }),
      );

      await queryFeatureByARN(GEO_URL, "12-345-678-90");

      expect(capturedUrl).toContain("ARN%3D%271234567890%27");
    });

    it("returns invalid format for non-numeric ARN", async () => {
      const result = await queryFeatureByARN(GEO_URL, "abc-def");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid ARN format");
    });
  });

  describe("queryFeaturesByGeometry", () => {
    it("returns error for empty WKT", async () => {
      const result = await queryFeaturesByGeometry({
        serviceUrl: GEO_URL,
        layerName: "simcoe:zoning",
        geometryField: "geom",
        wkt: "",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("WKT geometry is required");
    });

    it("builds INTERSECTS CQL filter", async () => {
      let capturedUrl = "";
      server.use(
        http.get(GEO_URL, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(mockFeatureCollection);
        }),
      );

      await queryFeaturesByGeometry({
        serviceUrl: GEO_URL,
        layerName: "simcoe:zoning",
        geometryField: "geom",
        wkt: "POLYGON((0 0,1 0,1 1,0 1,0 0))",
      });

      expect(capturedUrl).toContain(encodeURIComponent("INTERSECTS(geom, POLYGON((0 0,1 0,1 1,0 1,0 0)))"));
    });

    it("wraps WKT in buffer() when buffer parameter given", async () => {
      let capturedUrl = "";
      server.use(
        http.get(GEO_URL, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(mockFeatureCollection);
        }),
      );

      await queryFeaturesByGeometry({
        serviceUrl: GEO_URL,
        layerName: "simcoe:zoning",
        geometryField: "geom",
        wkt: "POLYGON((0 0,1 0,1 1,0 1,0 0))",
        buffer: -10,
      });

      expect(capturedUrl).toContain(encodeURIComponent("INTERSECTS(geom, buffer(POLYGON((0 0,1 0,1 1,0 1,0 0)), -10))"));
    });
  });

  describe("queryFeaturesByAttribute", () => {
    it("returns error for empty attribute value", async () => {
      const result = await queryFeaturesByAttribute({
        serviceUrl: GEO_URL,
        layerName: "simcoe:zoning",
        attributeName: "arn",
        attributeValue: "",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("arn value is required");
    });

    it("builds correct CQL filter for attribute query", async () => {
      let capturedUrl = "";
      server.use(
        http.get(GEO_URL, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(mockFeatureCollection);
        }),
      );

      await queryFeaturesByAttribute({
        serviceUrl: GEO_URL,
        layerName: "simcoe:zoning",
        attributeName: "arn",
        attributeValue: "12345",
      });

      expect(capturedUrl).toContain("(arn%3D%2712345%27)");
    });
  });

  describe("getFeatureCenter", () => {
    it("returns coordinates for Point geometry", () => {
      const center = getFeatureCenter({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [10, 20] },
      });
      expect(center).toEqual([10, 20]);
    });

    it("returns midpoint for LineString geometry", () => {
      const center = getFeatureCenter({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [5, 5],
            [10, 10],
          ],
        },
      });
      expect(center).toEqual([5, 5]);
    });

    it("returns centroid approximation for Polygon geometry", () => {
      const center = getFeatureCenter({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
      });
      // Centroid of square should be near 4, 4 (avg of all points including closing point)
      expect(center).toBeTruthy();
      expect(center![0]).toBeCloseTo(4, 0);
      expect(center![1]).toBeCloseTo(4, 0);
    });

    it("returns null for feature with no geometry", () => {
      const center = getFeatureCenter({
        type: "Feature",
        properties: {},
        geometry: null as unknown as { type: string },
      });
      expect(center).toBeNull();
    });

    it("returns null for unknown geometry type", () => {
      const center = getFeatureCenter({
        type: "Feature",
        properties: {},
        geometry: { type: "UnknownType" },
      });
      expect(center).toBeNull();
    });

    it("handles MultiPolygon geometry", () => {
      const center = getFeatureCenter({
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
              ],
            ],
          ],
        },
      });
      expect(center).toBeTruthy();
    });

    it("handles GeometryCollection by using first geometry", () => {
      const center = getFeatureCenter({
        type: "Feature",
        properties: {},
        geometry: {
          type: "GeometryCollection",
          geometries: [{ type: "Point", coordinates: [5, 10] }],
        },
      });
      expect(center).toEqual([5, 10]);
    });
  });

  describe("getFeatureExtent", () => {
    it("returns extent for Point geometry", () => {
      const extent = getFeatureExtent({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [10, 20] },
      });
      expect(extent).toEqual([10, 20, 10, 20]);
    });

    it("returns extent for Polygon geometry", () => {
      const extent = getFeatureExtent({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 20],
              [0, 20],
              [0, 0],
            ],
          ],
        },
      });
      expect(extent).toEqual([0, 0, 10, 20]);
    });

    it("returns null for feature with no geometry", () => {
      const extent = getFeatureExtent({
        type: "Feature",
        properties: {},
        geometry: null as unknown as { type: string },
      });
      expect(extent).toBeNull();
    });

    it("handles MultiPolygon extent", () => {
      const extent = getFeatureExtent({
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0, 0],
                [5, 0],
                [5, 5],
                [0, 5],
                [0, 0],
              ],
            ],
            [
              [
                [10, 10],
                [20, 10],
                [20, 20],
                [10, 20],
                [10, 10],
              ],
            ],
          ],
        },
      });
      expect(extent).toEqual([0, 0, 20, 20]);
    });
  });
});
