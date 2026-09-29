/**
 * MyMaps save format serialization.
 *
 * MyMaps drawings are persisted as a JSON dump where every OpenLayers `Style`
 * object is serialized with OL's internal `_`-suffixed property names (e.g.
 * `fill_`, `stroke_`, `image_`, `points_`). This is the standard cross-app
 * save format shared with the original SimcoeCountyWebViewer.
 *
 * This module is the single boundary that converts the app's clean internal
 * representation into the server payload — no other serializers should run on
 * the save path.
 *
 * Reference structure:
 * {
 *   "drawType": "Cancel",
 *   "drawColor": "#e809e5",
 *   "drawOpacity": 0.8,
 *   "drawStyle": { "geometry_": null, "fill_": {...}, "image_": {...}, ... },
 *   "items": [
 *     {
 *       "id": "<uuid>",
 *       "label": "Drawing 1",
 *       "labelVisible": false,
 *       "labelStyle": { ... },
 *       "labelRotation": 0,
 *       "featureGeoJSON": "{...properties:{id,label,labelVisible,drawType,isParcel}...}",
 *       "style": { "fill_": {...}, "stroke_": {...}, ... },
 *       "visible": true,
 *       "drawType": "LineString",
 *       "geometryType": "LineString"
 *     }
 *   ],
 *   "toolTipClass": "sc-hidden",
 *   "toolTipId": "<uuid>",
 *   "tooltipClass": "sc-hidden"
 * }
 */

import { Style } from "ol/style";
import type { MyMapsItem, StyleJSON } from "@/stores/myMapsStore";

// ─── Style conversion ───────────────────────────────────────────────────────

/**
 * Detect a style already serialized in the OL-internal `_`-suffixed form.
 */
function isOLSerializedStyle(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const keys = Object.keys(value as Record<string, unknown>);
  return keys.some((k) => k.endsWith("_"));
}

/**
 * Walk a JSON-stringified OL Style tree and rename property names that have
 * drifted between OL versions back to the `_`-suffixed names that
 * `getStyleFromJSON()` in the SimcoeCountyWebViewer reads.
 *
 * Currently the only known drift is `radius` (CircleStyle / RegularShape) —
 * older OL stored it as `radius_`. If OL renames more fields in the future,
 * extend the map below.
 */
const OL_KEY_RENAMES: Record<string, string> = {
  radius: "radius_",
};

function normalizeToOLSerializedKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeToOLSerializedKeys);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const renamed = OL_KEY_RENAMES[k] ?? k;
      out[renamed] = normalizeToOLSerializedKeys(v);
    }
    return out;
  }
  return value;
}

function serializeStyleJSON(styleJson: StyleJSON): Record<string, unknown> {
  const result: Record<string, unknown> = {
    geometry_: null,
    fill_: null,
    stroke_: null,
    image_: null,
    text_: null,
  };

  if (styleJson.fill) {
    result.fill_ = { color_: styleJson.fill.color };
  }

  if (styleJson.stroke) {
    result.stroke_ = {
      color_: styleJson.stroke.color,
      ...(styleJson.stroke.width !== undefined && { width_: styleJson.stroke.width }),
      ...(styleJson.stroke.lineDash !== undefined && { lineDash_: styleJson.stroke.lineDash }),
    };
  }

  if (styleJson.image) {
    const imageResult: Record<string, unknown> = {
      ...(styleJson.image.type !== undefined && { type_: styleJson.image.type }),
      ...(styleJson.image.radius !== undefined && { radius_: styleJson.image.radius }),
      ...(styleJson.image.points !== undefined && { points_: styleJson.image.points }),
      ...(styleJson.image.radius2 !== undefined && { radius2_: styleJson.image.radius2 }),
      ...(styleJson.image.angle !== undefined && { angle_: styleJson.image.angle }),
      ...(styleJson.image.rotation !== undefined && { rotation_: styleJson.image.rotation }),
      ...(styleJson.image.src !== undefined && { src_: styleJson.image.src }),
      ...(styleJson.image.scale !== undefined && { scale_: styleJson.image.scale }),
    };

    if (styleJson.image.fill) {
      imageResult.fill_ = { color_: styleJson.image.fill.color };
    }

    if (styleJson.image.stroke) {
      imageResult.stroke_ = {
        color_: styleJson.image.stroke.color,
        ...(styleJson.image.stroke.width !== undefined && { width_: styleJson.image.stroke.width }),
        ...(styleJson.image.stroke.lineDash !== undefined && { lineDash_: styleJson.image.stroke.lineDash }),
      };
    }

    result.image_ = imageResult;
  }

  if (styleJson.text) {
    const textResult: Record<string, unknown> = {
      ...(styleJson.text.text !== undefined && { text_: styleJson.text.text }),
      ...(styleJson.text.font !== undefined && { font_: styleJson.text.font }),
      ...(styleJson.text.offsetX !== undefined && { offsetX_: styleJson.text.offsetX }),
      ...(styleJson.text.offsetY !== undefined && { offsetY_: styleJson.text.offsetY }),
      ...(styleJson.text.rotation !== undefined && { rotation_: styleJson.text.rotation }),
    };

    if (styleJson.text.fill) {
      textResult.fill_ = { color_: styleJson.text.fill.color };
    }

    if (styleJson.text.stroke) {
      textResult.stroke_ = {
        color_: styleJson.text.stroke.color,
        ...(styleJson.text.stroke.width !== undefined && { width_: styleJson.text.stroke.width }),
      };
    }

    result.text_ = textResult;
  }

  return result;
}

/**
 * Serialize a style into the OL-internal JSON shape used for persistence.
 *
 * - `Style` instance       → `JSON.parse(JSON.stringify(style))` then key-rename
 * - clean `StyleJSON`      → direct mapping to underscore-suffixed fields
 * - already-serialized obj → returned as-is
 * - null/undefined         → null
 */
export function serializeStyle(style: Style | StyleJSON | Record<string, unknown> | null | undefined): unknown {
  if (style === null || style === undefined) return null;

  if (style instanceof Style) {
    return normalizeToOLSerializedKeys(JSON.parse(JSON.stringify(style)));
  }

  if (isOLSerializedStyle(style)) {
    return style;
  }

  // Clean StyleJSON → serialized shape directly
  return serializeStyleJSON(style as StyleJSON);
}

// ─── Feature GeoJSON property normalization ────────────────────────────────

interface FeatureItemFields {
  id: string;
  label: string;
  labelVisible: boolean;
  drawType: string;
  isParcel?: boolean;
}

/**
 * Rewrite a feature's GeoJSON `properties` block to the standard schema.
 * Required keys: `id, label, labelVisible, drawType, isParcel`.
 * Any other parcel/source attributes (e.g. `Assessment Roll Number`) are kept
 * so they remain available, but we strip the new-app-only `originalDrawType`.
 * The viewer expects `id` inside `properties` (not at the Feature root),
 * so any top-level Feature `id` is removed.
 */
export function serializeFeatureGeoJSON(featureGeoJSON: string, item: FeatureItemFields): string {
  if (!featureGeoJSON) return featureGeoJSON;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(featureGeoJSON) as Record<string, unknown>;
  } catch {
    return featureGeoJSON;
  }

  const existing = (parsed.properties as Record<string, unknown> | undefined) ?? {};
  delete existing.originalDrawType;

  parsed.properties = {
    ...existing,
    id: item.id,
    label: item.label,
    labelVisible: item.labelVisible,
    drawType: item.drawType,
    isParcel: item.isParcel ?? false,
  };

  if ("id" in parsed) delete parsed.id;

  return JSON.stringify(parsed);
}

// ─── Top-level payload builder ──────────────────────────────────────────────

export interface SavePayloadInput {
  items: MyMapsItem[];
  drawType: string;
  drawColor: string;
  drawOpacity: number;
  drawStyle: Style | StyleJSON | null;
  toolTipClass: string;
  toolTipId: string;
}

/**
 * Build the standard MyMaps save payload.
 * Returns a plain object ready to be sent to `POST /api/mymaps` and
 * cross-compatible with the SimcoeCountyWebViewer save format.
 */
export function buildSavePayload(input: SavePayloadInput): Record<string, unknown> {
  const items = input.items.map((item) => {
    const serializedItem: Record<string, unknown> = {
      id: item.id,
      label: item.label,
      labelVisible: item.labelVisible,
      labelStyle: item.labelStyle ?? null,
      labelRotation: item.labelRotation,
      featureGeoJSON: serializeFeatureGeoJSON(item.featureGeoJSON, {
        id: item.id,
        label: item.label,
        labelVisible: item.labelVisible,
        drawType: item.drawType,
        isParcel: item.isParcel,
      }),
      style: serializeStyle(item.style as Style | StyleJSON | null | undefined),
      visible: item.visible,
      drawType: item.drawType,
      geometryType: item.geometryType,
      isParcel: item.isParcel ?? false,
    };

    // `pointType` / `strokeType` must be persisted on the item itself so that
    // `getStyleFromJSON(item.style, item.pointType)` can reconstruct CROSS /
    // STAR / SQUARE / TRIANGLE / X shapes correctly on import.
    if (item.pointType !== undefined) serializedItem.pointType = item.pointType;
    if (item.strokeType !== undefined) serializedItem.strokeType = item.strokeType;

    return serializedItem;
  });

  return {
    drawType: input.drawType,
    drawColor: input.drawColor,
    drawOpacity: input.drawOpacity,
    drawStyle: serializeStyle(input.drawStyle),
    items,
    toolTipClass: input.toolTipClass,
    toolTipId: input.toolTipId,
    // Both keys are emitted for cross-app compatibility.
    tooltipClass: input.toolTipClass,
  };
}
