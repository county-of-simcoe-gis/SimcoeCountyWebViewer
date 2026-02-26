import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useConfig } from "@/hooks/useConfig";
import { server } from "@/test/testServer";
import { http, HttpResponse } from "msw";
import { resetConfig } from "@/utils/config";

// Mock the config.json to disable API loading for this test
vi.mock("@/config.json", () => ({
  default: {
    useMapConfigApi: false,
    mapId: "public",
    headerLogoImageName: "logo.png",
    title: "Interactive Map - County of Simcoe (GIS)",
    favicon: "favicon.ico",
    originUrl: "",
    feedbackUrl: "",
    geoserverUrl: "",
    publicUrl: "",
    geoserverPath: "geoserver",
    printUrl: "",
    apiUrl: "",
    apiUrlDev: "",
    includeAppStats: false,
    htmlIdentify: false,
    leftClickIdentify: true,
    excludeIdentifyTitleName: false,
    allowIdentifyExport: false,
    showFeedbackMessageOnStartup: false,
    showWhatsNewOnStartup: false,
    showWhatsNewPopupOnStartup: false,
    showTermsOnStartup: false,
    termsUrl: "",
    reportUrl: "",
    openLicenseUrl: "",
    whatsNewUrl: "",
    helpUrl: "",
    ieWarningUrl: "",
    propertyReportUrl: "",
    weatherRadarApiUrl: "",
    googleAnalyticsID: "",
    appStatsUrl: "",
    centerCoords: [0, 0],
    defaultZoom: 5,
    maxZoom: 20,
    controls: {
      rotate: true,
      fullScreen: true,
      zoomInOut: true,
      currentLocation: false,
      zoomExtent: true,
      scale: true,
      scaleLine: true,
      basemap: true,
      gitHubButton: false,
      scaleSelector: false,
      showGrid: false,
      extentHistory: false,
      attribution: true,
    },
    storageKeys: {
      SearchHistory: "SearchHistory",
      Draw: "Draw",
      URLDontShowAgain: "URLDontShowAgain",
    },
    mapTheme: "light",
    showFloatingMenuHeader: false,
    showLoadingScreens: false,
    onlyStandardCursor: true,
    restrictOriginForUrlWindow: false,
    rightClickMenuVisibility: {},
    drawingOptionsToolsMenuVisibility: {},
    toc: {
      tocType: "LIST",
      geoserverLayerGroupsUrl: "",
      geoserverLayerGroupsUrlType: "root",
      esriServiceUrl: "",
      default_group: "",
      sources: [],
      helpLink: "",
      layerInfoURL: "",
      keywords: {},
    },
    sidebarToolComponents: [],
    sidebarThemeComponents: [],
  },
}));

describe("useConfig", () => {
  beforeEach(() => {
    resetConfig();
    // Mock the map API endpoint to return empty config (test config has mapId: "public"
    // and loadConfig will try to load from API when mapId is non-empty)
    server.use(
      http.get("*/map/public", () => {
        return HttpResponse.json({ json: null });
      }),
      http.get("*/map", () => {
        return HttpResponse.json({ json: null });
      }),
    );
  });

  it("loads config and updates metadata", async () => {
    const { result } = renderHook(() => useConfig());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.config?.title).toBe("Interactive Map - County of Simcoe (GIS)");
  });
});
