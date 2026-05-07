// Settings type interface for JSONTranslation
// This interface defines the structured settings object that maps to the translation table

export interface SidebarToolComponent {
  id: number;
  componentName: string;
  disable: boolean;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface SidebarThemeComponent {
  id: number;
  componentName: string;
  disable: boolean;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface SettingsType {
  // General settings
  General: {
    favicon?: string;
    title?: string;
    description?: string;
    allowIdentifyExport?: boolean;
    headerLogoImageName?: string;
    viewerMode?: string;
    showWhatsNewPopupOnStartup?: boolean;
    whatsNewUrl?: string;
    showTermsOnStartup?: boolean;
    termsUrl?: string;
    showFeedbackMessageOnStartup?: boolean;
    leftClickIdentify?: boolean;
    allowIdentityExport?: boolean;
    showFloatingMenuHeader?: boolean;
    disableRightClickMenu?: boolean;
    defaultZoom?: number;
    showHelpButtonInsteadOfFeedback?: boolean;
    helpUrl?: string;
    feedback_contact?: string;
    feedbackUrl?: string;
    centerCoords?: number[];
    maxZoom?: number;
    controls?: {
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
    rightClickMenuVisibility?: {
      basic_mode: boolean;
      property_click: boolean;
      add_mymaps: boolean;
      save_map_extent: boolean;
      report_problem: boolean;
      identify: boolean;
      google_maps: boolean;
      more: boolean;
    };
  };

  // Layer settings
  Layers: {
    hideLayers?: boolean;
    tocType?: string;
    defaultGroup?: string;
    sources?: Array<{
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
    helpLink?: string;
  };

  // Search settings
  Search: {
    hideSearch?: boolean;
    municipality?: string;
    placeHolder?: string;
    hideTypes?: boolean;
    defaultSearchType?: string;
  };

  // Tools settings
  Tools: {
    title?: string;
    hideTools?: boolean;
    default_tool?: string;
    sidebarToolComponents?: SidebarToolComponent[];
  };

  // MyMaps settings
  MyMaps: {
    hideMyMaps?: boolean;
    mailingLabelUsePartnerData?: boolean;
    drawingOptionsToolsMenuVisibility?: Record<string, boolean>;
  };

  // Themes settings
  Themes: {
    title?: string;
    hideThemes?: boolean;
    default_theme?: string;
    sidebarThemeComponents?: SidebarThemeComponent[];
  };

  // Reports settings
  Reports: {
    hideReports?: boolean;
  };

  // Basemaps settings
  Basemaps: {
    defaultButton?: string;
    imageryServices?: unknown[];
    topoServices?: unknown[];
  };

  // Property Report settings (from map config)
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

  // Allow for additional dynamic properties
  [key: string]: unknown;
}
