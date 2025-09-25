// Configuration types and utilities for the Simcoe County Web Viewer
import { JSONToSettings } from "@/lib/JSONTranslation";
import type { SettingsType } from "@/interfaces/SettingsType";
import { getAxiosClient } from "@/lib/axiosInstance";
import localConfig from "../config.json";

export interface AppConfig {
  // Basic app settings
  useMapConfigApi: boolean;
  mapId: string;
  headerLogoImageName: string;
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
    }>;
    helpLink: string;
    layerInfoURL: string;
    keywords: Record<string, unknown>;
    loaderType?: string;
  };

  // Sidebar components
  sidebarToolComponents: SidebarComponent[];
  sidebarThemeComponents: SidebarComponent[];

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

// Global config store
let globalConfig: AppConfig | null = null;

/**
 * Load configuration from the map API and translate using JSONTranslation
 */
async function loadConfigFromApi(mapId: string): Promise<Partial<AppConfig> | null> {
  try {
    // Determine which API endpoint to use
    const apiUrl = mapId && mapId.trim() !== "" ? `/api/map/${mapId}` : `/api/map`; // Use default map endpoint

    console.log(`Loading config from API: ${apiUrl}`);

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

    console.log("Successfully loaded and translated config from API:", apiConfig);
    return apiConfig;
  } catch (error) {
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
    if (general.title) config.title = general.title;
    if (general.description) config.description = general.description;
    if (general.favicon) config.favicon = general.favicon;
    if (general.headerLogoImageName) config.headerLogoImageName = general.headerLogoImageName;
    if (general.defaultZoom) config.defaultZoom = general.defaultZoom;
    if (general.maxZoom) config.maxZoom = general.maxZoom;
    if (general.centerCoords) config.centerCoords = general.centerCoords;
    if (general.leftClickIdentify !== undefined) config.leftClickIdentify = general.leftClickIdentify;
    if (general.allowIdentifyExport !== undefined) config.allowIdentifyExport = general.allowIdentifyExport;
    if (general.showFloatingMenuHeader !== undefined) config.showFloatingMenuHeader = general.showFloatingMenuHeader;
    if (general.showFeedbackMessageOnStartup !== undefined) config.showFeedbackMessageOnStartup = general.showFeedbackMessageOnStartup;
    if (general.showTermsOnStartup !== undefined) config.showTermsOnStartup = general.showTermsOnStartup;
    if (general.showWhatsNewPopupOnStartup !== undefined) config.showWhatsNewPopupOnStartup = general.showWhatsNewPopupOnStartup;
    if (general.termsUrl) config.termsUrl = general.termsUrl;
    if (general.helpUrl) config.helpUrl = general.helpUrl;
    if (general.feedbackUrl) config.feedbackUrl = general.feedbackUrl;
    if (general.whatsNewUrl) config.whatsNewUrl = general.whatsNewUrl;

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
  if (settings.Layers) {
    const layers = settings.Layers;
    config.toc = {
      tocType: layers.tocType || "",
      geoserverLayerGroupsUrl: "",
      geoserverLayerGroupsUrlType: "",
      esriServiceUrl: "",
      default_group: layers.defaultGroup || "",
      sources: layers.sources || [],
      helpLink: layers.helpLink || "",
      layerInfoURL: "",
      keywords: {},
    };
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
        enabled: comp.enabled,
        disable: comp.disable,
        config: JSON.stringify(comp.config || {}),
      }));
    }
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
        enabled: comp.enabled,
        disable: comp.disable,
        config: JSON.stringify(comp.config || {}),
      }));
    }
  }

  // Map MyMaps settings
  if (settings.MyMaps) {
    const myMaps = settings.MyMaps;
    if (myMaps.drawingOptionsToolsMenuVisibility) {
      config.drawingOptionsToolsMenuVisibility = { ...myMaps.drawingOptionsToolsMenuVisibility };
    }
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
 * Load configuration from the public config.json file and process URL parameters
 */
export async function loadConfig(configSecured: Record<string, unknown> = {}): Promise<AppConfig> {
  try {
    // Load the base config from imported config.json
    const config: AppConfig = localConfig as AppConfig;
    config.configSecured = configSecured;

    // Process URL parameters
    const queryString = window.location.search;
    let mapId = config.mapId;
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

    // Load additional config from API if enabled
    if (config.useMapConfigApi) {
      try {
        const apiConfig = await loadConfigFromApi(config.mapId);
        if (apiConfig) {
          // Merge API config with base config, with API config taking precedence

          Object.assign(config, apiConfig);
        }
      } catch (apiError) {
        console.warn("Failed to load config from API, using base config:", apiError);
        // Continue with base config if API fails
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
 */
export function changeIcon(icon: string) {
  let link = document.getElementById("favicon") as HTMLLinkElement;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.id = "favicon";
    document.getElementsByTagName("head")[0].appendChild(link);
  }

  // If it's not a full URL, assume it's in the public directory
  if (!icon.startsWith("http")) {
    icon = `/${icon}`;
  }

  link.href = icon;
}
