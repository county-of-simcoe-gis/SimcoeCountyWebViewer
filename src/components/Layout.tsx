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

interface LayoutProps {
  children?: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAnyLoading, setConfig, setConfigLoading, setConfigError } = useAppStore();
  const { loadFromConfig, setEventEmitter } = useSidebarStore();
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
      // Load sidebar items from config
      loadFromConfig(config.sidebarToolComponents, config.sidebarThemeComponents);
    }

    if (configError) {
      setConfigError(configError);
    }
  }, [config, configLoading, configError, setConfig, setConfigLoading, setConfigError, loadFromConfig]);

  const isLoading = isAnyLoading();

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
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

      {/* Additional content */}
      {children}
    </div>
  );
}
