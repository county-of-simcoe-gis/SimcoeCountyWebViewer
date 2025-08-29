/**
 * Buffer geometry helper functions
 * Simple implementation using OpenLayers geometry buffer
 */

import { Feature } from 'ol';
import { Geometry, Point, LineString, Polygon, Circle } from 'ol/geom';
import { fromCircle } from 'ol/geom/Polygon';
import GeoJSON from 'ol/format/GeoJSON';

/**
 * Create a buffered geometry around a feature
 * @param geometry - OpenLayers geometry to buffer
 * @param distanceMeters - Buffer distance in meters  
 * @param callback - Callback function that receives the buffered geometry
 */
export const bufferGeometry = (
  geometry: Geometry,
  distanceMeters: number,
  callback: (bufferedGeometry: Geometry) => void
): void => {
  try {
    let bufferedGeometry: Geometry;

    if (geometry instanceof Point) {
      // For points, create a circle with the buffer distance as radius
      const coords = geometry.getCoordinates();
      const circle = new Circle(coords, distanceMeters);
      // Convert circle to polygon for GeoJSON compatibility
      bufferedGeometry = fromCircle(circle, 64);
    } else if (geometry instanceof LineString) {
      // For lines, create a simple buffer by expanding each coordinate
      const coords = geometry.getCoordinates();
      const bufferedCoords: number[][] = [];
      
      // Simple approach: create a rectangular buffer around the line
      // This is a simplified version - a proper implementation would need more complex geometry
      for (let i = 0; i < coords.length - 1; i++) {
        const start = coords[i];
        const end = coords[i + 1];
        
        // Calculate perpendicular offset
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const length = Math.sqrt(dx * dx + dy * dy);
        const offsetX = (-dy / length) * distanceMeters;
        const offsetY = (dx / length) * distanceMeters;
        
        bufferedCoords.push([start[0] + offsetX, start[1] + offsetY]);
        bufferedCoords.push([end[0] + offsetX, end[1] + offsetY]);
        bufferedCoords.push([end[0] - offsetX, end[1] - offsetY]);
        bufferedCoords.push([start[0] - offsetX, start[1] - offsetY]);
      }
      
      // Close the polygon
      if (bufferedCoords.length > 0) {
        bufferedCoords.push(bufferedCoords[0]);
        bufferedGeometry = new Polygon([bufferedCoords]);
      } else {
        bufferedGeometry = geometry;
      }
    } else if (geometry instanceof Polygon) {
      // For polygons, expand outward by creating a larger polygon
      // This is a simplified approach - proper buffering would require complex algorithms
      const coords = geometry.getCoordinates()[0]; // Get exterior ring
      const centroid = geometry.getInteriorPoint().getCoordinates();
      
      const bufferedCoords = coords.map(coord => {
        const dx = coord[0] - centroid[0];
        const dy = coord[1] - centroid[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const factor = (distance + distanceMeters) / distance;
          return [
            centroid[0] + dx * factor,
            centroid[1] + dy * factor
          ];
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
    console.error('Buffer geometry error:', error);
    // Return original geometry if buffer fails
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
    case 'meters':
      return value;
    case 'kilometers':
      return value * 1000;
    case 'miles':
      return value * 1609.34;
    case 'feet':
      return value / 3.281;
    case 'yards':
      return value * 0.9144;
    case 'nauticalMiles':
      return value * 1852;
    default:
      return value;
  }
};
