// Configuration types and utilities for the Simcoe County Web Viewer

export interface AppConfig {
  // Basic app settings
  useMapConfigApi: boolean;
  mapId: string;
  headerLogoImageName: string;
  title: string;
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
 * Load configuration from the public config.json file and process URL parameters
 */
export async function loadConfig(configSecured: Record<string, unknown> = {}): Promise<AppConfig> {
  try {
    // Load the base config from public/config.json
    const response = await fetch("/config.json");
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }

    const config: AppConfig = await response.json();
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

    // TODO: Implement API-based config loading if useMapConfigApi is true
    // For now, just return the basic config

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
 * Update the page title and favicon based on config
 */
export function updatePageMetadata(config: AppConfig) {
  if (config.title) {
    document.title = config.title;
  }

  if (config.favicon) {
    changeIcon(config.favicon);
  }
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
