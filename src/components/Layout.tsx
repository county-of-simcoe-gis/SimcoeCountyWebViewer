"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/appStore";
import { useTOCStore } from "@/stores/tocStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useMapStore } from "@/stores/mapStore";
import { useConfig } from "@/hooks/useConfig";
import { useToastStore } from "@/hooks/useToast";
import { usePermissions } from "@/hooks/usePermissions";
import { showURLWindow } from "@/utils/helpersUI";
import { enableUserStorage, getUserStorage, userStorageReady } from "@/utils/userStorage";
import { getStorageItem } from "@/utils/storage";
import { trackMapLoad } from "@/lib/appStats";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import SidebarSlim from "@/components/SidebarSlim";
import MapContainer from "@/components/map/MapContainer";
import LoadingScreen from "@/components/LoadingScreen";
import MyMapsService from "@/components/myMaps/MyMapsService";
import GlobalDrawingOptionsPopup from "@/components/myMaps/GlobalDrawingOptionsPopup";
import LayerInfoModal from "@/components/LayerInfo/LayerInfoModal";
import LegendModal from "@/components/Legend/LegendModal";
import AttributeTablePanel from "@/components/AttributeTable/AttributeTablePanel";
import MoreMenu from "@/components/MoreMenu";
import GlobalURLModal from "@/components/common/GlobalURLModal";
import DisclaimerModal from "@/components/common/DisclaimerModal";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "@/styles/react-tabs.css";

interface LayoutProps {
  children?: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const mapLoading = useAppStore((s) => s.mapLoading);
  const sidebarLoading = useAppStore((s) => s.sidebarLoading);
  const headerLoading = useAppStore((s) => s.headerLoading);
  const appConfigLoading = useAppStore((s) => s.configLoading);
  const layersLoading = useTOCStore((s) => s.isLoading);
  const tocHasInitialized = useTOCStore((s) => s.hasInitialized);
  const setConfig = useAppStore((s) => s.setConfig);
  const setConfigLoading = useAppStore((s) => s.setConfigLoading);
  const setConfigError = useAppStore((s) => s.setConfigError);
  const setUserName = useAppStore((s) => s.setUserName);
  const loadFromConfig = useSidebarStore((s) => s.loadFromConfig);
  const activateDefaultItems = useSidebarStore((s) => s.activateDefaultItems);
  const openSidebar = useSidebarStore((s) => s.openSidebar);
  const attributeTableEnabled = useMapStore((s) => s.controlVisibility.attributeTable);
  const { config, loading: configLoading, error: configError } = useConfig();
  const { data: session, status: sessionStatus } = useSession();
  const { checkAllPermissions } = usePermissions();

  // Sync authenticated username into appStore for app stats
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.name) {
      setUserName(session.user.name);
    } else if (sessionStatus === "unauthenticated") {
      setUserName(null);
    }
  }, [session, sessionStatus, setUserName]);

  // --- User storage sync (restore localStorage from server for saveToServer users) ---
  const userStorageFiredRef = useRef(false);
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    if (sessionStatus !== "authenticated" || userStorageFiredRef.current) return;
    userStorageFiredRef.current = true;

    const hasSaveRole = session?.user?.roles?.includes("saveToServer") ?? false;
    // Only enable server-backed user storage when MAP_ID equals "app_track"
    let isAppTrack = false;
    try {
      const params = new URLSearchParams(window.location.search);
      const mapIdParam = params.get("MAP_ID") ?? params.get("map_id") ?? "";
      isAppTrack = (mapIdParam || "").toLowerCase() === "app_track";
    } catch {
      isAppTrack = false;
    }

    const shouldEnable = hasSaveRole && isAppTrack;
    enableUserStorage(shouldEnable);

    if (shouldEnable) {
      getUserStorage();
    }

    // Signal that localStorage is populated (or user doesn't have the role)
    userStorageReady.then(() => setStorageReady(true));
  }, [session, sessionStatus]);

  // For unauthenticated users, disable server sync (resolves userStorageReady) and mark ready
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      enableUserStorage(false);
      setStorageReady(true);
    }
  }, [sessionStatus]);

  // Update app store when config changes — wait for storageReady so localStorage
  // contains server-restored values before TOC/stores read from it.
  useEffect(() => {
    setConfigLoading(configLoading);

    if (config && storageReady) {
      setConfig(config);
      // Load sidebar items from config, including hide flags
      // console.log("Loading sidebar components from config:", {
      //   tools: config.sidebarToolComponents?.length || 0,
      //   themes: config.sidebarThemeComponents?.length || 0,
      //   default_theme: config.default_theme || "(none)",
      //   default_tool: config.default_tool || "(none)",
      // });
      loadFromConfig(config.sidebarToolComponents || [], config.sidebarThemeComponents || [], {
        hideLayers: !!config.hideLayers,
        hideTools: !!config.hideTools,
        hideMyMaps: !!config.hideMyMaps,
        hideThemes: !!config.hideThemes,
        hideReports: !!config.hideReports,
      });

      // Activate default theme/tool after sidebar items are loaded
      const defaultTheme = config.default_theme as string | undefined;
      const defaultTool = config.default_tool as string | undefined;
      if (defaultTheme || defaultTool) {
        // Small delay to ensure sidebar store has processed the items
        setTimeout(() => {
          activateDefaultItems(defaultTheme, defaultTool);
        }, 100);
      }

      // Auto-open sidebar if viewerMode is "ADVANCED" (matches old app behavior)
      const viewerMode = ((config.viewerMode as string) || "").toUpperCase();
      if (viewerMode === "ADVANCED") {
        openSidebar();
      }

      // Track map load once per session
      if (!mapLoadTrackedRef.current) {
        mapLoadTrackedRef.current = true;
        trackMapLoad(config.mapId);
      }
    }

    if (configError) {
      setConfigError(configError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, configLoading, configError, storageReady, setConfig, setConfigLoading, setConfigError, loadFromConfig, activateDefaultItems]);

  // Ref to ensure we only track map load once per session
  const mapLoadTrackedRef = useRef(false);

  // Run permission checks early on app mount so features can warn the user
  useEffect(() => {
    checkAllPermissions();
    // We intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Startup popups (What's New + Feedback) --- run once when config arrives
  const startupFiredRef = useRef(false);
  useEffect(() => {
    if (!config || startupFiredRef.current) return;
    startupFiredRef.current = true;

    // What's New — full-window mode
    if (config.showWhatsNewOnStartup && config.whatsNewUrl) {
      showURLWindow(config.whatsNewUrl, true, "full", true, true, "What's New");
    }
    // What's New — popup / toast mode (only if full-window mode is NOT enabled)
    else if (config.showWhatsNewPopupOnStartup && config.whatsNewUrl) {
      // Check localStorage "don't show again" before displaying
      let isDismissed = false;
      try {
        const stored = getStorageItem("sc_dontshowagain");
        if (stored) {
          const data = JSON.parse(stored);
          const items: Array<{ url?: string }> = Array.isArray(data) ? data : (data?.value ?? []);
          isDismissed = items.some((item) => item.url?.toLowerCase() === config.whatsNewUrl.toLowerCase());
        }
      } catch {
        /* ignore */
      }

      if (!isDismissed) {
        useToastStore.getState().addToast(`What's changed? Click the hamburger menu ☰ → "What's New" to find out!`, "info", 10000);
      }
    }

    // Feedback message — delayed toast after 60 seconds
    if (config.showFeedbackMessageOnStartup) {
      setTimeout(() => {
        useToastStore.getState().addToast("Please provide us feedback! Click the feedback button in the header to share your thoughts.", "info", 10000);
      }, 60000);
    }
  }, [config]);

  const isLoading = mapLoading || sidebarLoading || headerLoading || appConfigLoading || !tocHasInitialized || layersLoading;

  return (
    <div id="app-root" className="relative w-full h-screen overflow-hidden print:hidden">
      {/* Portal root for modals */}
      <div id="portal-root" />

      {/* Loading Screen */}
      <LoadingScreen visible={isLoading} headerLogoImageName={config?.headerLogoImageName} />

      {/* Error Display */}
      {configError && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-error/10 text-error p-5 rounded-md border border-error/30 z-[9999]">
          <h3>Configuration Error</h3>
          <p>{configError}</p>
        </div>
      )}

      {/* Header - positioned absolutely at top */}
      <Header />

      {/* Sidebar - positioned below header */}
      <Sidebar />

      {/* Slim Sidebar - shows when sidebar is closed */}
      <SidebarSlim />

      {/* Main Map */}
      <MapContainer />

      {/* MyMaps Service - runs in background to manage map features */}
      <MyMapsService />

      {/* Global Drawing Options Popup - available even when MyMaps panel is closed */}
      <GlobalDrawingOptionsPopup />

      {/* Layer Info Modal - displays layer metadata and download options */}
      <LayerInfoModal />

      {/* Legend Modal - displays legends for visible layers */}
      <LegendModal />

      {/* Attribute Table - bottom-docked, tabbed data grid per layer */}
      {attributeTableEnabled && <AttributeTablePanel />}

      {/* More Menu - displays themes, tools, and other options */}
      <MoreMenu />

      {/* Global URL Modal - full-screen iframe overlay triggered by showURLWindow() */}
      <GlobalURLModal />

      {/* Disclaimer Modal - layer-specific terms/disclaimer prompt */}
      <DisclaimerModal />

      {/* Google Analytics - conditionally loaded when googleAnalyticsID is configured */}
      <GoogleAnalytics />

      {/* Additional content */}
      {children}
    </div>
  );
}
