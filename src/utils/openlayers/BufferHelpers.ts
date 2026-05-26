/**
 * Buffer geometry helper functions
 * Uses server-side API for accurate geometric buffering, same as old app
 */

import { Geometry, Point, LineString, Polygon, Circle } from "ol/geom";
import { fromCircle } from "ol/geom/Polygon";
import GeoJSON from "ol/format/GeoJSON";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import axiosInstance from "@/lib/axiosInstance";

// Register NAD83 UTM Zone 17 projection (same as old app)
proj4.defs("EPSG:26917", "+proj=utm +zone=17 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
register(proj4);

// NAD83 UTM Zone 17 projection
const nad83Proj = "EPSG:26917";
const webMercatorProj = "EPSG:3857";

/**
 * Convert OpenLayers geometry to GeoJSON string (geometry only, same as old app)
 */
export const getGeoJSONFromGeometry = (geometry: Geometry): string => {
  const geoJSONFormat = new GeoJSON();
  return geoJSONFormat.writeGeometry(geometry);
};

/**
 * Convert GeoJSON string to OpenLayers geometry (geometry only, same as old app)
 */
export const getGeometryFromGeoJSON = (geoJSON: string): Geometry => {
  const geoJSONFormat = new GeoJSON();
  return geoJSONFormat.readGeometry(geoJSON);
};

/**
 * Create a buffered geometry using server-side API (same approach as old app)
 * @param geometry - OpenLayers geometry to buffer
 * @param distanceMeters - Buffer distance in meters
 * @param callback - Callback function that receives the buffered geometry
 */
export const bufferGeometry = async (geometry: Geometry, distanceMeters: number, callback: (bufferedGeometry: Geometry) => void): Promise<void> => {
  try {
    // Project geometry to UTM NAD83 for accuracy (same as old app)
    const utmGeometry = geometry.clone();
    utmGeometry.transform(webMercatorProj, nad83Proj);

    // Convert to GeoJSON
    const geoJSON = getGeoJSONFromGeometry(utmGeometry);

    // Prepare API request payload
    const requestData = {
      geoJSON: geoJSON,
      distance: distanceMeters,
      srid: "26917",
    };

    // Make API call to internal NextJS route
    const response = await axiosInstance.post<{ geojson: string }>("/public/map/geometry/buffer", requestData);
    const result = response.data;

    // Convert result back to geometry and transform to Web Mercator
    let geoJsonData = result.geojson;

    // Handle case where server returns object instead of string
    if (typeof geoJsonData === "object") {
      geoJsonData = JSON.stringify(geoJsonData);
    }

    const bufferedGeometry = getGeometryFromGeoJSON(geoJsonData);
    bufferedGeometry.transform(nad83Proj, webMercatorProj);

    callback(bufferedGeometry);
  } catch (error) {
    console.error("Server-side buffer error, falling back to client-side:", error);
    // Fallback to client-side buffering if server fails
    fallbackClientSideBuffer(geometry, distanceMeters, callback);
  }
};

/**
 * Fallback client-side buffering (improved from original)
 */
const fallbackClientSideBuffer = (geometry: Geometry, distanceMeters: number, callback: (bufferedGeometry: Geometry) => void): void => {
  try {
    let bufferedGeometry: Geometry;

    if (geometry instanceof Point) {
      // For points, create a circle with the buffer distance as radius
      const coords = geometry.getCoordinates();
      const circle = new Circle(coords, distanceMeters);
      bufferedGeometry = fromCircle(circle, 64);
    } else if (geometry instanceof LineString) {
      // For lines, use simplified buffering (still not perfect but better than before)
      // A proper line buffer would need complex geometric algorithms
      const coords = geometry.getCoordinates();

      if (coords.length < 2) {
        bufferedGeometry = geometry;
      } else {
        // Create a simple buffer by creating perpendicular offsets at each point
        const leftSide: number[][] = [];
        const rightSide: number[][] = [];

        for (let i = 0; i < coords.length; i++) {
          let perpVector: [number, number];

          if (i === 0) {
            // First point - use direction to next point
            const dx = coords[i + 1][0] - coords[i][0];
            const dy = coords[i + 1][1] - coords[i][1];
            const length = Math.sqrt(dx * dx + dy * dy);
            perpVector = [-dy / length, dx / length];
          } else if (i === coords.length - 1) {
            // Last point - use direction from previous point
            const dx = coords[i][0] - coords[i - 1][0];
            const dy = coords[i][1] - coords[i - 1][1];
            const length = Math.sqrt(dx * dx + dy * dy);
            perpVector = [-dy / length, dx / length];
          } else {
            // Middle points - use average of adjacent segments
            const dx1 = coords[i][0] - coords[i - 1][0];
            const dy1 = coords[i][1] - coords[i - 1][1];
            const length1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

            const dx2 = coords[i + 1][0] - coords[i][0];
            const dy2 = coords[i + 1][1] - coords[i][1];
            const length2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            const avgDx = dx1 / length1 + dx2 / length2;
            const avgDy = dy1 / length1 + dy2 / length2;
            const avgLength = Math.sqrt(avgDx * avgDx + avgDy * avgDy);

            perpVector = avgLength > 0 ? [-avgDy / avgLength, avgDx / avgLength] : [0, 1];
          }

          leftSide.push([coords[i][0] + perpVector[0] * distanceMeters, coords[i][1] + perpVector[1] * distanceMeters]);

          rightSide.push([coords[i][0] - perpVector[0] * distanceMeters, coords[i][1] - perpVector[1] * distanceMeters]);
        }

        // Create polygon by connecting left side, then right side in reverse
        const bufferCoords = [...leftSide, ...rightSide.reverse(), leftSide[0]];
        bufferedGeometry = new Polygon([bufferCoords]);
      }
    } else if (geometry instanceof Polygon) {
      // For polygons, expand outward (simplified approach)
      const coords = geometry.getCoordinates()[0]; // Get exterior ring
      const centroid = geometry.getInteriorPoint().getCoordinates();

      const bufferedCoords = coords.map((coord) => {
        const dx = coord[0] - centroid[0];
        const dy = coord[1] - centroid[1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const factor = (distance + distanceMeters) / distance;
          return [centroid[0] + dx * factor, centroid[1] + dy * factor];
        }
        return coord;
      });

      bufferedGeometry = new Polygon([bufferedCoords]);
    } else if (geometry instanceof Circle) {
      // For circles, just increase the radius
      const center = geometry.getCenter();
      const radius = geometry.getRadius();
      const bufferedCircle = new Circle(center, radius + distanceMeters);
      bufferedGeometry = fromCircle(bufferedCircle, 64);
    } else {
      // Fallback for other geometry types
      bufferedGeometry = geometry;
    }

    callback(bufferedGeometry);
  } catch (error) {
    console.error("Client-side buffer error:", error);
    callback(geometry);
  }
};

/**
 * Convert distance from various units to meters
 */
export const convertToMeters = (distance: number, units: string): number => {
  const value = parseFloat(distance.toString());
  if (isNaN(value)) return 0;

  switch (units) {
    case "meters":
      return value;
    case "kilometers":
      return value * 1000;
    case "miles":
      return value * 1609.34;
    case "feet":
      return value / 3.281;
    case "yards":
      return value * 0.9144;
    case "nauticalMiles":
      return value * 1852;
    default:
      return value;
  }
};
