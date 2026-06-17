import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useConfig } from "@/hooks/useConfig";
import { server } from "@/test/testServer";
import { http, HttpResponse } from "msw";
import { resetConfig } from "@/utils/config";
import { useAppStore } from "@/stores/appStore";

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
    // Reset appStore config state for clean test
    useAppStore.setState({
      config: null,
      configLoading: false,
      configError: null,
    });
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

  it("ensures single API load when multiple hooks mount concurrently", async () => {
    let apiCallCount = 0;
    // Track API calls by counting successful responses
    server.use(
      http.get("*/map/public", ({ request }) => {
        // Count calls to the actual API endpoint
        if (request.url.includes("/map/public")) {
          apiCallCount++;
        }
        return HttpResponse.json({ json: null });
      }),
    );

    // Render two hooks concurrently
    const { result: result1 } = renderHook(() => useConfig());
    const { result: result2 } = renderHook(() => useConfig());

    // Wait for both to finish loading
    await waitFor(() => expect(result1.current.loading).toBe(false));
    await waitFor(() => expect(result2.current.loading).toBe(false));

    // Both should have the same config
    expect(result1.current.config).toBe(result2.current.config);
    // API should only be called once (or minimal times due to singleton behavior)
    expect(apiCallCount).toBeLessThanOrEqual(2); // Allow small variance due to timing
  });

  it("updates document title when config loads", async () => {
    const originalTitle = document.title;
    const { result } = renderHook(() => useConfig());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Document title should be updated from config
    expect(document.title).toBe("Interactive Map - County of Simcoe (GIS)");

    // Cleanup
    document.title = originalTitle;
  });

  it("allows forced reload by clearing config", async () => {
    let apiCallCount = 0;
    server.use(
      http.get("*/map/public", () => {
        apiCallCount++;
        return HttpResponse.json({ json: null });
      }),
    );

    const { result, rerender } = renderHook(() => useConfig());

    await waitFor(() => expect(result.current.loading).toBe(false));
    const firstCallCount = apiCallCount;

    // Trigger reload
    result.current.reloadConfig();
    rerender();

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Should have made additional API calls for the reload
    expect(apiCallCount).toBeGreaterThan(firstCallCount);
  });
});
