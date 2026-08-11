/**
 * Client-side helpers for ArcGIS feature editing via the secure Next.js API.
 */

import axios, { AxiosError } from "axios";
import axiosInstance from "@/lib/axiosInstance";
import { AddFeatureRequestBody, ArcGisEditResponse, DeleteFeatureRequestBody, SqlFeature, UpdateFeatureRequestBody } from "./types";

export type { ArcGisEditResponse };

export interface FeatureEditSuccessResult<T> {
  success: true;
  data: T;
}

export interface FeatureEditErrorResult {
  success: false;
  error: string;
}

export type FeatureEditResult<T> = FeatureEditSuccessResult<T> | FeatureEditErrorResult;

async function postFeature<TRequest, TResponse>(
  endpoint: string,
  body: TRequest,
): Promise<FeatureEditResult<TResponse>> {
  try {
    const response = await axiosInstance.post<TResponse>(endpoint, body);
    return { success: true, data: response.data };
  } catch (error) {
    let message = "Feature editing request failed";
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;
      message = axiosError.response?.data?.error ?? axiosError.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    return { success: false, error: message };
  }
}

/**
 * Add features to an approved ArcGIS feature service.
 */
export function addArcGISFeature(
  url: string,
  features: SqlFeature[],
): Promise<FeatureEditResult<ArcGisEditResponse>> {
  const body: AddFeatureRequestBody = { url, features };
  return postFeature<AddFeatureRequestBody, ArcGisEditResponse>("/secure/arcgis/feature/add", body);
}

/**
 * Update features on an approved ArcGIS feature service.
 */
export function updateArcGISFeature(
  url: string,
  features: SqlFeature[],
): Promise<FeatureEditResult<ArcGisEditResponse>> {
  const body: UpdateFeatureRequestBody = { url, features };
  return postFeature<UpdateFeatureRequestBody, ArcGisEditResponse>("/secure/arcgis/feature/update", body);
}

/**
 * Delete features from an approved ArcGIS feature service by OBJECTID.
 */
export function deleteArcGISFeature(
  url: string,
  objectIds: number[] | string,
): Promise<FeatureEditResult<ArcGisEditResponse>> {
  const body: DeleteFeatureRequestBody = { url, objectIds };
  return postFeature<DeleteFeatureRequestBody, ArcGisEditResponse>("/secure/arcgis/feature/delete", body);
}
