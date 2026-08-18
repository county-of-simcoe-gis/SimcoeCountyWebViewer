import { describe, expect, it } from "vitest";
import { isOldOLStyleFormat, transformOLStyle } from "../storageMigration";

describe("isOldOLStyleFormat", () => {
  it("returns true for legacy underscore-suffixed OL style objects", () => {
    expect(isOldOLStyleFormat({ fill_: { color_: [255, 0, 0, 1] } })).toBe(true);
    expect(isOldOLStyleFormat({ stroke_: { color_: [0, 0, 0, 1], width_: 2 } })).toBe(true);
  });

  it("returns false for clean style JSON or non-objects", () => {
    expect(isOldOLStyleFormat({ fill: { color: [255, 0, 0, 1] } })).toBe(false);
    expect(isOldOLStyleFormat(null)).toBe(false);
    expect(isOldOLStyleFormat(undefined)).toBe(false);
    expect(isOldOLStyleFormat("string")).toBe(false);
  });
});

describe("transformOLStyle", () => {
  it("converts legacy fill, stroke, and circle image properties", () => {
    const result = transformOLStyle({
      fill_: { color_: [232, 9, 229, 0.8] },
      stroke_: { color_: [0, 0, 0, 1], width_: 3 },
      image_: {
        fill_: { color_: [232, 9, 229, 0.8] },
        stroke_: { color_: [0, 0, 0, 1], width_: 1 },
        radius_: 4,
      },
    });

    expect(result).toEqual({
      fill: { color: [232, 9, 229, 0.8] },
      stroke: { color: [0, 0, 0, 1], width: 3 },
      image: {
        type: "circle",
        radius: 4,
        fill: { color: [232, 9, 229, 0.8] },
        stroke: { color: [0, 0, 0, 1], width: 1 },
      },
    });
  });

  it("treats OL-serialized circles (points_: null) as circles, not regularShapes", () => {
    // The old app JSON.stringifies its OL Style objects. CircleStyle serializes with
    // points_: null (OL internal). Previously `points_ !== undefined` was true for
    // null, causing circles to be misidentified as regularShape and rendered as squares.
    const result = transformOLStyle({
      fill_: { color_: [232, 9, 229, 0.4] },
      image_: {
        fill_: { color_: [232, 9, 229, 0.4] },
        stroke_: { color_: [0, 0, 0, 0.8], width_: 3 },
        radius_: 4,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        points_: null as any, // OL CircleStyle serializes points_ as null
      },
    });

    expect(result.image?.type).toBe("circle");
    expect(result.image?.points).toBeUndefined();
    expect(result.image?.radius).toBe(4);
    expect(result.fill).toEqual({ color: [232, 9, 229, 0.4] });
  });

  it("converts regular shapes, icons, and text blocks", () => {
    const result = transformOLStyle({
      image_: {
        points_: 5,
        radius_: 10,
        radius2_: 4,
        angle_: 0.3,
        rotation_: 0.5,
        scale_: 1.2,
      },
      text_: {
        text_: "Label",
        font_: "14px Arial",
        fill_: { color_: "#fff" },
        stroke_: { color_: "#000", width_: 2 },
        offsetX_: 10,
        offsetY_: -10,
        rotation_: 0.25,
      },
    });

    expect(result).toEqual({
      image: {
        type: "regularShape",
        points: 5,
        radius: 10,
        radius2: 4,
        angle: 0.3,
        rotation: 0.5,
        scale: 1.2,
      },
      text: {
        text: "Label",
        font: "14px Arial",
        fill: { color: "#fff" },
        stroke: { color: "#000", width: 2 },
        offsetX: 10,
        offsetY: -10,
        rotation: 0.25,
      },
    });
  });

  it("defaults missing stroke colors and returns an empty object when nothing is set", () => {
    expect(transformOLStyle({ stroke_: { width_: 2 } })).toEqual({
      stroke: { color: [0, 0, 0, 1], width: 2 },
    });

    expect(transformOLStyle({})).toEqual({});
  });
});
