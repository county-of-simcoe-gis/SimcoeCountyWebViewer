import { describe, it, expect } from "vitest";
import { transform } from "ol/proj";
import { getDistance } from "ol/sphere";
import { getBearing } from "@/utils/myMapsHelpers";
import { destinationPoint, geodesicCircleCoords, getMinimumPathPoints, parseBearing, parseDistance, rectangleFromCorner, supportsTextEntry, unitsToMeters } from "@/utils/myMapsTextEntry";

const START = transform([-79.5, 44.5], "EPSG:4326", "EPSG:3857");

const toLonLat = (coordinate: number[]) => transform(coordinate, "EPSG:3857", "EPSG:4326");
const groundDistance = (from: number[], to: number[]) => getDistance(toLonLat(from), toLonLat(to));

describe("unitsToMeters", () => {
  it("converts each supported unit to meters", () => {
    expect(unitsToMeters(1, "m")).toBe(1);
    expect(unitsToMeters(2, "km")).toBe(2000);
    expect(unitsToMeters(10, "ft")).toBeCloseTo(3.048, 6);
    expect(unitsToMeters(1, "mi")).toBeCloseTo(1609.344, 6);
  });
});

describe("destinationPoint", () => {
  it("places the destination at the requested ground distance", () => {
    const destination = destinationPoint(START, 45, 1000);
    expect(Math.abs(groundDistance(START, destination) - 1000)).toBeLessThan(1);
  });

  it("places the destination on the requested true bearing", () => {
    const destination = destinationPoint(START, 90, 1000);
    expect(Math.abs(getBearing(START, destination) - 90)).toBeLessThan(0.1);
  });

  it("moves north when the bearing is 0", () => {
    const destination = destinationPoint(START, 0, 1000);
    expect(toLonLat(destination)[1]).toBeGreaterThan(toLonLat(START)[1]);
  });
});

describe("geodesicCircleCoords", () => {
  it("returns a closed ring with every vertex at the radius", () => {
    const ring = geodesicCircleCoords(START, 250);

    expect(ring).toHaveLength(65);
    expect(ring[64]).toEqual(ring[0]);
    ring.slice(0, 64).forEach((vertex) => {
      expect(Math.abs(groundDistance(START, vertex) - 250)).toBeLessThan(0.5);
    });
  });
});

describe("rectangleFromCorner", () => {
  it("extends east by width and north by height from the start corner", () => {
    const rectangle = rectangleFromCorner(START, 300, 200);

    expect(rectangle).toHaveLength(5);
    expect(rectangle[4]).toEqual(rectangle[0]);
    expect(Math.abs(groundDistance(rectangle[0], rectangle[1]) - 300)).toBeLessThan(0.5);
    expect(Math.abs(groundDistance(rectangle[1], rectangle[2]) - 200)).toBeLessThan(0.5);
    expect(Math.abs(groundDistance(rectangle[0], rectangle[3]) - 200)).toBeLessThan(0.5);
  });
});

describe("parseBearing", () => {
  it("accepts values from 0 to 360 inclusive", () => {
    expect(parseBearing("0")).toBe(0);
    expect(parseBearing(" 90.5 ")).toBe(90.5);
    expect(parseBearing("360")).toBe(360);
  });

  it("rejects empty, non-numeric, and out-of-range values", () => {
    expect(parseBearing("")).toBeNull();
    expect(parseBearing("north")).toBeNull();
    expect(parseBearing("-1")).toBeNull();
    expect(parseBearing("361")).toBeNull();
  });
});

describe("parseDistance", () => {
  it("accepts positive numbers", () => {
    expect(parseDistance("12.5")).toBe(12.5);
  });

  it("rejects empty, zero, negative, and non-numeric values", () => {
    expect(parseDistance("")).toBeNull();
    expect(parseDistance("0")).toBeNull();
    expect(parseDistance("-3")).toBeNull();
    expect(parseDistance("far")).toBeNull();
  });
});

describe("supportsTextEntry", () => {
  it("is enabled for the configured drawing tools", () => {
    expect(supportsTextEntry("LineString")).toBe(true);
    expect(supportsTextEntry("Polygon")).toBe(true);
    expect(supportsTextEntry("Circle")).toBe(true);
    expect(supportsTextEntry("Rectangle")).toBe(true);
    expect(supportsTextEntry("Arrow")).toBe(true);
    expect(supportsTextEntry("Bearing")).toBe(true);
    expect(supportsTextEntry("Measure")).toBe(true);
  });

  it("is disabled for point, text, and callout tools", () => {
    expect(supportsTextEntry("Point")).toBe(false);
    expect(supportsTextEntry("Text")).toBe(false);
    expect(supportsTextEntry("Callout")).toBe(false);
  });
});

describe("getMinimumPathPoints", () => {
  it("requires three points for a polygon and two for a line", () => {
    expect(getMinimumPathPoints("Polygon")).toBe(3);
    expect(getMinimumPathPoints("LineString")).toBe(2);
  });
});
