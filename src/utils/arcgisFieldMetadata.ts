/**
 * ArcGIS field metadata (aliases + coded-value domains)
 * ----------------------------------------------------------------------------
 * ArcGIS layer metadata (`{layerUrl}?f=json`) carries a `fields` array where
 * each field has a human-friendly `alias` and optionally a `domain` of type
 * `codedValue` mapping stored codes to display names. The identify panel,
 * live-layer results popup and attribute table all display raw attribute
 * keys/values — this module fetches, caches and resolves that metadata so
 * those surfaces can show aliases and domain display names instead.
 *
 * Resolution is display-only: raw attribute keys/values are never mutated, so
 * feature-id lookups, filters and exports that operate on raw values keep
 * working. When metadata is unavailable (fetch failure, no alias, no domain,
 * or a value with no matching code) callers fall back to the existing
 * `formatFieldName`/`formatFieldValue` behavior.
 *
 * Field names may be fully qualified (e.g. `DBO.TestWidget.MATERIAL`) when
 * the layer is published from a join — lookups therefore try the exact name,
 * a case-insensitive match, and finally the last `.`-delimited segment.
 */

import { useArcGISTokenStore } from "@/stores/arcgisTokenStore";

export interface ArcgisCodedValue {
  code: string | number;
  name: string;
}

export interface ArcgisLayerFieldMetadata {
  /** field name (lowercase) → alias */
  aliases: Record<string, string>;
  /** field name (lowercase) → coded values */
  domains: Record<string, ArcgisCodedValue[]>;
}

export const EMPTY_FIELD_METADATA: ArcgisLayerFieldMetadata = { aliases: {}, domains: {} };

/** Shape of one entry in the ArcGIS layer JSON `fields` array (partial). */
interface ArcgisFieldJson {
  name?: unknown;
  alias?: unknown;
  domain?: {
    type?: unknown;
    codedValues?: Array<{ name?: unknown; code?: unknown }>;
  } | null;
}

/**
 * Pure parser for the `fields` array from an ArcGIS layer JSON response.
 * Exported so callers that already fetched the layer JSON (e.g. the attribute
 * table's `describeArcgisLayer`) can reuse the same parsing without a second
 * request. Range domains are ignored — only `codedValue` domains resolve.
 */
export function parseArcgisFieldsMetadata(fields: unknown): ArcgisLayerFieldMetadata {
  const metadata: ArcgisLayerFieldMetadata = { aliases: {}, domains: {} };
  if (!Array.isArray(fields)) return metadata;

  for (const raw of fields as ArcgisFieldJson[]) {
    const name = typeof raw?.name === "string" ? raw.name : null;
    if (!name) continue;
    const key = name.toLowerCase();
    const segmentKey = key.split(".").pop() ?? key;

    if (typeof raw.alias === "string" && raw.alias.length > 0 && raw.alias !== name) {
      // Skip aliases that restate the field name exactly (e.g. "zip_code") —
      // the caller's formatFieldName fallback beautifies those better.
      metadata.aliases[key] = raw.alias;
      if (!(segmentKey in metadata.aliases)) metadata.aliases[segmentKey] = raw.alias;
    }

    const domain = raw.domain;
    if (domain && domain.type === "codedValue" && Array.isArray(domain.codedValues)) {
      const codedValues: ArcgisCodedValue[] = [];
      for (const cv of domain.codedValues) {
        if ((typeof cv?.code === "string" || typeof cv?.code === "number") && typeof cv?.name === "string") {
          codedValues.push({ code: cv.code, name: cv.name });
        }
      }
      if (codedValues.length > 0) {
        metadata.domains[key] = codedValues;
        if (!(segmentKey in metadata.domains)) metadata.domains[segmentKey] = codedValues;
      }
    }
  }

  return metadata;
}

// ---------------------------------------------------------------------------
// Fetch + cache
// ---------------------------------------------------------------------------

/**
 * Session-level cache of metadata per layer URL, storing the in-flight
 * promise so concurrent callers dedupe. Failures are cached as `null` so a
 * broken endpoint doesn't get retried on every map click.
 */
const metadataCache = new Map<string, Promise<ArcgisLayerFieldMetadata | null>>();

/** Clear the metadata cache. Intended for tests. */
export function clearArcgisFieldMetadataCache(): void {
  metadataCache.clear();
}

async function fetchFieldMetadata(layerUrl: string, secured: boolean, token?: string | null): Promise<ArcgisLayerFieldMetadata | null> {
  let url = layerUrl.endsWith("?f=json") ? layerUrl : `${layerUrl}?f=json`;
  let effectiveToken = token ?? null;
  if (!effectiveToken && secured) {
    try {
      effectiveToken = (await useArcGISTokenStore.getState().getValidToken()) ?? null;
    } catch {
      effectiveToken = null;
    }
  }
  if (effectiveToken) {
    url += `&token=${encodeURIComponent(effectiveToken)}`;
  }

  try {
    const res = await fetch(url, { method: "GET", mode: "cors" });
    if (!res.ok) return null;
    const json = (await res.json()) as { fields?: unknown };
    return parseArcgisFieldsMetadata(json.fields);
  } catch {
    return null;
  }
}

/**
 * Fetch (and cache) alias/domain metadata for an ArcGIS layer URL, e.g.
 * `https://host/arcgis/rest/services/Name/MapServer/7`. Returns `null` on any
 * failure — callers must treat that as "no metadata" and fall back to raw
 * formatting. `token` may come from the URL template; when omitted and
 * `secured` is true a fresh token is pulled from the ArcGIS token store.
 */
export function getArcgisFieldMetadata(layerUrl: string, options?: { secured?: boolean; token?: string | null }): Promise<ArcgisLayerFieldMetadata | null> {
  const key = layerUrl.split("?")[0];
  const cached = metadataCache.get(key);
  if (cached) return cached;
  const promise = fetchFieldMetadata(key, options?.secured ?? false, options?.token);
  metadataCache.set(key, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

function lookupEntry<T>(map: Record<string, T>, fieldName: string): T | undefined {
  const lower = fieldName.toLowerCase();
  const exact = map[lower];
  if (exact !== undefined) return exact;
  const segment = lower.split(".").pop();
  return segment ? map[segment] : undefined;
}

/**
 * Resolve the display alias for a field. ArcGIS always provides an alias and
 * it is always at least as display-friendly as the raw name (e.g. "Material"
 * for "MATERIAL", or "Asset ID" for "DBO.TestWidget.FACILITYID"), so the
 * alias is returned verbatim whenever present. Aliases that restate the field
 * name exactly (e.g. "zip_code") are dropped at parse time so callers fall
 * back to `formatFieldName` beautification. Returns `undefined` when no
 * metadata or alias exists for the field.
 */
export function resolveFieldAlias(metadata: ArcgisLayerFieldMetadata | null | undefined, fieldName: string): string | undefined {
  if (!metadata) return undefined;
  return lookupEntry(metadata.aliases, fieldName);
}

/**
 * Resolve the display name for a coded domain value. Codes may be strings or
 * numbers (e.g. DIAMETER is numeric, MATERIAL is string), so comparison is
 * done on trimmed string form. Returns `undefined` when the field has no
 * coded-value domain or the value has no matching code.
 */
export function resolveDomainName(metadata: ArcgisLayerFieldMetadata | null | undefined, fieldName: string, value: unknown): string | undefined {
  return resolveDomainValue(metadata?.domains, fieldName, value);
}

/** Variant of {@link resolveDomainName} for callers that hold the domains map directly. */
export function resolveDomainValue(domains: Record<string, ArcgisCodedValue[]> | null | undefined, fieldName: string, value: unknown): string | undefined {
  if (!domains || value === null || value === undefined) return undefined;
  const codedValues = lookupEntry(domains, fieldName);
  if (!codedValues || codedValues.length === 0) return undefined;

  if (typeof value === "object") return undefined;
  const needle = String(value).trim();
  for (const cv of codedValues) {
    if (cv.code === value) return cv.name;
    if (String(cv.code).trim() === needle) return cv.name;
  }
  return undefined;
}
