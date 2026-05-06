/**
 * Legacy MyMaps save format compatibility layer.
 *
 * The legacy SimcoeCountyWebViewer persists MyMaps drawings as a JSON dump of
 * its in-memory React state, where every OpenLayers `Style` object is
 * `JSON.stringify`-ed directly. That produces objects with the OL internal
 * `_`-suffixed property names (e.g. `fill_`, `stroke_`, `image_`, `points_`).
 *
 * Thousands of MyMaps records exist in the production database in that format.
 * To keep the legacy and Next.js viewers fully cross-compatible we MUST emit
 * exactly that shape on save. This module is the single boundary that
 * converts the new app's clean internal representation into the legacy
 * server payload — no other "translators" should run on the save path.
 *
 * Reference structure (from a legacy save):
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
import { styleFromJSON } from "@/utils/myMapsHelpers";
import type { MyMapsItem, StyleJSON } from "@/stores/myMapsStore";

// ─── Style conversion ───────────────────────────────────────────────────────

/**
 * Detect a style already serialized in the legacy `_`-suffixed form.
 */
function isLegacyStyleShape(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const keys = Object.keys(value as Record<string, unknown>);
  return keys.some((k) => k.endsWith("_"));
}

/**
 * Walk a JSON-stringified OL Style tree and rename property names that have
 * drifted between OL versions back to the legacy `_`-suffixed names that
 * `getStyleFromJSON()` in the legacy SimcoeCountyWebViewer reads.
 *
 * Currently the only known drift is `radius` (CircleStyle / RegularShape) —
 * older OL stored it as `radius_`. If OL renames more fields in the future,
 * extend the map below.
 */
const LEGACY_KEY_RENAMES: Record<string, string> = {
  radius: "radius_",
};

function normalizeToLegacyKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeToLegacyKeys);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const renamed = LEGACY_KEY_RENAMES[k] ?? k;
      out[renamed] = normalizeToLegacyKeys(v);
    }
    return out;
  }
  return value;
}

/**
 * Serialize a style into the legacy OL-internal JSON shape.
 *
 * - `Style` instance        → `JSON.parse(JSON.stringify(style))` then key-rename
 * - clean `StyleJSON`       → reconstruct an OL `Style`, then stringify+rename
 * - already-legacy object   → returned as-is
 * - null/undefined          → null
 */
export function styleToLegacyJSON(
  style: Style | StyleJSON | Record<string, unknown> | null | undefined
): unknown {
  if (style === null || style === undefined) return null;

  if (style instanceof Style) {
    return normalizeToLegacyKeys(JSON.parse(JSON.stringify(style)));
  }

  if (isLegacyStyleShape(style)) {
    return style;
  }

  // Clean StyleJSON → OL Style → stringify → rename
  const olStyle = styleFromJSON(style as StyleJSON);
  return normalizeToLegacyKeys(JSON.parse(JSON.stringify(olStyle)));
}

// ─── Feature GeoJSON property normalization ────────────────────────────────

interface LegacyFeatureItemFields {
  id: string;
  label: string;
  labelVisible: boolean;
  drawType: string;
  isParcel?: boolean;
}

/**
 * Rewrite a feature's GeoJSON `properties` block to the legacy schema.
 * Legacy required keys: `id, label, labelVisible, drawType, isParcel`.
 * Any other parcel/source attributes (e.g. `Assessment Roll Number`) are kept
 * so they remain available, but we strip the new-app-only `originalDrawType`.
 * The legacy app expects `id` inside `properties` (not at the Feature root),
 * so any top-level Feature `id` is removed.
 */
export function featureGeoJSONToLegacy(
  featureGeoJSON: string,
  item: LegacyFeatureItemFields
): string {
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

export interface LegacyPayloadInput {
  items: MyMapsItem[];
  drawType: string;
  drawColor: string;
  drawOpacity: number;
  drawStyle: Style | StyleJSON | null;
  toolTipClass: string;
  toolTipId: string;
}

/**
 * Build a save payload that is byte-compatible with the legacy MyMaps schema.
 * Returns a plain object ready to be sent to `POST /api/mymaps`. The shape
 * matches what the legacy `SimcoeCountyWebViewer` ships to
 * `POST /api_v2/public/map/mymaps`.
 */
export function buildLegacySavePayload(input: LegacyPayloadInput): Record<string, unknown> {
  const items = input.items.map((item) => {
    const legacyItem: Record<string, unknown> = {
      id: item.id,
      label: item.label,
      labelVisible: item.labelVisible,
      labelStyle: item.labelStyle ?? null,
      labelRotation: item.labelRotation,
      featureGeoJSON: featureGeoJSONToLegacy(item.featureGeoJSON, {
        id: item.id,
        label: item.label,
        labelVisible: item.labelVisible,
        drawType: item.drawType,
        isParcel: item.isParcel,
      }),
      style: styleToLegacyJSON(item.style as Style | StyleJSON | null | undefined),
      visible: item.visible,
      drawType: item.drawType,
      geometryType: item.geometryType,
      isParcel: item.isParcel ?? false,
    };

    // The legacy SimcoeCountyWebViewer reads `item.pointType` / `item.strokeType`
    // (top-level item fields) when reconstructing a feature's style. Without
    // these, a saved CROSS / STAR / SQUARE / TRIANGLE / X point shape is read
    // back as a plain CIRCLE. They must be persisted on the item itself —
    // not on the style — so the legacy `getStyleFromJSON(item.style, item.pointType)`
    // call branches correctly.
    if (item.pointType !== undefined) legacyItem.pointType = item.pointType;
    if (item.strokeType !== undefined) legacyItem.strokeType = item.strokeType;

    return legacyItem;
  });

  return {
    drawType: input.drawType,
    drawColor: input.drawColor,
    drawOpacity: input.drawOpacity,
    drawStyle: styleToLegacyJSON(input.drawStyle),
    items,
    toolTipClass: input.toolTipClass,
    toolTipId: input.toolTipId,
    // Legacy app emits both keys for historical reasons; preserve the duplicate.
    tooltipClass: input.toolTipClass,
  };
}
