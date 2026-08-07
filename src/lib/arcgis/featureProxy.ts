/**
 * Shared ArcGIS REST feature-editing proxy helpers.
 *
 * These functions build the correct application/x-www-form-urlencoded payload
 * for add/update/delete operations and attach a server-side editor token.
 */

import { getEditorTokenConfig } from "./editorToken";
import { ArcGisEditOperation, ArcGisEditResponse, ArcGisFeature } from "./types";
import { getEditorToken } from "./editorToken";

const RESULT_KEYS: Record<ArcGisEditOperation, keyof ArcGisEditResponse> = {
  addFeatures: "addResults",
  updateFeatures: "updateResults",
  deleteFeatures: "deleteResults",
};

export class FeatureProxyError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "FeatureProxyError";
  }
}

async function arcGisFetch(operationUrl: string, body: URLSearchParams): Promise<ArcGisEditResponse> {
  const { referer } = getEditorTokenConfig();

  const response = await fetch(operationUrl, {
    method: "POST",
    cache: "no-cache",
    redirect: "follow",
    headers: {
      referer,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new FeatureProxyError(`ArcGIS request failed: HTTP ${response.status}`, response.status);
  }

  const result = (await response.json()) as ArcGisEditResponse;

  if (result.error) {
    const message = result.error.message ?? "ArcGIS edit request failed";
    throw new FeatureProxyError(message, 500);
  }

  return result;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

async function buildOperationUrl(url: string, operation: ArcGisEditOperation): Promise<string> {
  const { token } = await getEditorToken();
  return `${normalizeUrl(url)}/${operation}?f=json&token=${encodeURIComponent(token)}`;
}

function validateFeatureArray(features: unknown, requireObjectId = false): asserts features is ArcGisFeature[] {
  if (!Array.isArray(features) || features.length === 0) {
    throw new FeatureProxyError("Request body must include a non-empty `features` array", 400);
  }

  for (const feature of features) {
    if (!feature || typeof feature !== "object") {
      throw new FeatureProxyError("Each feature must be an object", 400);
    }
    if (requireObjectId) {
      const objectId = (feature as ArcGisFeature).attributes?.OBJECTID;
      if (objectId === undefined || objectId === null) {
        throw new FeatureProxyError("Each update feature must include `attributes.OBJECTID`", 400);
      }
    }
  }
}

function validateObjectIds(objectIds: unknown): asserts objectIds is number[] | string {
  if (objectIds === undefined || objectIds === null) {
    throw new FeatureProxyError("Request body must include `objectIds`", 400);
  }

  if (typeof objectIds === "string") return;

  if (!Array.isArray(objectIds) || objectIds.some((id) => typeof id !== "number" || !Number.isFinite(id))) {
    throw new FeatureProxyError("`objectIds` must be a string or an array of finite numbers", 400);
  }
}

/**
 * Proxy an addFeatures request to ArcGIS.
 */
export async function proxyAddFeatures(url: string, features: ArcGisFeature[]): Promise<ArcGisEditResponse> {
  validateFeatureArray(features);

  const operationUrl = await buildOperationUrl(url, "addFeatures");
  const body = new URLSearchParams();
  body.append("features", JSON.stringify(features));

  return arcGisFetch(operationUrl, body);
}

/**
 * Proxy an updateFeatures request to ArcGIS.
 */
export async function proxyUpdateFeatures(url: string, features: ArcGisFeature[]): Promise<ArcGisEditResponse> {
  validateFeatureArray(features, true);

  const operationUrl = await buildOperationUrl(url, "updateFeatures");
  const body = new URLSearchParams();
  body.append("features", JSON.stringify(features));

  return arcGisFetch(operationUrl, body);
}

/**
 * Proxy a deleteFeatures request to ArcGIS.
 */
export async function proxyDeleteFeatures(url: string, objectIds: number[] | string): Promise<ArcGisEditResponse> {
  validateObjectIds(objectIds);

  const operationUrl = await buildOperationUrl(url, "deleteFeatures");
  const body = new URLSearchParams();
  body.append("objectIds", Array.isArray(objectIds) ? objectIds.join(",") : objectIds);

  return arcGisFetch(operationUrl, body);
}

/**
 * Return the result key used by ArcGIS for a given operation.
 */
export function getResultKey(operation: ArcGisEditOperation): keyof ArcGisEditResponse {
  return RESULT_KEYS[operation];
}
