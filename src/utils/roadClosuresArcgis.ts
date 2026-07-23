/**
 * Direct client-side ArcGIS FeatureServer read/write helpers for the Road Closures tool.
 *
 * Writes go directly from the browser to the ArcGIS REST API (addFeatures/updateFeatures/
 * deleteFeatures), authenticated the same way as the app's other secured ArcGIS layers: a
 * `?token=` query param sourced from useArcGISTokenStore.getValidToken() (ArcGIS REST uses
 * query-param tokens, not a Bearer header). There is intentionally no Next.js proxy route for
 * these writes.
 */
import type { Feature } from "ol";
import EsriJSON from "ol/format/EsriJSON";
import { useArcGISTokenStore } from "@/stores/arcgisTokenStore";

export type ClosureType = "Blocks" | "Closures" | "Detours";

export const ROAD_CLOSURES_FEATURE_SERVER_URL = "https://maps2.simcoe.ca/arcgis/rest/services/SimcoeCounty/RoadClosures/FeatureServer";

export const LAYER_ID_BY_TYPE: Record<ClosureType, number> = {
  Blocks: 5,
  Closures: 6,
  Detours: 7,
};

/** Form field keys that are datetime-local strings and must be converted to/from ArcGIS's
 * epoch-millisecond date representation. */
const DATE_FIELD_KEYS = new Set(["startTime", "endTime"]);

/**
 * Editor-tracking-style attribute names, identical across blocks.json/closures.json/detours.json.
 * NOTE: the layer schemas have `"editFieldsInfo": null`, meaning ArcGIS editor tracking is NOT
 * enabled on this service — these fields are NOT auto-populated server-side and must be set
 * client-side on every write (contrary to an earlier assumption in this codebase).
 */
const AUDIT_FIELD_NAMES = {
  createdUser: "created_user",
  createdDate: "created_date",
  lastEditedUser: "last_edited_user",
  lastEditedDate: "last_edited_date",
} as const;

/**
 * Builds the audit attributes to merge into an addFeatures/updateFeatures payload.
 * On create, all 4 fields are set. On update, only last_edited_* are refreshed — created_user/
 * created_date are intentionally omitted so ArcGIS updateFeatures (which only touches attributes
 * present in the request) leaves the original creation audit values untouched.
 */
function buildAuditAttributes(mode: "create" | "update", auditUser: string): Record<string, string | number> {
  const now = Date.now();
  const attributes: Record<string, string | number> = {
    [AUDIT_FIELD_NAMES.lastEditedUser]: auditUser,
    [AUDIT_FIELD_NAMES.lastEditedDate]: now,
  };
  if (mode === "create") {
    attributes[AUDIT_FIELD_NAMES.createdUser] = auditUser;
    attributes[AUDIT_FIELD_NAMES.createdDate] = now;
  }
  return attributes;
}

/**
 * Maps our internal camelCase form field keys to the ArcGIS layer's lowercase attribute field
 * names, per type (see ./config/blocks.json, closures.json, detours.json). ID fields
 * (blockid/closureid/detourid) and editor-tracking fields (created_user/created_date/
 * last_edited_user/last_edited_date) are intentionally excluded — IDs are server-generated and
 * editor-tracking fields are auto-populated by ArcGIS.
 */
export const ATTRIBUTE_FIELD_MAP: Record<ClosureType, Record<string, string>> = {
  Blocks: {
    streetName: "street",
    reason: "reason",
    direction: "direction",
    accessAllowed: "accessallowed",
    description: "description",
    startTime: "starttime",
    endTime: "endtime",
    url: "url",
    streetOverride: "streetoverride",
    // Links this Block back to its parent Closures record; auto-populated client-side by
    // RoadClosuresTool when a parent is selected (never rendered as a user-editable form field).
    closureId: "closureglobalid",
  },
  Closures: {
    streetName: "street",
    direction: "direction",
    reason: "reason",
    laneImpacted: "laneimpact",
    accessAllowed: "accessallowed",
    description: "description",
    startTime: "starttime",
    endTime: "endtime",
    alternateRoute: "altroute",
    url: "url",
    contactName: "pocname",
    contactEmail: "pocemail",
    contactPhone: "pocphone",
    streetOverride: "streetoverride",
  },
  Detours: {
    streetName: "street",
    description: "description",
    startTime: "starttime",
    endTime: "endtime",
    url: "url",
    // Links this Detour back to its parent Closures record; auto-populated client-side by
    // RoadClosuresTool when a parent is selected (never rendered as a user-editable form field).
    closureId: "closureglobalid",
  },
};

function toEsriValue(formKey: string, value: string | undefined): string | number | null {
  if (!value) return null;
  if (DATE_FIELD_KEYS.has(formKey)) {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  return value;
}

function fromEsriValue(formKey: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (DATE_FIELD_KEYS.has(formKey)) {
    const ms = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(ms)) return "";
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, "0");
    // "YYYY-MM-DDTHH:mm" as expected by <input type="datetime-local">
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return String(value);
}

/** Convert form field values (camelCase) into ArcGIS attribute names/values for the given type. */
export function formValuesToAttributes(closureType: ClosureType, formValues: Record<string, string>): Record<string, string | number | null> {
  const fieldMap = ATTRIBUTE_FIELD_MAP[closureType];
  const attributes: Record<string, string | number | null> = {};
  for (const [formKey, esriField] of Object.entries(fieldMap)) {
    attributes[esriField] = toEsriValue(formKey, formValues[formKey]);
  }
  return attributes;
}

/** Inverse of formValuesToAttributes — populates the form when an existing feature is selected. */
export function attributesToFormValues(closureType: ClosureType, attributes: Record<string, unknown>): Record<string, string> {
  const fieldMap = ATTRIBUTE_FIELD_MAP[closureType];
  const formValues: Record<string, string> = {};
  for (const [formKey, esriField] of Object.entries(fieldMap)) {
    formValues[formKey] = fromEsriValue(formKey, attributes[esriField]);
  }
  return formValues;
}

async function getTokenSuffix(): Promise<string> {
  const token = await useArcGISTokenStore.getState().getValidToken();
  return token ? `&token=${token}` : "";
}

function toEsriGeometry(feature: Feature): Record<string, unknown> | null {
  const geometry = feature.getGeometry();
  if (!geometry) return null;
  return new EsriJSON().writeGeometryObject(geometry, { featureProjection: "EPSG:3857", dataProjection: "EPSG:3857" }) as unknown as Record<string, unknown>;
}

export type ArcgisEditResult = { success: boolean; objectId?: number; globalId?: string; error?: string };

type EditOperation = "addFeatures" | "updateFeatures" | "deleteFeatures";

async function postEdit(closureType: ClosureType, operation: EditOperation, body: URLSearchParams): Promise<ArcgisEditResult> {
  const layerId = LAYER_ID_BY_TYPE[closureType];
  const tokenSuffix = await getTokenSuffix();
  const url = `${ROAD_CLOSURES_FEATURE_SERVER_URL}/${layerId}/${operation}?f=json${tokenSuffix}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const json = await response.json();
    if (json?.error) {
      return { success: false, error: json.error.message ?? "ArcGIS request failed" };
    }

    const resultKey = operation === "addFeatures" ? "addResults" : operation === "updateFeatures" ? "updateResults" : "deleteResults";
    const result = json?.[resultKey]?.[0];

    if (!result) {
      return { success: false, error: "No result returned from ArcGIS" };
    }
    if (!result.success) {
      return { success: false, error: result.error?.description ?? result.error?.message ?? "ArcGIS edit failed" };
    }

    return { success: true, objectId: result.objectId, globalId: result.globalId };
  } catch (error) {
    console.error(`[RoadClosures] ArcGIS ${operation} error:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

/**
 * Fallback used when an addFeatures response doesn't include `globalId` for the newly created
 * feature (not guaranteed by every ArcGIS service configuration). Queries the feature back by
 * OBJECTID to read its globalid attribute directly.
 */
export async function fetchFeatureGlobalId(closureType: ClosureType, objectId: number): Promise<string | null> {
  const layerId = LAYER_ID_BY_TYPE[closureType];
  const tokenSuffix = await getTokenSuffix();
  const url = `${ROAD_CLOSURES_FEATURE_SERVER_URL}/${layerId}/query?objectIds=${objectId}&outFields=globalid&f=json${tokenSuffix}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = await response.json();
    const globalId = json?.features?.[0]?.attributes?.globalid ?? json?.features?.[0]?.attributes?.GlobalID;
    return typeof globalId === "string" ? globalId : null;
  } catch (error) {
    console.error("[RoadClosures] fetchFeatureGlobalId error:", error);
    return null;
  }
}

export async function addRoadClosureFeature(closureType: ClosureType, formValues: Record<string, string>, feature: Feature, auditUser: string): Promise<ArcgisEditResult> {
  const attributes = { ...formValuesToAttributes(closureType, formValues), ...buildAuditAttributes("create", auditUser) };
  const geometry = toEsriGeometry(feature);
  const body = new URLSearchParams();
  body.set("features", JSON.stringify([{ geometry, attributes }]));
  return postEdit(closureType, "addFeatures", body);
}

export async function updateRoadClosureFeature(closureType: ClosureType, objectId: number, formValues: Record<string, string>, feature: Feature, auditUser: string): Promise<ArcgisEditResult> {
  const attributes = { ...formValuesToAttributes(closureType, formValues), ...buildAuditAttributes("update", auditUser) };
  const geometry = toEsriGeometry(feature);
  const body = new URLSearchParams();
  body.set("features", JSON.stringify([{ attributes: { OBJECTID: objectId, ...attributes }, geometry }]));
  return postEdit(closureType, "updateFeatures", body);
}

export async function deleteRoadClosureFeature(closureType: ClosureType, objectId: number): Promise<ArcgisEditResult> {
  const body = new URLSearchParams();
  body.set("objectIds", String(objectId));
  return postEdit(closureType, "deleteFeatures", body);
}
