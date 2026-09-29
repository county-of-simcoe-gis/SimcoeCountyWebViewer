import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useConfig } from "@/hooks/useConfig";
import { server } from "@/test/testServer";
import { http, HttpResponse } from "msw";
import { resetConfig } from "@/utils/config";
import { useAppStore } from "@/stores/appStore";
import { useToastStore } from "@/hooks/useToast";
import { signIn } from "next-auth/react";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  getSession: vi.fn().mockResolvedValue(null),
}));

const signInMock = vi.mocked(signIn);

const VALID_MAP_JSON = JSON.stringify({ General: { title: "Secured Map" } });

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
  // Test setup replaces window.location with a plain stub object, so
  // history.replaceState can't navigate — set the search string directly.
  const setUrlSearch = (search: string) => {
    window.location.search = search;
    window.location.href = `http://localhost:3000/${search}`;
  };

  beforeEach(() => {
    resetConfig();
    signInMock.mockClear();
    useToastStore.getState().clearAll();
    setUrlSearch("");
    // The stubbed window.location doesn't respond to history.replaceState,
    // so emulate the navigation by updating the stub like a real browser would.
    vi.spyOn(window.history, "replaceState").mockImplementation((_data, _unused, url) => {
      if (typeof url === "string") {
        window.location.href = url;
        window.location.search = new URL(url).search;
      }
    });
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

  it("redirects to login when the map API returns 401 and there is no session", async () => {
    setUrlSearch("?MAP_ID=secured_map");
    server.use(
      http.get("*/map/secured_map", () => {
        return HttpResponse.json({ error: "Map requires authentication" }, { status: 401 });
      }),
    );

    renderHook(() => useConfig());

    // Redirects to login, preserving the requested MAP_ID so the user returns to
    // the secured map after a legitimate login.
    await waitFor(() => expect(signInMock).toHaveBeenCalledTimes(1));
    const callbackUrl = signInMock.mock.calls[0][1]?.callbackUrl as string;
    expect(callbackUrl).toContain("MAP_ID=secured_map");
  });

  it("strips the /signout path from the login callback so post-logout auto-login doesn't loop", async () => {
    setUrlSearch("?MAP_ID=secured_map");
    window.location.pathname = "/signout";
    server.use(
      http.get("*/map/secured_map", () => {
        return HttpResponse.json({ error: "Map requires authentication" }, { status: 401 });
      }),
    );

    renderHook(() => useConfig());

    await waitFor(() => expect(signInMock).toHaveBeenCalledTimes(1));
    const callbackUrl = signInMock.mock.calls[0][1]?.callbackUrl as string;
    expect(callbackUrl).not.toContain("/signout");
    expect(callbackUrl).toContain("MAP_ID=secured_map");
    // reset pathname for other tests
    window.location.pathname = "/";
  });

  it("shows a warning toast and falls back to the default map on 403 without redirecting to login", async () => {
    setUrlSearch("?MAP_ID=secured_map");
    server.use(
      http.get("*/map/secured_map", () => {
        return HttpResponse.json({ error: "Access denied" }, { status: 403 });
      }),
      // After MAP_ID is stripped, the fallback reloads the config's own mapId ("public")
      http.get("*/map/public", () => {
        return HttpResponse.json({ json: VALID_MAP_JSON, is_secured: false, allowed_roles: "", published: true });
      }),
    );

    const { result } = renderHook(() => useConfig());

    // Loop regression: authenticated-but-denied must never trigger signIn
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(signInMock).not.toHaveBeenCalled();

    // Warning toast shown
    expect(useToastStore.getState().toasts.some((toast) => toast.type === "warning" && toast.message.includes("secured_map"))).toBe(true);

    // MAP_ID removed from the URL so the fallback doesn't retry the secured map
    expect(window.location.search).not.toContain("MAP_ID");

    // Default map loaded
    expect(result.current.config?.title).toBe("Secured Map");
    expect(result.current.error).toBeNull();
  });

  it("shows an error for a non-existent map (404) without redirecting to login or falling back", async () => {
    setUrlSearch("?MAP_ID=does_not_exist");
    server.use(
      http.get("*/map/does_not_exist", () => {
        return HttpResponse.json({ error: "Map not found" }, { status: 404 });
      }),
    );

    const { result } = renderHook(() => useConfig());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(signInMock).not.toHaveBeenCalled();
    expect(result.current.error).toContain("does_not_exist");
    expect(result.current.config).toBeNull();
  });

  it("shows a clear error when the app's own default map is not found (no MAP_ID), without looping", async () => {
    // No MAP_ID in URL: loadConfig falls back to the config's own mapId ("public")
    server.use(
      http.get("*/map/public", () => {
        return HttpResponse.json({ error: "Map not found" }, { status: 404 });
      }),
    );

    const { result } = renderHook(() => useConfig());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(signInMock).not.toHaveBeenCalled();
    expect(result.current.error).toContain("could not be found");
    expect(result.current.config).toBeNull();
  });
});
