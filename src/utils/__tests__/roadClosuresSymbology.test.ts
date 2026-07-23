import { describe, it, expect } from "vitest";
import { Style, Stroke, RegularShape } from "ol/style";
import { Feature } from "ol";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import { withArrowEndpoints, buildClosureStyleFunction, buildClosureLegendItems } from "@/utils/roadClosuresSymbology";
import type { EsriRenderer } from "@/utils/esriSymbology";

const closureRenderer: EsriRenderer = {
  type: "uniqueValue",
  field1: "direction",
  uniqueValueInfos: [
    {
      value: "One Direction",
      label: "One Direction",
      symbol: { type: "esriSLS", color: [191, 31, 0, 255], width: 18, style: "esriSLSSolid" },
    },
    {
      value: "Both Directions",
      label: "Both Directions",
      symbol: { type: "esriSLS", color: [191, 31, 0, 255], width: 18, style: "esriSLSSolid" },
    },
  ],
};

const simpleLineRenderer: EsriRenderer = {
  type: "simple",
  symbol: { type: "esriSLS", color: [0, 170, 0, 255], width: 3, style: "esriSLSDash" },
};

function makeLineFeature(direction: string): Feature<LineString> {
  return new Feature({
    geometry: new LineString([
      [0, 0],
      [10, 0],
    ]),
    direction,
  });
}

const baseLineStyle = new Style({
  stroke: new Stroke({ color: "rgba(255,0,0,1)", width: 4 }),
});

describe("withArrowEndpoints", () => {
  it("returns the base style for point geometry", () => {
    const wrapped = withArrowEndpoints(() => baseLineStyle);
    const feature = new Feature({ geometry: new Point([0, 0]) });
    const result = wrapped(feature, 1);
    expect(result).toHaveLength(1);
    expect((result as Style[])[0]).toBe(baseLineStyle);
  });

  it("returns the base style for lines with an unrecognized direction", () => {
    const wrapped = withArrowEndpoints(() => baseLineStyle);
    const feature = makeLineFeature("Unknown");
    const result = wrapped(feature, 1);
    expect(result).toHaveLength(1);
    expect((result as Style[])[0]).toBe(baseLineStyle);
  });

  it("adds one arrowhead for One Direction", () => {
    const wrapped = withArrowEndpoints(() => baseLineStyle);
    const feature = makeLineFeature("One Direction");
    const result = wrapped(feature, 1) as Style[];
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(baseLineStyle);
    const arrow = result[1];
    const image = arrow.getImage();
    expect(image).toBeInstanceOf(RegularShape);
    expect((image as RegularShape).getPoints()).toBe(3);
  });

  it("adds two arrowheads for Both Directions", () => {
    const wrapped = withArrowEndpoints(() => baseLineStyle);
    const feature = makeLineFeature("Both Directions");
    const result = wrapped(feature, 1) as Style[];
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(baseLineStyle);
    expect(result[1].getImage()).toBeInstanceOf(RegularShape);
    expect(result[2].getImage()).toBeInstanceOf(RegularShape);
  });

  it("points the end arrowhead along the last segment", () => {
    const wrapped = withArrowEndpoints(() => baseLineStyle);
    const feature = new Feature({
      geometry: new LineString([
        [0, 0],
        [10, 0],
      ]),
      direction: "One Direction",
    });
    const result = wrapped(feature, 1) as Style[];
    // Last segment points right (angle 0). With angle=-π/2 the triangle vertex should align to 0.
    const endArrow = result[1].getImage() as RegularShape;
    expect(endArrow.getRotation()).toBeCloseTo(Math.PI / 2, 5);
  });

  it("points the start arrowhead outward for Both Directions", () => {
    const wrapped = withArrowEndpoints(() => baseLineStyle);
    const feature = new Feature({
      geometry: new LineString([
        [10, 0],
        [0, 0],
      ]),
      direction: "Both Directions",
    });
    const result = wrapped(feature, 1) as Style[];
    // Feature coordinates run from (10,0) to (0,0). First segment angle is π (pointing left).
    // The start arrowhead should point outward (away from the line interior), so it must be
    // rotated by π relative to the first segment — i.e. 0 / 2π (pointing right).
    const startArrow = result[2].getImage() as RegularShape;
    const rotation = startArrow.getRotation() % (Math.PI * 2);
    expect(rotation).toBeCloseTo(Math.PI / 2, 5);
  });

  it("uses a larger radius for sketch/thick stroke styles", () => {
    const thickStyle = new Style({ stroke: new Stroke({ color: "rgba(255,0,0,1)", width: 18 }) });
    const wrapped = withArrowEndpoints(() => thickStyle);
    const feature = makeLineFeature("One Direction");
    const result = wrapped(feature, 1) as Style[];
    const endArrow = result[1].getImage() as RegularShape;
    // radius = max(18 * 1.1, 8) = 19.8
    expect(endArrow.getRadius()).toBeGreaterThan(15);
  });
});

describe("buildClosureStyleFunction", () => {
  it("adds arrowheads for a direction uniqueValue renderer", () => {
    const styleFn = buildClosureStyleFunction(closureRenderer);
    const oneWay = makeLineFeature("One Direction");
    const oneWayResult = styleFn(oneWay, 1) as Style[];
    expect(oneWayResult.length).toBeGreaterThanOrEqual(2);
    expect(oneWayResult[1].getImage()).toBeInstanceOf(RegularShape);

    const bothWays = makeLineFeature("Both Directions");
    const bothWaysResult = styleFn(bothWays, 1) as Style[];
    expect(bothWaysResult.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to plain Esri styling for non-direction renderers", () => {
    const styleFn = buildClosureStyleFunction(simpleLineRenderer);
    const feature = makeLineFeature("One Direction");
    const result = styleFn(feature, 1);
    const styles = result ? (Array.isArray(result) ? result : [result]) : [];
    expect(styles).toHaveLength(1);
    expect(styles[0].getStroke()?.getColor()).toBe("rgba(0,170,0,1)");
  });
});

describe("buildClosureLegendItems", () => {
  it("renders arrowhead swatches for each direction value", () => {
    const items = buildClosureLegendItems(closureRenderer);
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe("One Direction");
    expect(items[0].imageDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(items[1].label).toBe("Both Directions");
    expect(items[1].imageDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("falls back to generic Esri legend for simple renderers", () => {
    const items = buildClosureLegendItems(simpleLineRenderer);
    expect(items).toHaveLength(1);
    expect(items[0].imageDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
