import { describe, it, expect } from "vitest";
import {
  constructGeoServerLayerUrl,
  constructArcGISLayerUrl,
  extractWorkspaceFromUrl,
  extractLayerNameFromUrl,
  getServerBaseUrl,
  isGeoServerUrl,
  isArcGISUrl,
  constructLayerInfoUrl,
  constructDownloadUrl,
} from "@/lib/layerInfoHelpers";
import type { TOCLayer } from "@/stores/tocStore";

describe("layerInfoHelpers", () => {
  describe("constructGeoServerLayerUrl", () => {
    it("builds correct REST URL", () => {
      const url = constructGeoServerLayerUrl("https://opengis.simcoe.ca", "simcoe", "roads");
      expect(url).toBe("https://opengis.simcoe.ca/geoserver/rest/workspaces/simcoe/layers/roads.json");
    });

    it("strips trailing slash from server URL", () => {
      const url = constructGeoServerLayerUrl("https://opengis.simcoe.ca/", "simcoe", "roads");
      expect(url).toBe("https://opengis.simcoe.ca/geoserver/rest/workspaces/simcoe/layers/roads.json");
    });
  });

  describe("constructArcGISLayerUrl", () => {
    it("adds ?f=json to bare URL", () => {
      const url = constructArcGISLayerUrl("https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/0");
      expect(url).toBe("https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/0?f=json");
    });

    it("returns URL unchanged if already has ?f=json", () => {
      const input = "https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/0?f=json";
      expect(constructArcGISLayerUrl(input)).toBe(input);
    });

    it("strips existing query params before appending", () => {
      const url = constructArcGISLayerUrl("https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/0?token=abc");
      expect(url).toBe("https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/0?f=json");
    });
  });

  describe("extractWorkspaceFromUrl", () => {
    it("extracts from /geoserver/workspace/ows pattern", () => {
      expect(extractWorkspaceFromUrl("https://opengis.simcoe.ca/geoserver/simcoe/ows?service=wms")).toBe("simcoe");
    });

    it("extracts from typeNames parameter pattern", () => {
      // Pattern 3: typeNames=workspace:layer
      expect(extractWorkspaceFromUrl("typeNames=myworkspace:roads&foo=bar")).toBe("myworkspace");
    });

    it("extracts from colon-delimited path segment", () => {
      // Pattern 2: /workspace:layerName — typical for direct WMS LAYERS param
      expect(extractWorkspaceFromUrl("https://example.com/simcoe:roads")).toBe("simcoe");
    });

    it("returns 'simcoe' as default fallback", () => {
      expect(extractWorkspaceFromUrl("https://example.com/something")).toBe("simcoe");
    });
  });

  describe("extractLayerNameFromUrl", () => {
    it("extracts from typeNames parameter", () => {
      expect(extractLayerNameFromUrl("?typeNames=simcoe:roads&outputFormat=json")).toBe("roads");
    });

    it("extracts from LAYERS parameter (case-insensitive)", () => {
      expect(extractLayerNameFromUrl("?LAYERS=simcoe:parcels&SRS=EPSG:3857")).toBe("parcels");
    });

    it("extracts from /layers/LayerName path", () => {
      expect(extractLayerNameFromUrl("/geoserver/rest/workspaces/simcoe/layers/buildings.json")).toBe("buildings");
    });

    it("extracts from /featuretypes/LayerName path", () => {
      expect(extractLayerNameFromUrl("/geoserver/rest/workspaces/simcoe/featuretypes/zoning")).toBe("zoning");
    });

    it("returns null when no pattern matches", () => {
      expect(extractLayerNameFromUrl("https://example.com/something")).toBeNull();
    });
  });

  describe("getServerBaseUrl", () => {
    it("extracts protocol and host from a URL", () => {
      expect(getServerBaseUrl("https://opengis.simcoe.ca/geoserver/simcoe/ows")).toBe("https://opengis.simcoe.ca");
    });

    it("falls back to splitting on /geoserver for invalid URLs", () => {
      expect(getServerBaseUrl("not-a-url/geoserver/something")).toBe("not-a-url");
    });
  });

  describe("isGeoServerUrl", () => {
    it("returns true for GeoServer URLs", () => {
      expect(isGeoServerUrl("https://opengis.simcoe.ca/geoserver/simcoe/ows")).toBe(true);
    });

    it("returns false for non-GeoServer URLs", () => {
      expect(isGeoServerUrl("https://maps.simcoe.ca/arcgis/rest/services")).toBe(false);
    });
  });

  describe("isArcGISUrl", () => {
    it("returns true for MapServer URLs", () => {
      expect(isArcGISUrl("https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/0")).toBe(true);
    });

    it("returns true for FeatureServer URLs", () => {
      expect(isArcGISUrl("https://maps.simcoe.ca/arcgis/rest/services/Public/FeatureServer/0")).toBe(true);
    });

    it("returns true for arcgis/rest/services URLs", () => {
      expect(isArcGISUrl("https://maps.simcoe.ca/arcgis/rest/services/Public")).toBe(true);
    });

    it("returns false for GeoServer URLs", () => {
      expect(isArcGISUrl("https://opengis.simcoe.ca/geoserver/simcoe/ows")).toBe(false);
    });
  });

  describe("constructLayerInfoUrl", () => {
    it("returns metadataUrl when present", () => {
      const layer = { metadataUrl: "https://example.com/metadata" } as TOCLayer;
      expect(constructLayerInfoUrl(layer)).toBe("https://example.com/metadata");
    });

    it("returns null when no layerUrl", () => {
      const layer = {} as TOCLayer;
      expect(constructLayerInfoUrl(layer)).toBeNull();
    });

    it("constructs GeoServer URL from layer", () => {
      const layer = {
        layerUrl: "https://opengis.simcoe.ca/geoserver/simcoe/ows?service=wms",
        name: "roads",
      } as TOCLayer;
      const url = constructLayerInfoUrl(layer);
      expect(url).toContain("/geoserver/rest/workspaces/simcoe/layers/roads.json");
    });

    it("constructs ArcGIS URL from layer", () => {
      const layer = {
        layerUrl: "https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/0",
      } as TOCLayer;
      const url = constructLayerInfoUrl(layer);
      expect(url).toBe("https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/0?f=json");
    });

    it("returns null for unknown service types", () => {
      const layer = { layerUrl: "https://example.com/wms" } as TOCLayer;
      expect(constructLayerInfoUrl(layer)).toBeNull();
    });
  });

  describe("constructDownloadUrl", () => {
    it("builds default SHAPE-ZIP download URL", () => {
      const url = constructDownloadUrl("https://opengis.simcoe.ca", "simcoe", "roads");
      expect(url).toContain("service=wfs");
      expect(url).toContain("typeNames=simcoe:roads");
      expect(url).toContain("outputFormat=SHAPE-ZIP");
    });

    it("supports GeoJSON format", () => {
      const url = constructDownloadUrl("https://opengis.simcoe.ca", "simcoe", "roads", "GeoJSON");
      expect(url).toContain("outputFormat=application/json");
    });

    it("supports KML format", () => {
      const url = constructDownloadUrl("https://opengis.simcoe.ca", "simcoe", "roads", "KML");
      expect(url).toContain("outputFormat=application/vnd.google-earth.kml+xml");
    });

    it("supports CSV format", () => {
      const url = constructDownloadUrl("https://opengis.simcoe.ca", "simcoe", "roads", "CSV");
      expect(url).toContain("outputFormat=csv");
    });
  });
});
