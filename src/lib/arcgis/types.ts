/**
 * Shared TypeScript types for ArcGIS REST feature editing and editor tokens.
 */

export type ArcGisEditOperation = "addFeatures" | "updateFeatures" | "deleteFeatures";

export interface ArcGisFeature {
  attributes?: Record<string, unknown>;
  geometry?: Record<string, unknown>;
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
  /** Array of features to add. Either this or `feature` must be provided. */
  features?: ArcGisFeature[];
  /** Legacy URL-encoded JSON string used by AppTrack. */
  feature?: string;
}

export interface UpdateFeatureRequestBody {
  /** Feature service layer URL (must be in the approved services list). */
  url: string;
  /** Array of features to update; each must include `attributes.OBJECTID`. */
  features: ArcGisFeature[];
}

export interface DeleteFeatureRequestBody {
  /** Feature service layer URL (must be in the approved services list). */
  url: string;
  /** Object ID(s) to delete. */
  objectIds: number[] | string;
}
