/**
 * URL Parameter Types and Configuration
 *
 * Centralized type definitions for the URL parameter handling system.
 * Supports 40+ legacy URL parameters with dependency management,
 * configurable notifications, and feature selection priority.
 */

// ============================================================================
// URL Parameter Names (Constants)
// ============================================================================

/**
 * All supported URL parameter names as string constants
 */
export const URL_PARAMS = {
  // Analytics
  ANALYTICS: "ANALYTICS",

  // Basemap & Visual
  BASEMAP: "BASEMAP",
  NAME: "NAME",
  SLIDER_OPEN: "SLIDER_OPEN",

  // Table of Contents & Layers
  TOCTYPE: "TOCTYPE",
  GROUP: "GROUP",
  LAYERS: "LAYERS",
  EXPAND_LEGEND: "EXPAND_LEGEND",

  // Themes & Tools
  THEME: "THEME",
  TOOL: "TOOL",

  // Location & Navigation
  X: "X",
  Y: "Y",
  SR: "SR",
  ID: "ID",
  XMIN: "XMIN",
  YMIN: "YMIN",
  XMAX: "XMAX",
  YMAX: "YMAX",
  ZOOM: "ZOOM",

  // Search
  Q: "q",
  QT: "qt",
  MUNI: "MUNI",
  LOCATIONID: "LOCATIONID",

  // Feature Selection (mutually exclusive, priority-based)
  NG911ID: "NG911ID",
  ARN: "ARN",
  PROPERTYLINK: "PROPERTYLINK",

  // MyMaps
  MY_MAPS_ID: "MY_MAPS_ID",
  MY_MAPS_FEATURE_ID: "MY_MAPS_FEATURE_ID",


  // UI
  TAB: "TAB",
} as const;

export type UrlParamName = (typeof URL_PARAMS)[keyof typeof URL_PARAMS];

// ============================================================================
// Execution Phases
// ============================================================================

/**
 * Execution phases for URL parameters
 * Parameters in earlier phases execute before later phases
 */
export enum UrlParamPhase {
  /** Phase 1: Analytics and tracking setup */
  ANALYTICS = 1,
  /** Phase 2: Basemap and visual settings */
  BASEMAP = 2,
  /** Phase 3: TOC and layer configuration */
  LAYERS = 3,
  /** Phase 4: Map location and navigation */
  LOCATION = 4,
  /** Phase 5: Search and UI state */
  SEARCH_UI = 5,
  /** Phase 6: Feature selection, MyMaps (after all dependencies ready) */
  FEATURES = 6,
}

// ============================================================================
// Component Dependencies
// ============================================================================

/**
 * Components that URL parameters can depend on
 */
export type ComponentDependency =
  | "map" // Map component fully loaded and interactive
  | "toc" // Table of Contents mounted
  | "search" // Search service initialized
  | "myMaps" // MyMaps service ready
  | "auth"; // Authentication completed

// ============================================================================
// Parameter Configuration Types
// ============================================================================

/**
 * Configuration for a single URL parameter
 */
export interface UrlParameterConfig {
  /** Parameter name (case-insensitive matching supported) */
  name: string;
  /** Expected value type */
  type: "string" | "number" | "boolean" | "coordinates";
  /** Execution phase (1-6) */
  phase: UrlParamPhase;
  /** Components that must be ready before this param can execute */
  dependencies: ComponentDependency[];
  /** Key to look up the handler function */
  handlerKey: string;
  /** Whether to show toast notification on success */
  notifyOnSuccess: boolean;
  /** Whether to show toast notification on failure */
  notifyOnFailure: boolean;
  /** Custom success message (optional) */
  successMessage?: string;
  /** Custom failure message prefix (optional) */
  failureMessagePrefix?: string;
}

/**
 * Extended configuration for feature selection parameters
 * These are mutually exclusive - only highest priority wins
 */
export interface FeatureSelectionConfig extends UrlParameterConfig {
  /** Priority order (lower number = higher priority) */
  priority: number;
  /** Whether to notify user if this param was ignored due to higher priority param */
  notifyIfIgnored: boolean;
  /** Whether to auto-open the popup after feature selection */
  autoOpenPopup: boolean;
  /** Full GeoServer/service URL for querying this feature type */
  serviceUrl: string;
  /** Layer name for GeoServer queries (optional) */
  layerName?: string;
  /** CQL filter field name (optional) */
  cqlField?: string;
}

// ============================================================================
// Component Readiness Types
// ============================================================================

/**
 * Options for registering component readiness
 */
export interface ComponentReadinessOptions {
  /**
   * When the component signals readiness:
   * - 'mount': Ready immediately on component mount
   * - 'dataLoaded': Ready after async data fetching completes
   */
  readinessType: "mount" | "dataLoaded";
  /** Maximum time to wait for component readiness (ms) */
  timeout?: number;
  /** Other components that must be ready first (e.g., 'auth' for secured components) */
  dependencies?: ComponentDependency[];
}

/**
 * Internal tracking of component readiness state
 */
export interface ComponentReady {
  /** Component identifier */
  name: ComponentDependency;
  /** Whether the component is ready */
  isReady: boolean;
  /** How readiness was determined */
  readinessType: "mount" | "dataLoaded";
  /** When component became ready */
  timestamp: number | null;
  /** Dependencies this component requires */
  dependencies: ComponentDependency[];
}

// ============================================================================
// Parameter Execution State
// ============================================================================

/**
 * Status of parameter execution
 */
export type ParameterExecutionStatus =
  | "queued" // Waiting for dependencies
  | "executing" // Currently being processed
  | "completed" // Successfully applied
  | "failed" // Failed to apply
  | "skipped"; // Skipped (e.g., lower priority feature selection)

/**
 * Tracks execution state for a single parameter
 */
export interface ParameterExecutionState {
  /** Parameter name */
  paramName: string;
  /** Raw value from URL */
  value: string;
  /** Current execution status */
  status: ParameterExecutionStatus;
  /** Error message if failed */
  error?: string;
  /** Result/message from handler if successful */
  result?: string;
  /** Timestamp when execution started */
  startedAt?: number;
  /** Timestamp when execution completed */
  completedAt?: number;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Handler function signature for URL parameters
 * @param value - The parameter value from the URL
 * @param config - The parameter configuration
 * @returns Promise resolving to optional success message, or rejecting with error
 */
export type UrlParameterHandler = (value: string, config: UrlParameterConfig | FeatureSelectionConfig) => Promise<string | void>;

/**
 * Map of handler keys to handler functions
 */
export type HandlerMap = Record<string, UrlParameterHandler>;

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useUrlParameters hook
 */
export interface UseUrlParametersReturn {
  /** Whether parameters are currently being processed */
  isProcessing: boolean;
  /** List of successfully completed parameter names */
  completedParameters: string[];
  /** List of failed parameter names */
  failedParameters: string[];
  /** List of skipped parameter names (e.g., lower priority feature selections) */
  skippedParameters: string[];
  /**
   * Register a component as ready for URL parameter processing
   * Call this when your component is fully initialized
   */
  registerComponentReady: (componentName: ComponentDependency, options?: ComponentReadinessOptions) => void;
  /**
   * Wait for a specific component to be ready
   * Useful in handlers that need to ensure dependencies
   */
  waitForComponent: (componentName: ComponentDependency) => Promise<void>;
  /**
   * Check if a specific component is ready
   */
  isComponentReady: (componentName: ComponentDependency) => boolean;
  /** Current readiness state of all tracked components */
  componentReadiness: Record<ComponentDependency, boolean>;
  /** Full execution state for debugging/monitoring */
  executionState: Map<string, ParameterExecutionState>;
}

// ============================================================================
// Sidebar Tab Mapping
// ============================================================================

/**
 * Sidebar tab name to index mapping
 * Matches sidebarStore: 0=layers, 1=tools, 2=mymaps, 3=themes, 4=reports
 */
export const SIDEBAR_TAB_INDEX: Record<string, number> = {
  layers: 0,
  toc: 0,
  tools: 1,
  mymaps: 2,
  my_maps: 2,
  themes: 3,
  reports: 4,
};

/**
 * Convert tab name string to index number
 */
export function tabNameToIndex(tabName: string): number {
  const normalized = tabName.toLowerCase().replace(/[-_\s]/g, "");
  return SIDEBAR_TAB_INDEX[normalized] ?? 0;
}

// ============================================================================
// Coordinate System Types
// ============================================================================

/**
 * Supported spatial reference identifiers
 */
export type SpatialReferenceId =
  | "4326" // WGS84 Lat/Long (default)
  | "LATLONG" // Alias for 4326
  | "WGS84" // Alias for 4326
  | "3857" // Web Mercator
  | "WEB" // Alias for 3857
  | "UTM" // UTM NAD83 Zone 17N
  | "26917"; // EPSG code for UTM Zone 17N

/**
 * Coordinate pair
 */
export interface Coordinates {
  x: number;
  y: number;
  sr?: SpatialReferenceId;
}

/**
 * Extent/bounding box
 */
export interface Extent {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  sr?: SpatialReferenceId;
}
