/**
 * Waze Traffic Data Service
 * Fetches live traffic data from Waze partner feed and converts to GeoJSON
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const GeoJSON = require("geojson");
import type { FeatureCollection } from "geojson";

// Waze API URL - should be set in environment variable
const wazeURL = process.env.WAZE_API_URL || "";

// Types for Waze API responses
interface WazeAlert {
  type: string;
  subtype?: string;
  reportDescription?: string;
  street?: string;
  location: {
    x: number;
    y: number;
  };
  pubMillis: number;
  uuid?: string;
  longitude?: number;
  latitude?: number;
  date?: string;
  [key: string]: unknown;
}

interface WazeJam {
  line: Array<{ x: number; y: number }>;
  speedKMH: number;
  delay: number;
  pubMillis: number;
  street?: string;
  city?: string;
  level?: number;
  length?: number;
  lineGeo?: [number, number][];
  date?: string;
  [key: string]: unknown;
}

interface WazeIrregularity {
  line: Array<{ x: number; y: number }>;
  speed: number;
  delaySeconds: number;
  updateDateMillis: number;
  street?: string;
  city?: string;
  highway?: boolean;
  trend?: number;
  delay?: number;
  speedKMH?: number;
  lineGeo?: [number, number][];
  date?: string;
  [key: string]: unknown;
}

interface WazeResponse {
  alerts?: WazeAlert[];
  jams?: WazeJam[];
  irregularities?: WazeIrregularity[];
}

/**
 * Format Unix timestamp (milliseconds) to readable date string
 */
function formatDateMillis(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Fetch Waze alert layer (points)
 * @param type - Alert type (ACCIDENT, HAZARD, CONSTRUCTION, ROAD_CLOSED, JAM)
 */
async function getWazeAlertLayer(type: string): Promise<FeatureCollection> {
  if (!wazeURL) {
    console.error("WAZE_API_URL environment variable not set");
    return { type: "FeatureCollection", features: [] };
  }

  try {
    const response = await fetch(wazeURL);

    if (!response.ok) {
      console.error(`Waze API fetch failed: ${response.status} ${response.statusText}`);
      return { type: "FeatureCollection", features: [] };
    }

    const allWaze: WazeResponse = await response.json();
    const alerts = allWaze.alerts || [];
    const wazeByType: WazeAlert[] = [];

    for (const element of alerts) {
      // Filter by type
      if (type.toUpperCase() === "HAZARD") {
        // HAZARD includes both WEATHERHAZARD and HAZARD types
        if (element.type.toUpperCase() !== "WEATHERHAZARD" && element.type.toUpperCase() !== "HAZARD") {
          continue;
        }
      } else if (element.type.toUpperCase() !== type.toUpperCase()) {
        continue;
      }

      // Set longitude/latitude from location
      element.longitude = element.location.x;
      element.latitude = element.location.y;

      // Convert Unix time
      element.date = formatDateMillis(element.pubMillis);

      // Delete unnecessary properties
      delete (element as { location?: unknown }).location;
      delete (element as { pubMillis?: unknown }).pubMillis;

      wazeByType.push(element);
    }

    return GeoJSON.parse(wazeByType, { Point: ["latitude", "longitude"] }) as FeatureCollection;
  } catch (error) {
    console.error(`Error fetching Waze alert layer for type ${type}:`, error);
    return { type: "FeatureCollection", features: [] };
  }
}

/**
 * Fetch Waze traffic jams layer (lines)
 */
async function getWazeJamsLayer(): Promise<FeatureCollection> {
  if (!wazeURL) {
    console.error("WAZE_API_URL environment variable not set");
    return { type: "FeatureCollection", features: [] };
  }

  try {
    const response = await fetch(wazeURL);

    if (!response.ok) {
      console.error(`Waze API fetch failed: ${response.status} ${response.statusText}`);
      return { type: "FeatureCollection", features: [] };
    }

    const allWaze: WazeResponse = await response.json();
    const jams = allWaze.jams || [];

    for (const element of jams) {
      // Convert line array to coordinate pairs
      const newLine: [number, number][] = [];
      for (const coords of element.line) {
        newLine.push([coords.x, coords.y]);
      }
      element.lineGeo = newLine;

      // Round speed
      element.speedKMH = Math.round(element.speedKMH);

      // Change delay to minutes
      if (element.delay !== -1) {
        element.delay = Math.round(element.delay / 60);
      }

      // Convert Unix time
      element.date = formatDateMillis(element.pubMillis);

      // Delete unnecessary properties
      delete (element as { location?: unknown }).location;
      delete (element as { pubMillis?: unknown }).pubMillis;
      delete (element as { line?: unknown }).line;
    }

    return GeoJSON.parse(jams, { LineString: "lineGeo" }) as FeatureCollection;
  } catch (error) {
    console.error("Error fetching Waze jams layer:", error);
    return { type: "FeatureCollection", features: [] };
  }
}

/**
 * Fetch Waze irregularities layer (lines)
 */
async function getWazeIrregularLayer(): Promise<FeatureCollection | []> {
  if (!wazeURL) {
    console.error("WAZE_API_URL environment variable not set");
    return { type: "FeatureCollection", features: [] };
  }

  try {
    const response = await fetch(wazeURL);

    if (!response.ok) {
      console.error(`Waze API fetch failed: ${response.status} ${response.statusText}`);
      return { type: "FeatureCollection", features: [] };
    }

    const allWaze: WazeResponse = await response.json();
    const irregular = allWaze.irregularities;

    // Nothing to report
    if (irregular === undefined) {
      return [];
    }

    for (const element of irregular) {
      // Convert line array to coordinate pairs
      const newLine: [number, number][] = [];
      for (const coords of element.line) {
        newLine.push([coords.x, coords.y]);
      }
      element.lineGeo = newLine;

      // Calculate speed in KMH from mph
      element.speedKMH = Math.round(element.speed * 1.6);

      // Change delay to minutes
      if (element.delay !== -1 && element.delaySeconds) {
        element.delay = Math.round(element.delaySeconds / 60);
      }

      // Convert Unix time
      element.date = formatDateMillis(element.updateDateMillis);

      // Delete unnecessary properties
      delete (element as { location?: unknown }).location;
      delete (element as { pubMillis?: unknown }).pubMillis;
      delete (element as { line?: unknown }).line;
    }

    return GeoJSON.parse(irregular, { LineString: "lineGeo" }) as FeatureCollection;
  } catch (error) {
    console.error("Error fetching Waze irregularities layer:", error);
    return { type: "FeatureCollection", features: [] };
  }
}

/**
 * Main function to get Waze layer data
 * @param category - Category: ALERTS, JAMS, or IRREGULAR
 * @param type - For ALERTS: ACCIDENT, HAZARD, CONSTRUCTION, ROAD_CLOSED, JAM
 * @returns GeoJSON FeatureCollection
 */
export async function getWazeLayer(category: string, type: string = ""): Promise<FeatureCollection | []> {
  const upperCategory = category.toUpperCase();

  switch (upperCategory) {
    case "ALERTS":
      return getWazeAlertLayer(type);
    case "JAMS":
      return getWazeJamsLayer();
    case "IRREGULAR":
      return getWazeIrregularLayer();
    default:
      return { type: "FeatureCollection", features: [] };
  }
}

// Export individual functions for direct access
export { getWazeAlertLayer, getWazeJamsLayer, getWazeIrregularLayer };
