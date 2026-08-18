import { describe, it, expect } from "vitest";
import {
  normalizeEpsg,
  getSRLabel,
  isValidCoordinate,
  isWithinBounds,
  convertCoordinates,
  convertExtent,
  convertCoordinatesObject,
  convertExtentObject,
  webMercatorToLatLong,
  parseCoordinate,
  reprojectExtentToWebMercator,
} from "@/utils/coordinateConversion";

describe("coordinateConversion", () => {
  describe("normalizeEpsg", () => {
    it("returns default EPSG:4326 for undefined", () => {
      expect(normalizeEpsg()).toBe("EPSG:4326");
    });

    it("maps '4326' to EPSG:4326", () => {
      expect(normalizeEpsg("4326")).toBe("EPSG:4326");
    });

    it("maps 'latlong' to EPSG:4326 (case insensitive)", () => {
      expect(normalizeEpsg("LatLong")).toBe("EPSG:4326");
    });

    it("maps 'wgs84' to EPSG:4326", () => {
      expect(normalizeEpsg("WGS84")).toBe("EPSG:4326");
    });

    it("maps '3857' to EPSG:3857", () => {
      expect(normalizeEpsg("3857")).toBe("EPSG:3857");
    });

    it("maps 'web' to EPSG:3857", () => {
      expect(normalizeEpsg("web")).toBe("EPSG:3857");
    });

    it("maps 'webmercator' to EPSG:3857", () => {
      expect(normalizeEpsg("WebMercator")).toBe("EPSG:3857");
    });

    it("maps 'utm' to EPSG:26917", () => {
      expect(normalizeEpsg("UTM")).toBe("EPSG:26917");
    });

    it("maps '26917' to EPSG:26917", () => {
      expect(normalizeEpsg("26917")).toBe("EPSG:26917");
    });

    it("returns default for unknown identifiers", () => {
      expect(normalizeEpsg("unknown")).toBe("EPSG:4326");
    });
  });

  describe("getSRLabel", () => {
    it("returns 'WGS84 (Lat/Long)' for 4326", () => {
      expect(getSRLabel("4326")).toBe("WGS84 (Lat/Long)");
    });

    it("returns 'Web Mercator' for 3857", () => {
      expect(getSRLabel("3857")).toBe("Web Mercator");
    });

    it("returns 'UTM Zone 17N (NAD83)' for utm", () => {
      expect(getSRLabel("utm")).toBe("UTM Zone 17N (NAD83)");
    });
  });

  describe("isValidCoordinate", () => {
    it("returns true for valid numbers", () => {
      expect(isValidCoordinate(-79.4, 44.3)).toBe(true);
    });

    it("returns false for undefined", () => {
      expect(isValidCoordinate(undefined, 44)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isValidCoordinate(-79, null)).toBe(false);
    });

    it("returns false for NaN", () => {
      expect(isValidCoordinate(NaN, 44)).toBe(false);
    });

    it("returns false for Infinity", () => {
      expect(isValidCoordinate(Infinity, 44)).toBe(false);
    });
  });

  describe("isWithinBounds", () => {
    it("validates WGS84 bounds", () => {
      expect(isWithinBounds(-79.4, 44.3, "4326")).toBe(true);
      expect(isWithinBounds(-200, 44, "4326")).toBe(false);
      expect(isWithinBounds(-79, 100, "4326")).toBe(false);
    });

    it("validates Web Mercator bounds", () => {
      expect(isWithinBounds(-8840000, 5500000, "3857")).toBe(true);
      expect(isWithinBounds(21000000, 5500000, "3857")).toBe(false);
    });

    it("validates UTM bounds", () => {
      expect(isWithinBounds(604000, 4912000, "utm")).toBe(true);
      expect(isWithinBounds(50000, 4912000, "utm")).toBe(false);
    });

    it("falls back to 4326 for unknown systems", () => {
      // 'unknown' normalizes to EPSG:4326, (999,999) is out of lat/long bounds
      expect(isWithinBounds(999, 999, "unknown")).toBe(false);
      // Valid lat/long should pass even with unknown SR label
      expect(isWithinBounds(-79, 44, "unknown")).toBe(true);
    });
  });

  describe("convertCoordinates", () => {
    it("converts WGS84 to Web Mercator", () => {
      const [x, y] = convertCoordinates(-79.4163, 44.3894);
      // proj4 output — verify rough magnitude
      expect(x).toBeLessThan(-8800000);
      expect(x).toBeGreaterThan(-8900000);
      expect(y).toBeGreaterThan(5500000);
      expect(y).toBeLessThan(5600000);
    });

    it("passes through Web Mercator coordinates unchanged", () => {
      const [x, y] = convertCoordinates(-8840000, 5500000, "3857");
      expect(x).toBe(-8840000);
      expect(y).toBe(5500000);
    });

    it("converts UTM to Web Mercator", () => {
      const [x, y] = convertCoordinates(604000, 4912000, "UTM");
      expect(x).not.toBeNaN();
      expect(y).not.toBeNaN();
    });

    it("throws for invalid coordinates (NaN)", () => {
      expect(() => convertCoordinates(NaN, 44)).toThrow("Invalid coordinates");
    });

    it("defaults to WGS84 when no SR provided", () => {
      const [x, y] = convertCoordinates(-79.4, 44.3);
      // Should produce Web Mercator values (large negative x, large positive y)
      expect(x).toBeLessThan(-1000000);
      expect(y).toBeGreaterThan(1000000);
    });
  });

  describe("convertExtent", () => {
    it("converts a WGS84 extent to Web Mercator", () => {
      const [xmin, ymin, xmax, ymax] = convertExtent(-80, 44, -79, 45);
      expect(xmin).toBeLessThan(xmax);
      expect(ymin).toBeLessThan(ymax);
    });

    it("throws for invalid extent coordinates", () => {
      expect(() => convertExtent(NaN, 44, -79, 45)).toThrow("Invalid extent");
    });

    it("ensures proper min/max ordering", () => {
      // Even if inputs are swapped, output should be ordered
      const [xmin, ymin, xmax, ymax] = convertExtent(-79, 45, -80, 44);
      expect(xmin).toBeLessThan(xmax);
      expect(ymin).toBeLessThan(ymax);
    });
  });

  describe("convertCoordinatesObject", () => {
    it("converts and returns object with sr '3857'", () => {
      const result = convertCoordinatesObject({ x: -79.4, y: 44.3 });
      expect(result.sr).toBe("3857");
      expect(result.x).toBeLessThan(-1000000);
      expect(result.y).toBeGreaterThan(1000000);
    });
  });

  describe("convertExtentObject", () => {
    it("converts and returns object with sr '3857'", () => {
      const result = convertExtentObject({ xmin: -80, ymin: 44, xmax: -79, ymax: 45 });
      expect(result.sr).toBe("3857");
      expect(result.xmin).toBeLessThan(result.xmax);
      expect(result.ymin).toBeLessThan(result.ymax);
    });
  });

  describe("webMercatorToLatLong", () => {
    it("converts Web Mercator to WGS84", () => {
      const [lng, lat] = webMercatorToLatLong(-8840000, 5500000);
      expect(lng).toBeCloseTo(-79.4, 0);
      expect(lat).toBeCloseTo(44.1, 0);
    });

    it("throws for invalid coordinates", () => {
      expect(() => webMercatorToLatLong(NaN, 5500000)).toThrow("Invalid Web Mercator");
    });
  });

  describe("parseCoordinate", () => {
    it("parses numeric string", () => {
      expect(parseCoordinate("-79.4163")).toBeCloseTo(-79.4163);
    });

    it("handles comma as decimal separator", () => {
      expect(parseCoordinate("-79,4163")).toBeCloseTo(-79.4163);
    });

    it("returns NaN for undefined", () => {
      expect(parseCoordinate(undefined)).toBeNaN();
    });

    it("returns NaN for null", () => {
      expect(parseCoordinate(null)).toBeNaN();
    });

    it("returns NaN for empty string", () => {
      expect(parseCoordinate("")).toBeNaN();
    });

    it("trims whitespace", () => {
      expect(parseCoordinate("  44.3  ")).toBeCloseTo(44.3);
    });
  });

  describe("reprojectExtentToWebMercator", () => {
    it("returns the extent unchanged when wkid is omitted", () => {
      const extent = [-8876000, 5510000, -8620000, 5680000];
      expect(reprojectExtentToWebMercator(extent)).toEqual(extent);
    });

    it("returns the extent unchanged for wkid 3857", () => {
      const extent = [-8876000, 5510000, -8620000, 5680000];
      expect(reprojectExtentToWebMercator(extent, 3857)).toEqual(extent);
    });

    it("returns the extent unchanged for Esri's wkid 102100 (Web Mercator)", () => {
      const extent = [-8876000, 5510000, -8620000, 5680000];
      expect(reprojectExtentToWebMercator(extent, 102100)).toEqual(extent);
    });

    it("reprojects a UTM 17N (EPSG:26917) extent to Web Mercator", () => {
      const result = reprojectExtentToWebMercator([590000, 4900000, 620000, 4930000], 26917);

      expect(result).not.toBeNull();
      const [minX, minY, maxX, maxY] = result as number[];
      expect(minX).toBeLessThan(maxX);
      expect(minY).toBeLessThan(maxY);
      expect(Math.abs(minX)).toBeLessThan(20037508.34);
      expect(Math.abs(maxY)).toBeLessThan(20037508.34);
    });

    it("reprojects a geographic (EPSG:4326) extent to Web Mercator", () => {
      const result = reprojectExtentToWebMercator([-79.8, 44.1, -77.5, 45.6], 4326);
      expect(result).not.toBeNull();

      const expected = convertExtent(-79.8, 44.1, -77.5, 45.6, "4326");
      expect(result).toEqual(expected);
    });

    it("returns null for an unrecognized wkid instead of silently assuming WGS84", () => {
      expect(reprojectExtentToWebMercator([590000, 4900000, 620000, 4930000], 3979)).toBeNull();
    });

    it("returns null for a malformed extent", () => {
      expect(reprojectExtentToWebMercator([1, 2, 3] as unknown as number[], 26917)).toBeNull();
      expect(reprojectExtentToWebMercator(undefined, 26917)).toBeNull();
      expect(reprojectExtentToWebMercator([1, 2, Infinity, 4], 26917)).toBeNull();
    });
  });
});
