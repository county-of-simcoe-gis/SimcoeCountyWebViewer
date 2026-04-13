import { describe, it, expect } from "vitest";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { isExcludedKey, filterFeatureKeys, filterPropertyKeys, IDENTIFY_FILTER_KEY_PATTERNS } from "@/utils/identifyHelpers";

describe("identifyHelpers", () => {
  describe("IDENTIFY_FILTER_KEY_PATTERNS", () => {
    it("is an array of regex patterns", () => {
      expect(IDENTIFY_FILTER_KEY_PATTERNS).toBeInstanceOf(Array);
      IDENTIFY_FILTER_KEY_PATTERNS.forEach((p) => expect(p).toBeInstanceOf(RegExp));
    });
  });

  describe("isExcludedKey", () => {
    it.each([
      "_private",
      "id",
      "geometry",
      "geom",
      "extent_geom",
      "mygid",
      "globalid",
      "objectid",
      "objectid_1",
      "shape",
      "shape_area",
      "shape.len",
      "displayfieldname",
      "displayfieldvalue",
      "layerdisplayname",
      "geostasis.foo",
      "somefid",
      "my_fid_value",
      "boundedby",
      "feature id",
    ])("excludes system key '%s'", (key) => {
      expect(isExcludedKey(key)).toBe(true);
    });

    it.each(["Name", "Address", "Population", "Area_sqm", "MUNICIPAL_NAME", "zoning_code"])("does NOT exclude user key '%s'", (key) => {
      expect(isExcludedKey(key)).toBe(false);
    });

    it("is case-insensitive", () => {
      expect(isExcludedKey("OBJECTID")).toBe(true);
      expect(isExcludedKey("Geometry")).toBe(true);
      expect(isExcludedKey("SHAPE_AREA")).toBe(true);
    });
  });

  describe("filterPropertyKeys", () => {
    it("filters out system keys from a plain object", () => {
      const props = {
        id: "1",
        Name: "Simcoe",
        geometry: {},
        Population: 300000,
        objectid: 42,
        zoning_code: "R1",
      };
      const result = filterPropertyKeys(props);
      expect(result).toContain("Name");
      expect(result).toContain("Population");
      expect(result).toContain("zoning_code");
      expect(result).not.toContain("id");
      expect(result).not.toContain("geometry");
      expect(result).not.toContain("objectid");
    });

    it("returns empty array for object with only system keys", () => {
      const props = { id: "1", geometry: {}, objectid: 42 };
      expect(filterPropertyKeys(props)).toEqual([]);
    });
  });

  describe("filterFeatureKeys", () => {
    it("filters system keys and object-valued properties from OL Feature", () => {
      const feature = new Feature({
        geometry: new Point([0, 0]),
        Name: "Test",
        objectid: 1,
        Address: "123 Main St",
        nestedObj: { a: 1 },
      });

      const result = filterFeatureKeys(feature);
      expect(result).toContain("Name");
      expect(result).toContain("Address");
      expect(result).not.toContain("geometry");
      expect(result).not.toContain("objectid");
      expect(result).not.toContain("nestedObj"); // object values excluded
    });

    it("returns empty array for feature with no user properties", () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      expect(filterFeatureKeys(feature)).toEqual([]);
    });
  });
});
