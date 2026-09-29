/**
 * Tests for MyMaps save format serialization.
 *
 * These tests guarantee that JSON saved by this app can be
 * imported by the SimcoeCountyWebViewer and vice-versa. Any change
 * that breaks these tests is a critical regression because the shared
 * format is used by all existing saved MyMaps records.
 */

import { describe, it, expect } from "vitest";
import { Style, Fill, Stroke, Circle as CircleStyle, RegularShape } from "ol/style";
import { buildSavePayload, serializeFeatureGeoJSON, serializeStyle } from "@/utils/myMapsFormat";
import type { MyMapsItem, StyleJSON } from "@/stores/myMapsStore";

const baseLabelStyle = {
  textColor: "#ffffff",
  textSize: "14px",
  outlineColor: "#000000",
  outlineWidth: 2,
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  borderColor: "#333333",
  lineColor: "#333333",
  anchorColor: "#333333",
};

describe("serializeStyle", () => {
  it("converts an OL Style with stroke into the legacy `_`-suffixed shape", () => {
    const style = new Style({
      stroke: new Stroke({ color: [115, 216, 255, 0.45], width: 8 }),
    });

    const result = serializeStyle(style) as Record<string, unknown>;

    expect(result).toMatchObject({
      geometry_: null,
      fill_: null,
      image_: null,
      text_: null,
      stroke_: {
        color_: [115, 216, 255, 0.45],
        width_: 8,
      },
    });
  });

  it("converts an OL Style with fill+stroke (polygon style) to legacy shape", () => {
    const style = new Style({
      fill: new Fill({ color: [251, 158, 0, 0.4] }),
      stroke: new Stroke({ color: [25, 77, 51, 0.3], width: 6 }),
    });

    const result = serializeStyle(style) as Record<string, unknown>;

    expect(result).toMatchObject({
      fill_: { color_: [251, 158, 0, 0.4] },
      stroke_: { color_: [25, 77, 51, 0.3], width_: 6 },
      image_: null,
    });
  });

  it("converts an OL Style with CircleStyle image to legacy shape", () => {
    const style = new Style({
      image: new CircleStyle({
        radius: 28,
        fill: new Fill({ color: [219, 223, 0, 0.15] }),
        stroke: new Stroke({ color: [179, 179, 179, 0.4], width: 5 }),
      }),
    });

    const result = serializeStyle(style) as { image_: Record<string, unknown> };

    expect(result.image_).toBeDefined();
    expect(result.image_).toMatchObject({
      radius_: 28,
      fill_: { color_: [219, 223, 0, 0.15] },
      stroke_: { color_: [179, 179, 179, 0.4], width_: 5 },
    });
  });

  it("converts an OL Style with RegularShape (square) image to legacy shape", () => {
    const style = new Style({
      image: new RegularShape({
        points: 4,
        radius: 10,
        angle: Math.PI / 4,
        fill: new Fill({ color: [255, 0, 0, 1] }),
        stroke: new Stroke({ color: [0, 0, 0, 1], width: 1 }),
      }),
    });

    const result = serializeStyle(style) as { image_: Record<string, unknown> };

    expect(result.image_).toMatchObject({
      points_: 4,
      radius_: 10,
    });
  });

  it("converts a clean StyleJSON (post-saveToStorage) to legacy `_` shape", () => {
    const styleJson: StyleJSON = {
      stroke: { color: [196, 81, 0, 0.45], width: 5.5 },
    };

    const result = serializeStyle(styleJson) as Record<string, unknown>;

    expect(result.stroke_).toMatchObject({ color_: [196, 81, 0, 0.45], width_: 5.5 });
    expect(result.fill_).toBeNull();
    expect(result.image_).toBeNull();
  });

  it("converts a clean StyleJSON with circle image to legacy `_` shape", () => {
    const styleJson: StyleJSON = {
      image: {
        type: "circle",
        radius: 36,
        fill: { color: [102, 102, 102, 0.3] },
        stroke: { color: [104, 188, 0, 0.4], width: 5.5 },
      },
    };

    const result = serializeStyle(styleJson) as { image_: Record<string, unknown> };

    expect(result.image_).toMatchObject({
      radius_: 36,
      fill_: { color_: [102, 102, 102, 0.3] },
      stroke_: { color_: [104, 188, 0, 0.4], width_: 5.5 },
    });
  });

  it("passes through a value already in legacy `_` shape", () => {
    const legacyShape = {
      fill_: { color_: [0, 0, 0, 1] },
      stroke_: { color_: [0, 0, 0, 1], width_: 2, lineDash_: null },
    };

    expect(serializeStyle(legacyShape)).toBe(legacyShape);
  });

  it("returns null for null/undefined", () => {
    expect(serializeStyle(null)).toBeNull();
    expect(serializeStyle(undefined)).toBeNull();
  });
});

describe("serializeFeatureGeoJSON", () => {
  it("rewrites the properties block to the legacy schema", () => {
    const input = JSON.stringify({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
      properties: { id: "stale", drawType: "LineString", originalDrawType: "LineString" },
    });

    const out = serializeFeatureGeoJSON(input, {
      id: "uuid-1",
      label: "Drawing 3",
      labelVisible: false,
      drawType: "LineString",
      isParcel: false,
    });

    const parsed = JSON.parse(out);
    expect(parsed.properties).toEqual({
      id: "uuid-1",
      label: "Drawing 3",
      labelVisible: false,
      drawType: "LineString",
      isParcel: false,
    });
    expect(parsed.id).toBeUndefined();
  });

  it("preserves parcel attributes while adding legacy keys and removing top-level id", () => {
    const input = JSON.stringify({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[0, 0]]] },
      properties: {
        "Assessment Roll Number": "435304000626200",
        Label: "006-26200",
        arn: "435304000626200",
      },
      id: "Assessment Parcel.fid--abc",
    });

    const out = serializeFeatureGeoJSON(input, {
      id: "uuid-parcel",
      label: "77 KING ROAD",
      labelVisible: false,
      drawType: "Cancel",
      isParcel: false,
    });

    const parsed = JSON.parse(out);
    expect(parsed.id).toBeUndefined();
    expect(parsed.properties).toMatchObject({
      "Assessment Roll Number": "435304000626200",
      Label: "006-26200",
      arn: "435304000626200",
      id: "uuid-parcel",
      label: "77 KING ROAD",
      labelVisible: false,
      drawType: "Cancel",
      isParcel: false,
    });
  });

  it("strips originalDrawType (new-app-only field)", () => {
    const input = JSON.stringify({
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: { id: "x", drawType: "Point", originalDrawType: "Point" },
    });

    const out = serializeFeatureGeoJSON(input, {
      id: "uuid-2",
      label: "Drawing 2",
      labelVisible: false,
      drawType: "Point",
    });

    const parsed = JSON.parse(out);
    expect(parsed.properties.originalDrawType).toBeUndefined();
  });
});

describe("buildSavePayload", () => {
  function makeItem(overrides: Partial<MyMapsItem> = {}): MyMapsItem {
    return {
      id: "uuid-1",
      label: "Drawing 1",
      labelVisible: false,
      labelRotation: 0,
      labelStyle: baseLabelStyle,
      featureGeoJSON: JSON.stringify({
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: { id: "uuid-1", drawType: "Point", originalDrawType: "Point" },
      }),
      style: new Style({
        stroke: new Stroke({ color: [196, 81, 0, 0.45], width: 5.5 }),
      }),
      visible: true,
      drawType: "Point",
      geometryType: "Point",
      ...overrides,
    };
  }

  it("emits the full top-level legacy schema (drawStyle, tooltipClass alias, etc.)", () => {
    const drawStyle = new Style({
      fill: new Fill({ color: [232, 9, 229, 0.4] }),
      stroke: new Stroke({ color: [232, 9, 229, 0.8], width: 3 }),
    });

    const payload = buildSavePayload({
      items: [makeItem()],
      drawType: "Cancel",
      drawColor: "#e809e5",
      drawOpacity: 0.8,
      drawStyle,
      toolTipClass: "sc-hidden",
      toolTipId: "tooltip-uuid",
    });

    expect(Object.keys(payload).sort()).toEqual(["drawColor", "drawOpacity", "drawStyle", "drawType", "items", "toolTipClass", "toolTipId", "tooltipClass"].sort());
    expect(payload.drawType).toBe("Cancel");
    expect(payload.drawColor).toBe("#e809e5");
    expect(payload.drawOpacity).toBe(0.8);
    expect(payload.toolTipClass).toBe("sc-hidden");
    expect(payload.tooltipClass).toBe("sc-hidden");
    expect(payload.toolTipId).toBe("tooltip-uuid");
    expect((payload.drawStyle as Record<string, unknown>).fill_).toBeDefined();
    expect((payload.drawStyle as Record<string, unknown>).stroke_).toBeDefined();
  });

  it("each item carries the exact legacy field set, in the legacy style shape", () => {
    const payload = buildSavePayload({
      items: [makeItem()],
      drawType: "Cancel",
      drawColor: "#e809e5",
      drawOpacity: 0.8,
      drawStyle: null,
      toolTipClass: "sc-hidden",
      toolTipId: "tip",
    });

    const items = payload.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    const item = items[0];

    expect(Object.keys(item).sort()).toEqual(["drawType", "featureGeoJSON", "geometryType", "id", "isParcel", "label", "labelRotation", "labelStyle", "labelVisible", "style", "visible"].sort());

    // The `style` field must be in legacy `_` shape
    const style = item.style as Record<string, unknown>;
    expect(style.stroke_).toMatchObject({ color_: [196, 81, 0, 0.45], width_: 5.5 });
    expect(style.fill_).toBeNull();

    // featureGeoJSON.properties must follow the legacy schema
    const geo = JSON.parse(item.featureGeoJSON as string);
    expect(geo.properties).toEqual({
      id: "uuid-1",
      label: "Drawing 1",
      labelVisible: false,
      drawType: "Point",
      isParcel: false,
    });
    expect(geo.properties.originalDrawType).toBeUndefined();

    // No new-app-only fields leak into the saved item
    expect(item.pointType).toBeUndefined();
    expect(item.strokeType).toBeUndefined();
    expect(item.fillAlpha).toBeUndefined();
    expect(item.strokeAlpha).toBeUndefined();
    expect(item.hasChanged).toBeUndefined();
    expect(item.originalDrawType).toBeUndefined();
  });

  it("preserves pointType / strokeType so legacy app reconstructs the right shape (cross, star, etc.)", () => {
    // The legacy `getStyleFromJSON(item.style, item.pointType)` branches on
    // `item.pointType` to decide between Circle / RegularShape (square,
    // triangle, star, cross, x). Without these top-level item fields, a CROSS
    // saved by the new app gets read back as a CIRCLE.
    const crossItem = makeItem({ pointType: "cross", strokeType: "dash" });

    const payload = buildSavePayload({
      items: [crossItem],
      drawType: "Cancel",
      drawColor: "#e809e5",
      drawOpacity: 0.8,
      drawStyle: null,
      toolTipClass: "sc-hidden",
      toolTipId: "tip",
    });

    const item = (payload.items as Array<Record<string, unknown>>)[0];
    expect(item.pointType).toBe("cross");
    expect(item.strokeType).toBe("dash");
  });

  it("converts items whose style was already converted to clean StyleJSON", () => {
    const cleanStyleItem = makeItem({
      style: { stroke: { color: [196, 81, 0, 0.45], width: 5.5 } } as StyleJSON,
    });

    const payload = buildSavePayload({
      items: [cleanStyleItem],
      drawType: "Cancel",
      drawColor: "#3174ba",
      drawOpacity: 0.8,
      drawStyle: null,
      toolTipClass: "sc-hidden",
      toolTipId: "tip",
    });

    const item = (payload.items as Array<Record<string, unknown>>)[0];
    const style = item.style as Record<string, unknown>;
    expect(style.stroke_).toMatchObject({ color_: [196, 81, 0, 0.45], width_: 5.5 });
  });

  it("emits null drawStyle when state has no drawStyle (matches legacy null handling)", () => {
    const payload = buildSavePayload({
      items: [],
      drawType: "Cancel",
      drawColor: "#3174ba",
      drawOpacity: 0.8,
      drawStyle: null,
      toolTipClass: "sc-hidden",
      toolTipId: "tip",
    });
    expect(payload.drawStyle).toBeNull();
  });
});
