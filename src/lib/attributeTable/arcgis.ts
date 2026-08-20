/**
 * ArcGIS REST client for the Attribute Table
 * ----------------------------------------------------------------------------
 * Mirrors the public surface of `./wfs.ts` but speaks ArcGIS REST. The
 * attribute-table loader (`useAttributeTableLoader`) detects the layer type
 * and calls the matching module.
 *
 * Supported endpoints:
 *   - GET {layerUrl}?f=json                    → field metadata + objectIdField
 *   - GET {layerUrl}/query?where=...&f=json    → paged feature rows
 *   - GET {layerUrl}/query?returnCountOnly=true → total count
 *
 * Auth: secured services use a token from `useArcGISTokenStore`. If the
 * templated layer URL already carries a `?token=` we reuse it; otherwise we
 * pull a fresh one from the store on demand.
 */

import type { ColumnType } from "./columnarStore";
import type { WfsFieldDescriptor, WfsPageResult } from "./wfs";
import { parseArcgisFieldsMetadata, type ArcgisCodedValue } from "@/utils/arcgisFieldMetadata";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Server refused to page via `resultOffset`/`resultRecordCount`. Raised when
 * the `/query` endpoint returns `{ error: { code: 400, message: "Pagination
 * is not supported." } }`. The loader catches this and retries with an
 * unpaged fetch (no offset, no orderByFields), mirroring the way
 * `WfsPrimaryKeyError` is handled on the GeoServer side.
 */
export class ArcgisPaginationNotSupportedError extends Error {
  constructor() {
    super("ArcGIS layer does not support pagination.");
    this.name = "ArcgisPaginationNotSupportedError";
  }
}

const ARCGIS_PAGINATION_ERROR_RE = /pagination is not supported/i;
import { useArcGISTokenStore } from "@/stores/arcgisTokenStore";
import { useMapStore } from "@/stores/mapStore";
import EsriJSON from "ol/format/EsriJSON";
import GeoJSON from "ol/format/GeoJSON";
import type Feature from "ol/Feature";

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

export interface ArcgisEndpoint {
  /** Service root, e.g. `https://host/arcgis/rest/services/Name/MapServer` */
  serviceUrl: string;
  /** Sub-layer id on that service, e.g. 3 */
  layerId: number;
  /** Fully-qualified layer URL (serviceUrl + "/" + layerId). */
  layerUrl: string;
  /** Token embedded in the URL, if any. */
  tokenFromUrl: string | null;
}

/**
 * Extract the ArcGIS service URL and sub-layer id from the `wfsUrl` that
 * `tocHelpers.buildESRILayer()` constructs for ArcGIS layers. That URL is
 * of the form:
 *   `${serviceUrl}/identify?geometry=#GEOMETRY#&layers=visible%3A${id}&…&token=xxx`
 *
 * Returns null if the URL doesn't look like an ArcGIS MapServer/FeatureServer
 * identify template, in which case the caller should fall back to WFS.
 */
export function parseArcgisLayerUrl(url: string): ArcgisEndpoint | null {
  if (!url) return null;
  // Any /rest/services path with /MapServer or /FeatureServer in it.
  const svcRe = /^(.*?\/rest\/services\/[^?]+?\/(?:MapServer|FeatureServer))\b/i;
  const m = svcRe.exec(url);
  if (!m) return null;
  const serviceUrl = m[1].replace(/\/+$/, "");

  // Find the layer id. Two shapes: `layers=visible:<id>` (identify URL) or
  // `/MapServer/<id>` (direct layer URL).
  let layerId = -1;
  const visibleMatch = /[?&]layers=(?:visible%3A|visible:)(\d+)/i.exec(url);
  if (visibleMatch) layerId = Number(visibleMatch[1]);
  if (layerId < 0) {
    // Strip query string, then look for trailing /<number> after service root.
    const noQuery = url.split("?")[0];
    const idMatch = new RegExp(`^${escapeRegex(serviceUrl)}/(\\d+)(?:/|$)`, "i").exec(noQuery);
    if (idMatch) layerId = Number(idMatch[1]);
  }
  if (layerId < 0) return null;

  // Token from URL (raw or encoded).
  let tokenFromUrl: string | null = null;
  const tokenMatch = /[?&]token=([^&]+)/i.exec(url);
  if (tokenMatch) tokenFromUrl = decodeURIComponent(tokenMatch[1]);

  return {
    serviceUrl,
    layerId,
    layerUrl: `${serviceUrl}/${layerId}`,
    tokenFromUrl,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function resolveToken(endpoint: ArcgisEndpoint, secured: boolean): Promise<string | null> {
  if (endpoint.tokenFromUrl) return endpoint.tokenFromUrl;
  if (!secured) return null;
  try {
    const t = await useArcGISTokenStore.getState().getValidToken();
    return t ?? null;
  } catch {
    return null;
  }
}

function withToken(url: string, token: string | null): string {
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

async function fetchJson<T>(url: string, signal: AbortSignal | undefined): Promise<T> {
  const res = await fetch(url, { method: "GET", mode: "cors", signal });
  if (!res.ok) {
    throw new Error(`ArcGIS request failed (${res.status}): ${url}`);
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`ArcGIS returned non-JSON response: ${(e as Error).message}`);
  }
  // ArcGIS returns 200 + `{ error: { code, message } }` on most failures.
  const err = (json as { error?: { code?: number; message?: string; details?: string[] } }).error;
  if (err && (err.code || err.message)) {
    const details = err.details?.join("; ") ?? "";
    throw new Error(`ArcGIS error ${err.code ?? "?"}: ${err.message ?? ""}${details ? ` (${details})` : ""}`);
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// DescribeFeatureType analog — service metadata
// ---------------------------------------------------------------------------

interface ArcgisServiceInfo {
  fields?: Array<{
    name: string;
    type: string; // e.g. esriFieldTypeString, esriFieldTypeOID, …
    alias?: string;
    nullable?: boolean;
    domain?: {
      type?: string;
      codedValues?: Array<{ name?: unknown; code?: unknown }>;
    } | null;
  }>;
  objectIdField?: string;
  /** Older services expose the OID field via 'displayField' or 'fields'. */
  globalIdField?: string;
  geometryType?: string;
  maxRecordCount?: number;
  supportsPagination?: boolean;
  advancedQueryCapabilities?: { supportsPagination?: boolean; supportsOrderBy?: boolean };
  extent?: { spatialReference?: { wkid?: number; latestWkid?: number } };
  sourceSpatialReference?: { wkid?: number; latestWkid?: number };
}

/**
 * Module-level cache of native spatial reference by layer URL. Populated
 * lazily — the per-feature REST endpoint (`{layerUrl}/{oid}?f=json`) does
 * not include `spatialReference` in its response, so we need to know the
 * layer's native SR to reproject client-side.
 */
const layerSpatialReferenceCache = new Map<string, { wkid?: number; latestWkid?: number } | null>();

async function getLayerSpatialReference(
  endpoint: ArcgisEndpoint,
  token: string | null,
  signal?: AbortSignal,
): Promise<{ wkid?: number; latestWkid?: number } | null> {
  const cached = layerSpatialReferenceCache.get(endpoint.layerUrl);
  if (cached !== undefined) return cached;
  try {
    const info = await fetchJson<ArcgisServiceInfo>(withToken(`${endpoint.layerUrl}?f=json`, token), signal);
    const sr = info.sourceSpatialReference ?? info.extent?.spatialReference ?? null;
    layerSpatialReferenceCache.set(endpoint.layerUrl, sr);
    return sr;
  } catch {
    layerSpatialReferenceCache.set(endpoint.layerUrl, null);
    return null;
  }
}

function esriTypeToColumnType(esriType: string): ColumnType {
  switch (esriType) {
    case "esriFieldTypeSmallInteger":
    case "esriFieldTypeInteger":
    case "esriFieldTypeSingle":
    case "esriFieldTypeDouble":
    case "esriFieldTypeOID":
      return "number";
    case "esriFieldTypeDate":
      return "date";
    case "esriFieldTypeGeometry":
      return "string"; // shouldn't reach the schema — filtered out
    default:
      return "string";
  }
}

export async function describeArcgisLayer(endpoint: ArcgisEndpoint, secured: boolean, signal?: AbortSignal): Promise<{
  fields: WfsFieldDescriptor[];
  objectIdField: string;
  maxRecordCount: number;
  supportsPagination: boolean;
  /** field name (lowercase) → coded values, for fields with a codedValue domain. */
  domains: Record<string, ArcgisCodedValue[]>;
}> {
  const token = await resolveToken(endpoint, secured);
  const url = withToken(`${endpoint.layerUrl}?f=json`, token);
  const info = await fetchJson<ArcgisServiceInfo>(url, signal);

  const fields: WfsFieldDescriptor[] = [];
  const objectIdField = info.objectIdField ?? findOidField(info.fields) ?? "OBJECTID";
  const domains = parseArcgisFieldsMetadata(info.fields).domains;

  for (const f of info.fields ?? []) {
    // Skip geometry / shape length/area — users don't want these in the grid.
    if (f.type === "esriFieldTypeGeometry") continue;
    if (/^(shape|st)_(length|area)$/i.test(f.name)) continue;

    fields.push({
      name: f.name,
      type: esriTypeToColumnType(f.type),
      nillable: f.nullable !== false,
      isGeometry: false,
      isIdLike: f.type === "esriFieldTypeOID" || f.name === objectIdField,
      // Surface the alias only when it adds information over the raw name.
      alias: typeof f.alias === "string" && f.alias.length > 0 && f.alias.toLowerCase() !== f.name.toLowerCase() ? f.alias : undefined,
    });
  }

  const supportsPagination =
    info.supportsPagination === true ||
    info.advancedQueryCapabilities?.supportsPagination === true;

  return {
    fields,
    objectIdField,
    maxRecordCount: info.maxRecordCount ?? 1000,
    supportsPagination,
    domains,
  };
}

function findOidField(fields: ArcgisServiceInfo["fields"]): string | null {
  if (!fields) return null;
  const oid = fields.find((f) => f.type === "esriFieldTypeOID");
  return oid?.name ?? null;
}

// ---------------------------------------------------------------------------
// Count
// ---------------------------------------------------------------------------

export async function fetchArcgisCount(opts: {
  endpoint: ArcgisEndpoint;
  secured: boolean;
  where?: string;
  bbox?: [number, number, number, number];
  signal?: AbortSignal;
}): Promise<number> {
  const token = await resolveToken(opts.endpoint, opts.secured);
  const params = new URLSearchParams();
  params.set("where", opts.where && opts.where.length > 0 ? opts.where : "1=1");
  params.set("returnCountOnly", "true");
  params.set("f", "json");
  if (opts.bbox) {
    params.set("geometry", bboxToEnvelopeJson(opts.bbox));
    params.set("geometryType", "esriGeometryEnvelope");
    params.set("inSR", "3857");
    params.set("spatialRel", "esriSpatialRelIntersects");
  }
  const url = withToken(`${opts.endpoint.layerUrl}/query?${params.toString()}`, token);
  const json = await fetchJson<{ count?: number }>(url, opts.signal);
  return typeof json.count === "number" ? json.count : 0;
}

// ---------------------------------------------------------------------------
// Page fetch
// ---------------------------------------------------------------------------

export interface ArcgisPageOptions {
  endpoint: ArcgisEndpoint;
  secured: boolean;
  objectIdField: string;
  startIndex: number;
  count: number;
  sortBy?: { field: string; direction: "A" | "D" };
  where?: string;
  bbox?: [number, number, number, number];
  includeGeometry?: boolean;
  /**
   * If false, omit `resultOffset`, `resultRecordCount`, and `orderByFields`
   * — used when the layer advertises `supportsPagination: false` or the
   * server has previously rejected a paginated request with
   * {@link ArcgisPaginationNotSupportedError}. The response will contain
   * up to the service's `maxRecordCount` features.
   */
  supportsPagination?: boolean;
  signal?: AbortSignal;
}

export async function fetchArcgisPage(opts: ArcgisPageOptions): Promise<WfsPageResult> {
  const token = await resolveToken(opts.endpoint, opts.secured);
  const params = new URLSearchParams();
  params.set("where", opts.where && opts.where.length > 0 ? opts.where : "1=1");
  params.set("outFields", "*");
  // Use esriJSON (`f=json`) rather than `f=geojson`: some services return
  // `geometry: null` when the geojson output conversion fails on curves or
  // unusual geometry types. esriJSON is the authoritative format — we
  // convert it to GeoJSON client-side via ol/format/EsriJSON.
  params.set("f", "json");
  params.set("returnGeometry", opts.includeGeometry ? "true" : "false");
  const paged = opts.supportsPagination !== false;
  if (paged) {
    params.set("resultOffset", String(opts.startIndex));
    params.set("resultRecordCount", String(opts.count));
    // ArcGIS requires a stable order for resultOffset paging to be deterministic.
    const sortField = opts.sortBy?.field ?? opts.objectIdField;
    const sortDir = opts.sortBy?.direction === "D" ? "DESC" : "ASC";
    params.set("orderByFields", `${sortField} ${sortDir}`);
  }
  // Intentionally no `outSR`: some ArcGIS deployments silently strip
  // geometry when they can't reproject to the requested SR on-the-fly.
  // We let the server return in its native SR and reproject client-side
  // via ol/format/EsriJSON (which reads `spatialReference` from the
  // FeatureSet response and applies it to each geometry).
  if (opts.bbox) {
    params.set("geometry", bboxToEnvelopeJson(opts.bbox));
    params.set("geometryType", "esriGeometryEnvelope");
    params.set("inSR", "3857");
    params.set("spatialRel", "esriSpatialRelIntersects");
  }
  const url = withToken(`${opts.endpoint.layerUrl}/query?${params.toString()}`, token);

  // esriJSON response: { features: [{attributes, geometry}], objectIdFieldName? }
  let json: {
    features?: Array<{ attributes?: Record<string, unknown>; geometry?: unknown }>;
    objectIdFieldName?: string;
    spatialReference?: { wkid?: number; latestWkid?: number };
  };
  try {
    json = await fetchJson(url, opts.signal);
  } catch (err) {
    // Some services advertise pagination support but still reject the
    // combination of parameters we send — surface a typed error so the
    // loader can retry unpaged.
    if (paged && err instanceof Error && ARCGIS_PAGINATION_ERROR_RE.test(err.message)) {
      throw new ArcgisPaginationNotSupportedError();
    }
    throw err;
  }

  const features = esriFeaturesToGeoJson(json, opts.objectIdField, opts.includeGeometry ?? false);

  return {
    features,
    numberMatched: null,
    numberReturned: features.length,
  };
}

// ---------------------------------------------------------------------------
// Single feature by OID
// ---------------------------------------------------------------------------

export async function fetchArcgisFeatureById(
  endpoint: ArcgisEndpoint,
  secured: boolean,
  objectIdField: string,
  fid: string,
  signal?: AbortSignal,
): Promise<{ id?: string | number; properties: Record<string, unknown> | null; geometry: unknown } | null> {
  const token = await resolveToken(endpoint, secured);

  // Prefer the per-feature endpoint `{layerUrl}/{oid}?f=json`. It returns
  // `{ feature: { attributes, geometry } }` and is the only shape that
  // reliably includes geometry on some older ArcGIS deployments where
  // `/query` silently strips it. The response doesn't carry its own
  // `spatialReference`, so we fetch (and cache) the layer's native SR.
  const cleanFid = fid.replace(/[^0-9-]/g, "");
  const featureUrl = withToken(`${endpoint.layerUrl}/${cleanFid}?f=json`, token);
  try {
    const [json, layerSr] = await Promise.all([
      fetchJson<{
        feature?: { attributes?: Record<string, unknown>; geometry?: unknown };
      }>(featureUrl, signal),
      getLayerSpatialReference(endpoint, token, signal),
    ]);
    if (json.feature) {
      const wrapped = {
        features: [json.feature],
        spatialReference: layerSr ?? undefined,
      };
      const features = esriFeaturesToGeoJson(wrapped, objectIdField, true);
      const f = features[0];
      if (f && f.geometry) {
        return { id: f.id, properties: f.properties ?? null, geometry: f.geometry };
      }
    }
  } catch {
    // fall through to /query fallback
  }

  // Fallback: /query (some services don't expose the per-feature endpoint).
  const params = new URLSearchParams();
  params.set("where", `${objectIdField}=${cleanFid}`);
  params.set("outFields", "*");
  params.set("f", "json");
  params.set("returnGeometry", "true");
  const url = withToken(`${endpoint.layerUrl}/query?${params.toString()}`, token);
  const json = await fetchJson<{
    features?: Array<{ attributes?: Record<string, unknown>; geometry?: unknown }>;
    objectIdFieldName?: string;
    spatialReference?: { wkid?: number; latestWkid?: number };
  }>(url, signal);
  const features = esriFeaturesToGeoJson(json, objectIdField, true);
  const f = features[0];
  if (!f || !f.geometry) return null;
  return { id: f.id, properties: f.properties ?? null, geometry: f.geometry };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bboxToEnvelopeJson(bbox: [number, number, number, number]): string {
  return JSON.stringify({
    xmin: bbox[0],
    ymin: bbox[1],
    xmax: bbox[2],
    ymax: bbox[3],
    spatialReference: { wkid: 3857 },
  });
}

/**
 * For ArcGIS we always sort by the OID — it's guaranteed unique, ordered,
 * and indexed. This avoids the PK/stable-sort dance needed for GeoServer.
 */
export function pickImplicitSortFieldArcgis(objectIdField: string): string {
  return objectIdField;
}

// ---------------------------------------------------------------------------
// esriJSON → GeoJSON conversion
// ---------------------------------------------------------------------------

/**
 * Parse an esriJSON FeatureSet response into the same shape our loader
 * expects from the WFS path ({ id, properties, geometry } with GeoJSON
 * geometry). Uses OL's EsriJSON → GeoJSON formats so ring orientation,
 * multi-part geometries, and M/Z coordinates are handled correctly.
 */
function esriFeaturesToGeoJson(
  response: {
    features?: Array<{ attributes?: Record<string, unknown>; geometry?: unknown }>;
    spatialReference?: { wkid?: number; latestWkid?: number };
    geometryType?: string;
  },
  objectIdField: string,
  includeGeometry: boolean,
): Array<{ id?: string; properties: Record<string, unknown>; geometry?: unknown }> {
  const raw = response.features ?? [];
  if (raw.length === 0) return [];

  const esri = new EsriJSON();
  const geo = new GeoJSON();

  // Determine the target projection (the map's view projection). If the
  // map isn't ready yet we fall back to EPSG:3857, our app default.
  const map = useMapStore.getState().map;
  const targetProj = map ? map.getView().getProjection().getCode() : "EPSG:3857";

  // Source (data) projection from the response's spatialReference. The
  // server may send wkid=102100 for web mercator — OL understands it as
  // EPSG:3857, but we normalize to the EPSG form.
  const sr = response.spatialReference;
  const srWkid = sr?.latestWkid ?? sr?.wkid;
  const dataProj = srWkid ? `EPSG:${srWkid === 102100 ? 3857 : srWkid}` : undefined;

  // OL's EsriJSON needs the whole FeatureSet so it can pick up the
  // response-level spatialReference and apply it to each geometry.
  let olFeatures: Feature[] = [];
  try {
    olFeatures = esri.readFeatures(response, {
      dataProjection: dataProj,
      featureProjection: targetProj,
    }) as Feature[];
  } catch {
    olFeatures = [];
  }

  // Diagnostic: if the user asked for geometry and the server returned none,
  // log once — helps distinguish server-side strip from our parsing.
  if (includeGeometry && olFeatures.length > 0 && !olFeatures.some((f) => f.getGeometry())) {
    console.warn(
      "[attributeTable/arcgis] Server returned no geometry for any feature. "
        + "This usually means the layer doesn't support query-with-geometry. "
        + "Response shape:",
      { hasGeometryType: !!response.geometryType, hasSpatialReference: !!response.spatialReference, sample: raw[0] },
    );
  }

  const out: Array<{ id?: string; properties: Record<string, unknown>; geometry?: unknown }> = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const props = (r.attributes ?? {}) as Record<string, unknown>;
    const oidVal = props[objectIdField];
    const id = oidVal !== undefined && oidVal !== null ? String(oidVal) : undefined;

    let geometry: unknown = undefined;
    if (includeGeometry) {
      const olFeat = olFeatures[i];
      const g = olFeat?.getGeometry();
      if (g) {
        try {
          // After readFeatures, `g` is in `targetProj` (map projection).
          // writeGeometryObject without options would reproject to OL's
          // default GeoJSON projection (EPSG:4326) — which downstream
          // consumers would then mis-interpret as Web Mercator metres.
          // Pass matching projections so coords stay in the map projection.
          geometry = geo.writeGeometryObject(g, {
            featureProjection: targetProj,
            dataProjection: targetProj,
          });
        } catch {
          geometry = undefined;
        }
      }
    }

    out.push({ id, properties: props, geometry });
  }
  return out;
}
