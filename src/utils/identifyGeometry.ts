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

/** Clicked-point search radius in pixels; ArcGIS /query has no tolerance parameter. */
const FEATURE_QUERY_TOLERANCE_PX = 10;

/**
 * Build an ESRI envelope JSON string around a point, sized from the view resolution.
 */
export function pointToEsriEnvelopeJSON(coordinate: number[], resolution: number): string {
  const radius = FEATURE_QUERY_TOLERANCE_PX * resolution;
  return JSON.stringify({
    xmin: coordinate[0] - radius,
    ymin: coordinate[1] - radius,
    xmax: coordinate[0] + radius,
    ymax: coordinate[1] + radius,
    spatialReference: { wkid: 3857 },
  });
}

export interface EsriQueryFeature {
  geometry?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

export interface EsriQueryResponse {
  geometryType?: string;
  features?: EsriQueryFeature[];
}

/**
 * Map a FeatureServer /query response to the identify `results` shape.
 */
export function normalizeFeatureQueryResponse(response: EsriQueryResponse): { results: (EsriQueryFeature & { geometryType?: string })[] } {
  return {
    results: (response.features ?? []).map((feature) => ({ ...feature, geometryType: response.geometryType })),
  };
}
