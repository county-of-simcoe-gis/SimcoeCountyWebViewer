import { EsriJSON } from "ol/format";
import type Geometry from "ol/geom/Geometry";
import Circle from "ol/geom/Circle";
import LineString from "ol/geom/LineString";
import MultiLineString from "ol/geom/MultiLineString";
import MultiPoint from "ol/geom/MultiPoint";
import MultiPolygon from "ol/geom/MultiPolygon";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";

/**
 * Serialize an OpenLayers geometry to an ESRI JSON geometry string.
 *
 * Note: EsriJSON.writeGeometry already returns a JSON string, so we return it
 * directly. Wrapping it in JSON.stringify() produces a double-encoded string
 * literal that ArcGIS identify endpoints reject as invalid geometry.
 */
export function geometryToEsriJSON(geometry: Geometry): string {
  const esriFormat = new EsriJSON();
  return esriFormat.writeGeometry(geometry);
}

/**
 * Map an OpenLayers geometry type to the ArcGIS geometryType value used by
 * the /identify endpoint.
 */
export function getEsriGeometryType(geometry: Geometry): string {
  if (geometry instanceof Point) {
    return "esriGeometryPoint";
  }

  if (geometry instanceof MultiPoint) {
    return "esriGeometryMultipoint";
  }

  if (geometry instanceof LineString || geometry instanceof MultiLineString) {
    return "esriGeometryPolyline";
  }

  if (geometry instanceof Polygon || geometry instanceof MultiPolygon || geometry instanceof Circle) {
    return "esriGeometryPolygon";
  }

  // Fallback for unknown/custom geometry types
  return "esriGeometryPolygon";
}
