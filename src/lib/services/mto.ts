/**
 * MTO (Ministry of Transportation Ontario) 511 Service
 * Fetches traffic data from 511on.ca API and converts to GeoJSON
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const GeoJSON = require("geojson");
import polyline from "@mapbox/polyline";
import type { FeatureCollection } from "geojson";

// MTO Layer configuration
export const mtoSites: Record<string, { url: string; geoType: "POINT" | "POLYLINE" | "NONE" }> = {
  EVENTS: {
    url: "https://511on.ca/api/v2/get/event",
    geoType: "POINT",
  },
  CONSTRUCTION: {
    url: "https://511on.ca/api/v2/get/constructionprojects",
    geoType: "POINT",
  },
  CAMERAS: {
    url: "https://511on.ca/api/v2/get/cameras",
    geoType: "POINT",
  },
  ROADCONDITIONS: {
    url: "https://511on.ca/api/v2/get/roadconditions",
    geoType: "POLYLINE",
  },
  TRANSITHUBS: {
    url: "https://511on.ca/api/v2/get/transithub",
    geoType: "POINT",
  },
  CARPOOLLOTS: {
    url: "https://511on.ca/api/v2/get/carpoollots",
    geoType: "POINT",
  },
  FERRIES: {
    url: "https://511on.ca/api/v2/get/ferryterminals",
    geoType: "POINT",
  },
  SERVICECENTRES: {
    url: "https://511on.ca/api/v2/get/servicecentres",
    geoType: "POINT",
  },
  TRAVELINFOCENTRES: {
    url: "https://511on.ca/api/v2/get/informationcenter",
    geoType: "POINT",
  },
  HOTHOV: {
    url: "https://511on.ca/api/v2/get/hovlanes",
    geoType: "POLYLINE",
  },
  ALERTS: {
    url: "https://511on.ca/api/v2/get/alerts",
    geoType: "NONE",
  },
};

// Road condition areas to filter by
const roadConditionAreas = [
  "From Flesherton to Shelburne",
  "From Orangeville to Highway 50",
  "From Maple Leaf Drive to Canal Road (Bradford)",
  "From Highway 50 to Jane Street",
  "From Beaverton to Gamebridge",
  "From Barrie to Stayner",
  "From Stayner to Collingwood",
  "From Craighurst to Midland",
  "From Warminster to Waubashene",
  "From Waubashene to Midland",
  "From Barrie to Severn Bridge",
  "From Gamebridge to Warminster",
  "From Canal Road (Bradford) to Craighurst",
  "From New Tecumseth to Mulmur",
  "From Highway 400 (near Cookstown) to New Tecumseth",
  "From Shelburne to Orangeville",
  "From Flesherton to Shelburne",
  "From Collingwood to Owen Sound",
  "From Rosemont to Harriston",
  "From Port Severn to Horseshoe Lake",
  "From Severn Bridge to Muskoka Falls",
  "From Craighurst to Port Severn",
];

// Note: The 511ON cameras API (https://511on.ca/api/v2/get/cameras) already includes
// comprehensive coverage from multiple sources including:
// - York Region traffic cameras (Highway 7, 9, 48, etc.)
// - Grey County road cameras
// - MTO RWIS weather stations with cameras
// - COMPASS traffic management cameras (Central, East, West regions)
// - Municipal cameras from Toronto, Windsor, and other municipalities
// - Maintenance cameras from MTO regions (Northeast, Northwest, East, West)
//
// No need for a custom cameras array - the 511ON API provides better coverage and
// is maintained by MTO, making it more reliable than scraping individual municipal feeds.

// Types for MTO API responses
interface MTOCameraView {
  Id: number;
  Url: string;
  Status: string;
  Description: string;
}

interface MTOCameraRecord {
  Id: number;
  Source: string;
  Roadway: string;
  Location: string;
  Latitude: number;
  Longitude: number;
  Views: MTOCameraView[];
  [key: string]: unknown;
}

interface MTOPointRecord {
  Longitude: number;
  Latitude: number;
  PlannedEndDate?: number;
  StartDate?: number;
  startDate?: string;
  endDate?: string;
  Description?: string;
  Location?: string;
  Url?: string;
  [key: string]: unknown;
}

interface MTORoadConditionRecord {
  Condition: string[];
  Visibility: string;
  EncodedPolyline: string;
  LocationDescription?: string;
  geoJSON?: GeoJSON.LineString;
  [key: string]: unknown;
}

/**
 * Check if coordinates are within Simcoe County bounds
 */
function isInCounty(long: number, lat: number): boolean {
  return long > -80.5 && long < -79 && lat > 43.9 && lat < 45;
}

/**
 * Format Unix timestamp to readable date string
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
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
 * Fetch MTO point layer data (cameras, events, construction, etc.)
 */
async function getMTOPointLayer(url: string): Promise<GeoJSON.FeatureCollection> {
  const response = await fetch(url);
  const isCameraLayer = url.toUpperCase().includes("CAMERA");

  if (isCameraLayer) {
    // Handle camera data with Views array
    const allCameras: MTOCameraRecord[] = await response.json();
    const cameras: MTOPointRecord[] = [];

    for (const camera of allCameras) {
      const isIn = isInCounty(camera.Longitude, camera.Latitude);
      if (isIn && camera.Views && camera.Views.length > 0) {
        // Use the first enabled view
        const primaryView = camera.Views.find((v) => v.Status === "Enabled") || camera.Views[0];

        cameras.push({
          Longitude: camera.Longitude,
          Latitude: camera.Latitude,
          Location: camera.Location,
          Description: camera.Location,
          Url: primaryView.Url,
        });
      }
    }

    return GeoJSON.parse(cameras, { Point: ["Latitude", "Longitude"] }) as FeatureCollection;
  } else {
    // Handle other point layers (events, construction, etc.)
    const allMTO: MTOPointRecord[] = await response.json();
    const mto: MTOPointRecord[] = [];
    const now = new Date();

    for (const rec of allMTO) {
      const isIn = isInCounty(rec.Longitude, rec.Latitude);
      if (isIn) {
        // Handle planned events with date range
        if (rec.PlannedEndDate !== undefined && rec.StartDate !== undefined) {
          const startDate = new Date(rec.StartDate * 1000);
          const endDate = new Date(rec.PlannedEndDate * 1000);

          if (now >= startDate && now <= endDate) {
            rec.startDate = formatDate(rec.StartDate);
            rec.endDate = formatDate(rec.PlannedEndDate);
            mto.push(rec);
          }
        } else {
          mto.push(rec);
        }
      }
    }

    return GeoJSON.parse(mto, { Point: ["Latitude", "Longitude"] }) as FeatureCollection;
  }
}

/**
 * Fetch MTO polyline layer data (road conditions, HOV lanes)
 */
async function getMTOPolylineLayer(url: string): Promise<FeatureCollection | []> {
  const response = await fetch(url);
  const allMTO: MTORoadConditionRecord[] = await response.json();
  const allMTOWithGeoJSON: MTORoadConditionRecord[] = [];

  for (const element of allMTO) {
    // Only return roads with snow or ice conditions
    const mainCondition = element.Condition[0]?.toUpperCase() || "";

    if (mainCondition.includes("SNOW") || mainCondition.includes("ICE")) {
      // Decode polyline to GeoJSON
      const geoJSONGeom = polyline.toGeoJSON(element.EncodedPolyline);
      element.geoJSON = geoJSONGeom;

      // Delete the encoded polyline
      delete (element as { EncodedPolyline?: string }).EncodedPolyline;

      // Set to English only (split bilingual description)
      if (element.LocationDescription !== undefined) {
        const englishDescription = element.LocationDescription.split("|")[0];
        element.LocationDescription = englishDescription;

        // Only use the roads found in config
        if (roadConditionAreas.includes(englishDescription)) {
          allMTOWithGeoJSON.push(element);
        }
      } else {
        allMTOWithGeoJSON.push(element);
      }
    }
  }

  if (allMTOWithGeoJSON.length > 0) {
    return GeoJSON.parse(allMTOWithGeoJSON, { GeoJSON: "geoJSON" }) as FeatureCollection;
  }

  return [];
}

/**
 * Fetch MTO alerts (no geometry)
 */
async function getMTOAlerts(url: string): Promise<unknown[]> {
  const response = await fetch(url);
  return response.json();
}

/**
 * Main function to get MTO layer data by layer name
 * @param layerName - Layer name (EVENTS, CONSTRUCTION, CAMERAS, ROADCONDITIONS, etc.)
 * @returns GeoJSON FeatureCollection or empty array
 */
export async function getMTOLayer(layerName: string): Promise<FeatureCollection | unknown[] | null> {
  const layerDetails = mtoSites[layerName.toUpperCase()];

  if (!layerDetails) {
    return null;
  }

  switch (layerDetails.geoType) {
    case "POINT":
      return getMTOPointLayer(layerDetails.url);
    case "POLYLINE":
      return getMTOPolylineLayer(layerDetails.url);
    case "NONE":
      return getMTOAlerts(layerDetails.url);
    default:
      return null;
  }
}
