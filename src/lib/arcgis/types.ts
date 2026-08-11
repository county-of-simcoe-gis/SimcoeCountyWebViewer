/**
 * Shared TypeScript types for ArcGIS REST feature editing and editor tokens.
 */

export type ArcGisEditOperation = "addFeatures" | "updateFeatures" | "deleteFeatures";

export interface ArcGisFeature {
  attributes?: Record<string, unknown>;
  geometry?: Record<string, unknown>;
}

export interface WktGeometry {
  wkt: string;
  srid: number;
}

export interface SqlFeature {
  attributes?: Record<string, unknown>;
  geometry?: WktGeometry | null;
}

export interface ArcGisEditorTokenResponse {
  token?: string;
  expires?: number;
  error?: {
    code?: number;
    message?: string;
    details?: string[];
  };
}

export interface ArcGisEditResult {
  objectId?: number;
  globalId?: string;
  success: boolean;
  error?: {
    code?: number;
    message?: string;
    description?: string;
  };
}

export interface ArcGisEditResponse {
  error?: {
    code?: number;
    message?: string;
    details?: string[];
  };
  addResults?: ArcGisEditResult[];
  updateResults?: ArcGisEditResult[];
  deleteResults?: ArcGisEditResult[];
}

export interface AddFeatureRequestBody {
  /** Feature service layer URL (must be in the approved services list). */
  url: string;
  /** Array of features to add. Each feature must use WKT geometry with SRID. */
  features?: SqlFeature[];
}

export interface UpdateFeatureRequestBody {
  /** Feature service layer URL (must be in the approved services list). */
  url: string;
  /** Array of features to update; each must include `attributes.OBJECTID` and use WKT geometry with SRID. */
  features: SqlFeature[];
}

export interface DeleteFeatureRequestBody {
  /** Feature service layer URL (must be in the approved services list). */
  url: string;
  /** Object ID(s) to delete. */
  objectIds: number[] | string;
}
