import { describe, it, expect } from "vitest";
import { parseArcGISFeature, parseESRIDescription, getFormattedProjection, getDownloadUrl, getServerUrl } from "@/lib/layerInfo";
import type { ArcGISFeatureInfo, LayerInfoData } from "@/types/layerInfo";

describe("layerInfo", () => {
  describe("parseESRIDescription", () => {
    it("strips HTML tags from description", () => {
      expect(parseESRIDescription("<p>Hello <b>World</b></p>")).toEqual({ description: "Hello World" });
    });

    it("returns empty description for empty string", () => {
      expect(parseESRIDescription("")).toEqual({ description: "" });
    });

    it("preserves plain text", () => {
      expect(parseESRIDescription("This is a layer")).toEqual({ description: "This is a layer" });
    });
  });

  describe("parseArcGISFeature", () => {
    const baseFeatureInfo: ArcGISFeatureInfo = {
      name: "TestLayer",
      description: "<p>A test layer</p>",
      extent: {
        xmin: -80,
        xmax: -79,
        ymin: 44,
        ymax: 45,
        spatialReference: { latestWkid: 4326 },
      },
      fields: [
        { name: "OBJECTID", type: "esriFieldTypeOID" },
        { name: "Name", type: "esriFieldTypeString" },
      ],
    };

    it("returns LayerInfoData with correct name and title", () => {
      const result = parseArcGISFeature(baseFeatureInfo);
      expect(result.name).toBe("TestLayer");
      expect(result.title).toBe("TestLayer");
    });

    it("strips HTML from description", () => {
      const result = parseArcGISFeature(baseFeatureInfo);
      expect(result.abstract).toBe("A test layer");
    });

    it("maps extent to nativeBoundingBox", () => {
      const result = parseArcGISFeature(baseFeatureInfo);
      expect(result.nativeBoundingBox.minx).toBe(-80);
      expect(result.nativeBoundingBox.maxx).toBe(-79);
      expect(result.nativeBoundingBox.miny).toBe(44);
      expect(result.nativeBoundingBox.maxy).toBe(45);
    });

    it("uses latestWkid for CRS when no WKT", () => {
      const result = parseArcGISFeature(baseFeatureInfo);
      expect(result.nativeCRS.$).toBe("EPSG:4326");
    });

    it("uses WKT for CRS when available", () => {
      const info: ArcGISFeatureInfo = {
        ...baseFeatureInfo,
        sourceSpatialReference: {
          wkid: 3857,
          latestWkid: 3857,
          wkt: 'PROJCS["WGS_1984_Web_Mercator"]',
        },
      };
      const result = parseArcGISFeature(info);
      expect(result.nativeCRS.$).toBe('PROJCS["WGS_1984_Web_Mercator"]');
    });

    it("sets Geographic class when CRS WKT contains GEOGCS", () => {
      const info: ArcGISFeatureInfo = {
        ...baseFeatureInfo,
        sourceSpatialReference: {
          wkid: 4326,
          latestWkid: 4326,
          wkt: 'GEOGCS["GCS_WGS_1984"]',
        },
      };
      const result = parseArcGISFeature(info);
      expect(result.nativeCRS["@class"]).toBe("Geographic");
    });

    it("maps fields to attributes", () => {
      const result = parseArcGISFeature(baseFeatureInfo);
      expect(result.attributes.attribute).toHaveLength(2);
      expect(result.attributes.attribute[0]).toEqual({ name: "OBJECTID", binding: "OID" });
      expect(result.attributes.attribute[1]).toEqual({ name: "Name", binding: "String" });
    });

    it("handles missing fields gracefully", () => {
      const info: ArcGISFeatureInfo = { ...baseFeatureInfo, fields: undefined as unknown as ArcGISFeatureInfo["fields"] };
      const result = parseArcGISFeature(info);
      expect(result.attributes.attribute).toEqual([]);
    });

    it("throws for missing extent", () => {
      const bad = { name: "Bad" } as ArcGISFeatureInfo;
      expect(() => parseArcGISFeature(bad)).toThrow("Invalid ArcGIS feature info");
    });
  });

  describe("getFormattedProjection", () => {
    it("formats projected CRS from object", () => {
      const info: LayerInfoData = {
        name: "test",
        title: "test",
        nativeCRS: { "@class": "Projected", $: 'PROJCS["NAD83_UTM_Zone_17N"]' },
        nativeBoundingBox: { minx: 0, maxx: 1, miny: 0, maxy: 1, crs: { "@class": "projected", $: "" } },
        attributes: { attribute: [] },
      };
      expect(getFormattedProjection(info)).toBe("Projected - NAD83_UTM_Zone_17N");
    });

    it("formats geographic CRS from object", () => {
      const info: LayerInfoData = {
        name: "test",
        title: "test",
        nativeCRS: { "@class": "Geographic", $: 'GEOGCS["GCS_WGS_1984"]' },
        nativeBoundingBox: { minx: 0, maxx: 1, miny: 0, maxy: 1, crs: { "@class": "projected", $: "" } },
        attributes: { attribute: [] },
      };
      expect(getFormattedProjection(info)).toBe("Geographic - GCS_WGS_1984");
    });

    it("formats CRS from string", () => {
      const info: LayerInfoData = {
        name: "test",
        title: "test",
        nativeCRS: 'PROJCS["WGS_84_Web_Mercator"]' as unknown as LayerInfoData["nativeCRS"],
        nativeBoundingBox: { minx: 0, maxx: 1, miny: 0, maxy: 1, crs: { "@class": "projected", $: "" } },
        attributes: { attribute: [] },
      };
      expect(getFormattedProjection(info)).toBe("Projected - WGS_84_Web_Mercator");
    });

    it("detects Geographic from string containing GEOGCS", () => {
      const info: LayerInfoData = {
        name: "test",
        title: "test",
        nativeCRS: 'GEOGCS["GCS_WGS_1984"]' as unknown as LayerInfoData["nativeCRS"],
        nativeBoundingBox: { minx: 0, maxx: 1, miny: 0, maxy: 1, crs: { "@class": "projected", $: "" } },
        attributes: { attribute: [] },
      };
      expect(getFormattedProjection(info)).toBe("Geographic - GCS_WGS_1984");
    });
  });

  describe("getDownloadUrl", () => {
    it("builds WFS SHAPE-ZIP download URL", () => {
      const url = getDownloadUrl("https://opengis.simcoe.ca/geoserver/", "simcoe", "roads");
      expect(url).toBe("https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=1.1.0&request=GetFeature&typeNames=simcoe:roads&outputFormat=SHAPE-ZIP");
    });
  });

  describe("getServerUrl", () => {
    it("extracts server URL before rest/", () => {
      expect(getServerUrl("https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/0")).toBe("https://maps.simcoe.ca/arcgis/");
    });
  });
});
