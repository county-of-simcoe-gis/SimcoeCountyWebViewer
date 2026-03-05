"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useEventStore } from "@/stores/eventStore";
import { useConfig } from "@/hooks/useConfig";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import SidebarSlim from "@/components/SidebarSlim";
import MapContainer from "@/components/MapContainer";
import LoadingScreen from "@/components/LoadingScreen";
import MyMapsService from "@/components/myMaps/MyMapsService";
import GlobalDrawingOptionsPopup from "@/components/myMaps/GlobalDrawingOptionsPopup";
import LayerInfoModal from "@/components/LayerInfo/LayerInfoModal";
import LegendModal from "@/components/Legend/LegendModal";
import HelpModal from "@/components/HelpModal";
import MoreMenu from "@/components/MoreMenu";
import GlobalURLModal from "@/components/common/GlobalURLModal";

interface LayoutProps {
  children?: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAnyLoading, setConfig, setConfigLoading, setConfigError } = useAppStore();
  const { loadFromConfig, activateDefaultItems, setEventEmitter } = useSidebarStore();
  const { emitSidebarChanged } = useEventStore();
  const { config, loading: configLoading, error: configError } = useConfig();

  // Wire up event emitters to stores
  useEffect(() => {
    setEventEmitter(emitSidebarChanged);
  }, [setEventEmitter, emitSidebarChanged]);

  // Update app store when config changes
  useEffect(() => {
    setConfigLoading(configLoading);

    if (config) {
      setConfig(config);
      // Load sidebar items from config, including hide flags
      console.log("Loading sidebar components from config:", {
        tools: config.sidebarToolComponents?.length || 0,
        themes: config.sidebarThemeComponents?.length || 0,
        default_theme: config.default_theme || "(none)",
        default_tool: config.default_tool || "(none)",
      });
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
    }

    if (configError) {
      setConfigError(configError);
    }
  }, [config, configLoading, configError, setConfig, setConfigLoading, setConfigError, loadFromConfig, activateDefaultItems]);

  const isLoading = isAnyLoading();

  return (
    <div id="app-root" className="app-layout-container print:hidden" style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      {/* Portal root for modals */}
      <div id="portal-root" />

      {/* Loading Screen */}
      <LoadingScreen visible={isLoading} />

      {/* Error Display */}
      {configError && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#f8d7da",
            color: "#721c24",
            padding: "20px",
            borderRadius: "5px",
            border: "1px solid #f5c6cb",
            zIndex: 9999,
          }}
        >
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

      {/* Help Modal - displays README.md as help documentation */}
      <HelpModal />

      {/* More Menu - displays themes, tools, and other options */}
      <MoreMenu />

      {/* Global URL Modal - full-screen iframe overlay triggered by showURLWindow() */}
      <GlobalURLModal />

      {/* Additional content */}
      {children}
    </div>
  );
}
