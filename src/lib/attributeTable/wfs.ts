/**
 * WFS client for the Attribute Table.
 * ----------------------------------------------------------------------------
 * Thin wrappers around WFS 2.0 GetFeature + GetCount, designed to be cheap
 * and cancellable. All requests take an AbortSignal; all return types include
 * enough metadata for the store to update paging state.
 *
 * We deliberately do NOT use the older `maxFeatures`/`typeName` (1.1) form —
 * GeoServer happily serves WFS 2.0 for our layers and `startIndex` paging is
 * essential for the attribute table. If a layer is WFS 1.1-only, we fall back
 * automatically when a 2.0 request fails.
 */

import { getAccessToken, isSecuredUrl } from "@/utils/auth";
import type { ColumnType } from "@/lib/attributeTable/columnarStore";
import { isWorkerSupported, workerParseGeoJson } from "@/lib/attributeTable/workerClient";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Server refused to page without a primary key (or explicit sort). The loader
 * catches this and retries with an implicit sortBy derived from the schema.
 */
export class WfsPrimaryKeyError extends Error {
  constructor() {
    super("WFS layer has no primary key; an explicit sortBy is required for paging.");
    this.name = "WfsPrimaryKeyError";
  }
}

/** Generic exception reported by GeoServer's ows:ExceptionReport XML. */
export class WfsException extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "WfsException";
  }
}

const PK_ERROR_RE = /cannot do natural order without a primary key/i;

function parseExceptionReport(xml: string): WfsException | null {
  const codeM = /exceptionCode\s*=\s*"([^"]+)"/i.exec(xml);
  const textM = /<ows:ExceptionText[^>]*>([\s\S]*?)<\/ows:ExceptionText>/i.exec(xml) ?? /<ExceptionText[^>]*>([\s\S]*?)<\/ExceptionText>/i.exec(xml);
  if (!codeM && !textM) return null;
  const code = codeM?.[1] ?? "Unknown";
  const text = (textM?.[1] ?? "Unknown error").trim();
  if (PK_ERROR_RE.test(text)) return new WfsPrimaryKeyError() as unknown as WfsException;
  return new WfsException(code, text);
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/**
 * Given a `wfsUrl` field from the TOC layer (which may already contain query
 * parameters or even template placeholders from the identify pipeline), return
 * a clean base endpoint like `https://…/geoserver/wfs`.
 */
export function extractWfsBase(wfsUrl: string): string {
  // Strip any ?… portion — we rebuild all params ourselves.
  const q = wfsUrl.indexOf("?");
  const base = q >= 0 ? wfsUrl.slice(0, q) : wfsUrl;
  // Trailing slash is fine; GeoServer treats /wfs and /wfs/ identically.
  return base;
}

function joinParams(base: string, params: Record<string, string | number | undefined>): string {
  const sep = base.includes("?") ? "&" : "?";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    parts.push(`${k}=${encodeURIComponent(String(v))}`);
  }
  return `${base}${sep}${parts.join("&")}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WfsPageOptions {
  wfsUrl: string;
  layerName: string;
  startIndex?: number;
  count?: number;
  sortBy?: { field: string; direction: "A" | "D" };
  cqlFilter?: string;
  bbox?: [number, number, number, number];
  srsName?: string;
  /** Attribute fields to fetch (geometry excluded by default). */
  propertyNames?: string[];
  /** Include geometry (default false for attribute-table grid). */
  includeGeometry?: boolean;
  signal?: AbortSignal;
}

export interface WfsPageResult {
  features: Array<{ id?: string | number; properties: Record<string, unknown> | null; geometry?: unknown }>;
  /** Total matched (if GeoServer returns `numberMatched`). */
  numberMatched?: number;
  /** Returned in this page. */
  numberReturned: number;
}

export interface WfsCountOptions {
  wfsUrl: string;
  layerName: string;
  cqlFilter?: string;
  bbox?: [number, number, number, number];
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function authedFetch(url: string, signal: AbortSignal | undefined, acceptJson = true): Promise<Response> {
  const headers: Record<string, string> = {};
  if (acceptJson) headers["Accept"] = "application/json";

  if (isSecuredUrl(url)) {
    const token = await getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { method: "GET", mode: "cors", headers, signal });
  if (!res.ok) {
    // GeoServer often returns 200 + XML exception, but some deployments return
    // 4xx with the same payload. Try to parse either way.
    const body = await res.text().catch(() => "");
    const ex = body ? parseExceptionReport(body) : null;
    if (ex) throw ex;
    throw new Error(`WFS request failed (${res.status}): ${url}`);
  }
  return res;
}

/**
 * Wrap a JSON-expecting fetch: if GeoServer returns an XML exception with
 * HTTP 200, surface it as a typed error so callers can retry.
 */
async function authedFetchJson<T>(url: string, signal: AbortSignal | undefined): Promise<T> {
  const res = await authedFetch(url, signal, true);
  const text = await res.text();
  // GeoServer sometimes answers 200 + XML when something is wrong.
  if (text.startsWith("<?xml") || /<ows:ExceptionReport/i.test(text)) {
    const ex = parseExceptionReport(text);
    if (ex) throw ex;
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`WFS returned non-JSON response: ${(e as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch one page of features as GeoJSON.
 * `includeGeometry=false` drops the geometry column via `propertyName=…` so
 * payloads stay small — this is the common path for the grid.
 */
export async function fetchWfsPage(opts: WfsPageOptions): Promise<WfsPageResult> {
  const base = `${extractWfsBase(opts.wfsUrl)}`;

  const params: Record<string, string | number | undefined> = {
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: opts.layerName,
    outputFormat: "application/json",
    srsName: opts.srsName ?? "EPSG:3857",
    count: opts.count ?? 1000,
  };

  // Only send startIndex/sortBy when the caller asked us to page. GeoServer
  // rejects `startIndex` on tables without a primary key ("cannot do natural
  // order…"), so for unpaged fetches we must omit both.
  if (typeof opts.startIndex === "number" && opts.startIndex > 0) {
    params["startIndex"] = opts.startIndex;
  }
  if (opts.sortBy) {
    params["sortBy"] = `${opts.sortBy.field} ${opts.sortBy.direction}`;
  }
  if (opts.cqlFilter && opts.cqlFilter.length > 0) {
    params["CQL_FILTER"] = opts.cqlFilter;
  } else if (opts.bbox) {
    params["bbox"] = `${opts.bbox.join(",")},${opts.srsName ?? "EPSG:3857"}`;
  }

  if (opts.propertyNames && opts.propertyNames.length > 0 && !opts.includeGeometry) {
    params["propertyName"] = opts.propertyNames.join(",");
  }

  const url = joinParams(base, params);

  // For small pages (typical 1000 rows ≈ 1–2 MB) main-thread parse is ~10–30
  // ms and the worker's postMessage round-trip isn't worth it. For larger
  // responses we transfer the ArrayBuffer to the worker and parse there.
  const WORKER_PARSE_THRESHOLD_BYTES = 2_000_000;

  const res = await authedFetch(url, opts.signal, true);
  const contentLengthHeader = Number(res.headers.get("content-length") ?? "0");
  const useWorker = isWorkerSupported() && contentLengthHeader > WORKER_PARSE_THRESHOLD_BYTES;

  let json: {
    features?: Array<{ id?: string | number; properties?: Record<string, unknown> | null; geometry?: unknown }>;
    numberMatched?: number | string;
    numberReturned?: number | string;
    totalFeatures?: number | string;
  };

  if (useWorker) {
    const buf = await res.arrayBuffer();
    // Before handing off: peek for an XML exception in the first 256 bytes.
    const head = new TextDecoder("utf-8").decode(new Uint8Array(buf, 0, Math.min(256, buf.byteLength)));
    if (head.startsWith("<?xml") || /<ows:ExceptionReport/i.test(head)) {
      const full = new TextDecoder("utf-8").decode(new Uint8Array(buf));
      const ex = parseExceptionReport(full);
      if (ex) throw ex;
    }
    const parsed = await workerParseGeoJson(buf, opts.includeGeometry ?? false);
    return {
      features: parsed.features,
      numberMatched: parsed.numberMatched,
      numberReturned: parsed.numberReturned,
    };
  } else {
    const text = await res.text();
    if (text.startsWith("<?xml") || /<ows:ExceptionReport/i.test(text)) {
      const ex = parseExceptionReport(text);
      if (ex) throw ex;
    }
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`WFS returned non-JSON response: ${(e as Error).message}`);
    }
  }

  const features = (json.features ?? []).map((f) => ({
    id: f.id,
    properties: f.properties ?? {},
    geometry: opts.includeGeometry ? f.geometry : undefined,
  }));

  const numberMatched =
    typeof json.numberMatched === "number" ? json.numberMatched : typeof json.numberMatched === "string" ? Number(json.numberMatched) : typeof json.totalFeatures === "number" ? json.totalFeatures : Number(json.totalFeatures ?? NaN);

  return {
    features,
    numberMatched: Number.isFinite(numberMatched) ? numberMatched : undefined,
    numberReturned: features.length,
  };
}

/**
 * Fetch total feature count via `resultType=hits`. Response is small XML; we
 * parse the `numberMatched` / `numberOfFeatures` attribute with a regex rather
 * than pulling in a DOMParser dep.
 */
export async function fetchWfsCount(opts: WfsCountOptions): Promise<number> {
  const base = extractWfsBase(opts.wfsUrl);
  const params: Record<string, string | number | undefined> = {
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: opts.layerName,
    resultType: "hits",
  };
  if (opts.cqlFilter) params["CQL_FILTER"] = opts.cqlFilter;
  else if (opts.bbox) params["bbox"] = opts.bbox.join(",");

  const url = joinParams(base, params);
  const res = await authedFetch(url, opts.signal, false);
  const text = await res.text();

  // GeoServer occasionally returns 200 + XML exception.
  if (/<ows:ExceptionReport/i.test(text)) {
    const ex = parseExceptionReport(text);
    if (ex) throw ex;
  }

  // WFS 2.0: numberMatched; WFS 1.1: numberOfFeatures. Match either.
  const m = /number(?:Matched|OfFeatures)\s*=\s*"(\d+)"/i.exec(text);
  return m ? Number(m[1]) : 0;
}

/**
 * Fetch a single feature (with geometry) by its fid.
 * Used on-demand for zoom-to-feature and map highlight — we never keep
 * geometries in the grid store.
 *
 * GeoServer auto-generates fids like `Library.fid--1574c53d_...` for
 * PK-less layers, and these don't always round-trip via `featureID` on
 * WFS 2.0. We try three variants and return the first that yields a
 * geometry:
 *   1. WFS 2.0 stored query `urn:ogc:def:query:OGC-WFS::GetFeatureById`
 *   2. WFS 2.0 `resourceID=<fid>`
 *   3. WFS 1.x-style `featureID=<fid>` (legacy fallback)
 */
export async function fetchFeatureById(wfsUrl: string, layerName: string, fid: string, signal?: AbortSignal): Promise<{ id?: string | number; properties: Record<string, unknown> | null; geometry: unknown } | null> {
  const base = extractWfsBase(wfsUrl);

  const common = {
    service: "WFS",
    version: "2.0.0",
    outputFormat: "application/json",
    srsName: "EPSG:3857",
  } as const;

  const attempts: Array<{ name: string; url: string }> = [
    // 1. WFS 2.0 stored query — works for PK-less auto-generated fids.
    {
      name: "storedQuery:GetFeatureById",
      url: joinParams(base, {
        ...common,
        request: "GetFeature",
        STOREDQUERY_ID: "urn:ogc:def:query:OGC-WFS::GetFeatureById",
        ID: fid,
      }),
    },
    // 2. WFS 2.0 resourceID.
    {
      name: "resourceID",
      url: joinParams(base, {
        ...common,
        request: "GetFeature",
        typeNames: layerName,
        resourceID: fid,
      }),
    },
    // 3. WFS 1.x featureID.
    {
      name: "featureID",
      url: joinParams(base, {
        ...common,
        request: "GetFeature",
        typeNames: layerName,
        featureID: fid,
      }),
    },
  ];

  for (const { name, url } of attempts) {
    if (signal?.aborted) return null;
    try {
      const json = await authedFetchJson<{ features?: Array<{ id?: string | number; properties?: Record<string, unknown> | null; geometry?: unknown }> }>(url, signal);
      const f = json.features?.[0];
      if (f && f.geometry) {
        return { id: f.id, properties: f.properties ?? {}, geometry: f.geometry };
      }
      console.debug(`[attributeTable] fetchFeatureById(${name}) returned no geometry`, { url, count: json.features?.length ?? 0 });
    } catch (err) {
      console.debug(`[attributeTable] fetchFeatureById(${name}) threw`, err);
      // try next variant
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// DescribeFeatureType — schema + primary key discovery
// ---------------------------------------------------------------------------

export interface WfsFieldDescriptor {
  name: string;
  type: ColumnType;
  nillable: boolean;
  /** Display alias (ArcGIS layers only — from the layer JSON `fields[].alias`). */
  alias?: string;
  /** true for geometry fields (gml:* types). Not added to grid schema. */
  isGeometry: boolean;
  /** true if the raw XSD type was xsd:ID / xsd:IDREF — great sort candidate. */
  isIdLike: boolean;
}

/**
 * Fetch and parse the XML schema GeoServer returns for a typeName. Used to
 * (a) surface a reliable schema before any features are loaded, and
 * (b) pick an implicit sortBy field so paging works on tables without a PK.
 */
export async function describeFeatureType(wfsUrl: string, layerName: string, signal?: AbortSignal): Promise<WfsFieldDescriptor[]> {
  const base = extractWfsBase(wfsUrl);
  const url = joinParams(base, {
    service: "WFS",
    version: "2.0.0",
    request: "DescribeFeatureType",
    typeNames: layerName,
  });
  const res = await authedFetch(url, signal, false);
  const xml = await res.text();
  if (/<ows:ExceptionReport/i.test(xml)) {
    const ex = parseExceptionReport(xml);
    if (ex) throw ex;
  }
  return parseFeatureTypeSchema(xml);
}

/**
 * Pure XML parser for GeoServer's XSD response. Extracted for unit testing.
 *
 * Uses DOMParser when available (browser, jsdom) and falls back to a tolerant
 * regex-based extraction otherwise — useful in headless Node environments.
 */
export function parseFeatureTypeSchema(xml: string): WfsFieldDescriptor[] {
  const fields: WfsFieldDescriptor[] = [];

  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    // Navigate into the innermost xsd:sequence (GeoServer wraps in extension)
    const elements = Array.from(doc.getElementsByTagNameNS("*", "element"));
    for (const el of elements) {
      const name = el.getAttribute("name");
      const rawType = el.getAttribute("type") ?? "";
      if (!name || !rawType) continue;
      // Skip top-level feature element (it doesn't have a primitive type)
      if (/^gml:AbstractFeatureType$/i.test(rawType)) continue;
      fields.push(xsdTypeToField(name, rawType, el.getAttribute("nillable")));
    }
  } else {
    // Regex fallback — tolerant of namespace prefix variations.
    const re = /<(?:xsd|xs)?:?element\b([^/>]*?)\/>/gi;
    for (let m; (m = re.exec(xml)); ) {
      const attrs = m[1];
      const name = /\bname\s*=\s*"([^"]+)"/i.exec(attrs)?.[1];
      const type = /\btype\s*=\s*"([^"]+)"/i.exec(attrs)?.[1];
      const nillable = /\bnillable\s*=\s*"([^"]+)"/i.exec(attrs)?.[1];
      if (!name || !type) continue;
      if (/^gml:AbstractFeatureType$/i.test(type)) continue;
      fields.push(xsdTypeToField(name, type, nillable ?? null));
    }
  }
  return fields;
}

function xsdTypeToField(name: string, rawType: string, nillableAttr: string | null): WfsFieldDescriptor {
  const t = rawType.toLowerCase();
  const nillable = nillableAttr !== "false";
  const isGeometry = t.startsWith("gml:");
  const isIdLike = /(^|:)id(ref)?$/i.test(rawType);

  let type: ColumnType;
  if (isGeometry) {
    type = "string"; // placeholder, caller should filter with isGeometry
  } else if (/(^|:)(boolean)$/.test(t)) {
    type = "boolean";
  } else if (/(^|:)(int|integer|long|short|byte|double|float|decimal|unsignedint|unsignedlong|negativeinteger|nonnegativeinteger|positiveinteger)$/.test(t)) {
    type = "number";
  } else if (/(^|:)(date|datetime|time|gyear)$/.test(t)) {
    type = "date";
  } else {
    type = "string";
  }

  return { name, type, nillable, isGeometry, isIdLike };
}

/**
 * Pick a stable sort field for paging when the user hasn't chosen one.
 *
 * Priority:
 *   1. An xsd:ID-typed field (actual primary key in the schema).
 *   2. A non-nullable field whose name looks like an identifier.
 *   3. Any non-nullable number field.
 *   4. Any non-nullable string field.
 *   5. First attribute column at all.
 *
 * Returns null when there are no usable attribute fields — the caller should
 * fall back to "no paging" mode in that case.
 */
export function pickImplicitSortField(fields: WfsFieldDescriptor[]): string | null {
  const attrs = fields.filter((f) => !f.isGeometry);
  if (attrs.length === 0) return null;

  const nameLooksLikeId = (n: string) => /^(object|fe|g)?(id|fid|gid|oid|uid|uuid|key|num)$/i.test(n) || /^(object|feat|f)id$/i.test(n);

  // Only return a field if it is genuinely a primary-key candidate. Falling
  // back to arbitrary string/number columns causes GeoServer to error with
  // "cannot do natural order without a primary key" when those columns are
  // not unique. When no PK candidate exists, return null so the loader can
  // do a single unpaged fetch instead of trying to page.
  const byIdLike = attrs.find((f) => f.isIdLike);
  if (byIdLike) return byIdLike.name;

  const byNameId = attrs.find((f) => !f.nillable && nameLooksLikeId(f.name));
  if (byNameId) return byNameId.name;

  return null;
}
