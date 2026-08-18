/**
 * Print Utility Functions
 * Ported from SimcoeCountyWebViewer printRequest/utils.js
 */

import type { PrintSize } from "./printConfig";

/**
 * Convert RGB values to hexadecimal color string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @param a - Alpha value (optional, 0-1)
 * @returns Hex color string (e.g., "#ff0000")
 */
export function rgbToHex(r: number, g: number, b: number, _a?: number): string {
  let rHex = r.toString(16);
  let gHex = g.toString(16);
  let bHex = b.toString(16);

  if (rHex.length === 1) rHex = "0" + rHex;
  if (gHex.length === 1) gHex = "0" + gHex;
  if (bHex.length === 1) bHex = "0" + bHex;

  return "#" + rHex + gHex + bHex;
}

/**
 * Generate a color from a string (deterministic hash)
 * @param str - Input string
 * @returns Hex color string
 */
export function stringToColour(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let colour = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += ("00" + value.toString(16)).substr(-2);
  }
  return colour;
}

interface XmlJsonNode {
  "@attributes"?: Record<string, string>;
  "#text"?: string;
  [key: string]: XmlJsonNode | XmlJsonNode[] | Record<string, string> | string | undefined;
}

/**
 * Convert XML document to JSON object
 * @param xml - XML DOM node
 * @returns JSON representation of XML
 */
export function xmlToJson(xml: Node): XmlJsonNode | string {
  const obj: XmlJsonNode = {};

  if (xml.nodeType === 1) {
    // Element node
    const element = xml as Element;
    if (element.attributes.length > 0) {
      obj["@attributes"] = {};
      for (let j = 0; j < element.attributes.length; j++) {
        const attribute = element.attributes.item(j);
        if (attribute) {
          obj["@attributes"][attribute.nodeName] = attribute.nodeValue || "";
        }
      }
    }
  } else if (xml.nodeType === 3) {
    // Text node
    return xml.nodeValue || "";
  }

  // Process children
  if (xml.hasChildNodes()) {
    for (let i = 0; i < xml.childNodes.length; i++) {
      const item = xml.childNodes.item(i);
      if (!item) continue;
      
      const nodeName = item.nodeName;
      const nodeValue = xmlToJson(item);
      
      if (typeof obj[nodeName] === "undefined") {
        obj[nodeName] = nodeValue as XmlJsonNode;
      } else {
        const existing = obj[nodeName];
        if (!Array.isArray(existing)) {
          obj[nodeName] = [existing as XmlJsonNode];
        }
        (obj[nodeName] as XmlJsonNode[]).push(nodeValue as XmlJsonNode);
      }
    }
  }
  return obj;
}

/**
 * Remove null and undefined values from object
 * @param obj - Input object
 * @returns Object with null/undefined values removed
 */
export function removeNull<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  const propNames = Object.getOwnPropertyNames(obj) as (keyof T)[];
  
  for (const propName of propNames) {
    if (obj[propName] !== null && obj[propName] !== undefined) {
      result[propName] = obj[propName];
    }
  }
  return result;
}

/**
 * Extract service name from ArcGIS service URL
 * @param url - Service URL
 * @returns Service name
 */
export function extractServiceName(url: string): string {
  let serviceName = "";
  try {
    const serviceUrl = url.split("/services/")[1].split("/");
    const filtered = serviceUrl.filter(
      (e) => e !== "MapServer" && e !== "Public"
    );
    if (filtered.length === 1) {
      serviceName = `${filtered[0]}`;
    }
    if (filtered.length > 1) {
      serviceName = `${filtered[0]}_${filtered[1]}`;
    }
  } catch {
    serviceName = "OSM";
  }
  return serviceName;
}

export interface ComputedDimensions {
  newWidth: number;
  newHeight: number;
  x?: number;
  y?: number;
}

/**
 * Compute dimensions for print based on extent
 * @param templateWidth - Template width in pixels
 * @param templateHeight - Template height in pixels
 * @param extent - Map extent [xmin, ymin, xmax, ymax]
 * @returns Computed dimensions
 */
export function computeDimension(
  templateWidth: number,
  templateHeight: number,
  extent: number[]
): ComputedDimensions {
  const dimensions: ComputedDimensions = {
    newWidth: templateWidth,
    newHeight: templateHeight,
  };

  const xMin = extent[0];
  const xMax = extent[2];
  const yMin = extent[1];
  const yMax = extent[3];
  const extentWidth = Math.abs(Math.abs(xMin) - Math.abs(xMax));
  const extentHeight = Math.abs(Math.abs(yMin) - Math.abs(yMax));

  if (extentHeight > extentWidth || extentHeight === extentWidth) {
    dimensions.newWidth = (extentWidth / extentHeight) * templateHeight;
    dimensions.newHeight = templateHeight;
    dimensions.x = Math.abs(extentWidth - dimensions.newWidth) / 2;
  } else if (extentHeight < extentWidth) {
    dimensions.newWidth = templateWidth;
    dimensions.newHeight = (extentHeight / extentWidth) * templateWidth;
    dimensions.y = Math.abs(extentHeight - dimensions.newHeight) / 2;
  }

  return dimensions;
}

/**
 * Compute map extent from print parameters
 * @param height - Image height in pixels
 * @param width - Image width in pixels
 * @param dpi - DPI (dots per inch)
 * @param scale - Map scale
 * @param center - Map center [x, y]
 * @returns Extent [xmin, ymin, xmax, ymax]
 */
export function computeExtent(
  height: number,
  width: number,
  dpi: number,
  scale: number,
  center: number[]
): number[] {
  const xCenter = center[0];
  const yCenter = center[1];

  // Convert image dimensions from pixels to meters
  // (pixels / DPI) * 0.0254 = meters
  const imgWidthInMeter = (width / dpi) * 0.0254;
  const imgHeightInMeter = (height / dpi) * 0.0254;

  // Calculate half of map's height & width at the specific scale
  const dX = (imgWidthInMeter * scale) / 2;
  const dY = (imgHeightInMeter * scale) / 2;

  const minX = xCenter - dX;
  const maxX = xCenter + dX;
  const minY = yCenter - dY;
  const maxY = yCenter + dY;

  return [minX, minY, maxX, maxY];
}

/**
 * Get base URL from full URL
 * @param url - Full URL
 * @returns Base URL (origin)
 */
export function getBaseUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.origin;
  } catch {
    return url;
  }
}

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Merge print sizes using legacy append/overwrite behavior from the old app.
 */
export function mergePrintSizes(defaultSizes: PrintSize[], configuredSizes?: PrintSize[], append?: boolean, overwrite?: boolean): PrintSize[] {
  const safeDefaults = Array.isArray(defaultSizes) ? [...defaultSizes] : [];
  const safeConfigured = Array.isArray(configuredSizes) ? [...configuredSizes] : [];

  if (safeConfigured.length === 0) {
    return safeDefaults;
  }

  if (overwrite) {
    return safeConfigured;
  }

  if (append === false) {
    return [...safeConfigured, ...safeDefaults];
  }

  return [...safeDefaults, ...safeConfigured];
}

const printUtils = {
  rgbToHex,
  stringToColour,
  xmlToJson,
  removeNull,
  extractServiceName,
  computeDimension,
  computeExtent,
  getBaseUrl,
  degreesToRadians,
  radiansToDegrees,
  mergePrintSizes,
};

export default printUtils;
