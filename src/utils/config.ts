// Configuration types and utilities for the Simcoe County Web Viewer
import { JSONToSettings } from "@/lib/JSONTranslation";
import type { SettingsType } from "@/types/SettingsType";
import { getAxiosClient } from "@/lib/axiosInstance";
import localConfig from "@/config.json";
import { getPublicPath } from "@/utils/getPublicPath";

function resolveInternalUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith("//")) return url;

  const normalized = url.startsWith("/") ? url : `/${url}`;
  return getPublicPath(normalized);
}

export interface AppConfig {
  // Basic app settings
  useMapConfigApi: boolean;
  mapId: string;
  headerLogoImageName: string;
  logoOverlayText?: string;
  title: string;
  description?: string;
  favicon: string;
  originUrl: string;
  feedbackUrl: string;

  // Server URLs
  geoserverUrl: string;
  publicUrl: string;
  geoserverPath: string;
  printUrl: string;
  apiUrl: string;
  apiUrlDev: string;
  apiUrlSecured?: string;
  apiUrlSecuredDev?: string;

  // Feature flags
  includeAppStats: boolean;
  htmlIdentify: boolean;
  leftClickIdentify: boolean;
  excludeIdentifyTitleName: boolean;
  allowIdentifyExport: boolean;
  showFeedbackMessageOnStartup: boolean;
  showWhatsNewOnStartup: boolean;
  showWhatsNewPopupOnStartup: boolean;
  showTermsOnStartup: boolean;

  // External URLs
  termsUrl: string;
  reportUrl: string;
  openLicenseUrl: string;
  whatsNewUrl: string;
  helpUrl: string;
  ieWarningUrl: string;
  propertyReportUrl: string;
  weatherRadarApiUrl: string;

  // Google Analytics
  googleAnalyticsID: string;
  appStatsUrl: string;

  // Map settings
  centerCoords: number[];
  defaultZoom: number;
  maxZoom: number;

  // Map controls
  controls: {
    rotate: boolean;
    fullScreen: boolean;
    zoomInOut: boolean;
    currentLocation: boolean;
    zoomExtent: boolean;
    scale: boolean;
    scaleLine: boolean;
    basemap: boolean;
    gitHubButton: boolean;
    scaleSelector: boolean;
    showGrid: boolean;
    extentHistory: boolean;
    attribution: boolean;
    attributeTable?: boolean;
  };

  // Storage keys
  storageKeys: {
    SearchHistory: string;
    Draw: string;
    URLDontShowAgain: string;
  };

  // UI settings
  mapTheme: string;
  showFloatingMenuHeader: boolean;
  showLoadingScreens: boolean;
  onlyStandardCursor: boolean;
  restrictOriginForUrlWindow: boolean;
  showHelpButtonInsteadOfFeedback?: boolean;

  // Menu visibility settings
  rightClickMenuVisibility: Record<string, boolean>;
  drawingOptionsToolsMenuVisibility: Record<string, boolean>;

  // TOC configuration
  toc: {
    tocType: string;
    geoserverLayerGroupsUrl: string;
    geoserverLayerGroupsUrlType: string;
    esriServiceUrl: string;
    default_group: string;
    sources: Array<{
      group: {
        name: string;
        displayName: string;
        visibleLayers: string[];
      };
      layerUrl: string;
      secure: boolean;
      primary: boolean;
      urlType: string;
      type: string;
      descriptionOverride?: string;
    }>;
    helpLink: string;
    layerInfoURL: string;
    keywords: Record<string, unknown>;
    loaderType?: string;
  };

  // Sidebar components
  sidebarToolComponents: SidebarComponent[];
  sidebarThemeComponents: SidebarComponent[];

  // Default active theme/tool (from map config)
  default_theme?: string;
  default_tool?: string;

  // Sidebar section visibility (from map config)
  hideLayers?: boolean;
  hideTools?: boolean;
  hideMyMaps?: boolean;
  hideThemes?: boolean;
  hideReports?: boolean;

  // Search settings (from map config)
  searchPlaceHolder?: string;
  searchHideTypes?: boolean;
  searchDefaultType?: string;
  hideSearch?: boolean;
  municipality?: string;

  // Viewer mode (from map config)
  viewerMode?: string;
  disableRightClickMenu?: boolean;
  feedback_contact?: string;

  // Property report configuration (from map config)
  propertyReport?: {
    customIdentify?: Array<{
      identifyType: string;
      label: string;
      title: string;
      linkText: string;
      layerURL: string;
      layerId: string;
      whereFormat: string;
      fields: string[];
      secured?: boolean;
      type?: string;
    }>;
  };

  // Print logo (from map config)
  printLogo?: string;

  // Feature highlight styles (from map config)
  featureHighlitStyles?: {
    zoomFactor?: number;
    circleRadius?: number;
    circleStroke?: string;
    circleStrokeWidth?: number;
    circleFill?: string;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
  };

  // Basemap configuration (from map config)
  baseMapType?: string;
  baseMapServices?: {
    defaultButton?: string;
    imageryServices?: unknown[];
    topoServices?: unknown[];
  };

  // Sidebar shortcut params (URL → sidebar item mappings)
  sidebarShortcutParams?: Array<{
    id?: number;
    url_param: string;
    type: string;
    component: string;
    matchValue?: string;
    hidden?: boolean;
    timeout?: number;
  }>;

  // Sidebar tab title customization
  toolsTitle?: string;
  themesTitle?: string;

  // Parcel layer config
  parcelLayer?: {
    url: string;
    rollNumberFieldName?: string;
  };

  // Other properties that might be added dynamically
  [key: string]: unknown;
}

export interface SidebarComponent {
  id: number;
  name: string;
  componentName: string;
  description: string;
  imageName: string;
  helpLink?: string;
  config?: string;
  secure?: boolean;
  securityKeywords?: string[];
  disable?: boolean;
  enabled?: boolean;
  hideHeader?: boolean;
}

/**
 * Merge two arrays of objects by matching on `id`.
 * For each item in the targetArray (local config), if a matching item exists in sourceArray (API config),
 * merge the source properties onto the target. Preserves local display metadata (name, description, imageName)
 * while applying API overrides (enabled, disable, config).
 * Any items in sourceArray that don't exist in targetArray are appended.
 * Ported from the old app's mergeObjArray in helpers.js.
 */
function mergeObjArray(targetArray: SidebarComponent[], sourceArray: SidebarComponent[]): SidebarComponent[] {
  // Deduplicate source array by id — when multiple entries share the same id,
  // merge them together (later entries override earlier ones). This handles
  // API configs that include both simple enable/disable flags and componentName
  // overrides for the same id.
  const deduped = new Map<number, SidebarComponent>();
  for (const item of sourceArray) {
    const existing = deduped.get(item.id);
    if (existing) {
      // Merge: later entry overrides, but skip undefined/empty fields
      const merged = { ...existing };
      for (const [key, value] of Object.entries(item)) {
        if (value !== undefined) {
          (merged as Record<string, unknown>)[key] = value;
        }
      }
      deduped.set(item.id, merged as SidebarComponent);
    } else {
      deduped.set(item.id, { ...item });
    }
  }
  const dedupedSource = Array.from(deduped.values());

  const resultArray: SidebarComponent[] = [];
  const remainingSource = [...dedupedSource];

  targetArray.forEach((targetObj) => {
    const sourceIndex = remainingSource.findIndex((source) => targetObj.id === source.id);
    if (sourceIndex !== -1) {
      const sourceObj = remainingSource[sourceIndex];
      // Merge source properties onto a copy of the target, preserving target's display metadata
      const merged: SidebarComponent = { ...targetObj };
      // Apply API overrides selectively
      if (sourceObj.enabled !== undefined) merged.enabled = sourceObj.enabled;
      if (sourceObj.disable !== undefined) merged.disable = sourceObj.disable;
      if (sourceObj.config !== undefined) merged.config = sourceObj.config;
      if (sourceObj.secure !== undefined) merged.secure = sourceObj.secure;
      if (sourceObj.securityKeywords !== undefined) merged.securityKeywords = sourceObj.securityKeywords;
      if (sourceObj.hideHeader !== undefined) merged.hideHeader = sourceObj.hideHeader;
      // Only override display fields if the source actually provides them (non-empty)
      if (sourceObj.name && sourceObj.name !== sourceObj.componentName) merged.name = sourceObj.name;
      if (sourceObj.description) merged.description = sourceObj.description;
      if (sourceObj.imageName) merged.imageName = sourceObj.imageName;
      if (sourceObj.helpLink) merged.helpLink = sourceObj.helpLink;

      resultArray.push(merged);
      remainingSource.splice(sourceIndex, 1);
    } else {
      resultArray.push({ ...targetObj });
    }
  });

  // Append any API-only items not found in local config
  return resultArray.concat(remainingSource);
}

// Global config store
let globalConfig: AppConfig | null = null;

/**
 * Custom error class for when a secured map requires authentication
 */
export class AuthenticationRequiredError extends Error {
  mapId: string;
  constructor(mapId: string) {
    super(`Map "${mapId}" requires authentication`);
    this.name = "AuthenticationRequiredError";
    this.mapId = mapId;
  }
}

/**
 * Custom error class for when the user is authenticated but does not have
 * access to the requested map (HTTP 403). Redirecting to sign in again would
 * cause an endless login loop, so this must never trigger signIn().
 */
export class MapAccessDeniedError extends Error {
  mapId: string;
  constructor(mapId: string) {
    super(`You don't have access to map "${mapId}"`);
    this.name = "MapAccessDeniedError";
    this.mapId = mapId;
  }
}

/**
 * Custom error class for when the requested map does not exist (HTTP 404).
 */
export class MapNotFoundError extends Error {
  mapId: string;
  constructor(mapId: string) {
    super(`Map "${mapId}" was not found`);
    this.name = "MapNotFoundError";
    this.mapId = mapId;
  }
}

/**
 * Load configuration from the map API and translate using JSONTranslation
 */
async function loadConfigFromApi(mapId: string, mapVersion?: string): Promise<Partial<AppConfig> | null> {
  try {
    // Determine which API endpoint to use
    const apiUrl = mapId && mapId.trim() !== "" ? (mapVersion ? `/api/map/${mapId}/${mapVersion}` : `/api/map/${mapId}`) : `/api/map`; // Use default map endpoint

    // console.log(`Loading config from API: ${apiUrl}`);

    // Fetch map configuration from the API using axios
    const axiosClient = getAxiosClient(apiUrl);
    // For internal API routes, the axiosInstance already has baseURL set, so we need to use the path without /api
    const requestPath = apiUrl.startsWith("/api/") ? apiUrl.replace("/api", "") : apiUrl;
    const response = await axiosClient.get<{
      json?: string;
      is_secured?: boolean;
      allowed_roles?: string;
      published?: boolean;
    }>(requestPath);
    const mapConfig = response.data;

    // Check if we have a valid map config with JSON
    if (!mapConfig.json) {
      console.error("Map config from API is missing json field");
      return null;
    }

    // Parse the JSON string from the database
    let rawJsonConfig: Record<string, unknown>;
    try {
      rawJsonConfig = typeof mapConfig.json === "string" ? JSON.parse(mapConfig.json) : mapConfig.json;
    } catch (parseError) {
      console.error("Failed to parse JSON config from database:", parseError);
      return null;
    }

    // Use JSONTranslation to convert raw JSON to structured settings
    const translatedSettings = JSONToSettings(rawJsonConfig);

    // Convert SettingsType to AppConfig format
    const apiConfig = convertSettingsToAppConfig(translatedSettings);

    // If the API wrapper indicates draft/published metadata, map it to config.draft
    if (mapConfig.published === false) {
      (apiConfig as Record<string, unknown>).draft = true;
    }

    // console.log("Successfully loaded and translated config from API:", apiConfig);
    return apiConfig;
  } catch (error) {
    // Map the HTTP status codes returned by the map API to distinct errors:
    // - 401: secured map, anonymous user — authentication is required
    // - 403: authenticated user lacks the required role/location — access denied
    //        (redirecting to sign in again would cause an endless loop)
    // - 404: the requested map does not exist
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { status?: number } };
      const status = axiosError.response?.status;
      const hasMapId = mapId && mapId.trim() !== "";
      if (status === 401) {
        throw new AuthenticationRequiredError(mapId);
      }
      if (status === 403 && hasMapId) {
        throw new MapAccessDeniedError(mapId);
      }
      if (status === 404 && hasMapId) {
        throw new MapNotFoundError(mapId);
      }
    }
    console.error("Error loading config from API:", error);
    throw error;
  }
}

/**
 * Convert SettingsType to AppConfig format
 */
function convertSettingsToAppConfig(settings: SettingsType & Record<string, unknown>): Partial<AppConfig> {
  const config: Partial<AppConfig> = {};

  // Map General settings
  if (settings.General) {
    const general = settings.General;
    // title/favicon: API map config wins when provided, otherwise local
    // config.json values remain as fallback (see loadConfig).
    if (general.title) config.title = general.title;
    if (general.favicon) config.favicon = general.favicon;
    if (general.description) config.description = general.description;
    if (general.headerLogoImageName) config.headerLogoImageName = general.headerLogoImageName;
    if (general.defaultZoom) config.defaultZoom = general.defaultZoom;
    if (general.maxZoom) config.maxZoom = general.maxZoom;
    if (Array.isArray(general.centerCoords) && general.centerCoords.length >= 2) config.centerCoords = general.centerCoords;
    if (general.leftClickIdentify !== undefined) config.leftClickIdentify = general.leftClickIdentify;
    if (general.allowIdentifyExport !== undefined) config.allowIdentifyExport = general.allowIdentifyExport;
    if (general.showFloatingMenuHeader !== undefined) config.showFloatingMenuHeader = general.showFloatingMenuHeader;
    if (general.showFeedbackMessageOnStartup !== undefined) config.showFeedbackMessageOnStartup = general.showFeedbackMessageOnStartup;
    if (general.showTermsOnStartup !== undefined) config.showTermsOnStartup = general.showTermsOnStartup;
    if (general.showWhatsNewPopupOnStartup !== undefined) config.showWhatsNewPopupOnStartup = general.showWhatsNewPopupOnStartup;
    if (general.termsUrl) config.termsUrl = general.termsUrl;
    if (general.helpUrl) config.helpUrl = resolveInternalUrl(general.helpUrl);
    if (general.feedbackUrl) config.feedbackUrl = general.feedbackUrl;
    if (general.whatsNewUrl) config.whatsNewUrl = general.whatsNewUrl;

    // Additional General properties
    if (general.viewerMode) config.viewerMode = general.viewerMode;
    if (general.disableRightClickMenu !== undefined) config.disableRightClickMenu = general.disableRightClickMenu;
    if (general.feedback_contact) config.feedback_contact = general.feedback_contact;
    if (general.showHelpButtonInsteadOfFeedback !== undefined) config.showHelpButtonInsteadOfFeedback = general.showHelpButtonInsteadOfFeedback;
    if ((general as Record<string, unknown>).printLogo) config.printLogo = (general as Record<string, unknown>).printLogo as string;
    if ((general as Record<string, unknown>).baseMapType) config.baseMapType = (general as Record<string, unknown>).baseMapType as string;
    if ((general as Record<string, unknown>).featureHighlitStyles) config.featureHighlitStyles = (general as Record<string, unknown>).featureHighlitStyles as AppConfig["featureHighlitStyles"];
    if ((general as Record<string, unknown>).sidebarShortcutParams) config.sidebarShortcutParams = (general as Record<string, unknown>).sidebarShortcutParams as AppConfig["sidebarShortcutParams"];

    // Map controls
    if (general.controls) {
      config.controls = {
        ...general.controls,
        attribution: general.controls.attribution || false, // Provide default for required field
      };
    }

    // Map right-click menu visibility
    if (general.rightClickMenuVisibility) {
      config.rightClickMenuVisibility = { ...general.rightClickMenuVisibility };
    }
  }

  // Map Layers settings to TOC
  // Only create toc override if Layers has meaningful data (non-empty sources, tocType, or defaultGroup)
  if (settings.Layers) {
    const layers = settings.Layers;
    const hasMeaningfulSources = Array.isArray(layers.sources) && layers.sources.length > 0;
    const hasMeaningfulData = hasMeaningfulSources || (layers.tocType && layers.tocType.trim() !== "") || (layers.defaultGroup && layers.defaultGroup.trim() !== "");

    if (hasMeaningfulData) {
      config.toc = {} as AppConfig["toc"];
      if (layers.tocType && layers.tocType.trim() !== "") config.toc.tocType = layers.tocType;
      if (layers.defaultGroup && layers.defaultGroup.trim() !== "") config.toc.default_group = layers.defaultGroup;
      if (hasMeaningfulSources && layers.sources) config.toc.sources = layers.sources;
      if (layers.helpLink && layers.helpLink.trim() !== "") config.toc.helpLink = resolveInternalUrl(layers.helpLink);
    } else {
      // API Layers section has no meaningful data to override local config
    }

    // Hide layers flag (independent of toc data)
    if (layers.hideLayers !== undefined) config.hideLayers = layers.hideLayers;
  }

  // Map Tools settings
  if (settings.Tools) {
    const tools = settings.Tools;
    if (tools.sidebarToolComponents) {
      config.sidebarToolComponents = tools.sidebarToolComponents.map((comp) => ({
        id: comp.id,
        name: comp.componentName,
        componentName: comp.componentName,
        description: "",
        imageName: "",
        // Translate old enabled/disabled flags to new disable flag
        // If enabled === false, set disable = true; otherwise use existing disable value
        disable: comp.enabled === false ? true : (comp.disable ?? false),
        config: JSON.stringify(comp.config || {}),
      }));
    }
    if (tools.default_tool) config.default_tool = tools.default_tool;
    if (tools.hideTools !== undefined) config.hideTools = tools.hideTools;
  }

  // Map Themes settings
  if (settings.Themes) {
    const themes = settings.Themes;
    if (themes.sidebarThemeComponents) {
      config.sidebarThemeComponents = themes.sidebarThemeComponents.map((comp) => ({
        id: comp.id,
        name: comp.componentName,
        componentName: comp.componentName,
        description: "",
        imageName: "",
        // Translate old enabled/disabled flags to new disable flag
        // If enabled === false, set disable = true; otherwise use existing disable value
        disable: comp.enabled === false ? true : (comp.disable ?? false),
        config: JSON.stringify(comp.config || {}),
      }));
    }
    if (themes.default_theme) config.default_theme = themes.default_theme;
    if (themes.hideThemes !== undefined) config.hideThemes = themes.hideThemes;
  }

  // Map MyMaps settings
  if (settings.MyMaps) {
    const myMaps = settings.MyMaps;
    if (myMaps.drawingOptionsToolsMenuVisibility) {
      config.drawingOptionsToolsMenuVisibility = { ...myMaps.drawingOptionsToolsMenuVisibility };
    }
    if (myMaps.hideMyMaps !== undefined) config.hideMyMaps = myMaps.hideMyMaps;
  }

  // Map Reports settings
  if (settings.Reports) {
    const reports = settings.Reports;
    if (reports.hideReports !== undefined) config.hideReports = reports.hideReports;
  }

  // Map Search settings
  if (settings.Search) {
    const search = settings.Search;
    if (search.municipality) config.municipality = search.municipality;
    if (search.placeHolder) config.searchPlaceHolder = search.placeHolder;
    if (search.hideTypes !== undefined) config.searchHideTypes = search.hideTypes;
    if (search.defaultSearchType) config.searchDefaultType = search.defaultSearchType;
    if (search.hideSearch !== undefined) config.hideSearch = search.hideSearch;
  }

  // Map Basemaps settings
  if (settings.Basemaps) {
    const basemaps = settings.Basemaps;
    const hasBasemapData =
      basemaps.defaultButton || (Array.isArray(basemaps.imageryServices) && basemaps.imageryServices.length > 0) || (Array.isArray(basemaps.topoServices) && basemaps.topoServices.length > 0);
    if (hasBasemapData) {
      config.baseMapServices = {};
      if (basemaps.defaultButton) config.baseMapServices.defaultButton = basemaps.defaultButton;
      if (Array.isArray(basemaps.imageryServices) && basemaps.imageryServices.length > 0) config.baseMapServices.imageryServices = basemaps.imageryServices;
      if (Array.isArray(basemaps.topoServices) && basemaps.topoServices.length > 0) config.baseMapServices.topoServices = basemaps.topoServices;
    }
  }

  // Map Tools title
  if (settings.Tools?.title) config.toolsTitle = settings.Tools.title;

  // Map Themes title
  if (settings.Themes?.title) config.themesTitle = settings.Themes.title;

  // Map propertyReport settings (passed through from translation)
  if (settings.propertyReport) {
    config.propertyReport = settings.propertyReport as AppConfig["propertyReport"];
  }

  // Copy any additional properties that don't fit the standard structure
  for (const key in settings) {
    if (!["General", "Layers", "Search", "Tools", "MyMaps", "Themes", "Reports", "Basemaps"].includes(key)) {
      (config as Record<string, unknown>)[key] = settings[key];
    }
  }

  return config;
}

/**
 * Load configuration from the bundled src/config.json and process URL parameters.
 * (public/config.json is a build-time artifact produced by scripts/strip-secure-blocks.py
 * for the public deployment; the app itself always uses the bundled src/config.json.)
 */
export async function loadConfig(configSecured: Record<string, unknown> = {}): Promise<AppConfig> {
  try {
    // Load the base config from imported config.json (deep clone to avoid mutating the module singleton)
    const config: AppConfig = JSON.parse(JSON.stringify(localConfig)) as AppConfig;
    config.configSecured = configSecured;

    // Process URL parameters
    const queryString = window.location.search;
    let mapId = config.mapId;
    let mapVersionVar: string | undefined = undefined;
    let loaderType = "DEFAULT"; // MAPID, ARCGIS, GEOSERVER
    let geoserverUrl = config.toc.geoserverLayerGroupsUrl;
    let geoserverUrlType = config.toc.geoserverLayerGroupsUrlType;
    let tocType = config.toc.tocType;
    let esriServiceUrl = config.toc.esriServiceUrl;

    if (queryString.length > 0) {
      const urlParams = new URLSearchParams(queryString);
      const url_mapId = urlParams.get("MAP_ID");
      const url_geoserverUrlType = urlParams.get("GEO_TYPE");
      const url_tocType = urlParams.get("TOCTYPE");
      const url_geoserverUrl = urlParams.get("GEO_URL");
      const url_esriServiceUrl = urlParams.get("ARCGIS_SERVICE");
      const viewerMode = urlParams.get("MODE");
      const url_mapVersion = urlParams.get("MAP_VERSION");

      if (url_mapVersion !== null) {
        mapVersionVar = url_mapVersion;
        // keep mapVersion on the returned config so consumers can inspect it
        (config as Record<string, unknown>).mapVersion = url_mapVersion;
      }

      if (url_geoserverUrlType !== null) geoserverUrlType = url_geoserverUrlType;
      if (url_mapId !== null) {
        mapId = url_mapId.toLowerCase();
        loaderType = "MAPID";
        config.mapId = mapId;
      }
      if (viewerMode !== null) {
        config.viewerMode = viewerMode;
      }
      if (url_geoserverUrl !== null) {
        geoserverUrl = url_geoserverUrl;
        loaderType = "GEOSERVER";
      }
      if (url_esriServiceUrl !== null) {
        esriServiceUrl = url_esriServiceUrl;
        loaderType = "ARCGIS";
      }
      if (url_tocType !== null) tocType = url_tocType;
    }

    // Update config with URL parameters
    if (tocType !== config.toc.tocType) config.toc.tocType = tocType;
    if (geoserverUrl !== config.toc.geoserverLayerGroupsUrl) {
      if (!geoserverUrl.toLowerCase().includes("request=GetCapabilities")) {
        geoserverUrl = `${geoserverUrl}/ows?service=wms&version=1.3.0&request=GetCapabilities`;
      }
      config.toc.geoserverLayerGroupsUrl = geoserverUrl;
    }
    if (geoserverUrlType !== config.toc.geoserverLayerGroupsUrlType) {
      config.toc.geoserverLayerGroupsUrlType = geoserverUrlType;
    }
    if (esriServiceUrl !== config.toc.esriServiceUrl) {
      config.toc.esriServiceUrl = esriServiceUrl;
    }

    // Determine loader type
    if (loaderType === "DEFAULT") {
      if (mapId !== null && mapId !== undefined && mapId.trim() !== "") {
        config.mapId = mapId;
        loaderType = "MAPID";
      } else if (geoserverUrl !== null && geoserverUrl !== undefined && geoserverUrl.trim() !== "") {
        loaderType = "GEOSERVER";
      } else if (esriServiceUrl !== null && esriServiceUrl !== undefined && esriServiceUrl.trim() !== "") {
        loaderType = "ARCGIS";
      }
    }

    config.toc.loaderType = loaderType;

    // Load additional config from API if enabled, or if a mapId is provided (via URL or config)
    const shouldLoadFromApi = config.useMapConfigApi || (mapId !== null && mapId !== undefined && mapId.trim() !== "");
    if (shouldLoadFromApi) {
      config.toc.loaderType = "MAPID";
      try {
        const apiConfig = await loadConfigFromApi(config.mapId, mapVersionVar);
        if (apiConfig) {
          // Preserve local config values that the API doesn't provide
          const localKeywords = config.toc?.keywords || {};
          const localToc = { ...config.toc };
          const localToolComponents = config.sidebarToolComponents || [];
          const localThemeComponents = config.sidebarThemeComponents || [];

          // Extract API toc before the shallow merge so it doesn't overwrite the full toc
          const apiToc = apiConfig.toc;
          delete apiConfig.toc;

          // Merge non-toc API config with base config (API takes precedence)
          Object.assign(config, apiConfig);

          // Deep-merge toc: start from local toc, then overlay API toc fields
          config.toc = { ...localToc };
          if (apiToc) {
            // Only override fields that the API actually provides
            if (apiToc.tocType) config.toc.tocType = apiToc.tocType;
            if (apiToc.default_group) config.toc.default_group = apiToc.default_group;
            if (apiToc.helpLink) config.toc.helpLink = resolveInternalUrl(apiToc.helpLink);
            if (apiToc.geoserverLayerGroupsUrl) config.toc.geoserverLayerGroupsUrl = apiToc.geoserverLayerGroupsUrl;
            if (apiToc.geoserverLayerGroupsUrlType) config.toc.geoserverLayerGroupsUrlType = apiToc.geoserverLayerGroupsUrlType;
            if (apiToc.esriServiceUrl) config.toc.esriServiceUrl = apiToc.esriServiceUrl;
            if (apiToc.layerInfoURL) config.toc.layerInfoURL = apiToc.layerInfoURL;

            // Sources: replace only if API provides non-empty sources.
            if (Array.isArray(apiToc.sources) && apiToc.sources.length > 0) {
              config.toc.sources = apiToc.sources;
            } else {
              // API config has no sources, keeping local config sources
            }
          }

          // Merge API keywords with local keywords (API may provide additional keyword
          // definitions, e.g. SAR, CATEGORY for Emergency Management maps). Local keywords
          // serve as the base; API keywords are layered on top so both sets are available.
          config.toc.keywords = { ...localKeywords, ...(apiToc?.keywords || {}) };

          // Smart merge tool/theme arrays: match by id, preserve local display metadata,
          // apply API overrides (enabled/disable/config). Falls back to local if API provides none.
          if (config.sidebarToolComponents && config.sidebarToolComponents.length > 0) {
            config.sidebarToolComponents = mergeObjArray(localToolComponents, config.sidebarToolComponents);
          } else {
            config.sidebarToolComponents = localToolComponents;
          }
          if (config.sidebarThemeComponents && config.sidebarThemeComponents.length > 0) {
            config.sidebarThemeComponents = mergeObjArray(localThemeComponents, config.sidebarThemeComponents);
          } else {
            config.sidebarThemeComponents = localThemeComponents;
          }
        }
      } catch (apiError) {
        // Re-throw auth/access errors so the UI can handle them explicitly:
        // - AuthenticationRequiredError (401) → redirect to login
        // - MapAccessDeniedError (403) → toast + default map fallback
        // - MapNotFoundError (404) → error message
        if (apiError instanceof AuthenticationRequiredError || apiError instanceof MapAccessDeniedError || apiError instanceof MapNotFoundError) {
          throw apiError;
        }
        console.warn("Failed to load config from API, using base config:", apiError);
        // Continue with base config if API fails for other reasons
      }
    }

    // Store globally for easy access
    globalConfig = config;

    return config;
  } catch (error) {
    console.error("Error loading configuration:", error);
    throw error;
  }
}

/**
 * Get the current configuration
 */
export function getConfig(): AppConfig | null {
  return globalConfig;
}

/**
 * Reset the global configuration (for testing)
 */
export function resetConfig(): void {
  globalConfig = null;
}

/**
 * Get configuration for a specific component (tool or theme)
 */
export function getComponentConfig(component: "tools" | "themes", name: string): SidebarComponent | undefined {
  if (!globalConfig) return undefined;

  const configArray = component === "tools" ? globalConfig.sidebarToolComponents : globalConfig.sidebarThemeComponents;

  return configArray.find((item) => item.name !== undefined && item.name.toLowerCase() === name.toLowerCase());
}

/**
 * Update the page title, description, and favicon based on config
 */
export function updatePageMetadata(config: AppConfig) {
  if (config.title) {
    document.title = config.title;
  }

  if (config.description) {
    updateMetaDescription(config.description);
  }

  if (config.favicon) {
    changeIcon(config.favicon);
  }
}

/**
 * Update the page meta description
 */
export function updateMetaDescription(description: string) {
  let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
  if (!metaDescription) {
    metaDescription = document.createElement("meta");
    metaDescription.name = "description";
    document.getElementsByTagName("head")[0].appendChild(metaDescription);
  }
  metaDescription.content = description;
}

/**
 * Change the page favicon
 *
 * In Next.js (App Router), a default favicon link is automatically injected
 * from `src/app/favicon.ico`. To ensure our dynamic favicon takes effect,
 * we update any existing icon links and remove auto-generated ones so the
 * configured icon is the only one the browser sees.
 */
export function changeIcon(icon: string) {
  if (typeof document === "undefined") return;

  // If it's not a full URL, assume it's in the public directory and prepend
  // the configured basePath (if any) so the browser can resolve it correctly.
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  let resolvedIcon: string;
  if (icon.startsWith("http")) {
    resolvedIcon = icon;
  } else {
    const normalized = icon.startsWith("/") ? icon : `/${icon}`;
    resolvedIcon = `${basePath}${normalized}`;
  }

  const head = document.getElementsByTagName("head")[0];

  // Remove any existing icon links that we don't manage (e.g., Next.js auto-injected)
  const existingIcons = document.querySelectorAll('link[rel~="icon"]');
  existingIcons.forEach((el) => {
    if ((el as HTMLLinkElement).id !== "favicon") {
      el.parentNode?.removeChild(el);
    }
  });

  let link = document.getElementById("favicon") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.id = "favicon";
    head.appendChild(link);
  }

  link.href = resolvedIcon;
}
