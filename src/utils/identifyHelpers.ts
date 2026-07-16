import Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import moment from "moment";

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

/** Field labels that should never be reformatted as dates (false-positive guards) */
const DATE_LABEL_EXCLUSIONS = ["NUMBER", "BYLAW", "WASTE COLLECTION DAY"];

/**
 * Detect a strict ISO 8601 date/time string and format it for display (local time).
 * Includes the time-of-day when the source value contains one, otherwise date-only.
 * Returns null when the value isn't a date-like string, or the label matches an
 * exclusion guard (e.g. "Bylaw Number"), so callers can leave the raw value untouched.
 */
export function formatIdentifyDateValue(label: string, value: string): string | null {
  if (!value || value.length < 8) return null;
  if (DATE_LABEL_EXCLUSIONS.some((word) => label.toUpperCase().includes(word))) return null;
  if (!moment(value, [moment.ISO_8601, "YYYY-MM-DDZ"], true).isValid()) return null;

  const hasSeconds = /\d{2}:\d{2}:\d{2}/.test(value);
  const hasTime = hasSeconds || /\d{2}:\d{2}/.test(value);
  if (!hasTime) return moment(value).format("YYYY-MM-DD");
  return moment(value).format(hasSeconds ? "YYYY-MM-DD HH:mm:ss" : "YYYY-MM-DD HH:mm");
}
