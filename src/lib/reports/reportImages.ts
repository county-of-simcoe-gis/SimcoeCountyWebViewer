/**
 * Report image helpers for the legacy public report endpoints.
 * Migrated from SimcoeCountyWebApiSecured modules/planningReport.js + landValues.js
 * and SimcoeCountyWebApi helpers/parcelImageGenerator.js + pointImageGenerator.js
 */

import { pgWeblive } from "@/lib/database/connections";
import { SQLServer } from "@/lib/database/sqlServer";
import { getLayerObject, getMapImage, getOrthoBasemap, STREETS_BASEMAP } from "@/lib/reports/imageGenerator";

const OVERVIEW_BBOX = "-8942711.7848,5465832.4289,-8805736.6301,5599902.9765";
const PARCEL_SERVICE_URL = "https://maps.simcoe.ca/arcgis/rest/services/Public/ParcelImage_Report/MapServer/";
const PARCEL_OVERVIEW_SERVICE_URL = "https://maps.simcoe.ca/arcgis/rest/services/Public/ParcelImageOverview_Report/MapServer/";
const MLS_SERVICE_URL = "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/MLSImage_Report/MapServer/";
const MLS_OVERVIEW_SERVICE_URL = "https://maps.simcoe.ca/arcgis/rest/services/SimcoeCounty/ParcelImageOverview_Report_MLS/MapServer/";

type GeoJsonFeature = {
  type: "Feature";
  geometry: { crs?: unknown } & Record<string, unknown>;
  properties: Record<string, unknown>;
};

interface ParcelGeometryRow {
  parcels: string;
  buffer: string;
  bounding_geom: string;
}

function toFeature(id: string, geometryJson: string): GeoJsonFeature {
  const geometry = JSON.parse(geometryJson);
  if (geometry.crs) delete geometry.crs;
  return { type: "Feature", geometry, properties: { id, label: "", labelVisible: false, drawType: "Cancel", isParcel: false } };
}

function polygonStyle(strokeColor: string, strokeOpacity: number) {
  return {
    version: "2",
    "*": {
      symbolizers: [{ type: "Polygon", fillColor: "#ffffff", fillOpacity: "0", strokeColor, strokeOpacity, strokeWidth: 3 }],
    },
  };
}

/** Envelope of the first polygon ring as [minX, minY, maxX, maxY]. */
function envelopeBbox(boundingGeom: { coordinates: number[][][] }): number[] {
  const ring = boundingGeom.coordinates[0];
  return [...ring[0], ...ring[2]];
}

/** Min/max extent of every coordinate pair in a WKT polygon, as "minX,minY,maxX,maxY". */
export function wktToBbox(wkt: string): string | null {
  const pairs = [...wkt.matchAll(/(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s+(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)/g)];
  if (pairs.length === 0) return null;
  const xs = pairs.map((p) => parseFloat(p[1]));
  const ys = pairs.map((p) => parseFloat(p[2]));
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].join(",");
}

export interface PlanningImageOptions {
  fieldValue: string;
  reportType: string;
  bufDistance: number;
  width: number;
  height: number;
  token: string;
}

/** Returns the print-server download URL of the planning report image, or null. */
export async function getPlanningReportImageUrl(options: PlanningImageOptions): Promise<string | null> {
  const isMain = options.reportType.toUpperCase() === "MAIN";

  const sql = `SELECT ST_AsGeoJSON(geom) parcels, ST_AsGeoJSON(ST_Buffer(geom, $2)) buffer, ST_AsGeoJSON(ST_Envelope(ST_Buffer(geom, $2))) bounding_geom FROM sde.TERANET_DAPF WHERE $1 ILIKE '%' || arn || '%'`;
  const row = await pgWeblive.selectFirstWithValues<ParcelGeometryRow>(sql, [options.fieldValue, options.bufDistance]);
  if (!row?.bounding_geom) {
    console.warn(`[PlanningImages] No parcel found for value "${options.fieldValue}"`);
    return null;
  }

  const bbox = envelopeBbox(JSON.parse(row.bounding_geom));
  const printBbox = [bbox[0] - 500, bbox[1] - 500, bbox[2] + 500, bbox[3] + 500];

  const printLayers: Record<string, unknown>[] = [
    { type: "geojson", geoJson: [toFeature("parcel_feature", row.parcels)], name: "parcels", style: polygonStyle("#FF5500", 1) },
  ];
  if (options.bufDistance > 0) {
    printLayers.push({ type: "geojson", geoJson: [toFeature("buffer_feature", row.buffer)], name: "buffer", style: polygonStyle("#00FFFF", 0.8) });
  }

  const layer = await getLayerObject({
    host: "maps2.simcoe.ca",
    service: isMain ? "SimcoeCounty/Planning_Report_Main" : "SimcoeCounty/Planning_Report_Inforce",
    bbox,
    bboxSR: 3857,
    width: options.width,
    height: options.height,
    format: "png",
    dpi: 96,
    token: options.token ? encodeURIComponent(options.token) : "",
    reportType: isMain ? "Assessment Parcel spView" : options.reportType,
  });
  if (!layer) {
    console.warn("[PlanningImages] Map service details unavailable (token missing or rejected?)");
    return null;
  }
  printLayers.push(layer);

  return getMapImage({ height: options.height, width: options.width, dpi: 96, bbox: printBbox, basemap: getOrthoBasemap() }, printLayers);
}

export interface LandValuesImageOptions {
  fieldValue: string;
  reportType: string;
  width: number;
  height: number;
  token: string;
}

/** Returns the print-server download URL of the land values report image, or null. */
export async function getLandValuesReportImageUrl(options: LandValuesImageOptions): Promise<string | null> {
  const isMain = options.reportType.toUpperCase() === "MAIN";
  const table = isMain ? "sde.TERANET_DAPF" : "sde.TERANET_DOPF";
  const column = isMain ? "arn" : "pin";
  const fieldName = isMain ? "ARN" : "PIN";
  const layerId = isMain ? 1 : 0;

  const sql = `SELECT ST_AsGeoJSON(ST_Envelope(ST_Buffer(geom, $2))) bounding_geom FROM ${table} WHERE $1 ILIKE '%' || ${column} || '%'`;
  const row = await pgWeblive.selectFirstWithValues<{ bounding_geom: string }>(sql, [options.fieldValue, 50]);
  if (!row?.bounding_geom) {
    console.warn(`[LandValuesImages] No parcel found for value "${options.fieldValue}"`);
    return null;
  }

  const bbox = envelopeBbox(JSON.parse(row.bounding_geom));
  const escapedValue = options.fieldValue.replace(/'/g, "''");
  const layerDefs = `%7B${layerId}:%22${encodeURIComponent(`${fieldName}='${escapedValue}'`)}%22%7D`;

  const layer = await getLayerObject({
    host: "maps2.simcoe.ca",
    service: isMain ? "SimcoeCounty/Land_Value_Report_Main" : "SimcoeCounty/Land_Value_Report_PIN",
    bbox,
    bboxSR: 3857,
    layers: isMain ? [0, 1] : [0, 2, 3],
    layerDefs,
    width: options.width,
    height: options.height,
    format: "png",
    dpi: 96,
    token: options.token ? encodeURIComponent(options.token) : "",
  });
  if (!layer) {
    console.warn("[LandValuesImages] Map service details unavailable (token missing or rejected?)");
    return null;
  }

  return getMapImage({ height: options.height, width: options.width, dpi: 96, bbox, basemap: STREETS_BASEMAP }, [layer]);
}

/** Returns the ArcGIS export URL of the parcel image, or null when the ARN has no geometry. ARN must be pre-validated. */
export async function getParcelImageUrl(arn: string, overview: boolean, width: number, height: number): Promise<string | null> {
  let serviceUrl = PARCEL_SERVICE_URL;
  let bbox = OVERVIEW_BBOX;

  if (overview) {
    serviceUrl = PARCEL_OVERVIEW_SERVICE_URL;
  } else {
    const db = new SQLServer({ dbName: "weblive" });
    try {
      const row = await db.selectFirstWithValues<{ WKT: string | null }>(
        "SELECT geometry::EnvelopeAggregate(Shape).ToString() as WKT FROM WEBLIVE.GIS.TERANET_DAPF WHERE ARN = @arn",
        [{ name: "arn", type: "NVarChar", typeOpts: { length: 250 }, value: arn }]
      );
      const parcelBbox = row?.WKT ? wktToBbox(row.WKT) : null;
      if (!parcelBbox) return null;
      bbox = parcelBbox;
    } finally {
      await db.close();
    }
  }

  return `${serviceUrl}export?bbox=${bbox}&layers=&layerDefs=%7B0%3A%22ARN+%3D+%27${arn}%27%22%7D&size=${width},${height}&format=jpg&transparent=true&dpi=96&f=image`;
}

/** Returns the ArcGIS export URL of the MLS point image, or null when the MLS has no geometry. MLS must be pre-validated. */
export async function getMlsImageUrl(mls: string, overview: boolean, width: number, height: number): Promise<string | null> {
  let serviceUrl = MLS_SERVICE_URL;
  let bbox = OVERVIEW_BBOX;

  if (overview) {
    serviceUrl = MLS_OVERVIEW_SERVICE_URL;
  } else {
    const row = await pgWeblive.selectFirstWithValues<{ wkt: string | null }>("select wkt from public.usp_get_ec_dev_point_envelope($1)", [mls]);
    const pointBbox = row?.wkt ? wktToBbox(row.wkt) : null;
    if (!pointBbox) return null;
    bbox = pointBbox;
  }

  const def = `MLSNO+%3D+%27${mls}%27`;
  return `${serviceUrl}export?bbox=${bbox}&bboxSR=3857&layers=&layerDefs=%7B0%3A%22${def}%22,1%3A%22${def}%22%7D&size=${width},${height}&format=jpg&transparent=true&dpi=96&f=image`;
}

/** Streams an upstream image back to the caller. */
export async function proxyImage(url: string, contentType?: string): Promise<Response> {
  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "Image not available" }, { status: 502 });
  }
  const headers = new Headers({ "Content-Type": contentType || upstream.headers.get("content-type") || "image/jpeg" });
  const length = upstream.headers.get("content-length");
  if (length && !upstream.headers.get("content-encoding")) headers.set("Content-Length", length);
  return new Response(upstream.body, { status: 200, headers });
}

/** Parses a positive integer within [1, max]; returns null when invalid. */
export function parseDimension(value: string | null, fallback: number, max = 4096): number | null {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value)) return null;
  const n = parseInt(value, 10);
  return n >= 1 && n <= max ? n : null;
}
