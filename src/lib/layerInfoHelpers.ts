/**
 * Helper functions for constructing and working with layer info URLs
 */

import type { TOCLayer } from "@/stores/tocStore";
import { useLayerInfoStore } from "@/stores/layerInfoStore";

/**
 * Constructs a layer info URL for GeoServer REST API
 * Uses the featuretypes endpoint which gives more complete information
 */
export function constructGeoServerLayerUrl(serverUrl: string, workspace: string, layerName: string): string {
  const baseUrl = serverUrl.replace(/\/$/, ""); // Remove trailing slash
  // First try to get it as a featuretype (most common case)
  // The REST API will follow redirects if it's in a different datastore
  return `${baseUrl}/geoserver/rest/workspaces/${workspace}/layers/${layerName}.json`;
}

/**
 * Constructs a layer info URL for ArcGIS REST API
 */
export function constructArcGISLayerUrl(layerUrl: string): string {
  // If it already has ?f=json, return as is
  if (layerUrl.includes("?f=json")) {
    return layerUrl;
  }
  // Remove any existing query params and add ?f=json
  const baseUrl = layerUrl.split("?")[0];
  return `${baseUrl}?f=json`;
}

/**
 * Extracts workspace from a GeoServer WMS/WFS URL
 */
export function extractWorkspaceFromUrl(url: string): string {
  // Try to match workspace from URL patterns
  // Pattern 1: /geoserver/workspace/ows
  let match = url.match(/\/geoserver\/([^/]+)\/ows/);
  if (match) return match[1];

  // Pattern 2: /workspace:layerName
  match = url.match(/\/([^/:]+):/);
  if (match) return match[1];

  // Pattern 3: typeNames=workspace:layer
  match = url.match(/typeNames=([^:&]+):/);
  if (match) return match[1];

  // Default fallback
  return "simcoe";
}

/**
 * Extracts layer name from various URL formats
 */
export function extractLayerNameFromUrl(url: string): string | null {
  // Pattern 1: typeNames=workspace:layerName
  let match = url.match(/typeNames=[^:]+:([^&]+)/);
  if (match) return match[1];

  // Pattern 2: LAYERS=workspace:layerName
  match = url.match(/LAYERS=[^:]+:([^&]+)/i);
  if (match) return match[1];

  // Pattern 3: /featuretypes/LayerName
  match = url.match(/\/featuretypes\/([^/.]+)/);
  if (match) return match[1];

  // Pattern 4: /layers/LayerName
  match = url.match(/\/layers\/([^/.]+)/);
  if (match) return match[1];

  return null;
}

/**
 * Gets the server base URL from a full URL
 */
export function getServerBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    // Fallback to simple string split
    const parts = url.split("/geoserver");
    return parts[0];
  }
}

/**
 * Determines if a URL is a GeoServer URL
 */
export function isGeoServerUrl(url: string): boolean {
  return url.includes("/geoserver/");
}

/**
 * Determines if a URL is an ArcGIS URL
 */
export function isArcGISUrl(url: string): boolean {
  return url.includes("/MapServer") || url.includes("/FeatureServer") || url.includes("/arcgis/rest/services");
}

/**
 * Constructs a layer info URL from a TOC layer object
 */
export function constructLayerInfoUrl(layer: TOCLayer): string | null {
  // If layer already has a metadata URL, use it
  if (layer.metadataUrl) {
    return layer.metadataUrl;
  }

  // Try to construct from layerUrl
  if (!layer.layerUrl) {
    return null;
  }

  // For GeoServer layers
  if (isGeoServerUrl(layer.layerUrl)) {
    const serverUrl = getServerBaseUrl(layer.layerUrl);
    const workspace = extractWorkspaceFromUrl(layer.layerUrl);
    const layerName = layer.name || extractLayerNameFromUrl(layer.layerUrl);

    if (!layerName) {
      return null;
    }

    return constructGeoServerLayerUrl(serverUrl, workspace, layerName);
  }

  // For ArcGIS layers
  if (isArcGISUrl(layer.layerUrl)) {
    return constructArcGISLayerUrl(layer.layerUrl);
  }

  return null;
}

/**
 * Opens layer info modal for a TOC layer object
 */
export function openLayerInfo(
  layer: TOCLayer,
  options: {
    showDownload?: boolean;
  } = {},
): boolean {
  const layerUrl = constructLayerInfoUrl(layer);

  if (!layerUrl) {
    console.warn("Could not construct layer info URL for layer:", layer);
    return false;
  }

  const { showDownload = layer.canDownload ?? false } = options;
  const secured = layer.secured ?? false;

  // Open the layer info modal
  const { openLayerInfo: openModal } = useLayerInfoStore.getState();
  openModal(layerUrl, showDownload, secured);

  return true;
}

/**
 * Validates if a URL is accessible
 */
export async function validateLayerUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Constructs a download URL for a layer
 */
export function constructDownloadUrl(serverUrl: string, workspace: string, layerName: string, format: "SHAPE-ZIP" | "GeoJSON" | "KML" | "CSV" = "SHAPE-ZIP"): string {
  const baseUrl = serverUrl.replace(/\/$/, "");
  const formatMap = {
    "SHAPE-ZIP": "SHAPE-ZIP",
    GeoJSON: "application/json",
    KML: "application/vnd.google-earth.kml+xml",
    CSV: "csv",
  };

  return `${baseUrl}/geoserver/wfs?service=wfs&version=1.1.0&request=GetFeature&typeNames=${workspace}:${layerName}&outputFormat=${formatMap[format]}`;
}
