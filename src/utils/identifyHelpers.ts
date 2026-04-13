import Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";

/** Regex patterns for keys to exclude from identify popups and CSV export */
export const IDENTIFY_FILTER_KEY_PATTERNS = [
  /^_.*$/,
  /^id$/,
  /^geometry$/,
  /^geom$/,
  /^extent_geom$/,
  /^.*gid.*$/,
  /^globalid$/,
  /^objectid.*$/,
  /^shape.*$/,
  /^displayfieldname$/,
  /^displayfieldvalue$/,
  /^layerdisplayname$/,
  /^geostasis\..*$/,
  /^.*fid.*$/,
  /^boundedby$/,
  /^feature id$/,
];

/** Check whether a property key should be excluded from display */
export function isExcludedKey(key: string): boolean {
  const lower = key.toLowerCase();
  return IDENTIFY_FILTER_KEY_PATTERNS.some((pattern) => pattern.test(lower));
}

/** Filter an OL Feature's property keys, removing internal/system fields and object values */
export function filterFeatureKeys(feature: Feature<Geometry>): string[] {
  const props = feature.getProperties();
  return Object.keys(props).filter((key) => {
    const val = props[key];
    if (val !== null && typeof val === "object") return false;
    return !isExcludedKey(key);
  });
}

/** Filter a plain properties object's keys, removing internal/system fields */
export function filterPropertyKeys(properties: Record<string, unknown>): string[] {
  return Object.keys(properties).filter((key) => !isExcludedKey(key));
}
