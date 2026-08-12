import { describe, it, expect } from "vitest";
import Point from "ol/geom/Point";
import MultiPoint from "ol/geom/MultiPoint";
import LineString from "ol/geom/LineString";
import MultiLineString from "ol/geom/MultiLineString";
import Polygon from "ol/geom/Polygon";
import MultiPolygon from "ol/geom/MultiPolygon";
import Circle from "ol/geom/Circle";
import { geometryToEsriJSON, getEsriGeometryType } from "@/utils/identifyGeometry";

describe("geometryToEsriJSON", () => {
  it("serializes a Point to ESRI point JSON", () => {
    const point = new Point([-8866446.73878801, 5509048.014128991]);
    const result = geometryToEsriJSON(point);

    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed).toMatchObject({ x: -8866446.73878801, y: 5509048.014128991 });
  });

  it("serializes a Polygon to ESRI polygon JSON", () => {
    const rings = [
      [
        [-8866446.73878801, 5509048.014128991],
        [-8865930.788847085, 5509086.232643134],
        [-8865949.898104157, 5508512.954930996],
        [-8866580.50358751, 5508560.728073673],
        [-8866828.923929436, 5508914.249329492],
        [-8866446.73878801, 5509048.014128991],
      ],
    ];
    const polygon = new Polygon(rings);
    const result = geometryToEsriJSON(polygon);

    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("rings");
    expect(parsed.rings).toHaveLength(1);
  });

  it("serializes a LineString to ESRI polyline JSON", () => {
    const line = new LineString([
      [-8866446.73878801, 5509048.014128991],
      [-8865930.788847085, 5509086.232643134],
    ]);
    const result = geometryToEsriJSON(line);

    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("paths");
    expect(parsed.paths).toHaveLength(1);
  });

  it("serializes a MultiPolygon to ESRI polygon JSON", () => {
    const polygon1 = new Polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const polygon2 = new Polygon([
      [
        [2, 2],
        [3, 2],
        [3, 3],
        [2, 3],
        [2, 2],
      ],
    ]);
    const multiPolygon = new MultiPolygon([polygon1, polygon2]);
    const result = geometryToEsriJSON(multiPolygon);

    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("rings");
    expect(parsed.rings).toHaveLength(2);
  });

  it("does not double-stringify the geometry", () => {
    const point = new Point([0, 0]);
    const result = geometryToEsriJSON(point);

    const firstParse = JSON.parse(result);
    expect(typeof firstParse).toBe("object");

    // A double-stringified value would parse to a string on the first pass.
    expect(typeof firstParse).not.toBe("string");
  });
});

describe("getEsriGeometryType", () => {
  it("maps Point to esriGeometryPoint", () => {
    expect(getEsriGeometryType(new Point([0, 0]))).toBe("esriGeometryPoint");
  });

  it("maps MultiPoint to esriGeometryMultipoint", () => {
    expect(
      getEsriGeometryType(
        new MultiPoint([
          [0, 0],
          [1, 1],
        ]),
      ),
    ).toBe("esriGeometryMultipoint");
  });

  it("maps LineString to esriGeometryPolyline", () => {
    expect(
      getEsriGeometryType(
        new LineString([
          [0, 0],
          [1, 1],
        ]),
      ),
    ).toBe("esriGeometryPolyline");
  });

  it("maps MultiLineString to esriGeometryPolyline", () => {
    expect(
      getEsriGeometryType(
        new MultiLineString([
          [
            [0, 0],
            [1, 1],
          ],
        ]),
      ),
    ).toBe("esriGeometryPolyline");
  });

  it("maps Polygon to esriGeometryPolygon", () => {
    expect(
      getEsriGeometryType(
        new Polygon([
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ]),
      ),
    ).toBe("esriGeometryPolygon");
  });

  it("maps MultiPolygon to esriGeometryPolygon", () => {
    const p1 = new Polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ]);
    const p2 = new Polygon([
      [
        [2, 2],
        [3, 2],
        [3, 3],
        [2, 2],
      ],
    ]);
    expect(getEsriGeometryType(new MultiPolygon([p1, p2]))).toBe("esriGeometryPolygon");
  });

  it("maps Circle to esriGeometryPolygon", () => {
    expect(getEsriGeometryType(new Circle([0, 0], 100))).toBe("esriGeometryPolygon");
  });
});
