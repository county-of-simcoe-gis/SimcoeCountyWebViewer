/**
 * URL Parameters Configuration
 *
 * Central configuration for all supported URL parameters.
 * Defines parameter metadata, execution phases, dependencies,
 * notification settings, and feature selection priority.
 *
 * SERVICE URLS: Each feature selection parameter requires a full serviceUrl.
 * Update these URLs to match your deployment's GeoServer/service endpoints.
 */

import { type UrlParameterConfig, type FeatureSelectionConfig, UrlParamPhase, URL_PARAMS } from "@/types/urlParameters";

// ============================================================================
// Standard Parameters Configuration
// ============================================================================

/**
 * Standard URL parameters (non-feature-selection)
 * These execute in phase order with dependency checking
 */
export const standardParameters: UrlParameterConfig[] = [
  // -------------------------------------------------------------------------
  // Phase 1: Analytics
  // -------------------------------------------------------------------------
  {
    name: URL_PARAMS.ANALYTICS,
    type: "string",
    phase: UrlParamPhase.ANALYTICS,
    dependencies: [],
    handlerKey: "handleAnalytics",
    notifyOnSuccess: false,
    notifyOnFailure: false,
  },

  // -------------------------------------------------------------------------
  // Phase 2: Basemap & Visual Settings
  // -------------------------------------------------------------------------
  {
    name: URL_PARAMS.BASEMAP,
    type: "string",
    phase: UrlParamPhase.BASEMAP,
    dependencies: ["map"],
    handlerKey: "handleBasemap",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Failed to set basemap",
  },
  {
    name: URL_PARAMS.NAME,
    type: "string",
    phase: UrlParamPhase.BASEMAP,
    dependencies: ["map"],
    handlerKey: "handleBasemapName",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Failed to set basemap layer",
  },
  {
    name: URL_PARAMS.SLIDER_OPEN,
    type: "boolean",
    phase: UrlParamPhase.BASEMAP,
    dependencies: ["map"],
    handlerKey: "handleSliderOpen",
    notifyOnSuccess: false,
    notifyOnFailure: false,
  },

  // -------------------------------------------------------------------------
  // Phase 3: TOC & Layer Configuration
  // -------------------------------------------------------------------------
  {
    name: URL_PARAMS.TOCTYPE,
    type: "string",
    phase: UrlParamPhase.LAYERS,
    dependencies: ["toc"],
    handlerKey: "handleTocType",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Failed to set TOC type",
  },
  {
    name: URL_PARAMS.GROUP,
    type: "string",
    phase: UrlParamPhase.LAYERS,
    dependencies: ["toc"],
    handlerKey: "handleGroup",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Failed to activate layer group",
  },
  {
    name: URL_PARAMS.LAYERS,
    type: "string",
    phase: UrlParamPhase.LAYERS,
    dependencies: ["toc"],
    handlerKey: "handleLayers",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Failed to toggle layers",
  },
  {
    name: URL_PARAMS.EXPAND_LEGEND,
    type: "boolean",
    phase: UrlParamPhase.LAYERS,
    dependencies: ["toc"],
    handlerKey: "handleExpandLegend",
    notifyOnSuccess: false,
    notifyOnFailure: false,
  },

  // -------------------------------------------------------------------------
  // Phase 3.5: Themes & Tools (after TOC, before location)
  // -------------------------------------------------------------------------
  {
    name: URL_PARAMS.THEME,
    type: "string",
    phase: UrlParamPhase.LAYERS, // Load themes in layer phase
    dependencies: ["map"], // Only need map for themes
    handlerKey: "handleTheme",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Theme not found",
  },
  {
    name: URL_PARAMS.TOOL,
    type: "string",
    phase: UrlParamPhase.LAYERS,
    dependencies: ["map"],
    handlerKey: "handleTool",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Tool not found",
  },

  // -------------------------------------------------------------------------
  // Phase 4: Location & Navigation (coordinates)
  // -------------------------------------------------------------------------
  // Note: X, Y, and SR are handled together as a group
  {
    name: URL_PARAMS.X,
    type: "coordinates",
    phase: UrlParamPhase.LOCATION,
    dependencies: ["map"],
    handlerKey: "handleCoordinates",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Failed to zoom to coordinates",
  },
  {
    name: URL_PARAMS.Y,
    type: "coordinates",
    phase: UrlParamPhase.LOCATION,
    dependencies: ["map"],
    handlerKey: "handleCoordinates", // Same handler as X - they work together
    notifyOnSuccess: false,
    notifyOnFailure: true,
  },
  {
    name: URL_PARAMS.SR,
    type: "string",
    phase: UrlParamPhase.LOCATION,
    dependencies: ["map"],
    handlerKey: "handleCoordinates", // Part of coordinate handling
    notifyOnSuccess: false,
    notifyOnFailure: false,
  },
  {
    name: URL_PARAMS.ZOOM,
    type: "number",
    phase: UrlParamPhase.LOCATION,
    dependencies: ["map"],
    handlerKey: "handleZoom",
    notifyOnSuccess: false,
    notifyOnFailure: false,
  },
  // Extent parameters (XMIN, YMIN, XMAX, YMAX handled together)
  {
    name: URL_PARAMS.XMIN,
    type: "coordinates",
    phase: UrlParamPhase.LOCATION,
    dependencies: ["map"],
    handlerKey: "handleExtent",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Failed to zoom to extent",
  },
  {
    name: URL_PARAMS.YMIN,
    type: "coordinates",
    phase: UrlParamPhase.LOCATION,
    dependencies: ["map"],
    handlerKey: "handleExtent",
    notifyOnSuccess: false,
    notifyOnFailure: true,
  },
  {
    name: URL_PARAMS.XMAX,
    type: "coordinates",
    phase: UrlParamPhase.LOCATION,
    dependencies: ["map"],
    handlerKey: "handleExtent",
    notifyOnSuccess: false,
    notifyOnFailure: true,
  },
  {
    name: URL_PARAMS.YMAX,
    type: "coordinates",
    phase: UrlParamPhase.LOCATION,
    dependencies: ["map"],
    handlerKey: "handleExtent",
    notifyOnSuccess: false,
    notifyOnFailure: true,
  },

  // -------------------------------------------------------------------------
  // Phase 5: Search & UI
  // -------------------------------------------------------------------------
  {
    name: URL_PARAMS.MUNI,
    type: "string",
    phase: UrlParamPhase.SEARCH_UI,
    dependencies: [],
    handlerKey: "handleMunicipality",
    notifyOnSuccess: false,
    notifyOnFailure: false,
  },
  {
    name: URL_PARAMS.Q,
    type: "string",
    phase: UrlParamPhase.SEARCH_UI,
    dependencies: ["search"],
    handlerKey: "handleSearchQuery",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Search failed",
  },
  {
    name: URL_PARAMS.QT,
    type: "string",
    phase: UrlParamPhase.SEARCH_UI,
    dependencies: ["search"],
    handlerKey: "handleSearchType",
    notifyOnSuccess: false,
    notifyOnFailure: false,
  },
  {
    name: URL_PARAMS.TAB,
    type: "string",
    phase: UrlParamPhase.SEARCH_UI,
    dependencies: [],
    handlerKey: "handleTab",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Failed to activate tab",
  },

];

// ============================================================================
// Feature Selection Parameters (Mutually Exclusive, Priority-Based)
// ============================================================================

/**
 * Feature selection parameters
 *
 * These are mutually exclusive - if multiple are provided in the URL,
 * only the highest priority (lowest priority number) will be applied.
 * Others will be skipped (and optionally notified based on notifyIfIgnored).
 *
 * IMPORTANT: Update serviceUrl values to match your GeoServer deployment!
 */
export const featureSelectionParameters: FeatureSelectionConfig[] = [
  {
    name: URL_PARAMS.NG911ID,
    type: "string",
    phase: UrlParamPhase.FEATURES,
    dependencies: ["map"],
    handlerKey: "handleNG911ID",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "911 Address not found",
    priority: 1, // Highest priority
    notifyIfIgnored: false,
    autoOpenPopup: false,
    // UPDATE THIS URL for your deployment
    serviceUrl: "https://opengis.simcoe.ca/geoserver/ows",
    layerName: "simcoe:Civic_Address_Point_Lookup",
    cqlField: "NGUID",
  },
  {
    name: URL_PARAMS.ARN,
    type: "string",
    phase: UrlParamPhase.FEATURES,
    dependencies: ["map"],
    handlerKey: "handleARN",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Property not found",
    priority: 2,
    notifyIfIgnored: false,
    autoOpenPopup: false,
    // UPDATE THIS URL for your deployment
    serviceUrl: "https://opengis.simcoe.ca/geoserver/ows",
    layerName: "simcoe:Assessment_Parcels",
    cqlField: "ARN",
  },
  {
    name: URL_PARAMS.LOCATIONID,
    type: "string",
    phase: UrlParamPhase.FEATURES,
    dependencies: ["map", "search"],
    handlerKey: "handleLocationId",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Location not found",
    priority: 3,
    notifyIfIgnored: false,
    autoOpenPopup: false,
    // UPDATE THIS URL for your deployment
    serviceUrl: "https://opengis.simcoe.ca/api/search",
  },
  {
    name: URL_PARAMS.PROPERTYLINK,
    type: "string",
    phase: UrlParamPhase.FEATURES,
    dependencies: ["map"],
    handlerKey: "handlePropertyLink",
    notifyOnSuccess: false,
    notifyOnFailure: true,
    failureMessagePrefix: "Invalid property link",
    priority: 4, // Lowest priority
    notifyIfIgnored: false,
    autoOpenPopup: false,
    serviceUrl: "", // Not used for property link - it's a URL itself
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get configuration for a specific parameter
 * @param paramName - Parameter name (case-insensitive)
 * @returns Parameter configuration or undefined
 */
export function getParameterConfig(paramName: string): UrlParameterConfig | FeatureSelectionConfig | undefined {
  const normalizedName = paramName.toUpperCase();

  // Check feature selection parameters first
  const featureParam = featureSelectionParameters.find((p) => p.name.toUpperCase() === normalizedName);
  if (featureParam) return featureParam;

  // Check standard parameters
  return standardParameters.find((p) => p.name.toUpperCase() === normalizedName);
}

/**
 * Check if a parameter is a feature selection parameter
 */
export function isFeatureSelectionParam(paramName: string): boolean {
  return featureSelectionParameters.some((p) => p.name.toUpperCase() === paramName.toUpperCase());
}

/**
 * Get all parameter configurations grouped by phase
 */
export function getParametersByPhase(): Map<UrlParamPhase, UrlParameterConfig[]> {
  const grouped = new Map<UrlParamPhase, UrlParameterConfig[]>();

  for (const param of standardParameters) {
    const existing = grouped.get(param.phase) || [];
    existing.push(param);
    grouped.set(param.phase, existing);
  }

  return grouped;
}

/**
 * Get all supported parameter names
 */
export function getAllParameterNames(): string[] {
  return [...standardParameters.map((p) => p.name), ...featureSelectionParameters.map((p) => p.name)];
}

/**
 * Parameters that should be processed together (e.g., X, Y, SR)
 * Maps primary param to all related params
 */
export const parameterGroups: Record<string, string[]> = {
  [URL_PARAMS.X]: [URL_PARAMS.X, URL_PARAMS.Y, URL_PARAMS.SR],
  [URL_PARAMS.Y]: [URL_PARAMS.X, URL_PARAMS.Y, URL_PARAMS.SR],
  [URL_PARAMS.SR]: [URL_PARAMS.X, URL_PARAMS.Y, URL_PARAMS.SR],
  [URL_PARAMS.XMIN]: [URL_PARAMS.XMIN, URL_PARAMS.YMIN, URL_PARAMS.XMAX, URL_PARAMS.YMAX],
  [URL_PARAMS.YMIN]: [URL_PARAMS.XMIN, URL_PARAMS.YMIN, URL_PARAMS.XMAX, URL_PARAMS.YMAX],
  [URL_PARAMS.XMAX]: [URL_PARAMS.XMIN, URL_PARAMS.YMIN, URL_PARAMS.XMAX, URL_PARAMS.YMAX],
  [URL_PARAMS.YMAX]: [URL_PARAMS.XMIN, URL_PARAMS.YMIN, URL_PARAMS.XMAX, URL_PARAMS.YMAX],
  [URL_PARAMS.Q]: [URL_PARAMS.Q, URL_PARAMS.QT],
  [URL_PARAMS.QT]: [URL_PARAMS.Q, URL_PARAMS.QT],
};

/**
 * Get the primary parameter for a grouped set
 * (e.g., X is primary for X/Y/SR group)
 */
export function getPrimaryParam(paramName: string): string {
  const upper = paramName.toUpperCase();
  if ([URL_PARAMS.X, URL_PARAMS.Y, URL_PARAMS.SR].includes(upper as typeof URL_PARAMS.X)) {
    return URL_PARAMS.X;
  }
  if ([URL_PARAMS.XMIN, URL_PARAMS.YMIN, URL_PARAMS.XMAX, URL_PARAMS.YMAX].includes(upper as typeof URL_PARAMS.XMIN)) {
    return URL_PARAMS.XMIN;
  }
  if ([URL_PARAMS.Q, URL_PARAMS.QT].includes(upper as typeof URL_PARAMS.Q)) {
    return URL_PARAMS.Q;
  }
  return paramName;
}
