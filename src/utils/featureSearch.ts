import type { Layer } from "ol/layer";
import { describeFeatureType, extractWfsBase, fetchWfsPage, type WfsFieldDescriptor, type WfsPageResult } from "@/lib/attributeTable/wfs";
import { ArcgisPaginationNotSupportedError, describeArcgisLayer, fetchArcgisPage, parseArcgisLayerUrl, type ArcgisEndpoint } from "@/lib/attributeTable/arcgis";
import type { ManagedLayer } from "@/stores/layerManagerStore";
import type { SearchResult } from "@/types/searchResult";
import { getAccessToken } from "@/utils/auth";
export const FEATURE_SEARCH_MIN_LENGTH = 3;
const MAX_LAYERS = 15;
const MAX_FIELDS_PER_LAYER = 25;
const MAX_FEATURES_PER_LAYER = 5;
const MAX_TOTAL_RESULTS = 25;
const MAX_CONCURRENT_REQUESTS = 6;
const REQUEST_TIMEOUT_MS = 5000;

const SEARCHABLE_CATEGORIES = new Set(["TOC", "Themes"]);
const SAFE_FIELD_NAME = /^[A-Za-z_](?:[A-Za-z0-9_ ]*[A-Za-z0-9_])?$/;

interface WfsTarget {
  kind: "wfs";
  id: string;
  title: string;
  wfsUrl: string;
  typeName: string;
  secured: boolean;
  cacheKey: string;
}

interface ArcgisTarget {
  kind: "arcgis";
  id: string;
  title: string;
  endpoint: ArcgisEndpoint;
  secured: boolean;
  cacheKey: string;
}

export type FeatureSearchTarget = WfsTarget | ArcgisTarget;

interface LayerSearchSchema {
  fields: string[];
  objectIdField: string;
  supportsPagination: boolean;
}

const EMPTY_SCHEMA: LayerSearchSchema = { fields: [], objectIdField: "OBJECTID", supportsPagination: false };
const schemaCache = new Map<string, Promise<LayerSearchSchema>>();

/** Strips LIKE wildcards so user input cannot change the match pattern. */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_]/g, "").trim();
}

function isSafeFieldName(name: string): boolean {
  return SAFE_FIELD_NAME.test(name);
}

/** Double-quotes names with spaces so the filter treats them as one identifier. */
function fieldRef(name: string): string {
  return name.includes(" ") ? `"${name}"` : name;
}

function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildCqlContainsFilter(fields: string[], term: string): string | null {
  const value = sanitizeSearchTerm(term);
  const names = fields.filter(isSafeFieldName);
  if (!value || names.length === 0) return null;
  const literal = escapeLiteral(value.toLowerCase());
  return names.map((name) => `strToLowerCase(${fieldRef(name)}) LIKE '%${literal}%'`).join(" OR ");
}

export function buildArcgisContainsWhere(fields: string[], term: string): string | null {
  const value = sanitizeSearchTerm(term);
  const names = fields.filter(isSafeFieldName);
  if (!value || names.length === 0) return null;
  const literal = escapeLiteral(value.toUpperCase());
  return names.map((name) => `UPPER(${fieldRef(name)}) LIKE '%${literal}%'`).join(" OR ");
}

function deriveWfsUrl(layer: Layer): string | undefined {
  const explicit = layer.get("wfsUrl") as string | undefined;
  if (explicit) return explicit;
  const source = layer.getSource() as unknown as { getUrls?: () => string[] | undefined; getUrl?: () => string | undefined } | null;
  const wmsUrl = typeof source?.getUrls === "function" ? source.getUrls()?.[0] : source?.getUrl?.();
  return wmsUrl?.includes("/wms") ? wmsUrl.replace("/wms", "/wfs") : undefined;
}

function toTarget(managed: ManagedLayer): FeatureSearchTarget | null {
  const { layer } = managed;
  if (!layer.getVisible() || layer.get("queryable") === false) return null;

  const title = String(layer.get("tocDisplayName") || layer.get("displayName") || layer.get("name") || managed.name);
  const url = deriveWfsUrl(layer);
  if (!url) return null;

  if (layer.get("isArcGIS")) {
    const endpoint = parseArcgisLayerUrl(url);
    if (!endpoint) return null;
    return { kind: "arcgis", id: managed.id, title, endpoint, secured: layer.get("secured") === true, cacheKey: `arcgis|${endpoint.layerUrl}` };
  }

  const typeName = layer.get("name") as string | undefined;
  if (!typeName) return null;
  return { kind: "wfs", id: managed.id, title, wfsUrl: url, typeName, secured: layer.get("secured") === true, cacheKey: `wfs|${extractWfsBase(url)}|${typeName}` };
}

/** Visible, queryable TOC/theme layers that expose a WFS or ArcGIS endpoint, top-most first. */
export function getFeatureSearchTargets(managedLayers: ManagedLayer[]): FeatureSearchTarget[] {
  const targets: FeatureSearchTarget[] = [];
  for (const managed of [...managedLayers].reverse()) {
    if (!SEARCHABLE_CATEGORIES.has(managed.category)) continue;
    const target = toTarget(managed);
    if (target) targets.push(target);
    if (targets.length >= MAX_LAYERS) break;
  }
  return targets;
}

function pickSearchableFields(fields: Pick<WfsFieldDescriptor, "name" | "type" | "isGeometry">[]): string[] {
  return fields
    .filter((f) => !f.isGeometry && f.type === "string" && isSafeFieldName(f.name))
    .map((f) => f.name)
    .slice(0, MAX_FIELDS_PER_LAYER);
}

async function describeTarget(target: FeatureSearchTarget, signal: AbortSignal): Promise<LayerSearchSchema> {
  if (target.kind === "arcgis") {
    const info = await describeArcgisLayer(target.endpoint, target.secured, signal);
    return { fields: pickSearchableFields(info.fields), objectIdField: info.objectIdField, supportsPagination: info.supportsPagination };
  }
  const descriptors = await describeFeatureType(target.wfsUrl, target.typeName, signal);
  return { fields: pickSearchableFields(descriptors), objectIdField: "OBJECTID", supportsPagination: false };
}

/** Field metadata is cached per layer. Failures are dropped so the next search retries. */
function loadSchema(target: FeatureSearchTarget): Promise<LayerSearchSchema> {
  const cached = schemaCache.get(target.cacheKey);
  if (cached) return cached;
  const request = createRequestSignal(undefined, REQUEST_TIMEOUT_MS);
  const promise = describeTarget(target, request.signal)
    .catch(() => {
      schemaCache.delete(target.cacheKey);
      return EMPTY_SCHEMA;
    })
    .finally(request.dispose);
  schemaCache.set(target.cacheKey, promise);
  return promise;
}

function createRequestSignal(parent: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (parent?.aborted) controller.abort();
  parent?.addEventListener("abort", onParentAbort);
  const timer = setTimeout(() => controller.abort(new DOMException(`Timed out after ${timeoutMs} ms`, "TimeoutError")), timeoutMs);
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      parent?.removeEventListener("abort", onParentAbort);
    },
  };
}

function pickLabel(props: Record<string, unknown>, fields: string[], term: string, fallback: string): string {
  const needle = sanitizeSearchTerm(term).toLowerCase();
  let firstText: string | undefined;
  for (const field of fields) {
    const value = props[field];
    if (typeof value !== "string" || value.trim() === "") continue;
    if (value.toLowerCase().includes(needle)) return value.trim();
    if (firstText === undefined) firstText = value.trim();
  }
  return firstText ?? fallback;
}

function toSearchResults(target: FeatureSearchTarget, fields: string[], term: string, features: WfsPageResult["features"]): SearchResult[] {
  const results: SearchResult[] = [];
  for (const feature of features) {
    if (!feature.geometry) continue;
    results.push({
      name: pickLabel(feature.properties ?? {}, fields, term, target.title),
      type: "Feature",
      layerName: target.title,
      featureKey: `${target.id}:${feature.id ?? results.length}`,
      geojson: JSON.stringify({ type: "Feature", geometry: feature.geometry, properties: {} }),
    });
    if (results.length >= MAX_FEATURES_PER_LAYER) break;
  }
  return results;
}

async function queryWfs(target: WfsTarget, schema: LayerSearchSchema, term: string, signal: AbortSignal): Promise<SearchResult[]> {
  const cqlFilter = buildCqlContainsFilter(schema.fields, term);
  if (!cqlFilter) return [];
  const page = await fetchWfsPage({
    wfsUrl: target.wfsUrl,
    layerName: target.typeName,
    count: MAX_FEATURES_PER_LAYER,
    cqlFilter,
    includeGeometry: true,
    signal,
  });
  return toSearchResults(target, schema.fields, term, page.features);
}

async function queryArcgis(target: ArcgisTarget, schema: LayerSearchSchema, term: string, signal: AbortSignal): Promise<SearchResult[]> {
  const where = buildArcgisContainsWhere(schema.fields, term);
  if (!where) return [];
  const base = {
    endpoint: target.endpoint,
    secured: target.secured,
    objectIdField: schema.objectIdField,
    startIndex: 0,
    count: MAX_FEATURES_PER_LAYER,
    where,
    includeGeometry: true,
    signal,
  };
  let page: WfsPageResult;
  try {
    page = await fetchArcgisPage({ ...base, supportsPagination: schema.supportsPagination });
  } catch (err) {
    if (!(err instanceof ArcgisPaginationNotSupportedError)) throw err;
    page = await fetchArcgisPage({ ...base, supportsPagination: false });
  }
  return toSearchResults(target, schema.fields, term, page.features);
}

async function queryTarget(target: FeatureSearchTarget, term: string, parentSignal: AbortSignal | undefined): Promise<SearchResult[]> {
  const schema = await loadSchema(target);
  if (schema.fields.length === 0) return [];

  const request = createRequestSignal(parentSignal, REQUEST_TIMEOUT_MS);
  try {
    return target.kind === "arcgis" ? await queryArcgis(target, schema, term, request.signal) : await queryWfs(target, schema, term, request.signal);
  } catch (err) {
    if (parentSignal?.aborted) return [];
    if (request.signal.aborted) console.warn(`[featureSearch] Skipped layer "${target.title}": no response within ${REQUEST_TIMEOUT_MS} ms`);
    else if (err instanceof TypeError) console.warn(`[featureSearch] Skipped layer "${target.title}": request was blocked or unreachable (network or CORS)`);
    else console.warn(`[featureSearch] Skipped layer "${target.title}":`, err);
    return [];
  } finally {
    request.dispose();
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Case-insensitive "contains" search across string fields of visible layers.
 * Layers that fail or time out are skipped. Returns an empty list for terms
 * shorter than {@link FEATURE_SEARCH_MIN_LENGTH} after sanitizing.
 */
export async function searchActiveLayerFeatures(term: string, managedLayers: ManagedLayer[], signal?: AbortSignal): Promise<SearchResult[]> {
  const cleanTerm = sanitizeSearchTerm(term);
  if (cleanTerm.length < FEATURE_SEARCH_MIN_LENGTH) return [];

  const targets = getFeatureSearchTargets(managedLayers);
  const hasSession = Boolean(await getAccessToken());
  // Secured WFS layers cannot succeed without a session, so skip the request entirely
  const searchable = targets.filter((target) => target.kind !== "wfs" || !target.secured || hasSession);
  const perTarget = await mapWithConcurrency(searchable, MAX_CONCURRENT_REQUESTS, (target) => queryTarget(target, cleanTerm, signal));
  if (signal?.aborted) return [];
  return perTarget.flat().slice(0, MAX_TOTAL_RESULTS);
}
