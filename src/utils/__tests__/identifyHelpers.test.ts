import { describe, it, expect } from "vitest";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import moment from "moment";
import {
  isExcludedKey,
  filterFeatureKeys,
  filterPropertyKeys,
  IDENTIFY_FILTER_KEY_PATTERNS,
  formatIdentifyDateValue,
  formatEpochDateValue,
  formatFieldValue,
  formatFieldValueAsText,
} from "@/utils/identifyHelpers";

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

  describe("formatEpochDateValue", () => {
    it("formats a UTC-midnight epoch value as date-only", () => {
      const ms = Date.UTC(2024, 0, 1, 0, 0, 0);
      expect(formatEpochDateValue(ms)).toBe("2024-01-01");
    });

    it("formats a non-midnight epoch value with a time component (UTC)", () => {
      const ms = Date.UTC(2024, 0, 1, 13, 45, 30);
      expect(formatEpochDateValue(ms)).toBe("2024-01-01 13:45:30");
    });

    it("is independent of the local timezone (uses UTC formatting)", () => {
      const ms = Date.UTC(2024, 0, 1, 0, 0, 0);
      expect(formatEpochDateValue(ms)).toBe(moment.utc(ms).format("YYYY-MM-DD"));
    });

    it("matches formatIdentifyDateValue's output for the equivalent bare ISO date string (no time/zone)", () => {
      // Bare "YYYY-MM-DD" strings are parsed as UTC by Date.parse, and as
      // local-midnight by moment — both echo back the same calendar date
      // without any timezone arithmetic, so the two paths agree regardless
      // of the machine's local timezone.
      const iso = "2024-01-01";
      const ms = Date.parse(iso);
      expect(formatEpochDateValue(ms)).toBe(formatIdentifyDateValue("Created", iso));
    });
  });

  describe("formatFieldValue / formatFieldValueAsText columnType hint", () => {
    describe("without a columnType hint (InfoRow/Identify default behavior)", () => {
      it("treats a large number as an epoch date via the legacy heuristic", () => {
        const ms = Date.UTC(2024, 0, 1, 13, 45, 30);
        expect(formatFieldValueAsText("Created", ms)).toBe(new Date(ms).toISOString().slice(0, 19).replace("T", " "));
      });

      it("leaves a small number as a plain number", () => {
        expect(formatFieldValueAsText("Count", 42)).toBe("42");
      });
    });

    describe("columnType: 'number'", () => {
      it("never reformats a large number as a date", () => {
        const large = 4341010203040000; // e.g. a legitimate large numeric identifier
        expect(formatFieldValueAsText("ParcelId", large, "number")).toBe(String(large));
        expect(formatFieldValue("ParcelId", large, "number")).toBe(String(large));
      });
    });

    describe("columnType: 'date'", () => {
      it("formats a UTC-midnight epoch value as date-only", () => {
        const ms = Date.UTC(2024, 0, 1, 0, 0, 0);
        expect(formatFieldValueAsText("Created", ms, "date")).toBe("2024-01-01");
        expect(formatFieldValue("Created", ms, "date")).toBe("2024-01-01");
      });

      it("formats a non-midnight epoch value with a time component", () => {
        const ms = Date.UTC(2024, 0, 1, 13, 45, 30);
        expect(formatFieldValueAsText("Created", ms, "date")).toBe("2024-01-01 13:45:30");
      });

      it("matches the string-based ISO formatting path for a bare date string", () => {
        const iso = "2024-01-01";
        const ms = Date.parse(iso);
        expect(formatFieldValueAsText("Created", ms, "date")).toBe(formatFieldValueAsText("Created", iso, "date"));
      });
    });

    describe("columnType: 'boolean' / 'string' / omitted", () => {
      it("still formats booleans as Yes/No", () => {
        expect(formatFieldValueAsText("Active", true, "boolean")).toBe("Yes");
        expect(formatFieldValueAsText("Active", false, "boolean")).toBe("No");
      });

      it("returns null for formatFieldValue on null/undefined regardless of hint", () => {
        expect(formatFieldValue("Anything", null, "date")).toBeNull();
        expect(formatFieldValue("Anything", undefined, "number")).toBeNull();
      });
    });
  });
});
