/**
 * SQL Server SDE feature writer for approved editing services.
 *
 * Replaces the ArcGIS REST proxy for services whose backing data lives in the
 * GEOEDIT database. Each add/update/delete call maps the ArcGIS FeatureServer URL
 * to an SDE table name, builds a JSON payload, and executes the unified
 * GIS.usp_EditRoadClosureFromJson stored procedure.
 */

import { sqlGeoEdit } from "@/lib/database/connections";
import { ArcGisEditResponse, ArcGisEditResult, SqlFeature } from "./types";

export class SqlFeatureWriterError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = "SqlFeatureWriterError";
  }
}

const URL_TO_TABLE_MAP: Record<string, string> = {
  "https://maps2.simcoe.ca/arcgis/rest/services/simcoecounty/roadclosures/featureserver/5": "SC_ROADCLOSURES_BLOCKS",
  "https://maps2.simcoe.ca/arcgis/rest/services/simcoecounty/roadclosures/featureserver/6": "SC_ROADCLOSURES_CLOSURES",
  "https://maps2.simcoe.ca/arcgis/rest/services/simcoecounty/roadclosures/featureserver/7": "SC_ROADCLOSURES_DETOURS",
};

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/$/, "");
}

export function mapServiceUrlToTable(url: string): string {
  const table = URL_TO_TABLE_MAP[normalizeUrl(url)];
  if (!table) {
    throw new SqlFeatureWriterError(`Service URL is not mapped to a SQL SDE table: ${url}`, 400);
  }
  return table;
}

function hasObjectId(feature: SqlFeature): feature is SqlFeature & { attributes: { OBJECTID: number } } {
  const objectId = feature.attributes?.OBJECTID;
  return typeof objectId === "number" && Number.isFinite(objectId);
}

function buildPayload(action: "add" | "update" | "delete", table: string, feature: SqlFeature): string {
  const payload: Record<string, unknown> = { action, target: table };

  if (action === "update" || action === "delete") {
    if (!hasObjectId(feature)) {
      throw new SqlFeatureWriterError(`\`${action}\` requires attributes.OBJECTID to be a finite number`, 400);
    }
    payload.objectId = feature.attributes.OBJECTID;
  }

  if (action !== "delete") {
    if (!feature.geometry?.wkt) {
      throw new SqlFeatureWriterError(`\`${action}\` requires geometry.wkt`, 400);
    }
    payload.geometry = feature.geometry;
    payload.attributes = feature.attributes;
  }

  return JSON.stringify(payload);
}

interface SqlEditResultRow {
  Succeeded?: boolean | number;
  ObjectId?: number;
  GlobalId?: string;
  RowsAffected?: number;
}

function parseResultRow(row: Record<string, unknown> | undefined): ArcGisEditResult {
  if (!row) {
    return { success: false, error: { message: "No result returned from SQL procedure" } };
  }

  const result = row as SqlEditResultRow;
  const success = result.Succeeded === true || result.Succeeded === 1 || result.RowsAffected === 1;

  return {
    success: !!success,
    objectId: typeof result.ObjectId === "number" ? result.ObjectId : undefined,
    globalId: typeof result.GlobalId === "string" ? result.GlobalId : undefined,
  };
}

async function executeFeatureEdit(action: "add" | "update" | "delete", url: string, feature: SqlFeature): Promise<ArcGisEditResult> {
  const table = mapServiceUrlToTable(url);
  const json = buildPayload(action, table, feature);

  const recordsets = await sqlGeoEdit.executeWithRecordsets<Record<string, unknown>>("EXEC [GIS].[usp_EditRoadClosureFromJson] @Json = @json;", [
    { name: "json", type: "nvarchar", value: json },
  ]);

  const lastRecordset = recordsets[recordsets.length - 1];
  return parseResultRow(lastRecordset?.[0]);
}

async function runFeatureEdit(action: "add" | "update" | "delete", url: string, feature: SqlFeature): Promise<ArcGisEditResult> {
  try {
    return await executeFeatureEdit(action, url, feature);
  } catch (error) {
    const message = error instanceof Error ? error.message : `SQL ${action} failed`;
    console.error(`[SQL Feature ${action}] Error:`, error);
    return { success: false, error: { message } };
  }
}

/**
 * Add features to an SDE table via the stored procedure.
 */
export async function sqlAddFeatures(url: string, features: SqlFeature[]): Promise<ArcGisEditResponse> {
  const addResults: ArcGisEditResult[] = [];
  for (const feature of features) {
    addResults.push(await runFeatureEdit("add", url, feature));
  }
  return { addResults };
}

/**
 * Update features in an SDE table via the stored procedure.
 */
export async function sqlUpdateFeatures(url: string, features: SqlFeature[]): Promise<ArcGisEditResponse> {
  const updateResults: ArcGisEditResult[] = [];
  for (const feature of features) {
    updateResults.push(await runFeatureEdit("update", url, feature));
  }
  return { updateResults };
}

/**
 * Delete features from an SDE table by OBJECTID via the stored procedure.
 */
export async function sqlDeleteFeatures(url: string, objectIds: number[] | string): Promise<ArcGisEditResponse> {
  const ids: number[] = typeof objectIds === "string" ? objectIds.split(",").map((id) => Number(id.trim())) : objectIds;

  const deleteResults: ArcGisEditResult[] = [];
  for (const objectId of ids) {
    deleteResults.push(await runFeatureEdit("delete", url, { attributes: { OBJECTID: objectId } }));
  }
  return { deleteResults };
}
