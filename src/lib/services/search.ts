/**
 * Search service — ported from SimcoeCountyWebApi/helpers/search.js
 * Provides search against the tbl_search table with fallbacks to ESRI geocoder and OSM.
 */
import { pgTabular } from "@/lib/database/connections";
import searchConfig from "./searchConfig.json";

const viewBox = searchConfig.OSMViewBox;
const useESRIGeocoder = searchConfig.useESRIGeocoder;
const useOSMSearch = searchConfig.useOSMSearch;

const geocodeUrl = (limit: number, keywords: string) =>
  `https://maps.simcoe.ca/arcgis/rest/services/SimcoeUtilities/AddressLocator/GeocodeServer/findAddressCandidates?${new URLSearchParams({
    f: "json",
    maxLocations: String(limit),
    outFields: "House,StreetName,SufType,City",
    Street: keywords,
  }).toString()}`;

const osmUrlWithViewBox = (vb: string, limit: number, keywords: string) =>
  `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    format: "json",
    addressdetails: "1",
    viewbox: vb,
    bounded: "1",
    limit: String(limit),
    q: keywords,
  }).toString()}`;

// ── Shared interfaces ──────────────────────────────────────────────

export interface SearchRow {
  name: string;
  type: string;
  municipality: string;
  location_id: string | null;
  x?: number;
  y?: number;
  place_id?: string;
  priority?: number;
  geojson?: string;
  geojson_point?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function toTitleCase(str: string | undefined): string {
  if (!str) return "";
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

async function getJSON<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  try {
    const headers = new Headers(init?.headers);

    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const response = await fetch(url, {
      ...init,
      headers,
    });

    const body = await response.text();
    const trimmedBody = body.trim();

    if (!response.ok) {
      console.error(`getJSON request failed (${response.status}): ${url}`);
      return {} as T;
    }

    if (!trimmedBody) {
      return {} as T;
    }

    const normalizedBody = trimmedBody.replace(/^\uFEFF/, "");

    if (!normalizedBody.startsWith("{") && !normalizedBody.startsWith("[")) {
      console.error(`getJSON non-JSON response from ${url}: ${normalizedBody.slice(0, 120)}`);
      return {} as T;
    }

    return JSON.parse(normalizedBody) as T;
  } catch (error) {
    console.error("getJSON error:", error);
    return {} as T;
  }
}

// ── Search functions ────────────────────────────────────────────────

/**
 * Main search — address + non-address + geocoder/OSM fallbacks.
 */
export async function search(keywords: string, type: string | undefined, muni: string | undefined, limit: number = 10): Promise<SearchRow[]> {
  try {
    if (keywords.length < 2) return [];

    const parts = keywords.split(" ");
    const isFirstWordNumeric = !isNaN(Number(parts[0]));

    const allValues: SearchRow[] = [];
    let addresses: SearchRow[] = [];

    // First word is numeric → assume address
    if (isFirstWordNumeric) {
      addresses = await searchAddress(keywords, muni, type, limit);

      // Fallback to ESRI geocoder
      if (useESRIGeocoder && addresses.length === 0 && (type === "Address" || type === undefined || type === "All")) {
        const geocodeResult = await getJSON<{ candidates?: GeocodeCandidateRaw[] }>(geocodeUrl(limit, keywords));
        if (geocodeResult?.candidates) {
          for (const candidate of geocodeResult.candidates) {
            if (candidate.score > 10) {
              addresses.push({
                name: toTitleCase(candidate.address),
                type: "Geocode",
                municipality: toTitleCase(candidate.attributes?.City),
                location_id: null,
                x: candidate.location?.x,
                y: candidate.location?.y,
              });
            }
          }
        }
      }
    }

    allValues.push(...addresses);

    // Fill remaining with non-address results
    if (allValues.length < limit) {
      const nonAddresses = await searchNonAddress(keywords, type, muni, limit);
      allValues.push(...nonAddresses);
    }

    // Fill with OSM if still empty and appropriate
    if ((useOSMSearch && allValues.length === 0) || type === "Open Street Map" || (allValues.length === 0 && type === "All")) {
      const numRecords = limit - allValues.length;
      const osmPlaces = await searchOsm(keywords, type, numRecords);
      allValues.push(...osmPlaces);
    }

    return allValues;
  } catch {
    return [];
  }
}

/**
 * Look up a single search row by location_id.
 */
export async function searchById(id: string): Promise<SearchRow | null> {
  const sql = `SELECT * FROM public.tbl_search WHERE location_id = $1;`;
  const rows = await pgTabular.selectAllWithValues<SearchRow>(sql, [id]);
  return rows[0] ?? null;
}

/**
 * Get distinct search types from tbl_search.
 */
export async function getSearchTypes(): Promise<string[]> {
  const sql = "SELECT DISTINCT(type) FROM public.tbl_search ORDER BY type";
  const rows = await pgTabular.selectAll<{ type: string }>(sql);
  return rows.map((r) => r.type);
}

// ── Internal queries ────────────────────────────────────────────────

async function searchAddress(value: string, muni: string | undefined, type: string | undefined, limit: number = 10): Promise<SearchRow[]> {
  if (type === "All" || type === "undefined") type = undefined;

  const values: unknown[] = [value];
  let sql = `SELECT DISTINCT name, type, municipality, location_id FROM public.tbl_search WHERE name ILIKE $1 || '%' AND type = 'Address'`;

  if (muni && muni !== "undefined") {
    sql += " AND LOWER(municipality) = LOWER($2)";
    values.push(muni);
  }

  if (type && type !== "undefined") {
    const idx = values.length + 1;
    sql += ` AND type = $${idx}`;
    values.push(type);
  }

  sql += ` LIMIT ${limit};`;

  return pgTabular.selectAllWithValues<SearchRow>(sql, values);
}

async function searchNonAddress(value: string, type: string | undefined, muni: string | undefined, limit: number = 10): Promise<SearchRow[]> {
  if (type === "undefined" || type === "All") type = undefined;
  if (muni === "undefined") muni = undefined;

  const values: unknown[] = [value, limit];
  let sql = "";

  if (!muni && !type) {
    sql = `SELECT DISTINCT name, type, municipality, location_id, priority FROM public.tbl_search WHERE name ILIKE $1 || '%' AND type <> 'Address' ORDER BY priority LIMIT $2;`;
  } else if (muni && !type) {
    values.push(muni);
    sql = `SELECT DISTINCT name, type, municipality, location_id, priority FROM public.tbl_search WHERE name ILIKE $1 || '%' AND type <> 'Address' AND LOWER(municipality) = LOWER($3) ORDER BY priority LIMIT $2;`;
  } else if (muni && type) {
    values.push(muni);
    values.push(type);
    sql = `SELECT name, type, municipality, location_id FROM public.tbl_search WHERE name ILIKE '%' || $1 || '%' AND type = $4 AND LOWER(municipality) = LOWER($3) AND type <> 'Address' LIMIT $2;`;
  } else if (!muni && type) {
    values.push(type);
    sql = `SELECT name, type, municipality, location_id FROM public.tbl_search WHERE name ILIKE '%' || $1 || '%' AND type = $3 AND type <> 'Address' LIMIT $2;`;
  }

  return pgTabular.selectAllWithValues<SearchRow>(sql, values);
}

async function searchOsm(keywords: string, type: string | undefined, limit: number = 10): Promise<SearchRow[]> {
  if (type === "undefined") type = undefined;
  if (type !== "All" && type !== "Open Street Map") return [];

  const osmUrl = osmUrlWithViewBox(viewBox, limit, keywords);
  const osmResult = await getJSON<OsmResult[]>(osmUrl, {
    headers: {
      "User-Agent": "SimcoeCountyWebViewerNextJS",
      "Accept-Language": "en",
    },
  });
  const osmPlaces: SearchRow[] = [];

  if (Array.isArray(osmResult) && osmResult.length > 0) {
    for (const osm of osmResult) {
      const city = osm.address?.city ?? osm.address?.town ?? "";
      osmPlaces.push({
        name: osm.display_name,
        type: toTitleCase(osm.type + " - Open Street Map"),
        municipality: toTitleCase(city),
        location_id: null,
        x: parseFloat(osm.lon),
        y: parseFloat(osm.lat),
        place_id: osm.place_id,
      });
    }
  }

  return osmPlaces;
}

// ── External API response shapes ────────────────────────────────────

interface GeocodeCandidateRaw {
  address: string;
  score: number;
  location: { x: number; y: number };
  attributes: { City: string };
}

interface OsmResult {
  display_name: string;
  type: string;
  lat: string;
  lon: string;
  place_id: string;
  address: { city?: string; town?: string };
}
