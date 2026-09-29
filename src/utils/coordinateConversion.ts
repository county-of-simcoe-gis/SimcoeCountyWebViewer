/**
 * Coordinate Conversion Utility
 *
 * Handles conversion between coordinate systems for URL parameters.
 * Default input system is EPSG:4326 (WGS84 Lat/Long).
 * Output is always EPSG:3857 (Web Mercator) for OpenLayers compatibility.
 */

import proj4 from "proj4";
import type { SpatialReferenceId, Coordinates, Extent } from "@/types/urlParameters";

// ============================================================================
// Projection Definitions
// ============================================================================

// Define projections (proj4 has 4326 and 3857 built-in)
// UTM Zone 17N NAD83
proj4.defs("EPSG:26917", "+proj=utm +zone=17 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");

/**
 * Map of spatial reference identifiers to EPSG codes
 */
const SR_TO_EPSG: Record<string, string> = {
  "4326": "EPSG:4326",
  latlong: "EPSG:4326",
  "lat/long": "EPSG:4326",
  wgs84: "EPSG:4326",
  "3857": "EPSG:3857",
  web: "EPSG:3857",
  webmercator: "EPSG:3857",
  "102100": "EPSG:3857", // Esri's wkid for Web Mercator (equivalent to EPSG:3857)
  utm: "EPSG:26917",
  "26917": "EPSG:26917",
};

/**
 * Target projection for map display (Web Mercator)
 */
const TARGET_EPSG = "EPSG:3857";

/**
 * Default source projection (WGS84 Lat/Long)
 */
const DEFAULT_SOURCE_EPSG = "EPSG:4326";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize spatial reference identifier to EPSG format
 * @param sr - Spatial reference identifier (e.g., '4326', 'WEB', 'UTM')
 * @returns EPSG code string (e.g., 'EPSG:4326')
 */
export function normalizeEpsg(sr?: string): string {
  if (!sr) return DEFAULT_SOURCE_EPSG;

  const normalized = sr.toLowerCase().replace(/[\s-]/g, "");
  return SR_TO_EPSG[normalized] || DEFAULT_SOURCE_EPSG;
}

/**
 * Get human-readable label for spatial reference
 * @param sr - Spatial reference identifier
 * @returns Human-readable label
 */
export function getSRLabel(sr?: string): string {
  const epsg = normalizeEpsg(sr);
  switch (epsg) {
    case "EPSG:4326":
      return "WGS84 (Lat/Long)";
    case "EPSG:3857":
      return "Web Mercator";
    case "EPSG:26917":
      return "UTM Zone 17N (NAD83)";
    default:
      return epsg;
  }
}

/**
 * Check if coordinates are valid numbers
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns true if both are valid finite numbers
 */
export function isValidCoordinate(x: number | undefined | null, y: number | undefined | null): boolean {
  return x !== undefined && x !== null && y !== undefined && y !== null && !isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y);
}

/**
 * Validate coordinates are within reasonable bounds for their coordinate system
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param sr - Spatial reference identifier
 * @returns true if coordinates are within valid bounds
 */
export function isWithinBounds(x: number, y: number, sr?: string): boolean {
  const epsg = normalizeEpsg(sr);

  switch (epsg) {
    case "EPSG:4326":
      // Lat/Long: -180 to 180 longitude, -90 to 90 latitude
      // Note: For 4326, x is longitude, y is latitude
      return x >= -180 && x <= 180 && y >= -90 && y <= 90;
    case "EPSG:3857":
      // Web Mercator: roughly -20M to 20M
      return Math.abs(x) < 20037508.34 && Math.abs(y) < 20037508.34;
    case "EPSG:26917":
      // UTM Zone 17N: reasonable bounds for Ontario area
      return x >= 100000 && x <= 900000 && y >= 0 && y <= 10000000;
    default:
      return true; // Unknown system, assume valid
  }
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert coordinates from source system to Web Mercator (EPSG:3857)
 *
 * @param x - X coordinate (longitude for 4326, easting for UTM/3857)
 * @param y - Y coordinate (latitude for 4326, northing for UTM/3857)
 * @param fromSR - Source spatial reference (default: '4326' Lat/Long)
 * @returns Tuple of [x, y] in Web Mercator
 * @throws Error if coordinates are invalid
 *
 * @example
 * // Convert lat/long to Web Mercator (default)
 * const [x, y] = convertCoordinates(-79.4163, 44.3894);
 *
 * @example
 * // Convert UTM to Web Mercator
 * const [x, y] = convertCoordinates(604000, 4912000, 'UTM');
 *
 * @example
 * // Already in Web Mercator (passthrough)
 * const [x, y] = convertCoordinates(-8840000, 5500000, 'WEB');
 */
export function convertCoordinates(x: number, y: number, fromSR?: SpatialReferenceId | string): [number, number] {
  // Validate input coordinates
  if (!isValidCoordinate(x, y)) {
    throw new Error(`Invalid coordinates: x=${x}, y=${y}`);
  }

  const sourceEpsg = normalizeEpsg(fromSR);

  // Validate bounds for known coordinate systems
  if (!isWithinBounds(x, y, fromSR)) {
    console.warn(`Coordinates (${x}, ${y}) may be outside valid bounds for ${getSRLabel(fromSR)}. ` + `Proceeding with conversion.`);
  }

  // If already in target projection, return as-is
  if (sourceEpsg === TARGET_EPSG) {
    return [x, y];
  }

  try {
    const result = proj4(sourceEpsg, TARGET_EPSG, [x, y]);
    return [result[0], result[1]];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown projection error";
    throw new Error(`Failed to convert coordinates from ${getSRLabel(fromSR)}: ${message}`);
  }
}

/**
 * Convert an extent/bounding box from source system to Web Mercator
 *
 * @param xmin - Minimum X coordinate
 * @param ymin - Minimum Y coordinate
 * @param xmax - Maximum X coordinate
 * @param ymax - Maximum Y coordinate
 * @param fromSR - Source spatial reference (default: '4326' Lat/Long)
 * @returns Tuple of [xmin, ymin, xmax, ymax] in Web Mercator
 * @throws Error if coordinates are invalid
 */
export function convertExtent(xmin: number, ymin: number, xmax: number, ymax: number, fromSR?: SpatialReferenceId | string): [number, number, number, number] {
  // Validate all coordinates
  if (!isValidCoordinate(xmin, ymin) || !isValidCoordinate(xmax, ymax)) {
    throw new Error(`Invalid extent coordinates: [${xmin}, ${ymin}, ${xmax}, ${ymax}]`);
  }

  // Convert min and max corners
  const [minX, minY] = convertCoordinates(xmin, ymin, fromSR);
  const [maxX, maxY] = convertCoordinates(xmax, ymax, fromSR);

  // Ensure proper ordering (min < max)
  return [Math.min(minX, maxX), Math.min(minY, maxY), Math.max(minX, maxX), Math.max(minY, maxY)];
}

/**
 * Convert coordinates object from source system to Web Mercator
 *
 * @param coords - Coordinates object with x, y, and optional sr
 * @returns Coordinates object in Web Mercator
 */
export function convertCoordinatesObject(coords: Coordinates): Coordinates {
  const [x, y] = convertCoordinates(coords.x, coords.y, coords.sr);
  return { x, y, sr: "3857" };
}

/**
 * Convert extent object from source system to Web Mercator
 *
 * @param extent - Extent object with xmin, ymin, xmax, ymax, and optional sr
 * @returns Extent object in Web Mercator
 */
export function convertExtentObject(extent: Extent): Extent {
  const [xmin, ymin, xmax, ymax] = convertExtent(extent.xmin, extent.ymin, extent.xmax, extent.ymax, extent.sr);
  return { xmin, ymin, xmax, ymax, sr: "3857" };
}

/**
 * Convert Web Mercator coordinates back to WGS84 (for display purposes)
 *
 * @param x - X coordinate in Web Mercator
 * @param y - Y coordinate in Web Mercator
 * @returns Tuple of [longitude, latitude] in WGS84
 */
export function webMercatorToLatLong(x: number, y: number): [number, number] {
  if (!isValidCoordinate(x, y)) {
    throw new Error(`Invalid Web Mercator coordinates: x=${x}, y=${y}`);
  }

  try {
    const result = proj4(TARGET_EPSG, "EPSG:4326", [x, y]);
    return [result[0], result[1]];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown projection error";
    throw new Error(`Failed to convert to Lat/Long: ${message}`);
  }
}

/**
 * Reproject a bounding-box extent (e.g. from an ArcGIS REST service) to Web Mercator.
 *
 * Unlike `convertExtent`, this never silently assumes WGS84 for an unrecognized spatial
 * reference - if `wkid` isn't a known/registered projection, `null` is returned so callers
 * can fall back to another strategy instead of fitting the map to bogus coordinates.
 *
 * @param extent - [xmin, ymin, xmax, ymax] in the source spatial reference
 * @param wkid - well-known ID of the source spatial reference (e.g. 26917, 4326, 3857, 102100).
 *   When omitted, the extent is assumed to already be in Web Mercator.
 * @returns [xmin, ymin, xmax, ymax] in EPSG:3857, or null if the projection is unknown/unsupported
 *   or the conversion failed
 */
export function reprojectExtentToWebMercator(extent: number[] | undefined | null, wkid?: number | string): number[] | null {
  if (!Array.isArray(extent) || extent.length !== 4 || !extent.every((coord) => typeof coord === "number" && isFinite(coord))) {
    return null;
  }

  if (wkid === undefined || wkid === null || wkid === "") {
    return extent;
  }

  const key = String(wkid).toLowerCase().replace(/[\s-]/g, "");
  const epsg = SR_TO_EPSG[key];

  if (!epsg) {
    console.warn(`reprojectExtentToWebMercator: unsupported spatial reference wkid=${wkid}`);
    return null;
  }

  if (epsg === TARGET_EPSG) {
    return extent;
  }

  const [xmin, ymin, xmax, ymax] = extent;

  try {
    // Pass the raw key (e.g. "26917"), not the resolved "EPSG:xxxx" string -
    // convertExtent/normalizeEpsg expect the former and would silently fall back
    // to WGS84 if given an "EPSG:" prefixed string it doesn't recognize.
    return convertExtent(xmin, ymin, xmax, ymax, key);
  } catch (error) {
    console.warn("reprojectExtentToWebMercator: failed to convert extent", error);
    return null;
  }
}

/**
 * Parse coordinate string to number, handling common formats
 *
 * @param value - Coordinate value as string
 * @returns Parsed number or NaN if invalid
 */
export function parseCoordinate(value: string | undefined | null): number {
  if (value === undefined || value === null || value === "") {
    return NaN;
  }

  // Remove whitespace and handle comma as decimal separator
  const cleaned = value.trim().replace(",", ".");
  return parseFloat(cleaned);
}
