/**
 * GeoServer Client Utility
 *
 * Dedicated utility for querying GeoServer services.
 * All URLs must be fully specified - no default GeoServer URL.
 * Used by URL parameter handlers for feature selection (NG911ID, ARN, etc.)
 */

import { getAccessToken, isSecuredUrl, fetchWithAuth } from "@/utils/auth";
import { reprojectExtentToWebMercator } from "@/utils/coordinateConversion";

// GeoJSON types (inline to avoid dependency on geojson package)
interface GeoJsonGeometry {
  type: string;
  coordinates?: number[] | number[][] | number[][][] | number[][][][];
  geometries?: GeoJsonGeometry[];
}

interface Feature {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown> | null;
  id?: string | number;
}

interface FeatureCollection {
  type: "FeatureCollection";
  features: Feature[];
}

// ============================================================================
// Types
// ============================================================================

/**
 * Options for GeoServer WFS queries
 */
export interface WfsQueryOptions {
  /** Full GeoServer OWS/WFS URL (required) */
  serviceUrl: string;
  /** Layer name (typeName) to query */
  layerName: string;
  /** CQL filter expression */
  cqlFilter?: string;
  /** Property names to include in response (optional, defaults to all) */
  propertyNames?: string[];
  /** Maximum features to return */
  maxFeatures?: number;
  /** Output format (default: application/json) */
  outputFormat?: string;
  /** Coordinate system for output (default: EPSG:3857) */
  srsName?: string;
}

/**
 * Result of a feature query
 */
export interface FeatureQueryResult {
  /** Whether the query was successful */
  success: boolean;
  /** The feature if found */
  feature?: Feature;
  /** All features if multiple found */
  features?: Feature[];
  /** Error message if failed */
  error?: string;
  /** Number of features found */
  count: number;
}

/**
 * Search result from location service
 */
export interface LocationSearchResult {
  /** Location ID */
  id: string;
  /** Display name */
  name: string;
  /** Longitude (Web Mercator) */
  x: number;
  /** Latitude (Web Mercator) */
  y: number;
  /** Feature geometry if available */
  geometry?: Feature["geometry"];
  /** Additional attributes */
  attributes?: Record<string, unknown>;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom error for GeoServer operations
 */
export class GeoServerError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly serviceUrl?: string,
  ) {
    super(message);
    this.name = "GeoServerError";
  }
}

/**
 * Convert error to user-friendly message
 */
export function handleGeoServerError(error: unknown): string {
  if (error instanceof GeoServerError) {
    if (error.statusCode === 404) {
      return "Feature not found";
    }
    if (error.statusCode === 403) {
      return "Access denied to the requested resource";
    }
    if (error.statusCode === 500) {
      return "Server error while fetching feature data";
    }
    return error.message;
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes("fetch")) {
      return "Unable to connect to the mapping service";
    }
    if (error.message.includes("timeout")) {
      return "Request timed out while fetching feature data";
    }
    return error.message;
  }

  return "An unknown error occurred";
}

// ============================================================================
// WFS Query Builder
// ============================================================================

/**
 * Build WFS GetFeature URL with parameters.
 *
 * Uses manual string construction instead of URLSearchParams to avoid
 * over-encoding that can break GeoServer CQL filters (e.g. parentheses,
 * colons in layer names, slashes in output format).
 */
function buildWfsUrl(options: WfsQueryOptions): string {
  const { serviceUrl, layerName, cqlFilter, propertyNames, maxFeatures = 10, outputFormat = "application/json", srsName = "EPSG:3857" } = options;

  const separator = serviceUrl.includes("?") ? "&" : "?";
  let url = `${serviceUrl}${separator}service=WFS&version=2.0.0&request=GetFeature&typeNames=${layerName}&outputFormat=${encodeURIComponent(outputFormat)}&srsName=${encodeURIComponent(srsName)}&count=${maxFeatures}`;

  if (cqlFilter) {
    url += `&CQL_FILTER=${encodeURIComponent(cqlFilter)}`;
  }

  if (propertyNames && propertyNames.length > 0) {
    url += `&propertyName=${propertyNames.join(",")}`;
  }

  return url;
}

// ============================================================================
// Generic Query Function
// ============================================================================

/**
 * Query GeoServer WFS for features
 *
 * @param options - WFS query options (requires full serviceUrl)
 * @returns Query result with feature(s) or error
 * @throws GeoServerError on network or server errors
 *
 * @example
 * const result = await queryFeature({
 *   serviceUrl: 'https://geoserver.example.com/geoserver/ows',
 *   layerName: 'parcels',
 *   cqlFilter: "ARN='1234567890'"
 * });
 */
export async function queryFeature(options: WfsQueryOptions): Promise<FeatureQueryResult> {
  if (!options.serviceUrl) {
    throw new GeoServerError("Service URL is required");
  }

  if (!options.layerName) {
    throw new GeoServerError("Layer name is required");
  }

  const url = buildWfsUrl(options);

  try {
    // Build fetch options with CORS mode and optional auth for secured endpoints
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (isSecuredUrl(options.serviceUrl)) {
      const token = await getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers,
    });

    if (!response.ok) {
      throw new GeoServerError(`GeoServer request failed: ${response.statusText}`, response.status, options.serviceUrl);
    }

    const data: FeatureCollection = await response.json();

    if (!data.features || data.features.length === 0) {
      return {
        success: false,
        error: "No features found",
        count: 0,
      };
    }

    return {
      success: true,
      feature: data.features[0],
      features: data.features,
      count: data.features.length,
    };
  } catch (error) {
    if (error instanceof GeoServerError) {
      throw error;
    }
    console.error("[GeoServerClient] Fetch failed for URL:", url, error);
    throw new GeoServerError(handleGeoServerError(error), undefined, options.serviceUrl);
  }
}

// ============================================================================
// Specialized Query Functions
// ============================================================================

/**
 * Query feature by NG911 ID (911 Address Point)
 *
 * @param serviceUrl - Full GeoServer OWS URL
 * @param nguid - The NG911 unique identifier (NGUID field)
 * @returns Query result with feature or error
 */
export async function queryFeatureByNG911ID(serviceUrl: string, nguid: string, layerName: string = "simcoe:Civic_Address_Point_Lookup"): Promise<FeatureQueryResult> {
  if (!nguid || nguid.trim() === "") {
    return {
      success: false,
      error: "NG911ID value is required",
      count: 0,
    };
  }

  return queryFeature({
    serviceUrl,
    layerName,
    cqlFilter: `NGUID='${nguid.trim()}'`,
    maxFeatures: 1,
  });
}

/**
 * Query feature by ARN (Assessment Roll Number / Property)
 *
 * @param serviceUrl - Full GeoServer OWS URL
 * @param arn - The Assessment Roll Number
 * @param layerName - Layer name to query (varies by deployment)
 * @returns Query result with feature or error
 */
export async function queryFeatureByARN(serviceUrl: string, arn: string, layerName: string = "simcoe:Assessment_Parcels"): Promise<FeatureQueryResult> {
  if (!arn || arn.trim() === "") {
    return {
      success: false,
      error: "ARN value is required",
      count: 0,
    };
  }

  // ARN is typically numeric, clean up any formatting
  const cleanArn = arn.trim().replace(/[^0-9]/g, "");

  if (cleanArn.length === 0) {
    return {
      success: false,
      error: "Invalid ARN format",
      count: 0,
    };
  }

  return queryFeature({
    serviceUrl,
    layerName,
    cqlFilter: `ARN='${cleanArn}'`,
    maxFeatures: 1,
  });
}

/**
 * Query location by ID from search service
 *
 * @param serviceUrl - Full search service URL
 * @param locationId - The location identifier
 * @returns Search result with location data or null
 */
export async function queryLocationById(serviceUrl: string, locationId: string): Promise<LocationSearchResult | null> {
  if (!serviceUrl) {
    throw new GeoServerError("Service URL is required");
  }

  if (!locationId || locationId.trim() === "") {
    return null;
  }

  try {
    // Build search URL - this may vary based on your search service implementation
    const url = new URL(serviceUrl);
    url.searchParams.set("id", locationId.trim());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new GeoServerError(`Search request failed: ${response.statusText}`, response.status, serviceUrl);
    }

    const data = await response.json();

    // Handle different response formats
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      return {
        id: item.id || locationId,
        name: item.name || item.label || item.displayName || "",
        x: parseFloat(item.x || item.longitude || item.lon || 0),
        y: parseFloat(item.y || item.latitude || item.lat || 0),
        geometry: item.geometry,
        attributes: item,
      };
    }

    if (data && typeof data === "object" && !Array.isArray(data)) {
      return {
        id: data.id || locationId,
        name: data.name || data.label || data.displayName || "",
        x: parseFloat(data.x || data.longitude || data.lon || 0),
        y: parseFloat(data.y || data.latitude || data.lat || 0),
        geometry: data.geometry,
        attributes: data,
      };
    }

    return null;
  } catch (error) {
    if (error instanceof GeoServerError) {
      throw error;
    }
    throw new GeoServerError(handleGeoServerError(error), undefined, serviceUrl);
  }
}

/**
 * Extract center coordinates from a feature geometry
 *
 * @param feature - GeoJSON feature
 * @returns Center coordinates [x, y] or null if unable to calculate
 */
export function getFeatureCenter(feature: Feature): [number, number] | null {
  if (!feature.geometry) {
    return null;
  }

  const { geometry } = feature;

  switch (geometry.type) {
    case "Point":
      return geometry.coordinates as [number, number];

    case "LineString":
    case "MultiPoint": {
      // Return midpoint of coordinates
      const coords = geometry.coordinates as number[][];
      if (coords.length === 0) return null;
      const mid = Math.floor(coords.length / 2);
      return coords[mid] as [number, number];
    }

    case "Polygon": {
      // Return centroid approximation (first ring center)
      if (!geometry.coordinates) return null;
      const ring = geometry.coordinates[0] as number[][];
      if (!ring || ring.length === 0) return null;
      const sumX = ring.reduce((sum, coord) => sum + coord[0], 0);
      const sumY = ring.reduce((sum, coord) => sum + coord[1], 0);
      return [sumX / ring.length, sumY / ring.length];
    }

    case "MultiPolygon": {
      // Return centroid of first polygon
      if (!geometry.coordinates) return null;
      const firstPoly = geometry.coordinates[0] as number[][][];
      if (!firstPoly || !firstPoly[0]) return null;
      const ring = firstPoly[0] as number[][];
      const sumX = ring.reduce((sum, coord) => sum + coord[0], 0);
      const sumY = ring.reduce((sum, coord) => sum + coord[1], 0);
      return [sumX / ring.length, sumY / ring.length];
    }

    case "MultiLineString": {
      // Return midpoint of first line
      if (!geometry.coordinates) return null;
      const firstLine = geometry.coordinates[0] as number[][];
      if (!firstLine || firstLine.length === 0) return null;
      const mid = Math.floor(firstLine.length / 2);
      return firstLine[mid] as [number, number];
    }

    case "GeometryCollection": {
      // Try first geometry in collection
      if (geometry.geometries && geometry.geometries.length > 0) {
        return getFeatureCenter({ type: "Feature", properties: {}, geometry: geometry.geometries[0] });
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Get bounding extent from a feature geometry
 *
 * @param feature - GeoJSON feature
 * @returns Extent [minX, minY, maxX, maxY] or null if unable to calculate
 */
export function getFeatureExtent(feature: Feature): [number, number, number, number] | null {
  if (!feature.geometry) {
    return null;
  }

  // Collect all coordinates from geometry
  const coords: number[][] = [];

  function collectCoords(geometry: Feature["geometry"]): void {
    if (!geometry) return;

    switch (geometry.type) {
      case "Point":
        coords.push(geometry.coordinates as number[]);
        break;
      case "LineString":
      case "MultiPoint":
        coords.push(...(geometry.coordinates as number[][]));
        break;
      case "Polygon":
      case "MultiLineString":
        (geometry.coordinates as number[][][]).forEach((ring) => coords.push(...ring));
        break;
      case "MultiPolygon":
        (geometry.coordinates as number[][][][]).forEach((poly) => poly.forEach((ring) => coords.push(...ring)));
        break;
      case "GeometryCollection":
        if (geometry.geometries) {
          geometry.geometries.forEach((g: GeoJsonGeometry) => collectCoords(g));
        }
        break;
    }
  }

  collectCoords(feature.geometry);

  if (coords.length === 0) {
    return null;
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const coord of coords) {
    if (coord[0] < minX) minX = coord[0];
    if (coord[1] < minY) minY = coord[1];
    if (coord[0] > maxX) maxX = coord[0];
    if (coord[1] > maxY) maxY = coord[1];
  }

  return [minX, minY, maxX, maxY];
}

// ============================================================================
// Spatial / Attribute Query Helpers
// ============================================================================

/**
 * Options for a spatial INTERSECTS query
 */
export interface SpatialQueryOptions {
  /** Full GeoServer WFS URL */
  serviceUrl: string;
  /** WFS layer name (typeName) */
  layerName: string;
  /** Geometry column in the layer */
  geometryField: string;
  /** WKT representation of the query geometry */
  wkt: string;
  /** Maximum features to return (default: 1000) */
  maxFeatures?: number;
  /** Output format (default: application/json) */
  outputFormat?: string;
  /** Coordinate system (default: EPSG:3857) */
  srsName?: string;
  /** Buffer distance to apply to the query geometry (negative values shrink). Uses GeoServer CQL buffer(). */
  buffer?: number;
}

/**
 * Options for an attribute-based CQL query
 */
export interface AttributeQueryOptions {
  /** Full GeoServer WFS URL */
  serviceUrl: string;
  /** WFS layer name (typeName) */
  layerName: string;
  /** Attribute (property) name to filter on */
  attributeName: string;
  /** Value to match */
  attributeValue: string;
  /** Maximum features to return (default: 1000) */
  maxFeatures?: number;
  /** Output format (default: application/json) */
  outputFormat?: string;
  /** Coordinate system (default: EPSG:3857) */
  srsName?: string;
}

/**
 * Query features that INTERSECT a given geometry (WKT).
 *
 * @example
 * const result = await queryFeaturesByGeometry({
 *   serviceUrl: 'https://opengis.simcoe.ca/geoserver/wfs',
 *   layerName: 'simcoe:zoning',
 *   geometryField: 'geom',
 *   wkt: 'POLYGON((...))' ,
 * });
 */
export async function queryFeaturesByGeometry(options: SpatialQueryOptions): Promise<FeatureQueryResult> {
  const { serviceUrl, layerName, geometryField, wkt, maxFeatures = 1000, outputFormat, srsName, buffer } = options;

  if (!wkt || wkt.trim() === "") {
    return { success: false, error: "WKT geometry is required", count: 0 };
  }

  // When a buffer distance is specified, wrap the search geometry in a CQL
  // buffer() call.  A negative value shrinks the search polygon inward so
  // that slightly shifted layer boundaries don't cause false matches with
  // adjacent features.  The buffer is applied to the WKT (second argument)
  // because GeoServer CQL requires the first INTERSECTS argument to be a
  // plain property name.
  const geomExpression = buffer != null ? `buffer(${wkt}, ${buffer})` : wkt;

  return queryFeature({
    serviceUrl,
    layerName,
    cqlFilter: `INTERSECTS(${geometryField}, ${geomExpression})`,
    maxFeatures,
    ...(outputFormat && { outputFormat }),
    ...(srsName && { srsName }),
  });
}

/**
 * Query features by a single attribute value (equality).
 *
 * @example
 * const result = await queryFeaturesByAttribute({
 *   serviceUrl: 'https://opengis.simcoe.ca/geoserver/wfs',
 *   layerName: 'simcoe:zoning',
 *   attributeName: 'arn',
 *   attributeValue: '123456',
 * });
 */
export async function queryFeaturesByAttribute(options: AttributeQueryOptions): Promise<FeatureQueryResult> {
  const { serviceUrl, layerName, attributeName, attributeValue, maxFeatures = 1000, outputFormat, srsName } = options;

  if (!attributeValue || attributeValue.trim() === "") {
    return { success: false, error: `${attributeName} value is required`, count: 0 };
  }

  return queryFeature({
    serviceUrl,
    layerName,
    cqlFilter: `(${attributeName}='${attributeValue.trim()}')`,
    maxFeatures,
    ...(outputFormat && { outputFormat }),
    ...(srsName && { srsName }),
  });
}

// ============================================================================
// WMS Capabilities / Extent Helpers
// ============================================================================

/**
 * GeoServer WMS layer names are qualified as "workspace:layerName". Split that out so callers
 * can target GeoServer's per-layer "virtual service" endpoint instead of the global one.
 */
export function splitWorkspaceLayerName(fullName: string): { workspace: string | null; layerName: string } {
  const colonIndex = fullName.indexOf(":");
  if (colonIndex <= 0) {
    return { workspace: null, layerName: fullName };
  }
  return { workspace: fullName.slice(0, colonIndex), layerName: fullName.slice(colonIndex + 1) };
}

/**
 * Resolve the true GeoServer root (e.g. "https://host/geoserver") from a WMS URL that may
 * already be scoped to a workspace/layer-group virtual service, e.g.
 * "https://host/geoserver/simcoe/Popular/ows?...". Naively stripping only a trailing
 * "/wms" or "/ows" segment would leave the "simcoe/Popular" virtual-service path in place,
 * producing an invalid doubled-up path when a workspace/layer is appended.
 */
function getGeoserverRoot(url: string): string {
  const withoutQuery = url.split("?")[0];
  const marker = "/geoserver/";
  const markerIndex = withoutQuery.indexOf(marker);

  if (markerIndex !== -1) {
    return withoutQuery.slice(0, markerIndex) + "/geoserver";
  }

  // Fallback for URLs that don't contain "/geoserver/" (e.g. a custom geoserverPath): just
  // strip a trailing "/wms" or "/ows" service segment.
  return withoutQuery.replace(/\/(wms|ows)\/?$/i, "");
}

/**
 * Build a WMS GetCapabilities URL scoped to a single workspace + layer using GeoServer's
 * "virtual service" endpoint (`.../geoserver/<workspace>/<layer>/wms`) instead of the global
 * `.../geoserver/wms` endpoint. Scoping the request this way returns capabilities for just the
 * one layer, avoiding a slow full-server capabilities document on GeoServer instances hosting
 * many layers/workspaces.
 *
 * Falls back to a GetCapabilities request against `baseWmsUrl` unchanged when the layer name
 * has no workspace prefix (unexpected, but keeps the previous global-endpoint behavior as a
 * safety net).
 */
export function buildLayerScopedCapabilitiesUrl(baseWmsUrl: string, fullLayerName: string): string {
  const { workspace, layerName } = splitWorkspaceLayerName(fullLayerName);

  if (!workspace) {
    return `${baseWmsUrl}?service=WMS&version=1.3.0&request=GetCapabilities`;
  }

  const geoserverRoot = getGeoserverRoot(baseWmsUrl);

  return `${geoserverRoot}/${encodeURIComponent(workspace)}/${encodeURIComponent(layerName)}/wms?service=WMS&version=1.3.0&request=GetCapabilities`;
}

/**
 * Extract a layer's bounding box (as an EPSG:3857 extent) from a parsed WMS GetCapabilities
 * document, matching either the full "workspace:layer" name or the unprefixed layer name (a
 * layer-scoped virtual service may report the name either way).
 */
function extractLayerExtentFromCapabilities(xmlDoc: Document, fullLayerName: string, unprefixedLayerName: string): number[] | null {
  const layers = xmlDoc.getElementsByTagName("Layer");

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const nameEl = layer.getElementsByTagName("Name")[0];
    if (!nameEl || (nameEl.textContent !== fullLayerName && nameEl.textContent !== unprefixedLayerName)) {
      continue;
    }

    // Prefer the geographic bounding box (always present per the WMS spec) and reproject it.
    const geoBounds = layer.getElementsByTagName("EX_GeographicBoundingBox")[0];
    if (geoBounds) {
      const westBound = geoBounds.getElementsByTagName("westBoundLongitude")[0]?.textContent;
      const eastBound = geoBounds.getElementsByTagName("eastBoundLongitude")[0]?.textContent;
      const southBound = geoBounds.getElementsByTagName("southBoundLatitude")[0]?.textContent;
      const northBound = geoBounds.getElementsByTagName("northBoundLatitude")[0]?.textContent;

      if (westBound && eastBound && southBound && northBound) {
        const reprojected = reprojectExtentToWebMercator([parseFloat(westBound), parseFloat(southBound), parseFloat(eastBound), parseFloat(northBound)], 4326);
        if (reprojected) return reprojected;
      }
    }

    // Fall back to a CRS-specific BoundingBox that's already in Web Mercator.
    const bboxes = layer.getElementsByTagName("BoundingBox");
    for (let j = 0; j < bboxes.length; j++) {
      const bbox = bboxes[j];
      const crs = bbox.getAttribute("CRS") || bbox.getAttribute("SRS");

      if (crs === "EPSG:3857" || crs === "EPSG:900913") {
        const minx = parseFloat(bbox.getAttribute("minx") || "0");
        const miny = parseFloat(bbox.getAttribute("miny") || "0");
        const maxx = parseFloat(bbox.getAttribute("maxx") || "0");
        const maxy = parseFloat(bbox.getAttribute("maxy") || "0");

        if (minx && miny && maxx && maxy && minx < maxx && miny < maxy) {
          return [minx, miny, maxx, maxy];
        }
      }
    }

    // Matched the layer but found no usable bounding box - stop searching.
    break;
  }

  return null;
}

/**
 * Fetch a WMS layer's extent (as an EPSG:3857 bounding box) from GeoServer's GetCapabilities,
 * scoped to the layer's own workspace/layer virtual service endpoint for speed (see
 * `buildLayerScopedCapabilitiesUrl`). Automatically attaches a bearer token for secured
 * GeoServer endpoints (`opengis2.simcoe.ca`) via `fetchWithAuth`.
 *
 * @param wmsUrl - Base WMS URL (global `.../geoserver/wms`, or an already workspace/group
 *   scoped virtual-service URL such as `.../geoserver/<ws>/<group>/ows`).
 * @param fullLayerName - The workspace-qualified layer name, e.g. "simcoe:Assessment Parcel".
 * @returns The layer's extent in EPSG:3857, or null if it couldn't be determined.
 */
export async function fetchWmsLayerExtent(wmsUrl: string, fullLayerName: string): Promise<number[] | null> {
  const capabilitiesUrl = buildLayerScopedCapabilitiesUrl(wmsUrl, fullLayerName);
  const { layerName: unprefixedLayerName } = splitWorkspaceLayerName(fullLayerName);

  try {
    const response = await fetchWithAuth(capabilitiesUrl);
    const capabilitiesText = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(capabilitiesText, "text/xml");

    return extractLayerExtentFromCapabilities(xmlDoc, fullLayerName, unprefixedLayerName);
  } catch (error) {
    console.warn("[GeoServerClient] Failed to fetch WMS layer extent:", error);
    return null;
  }
}
