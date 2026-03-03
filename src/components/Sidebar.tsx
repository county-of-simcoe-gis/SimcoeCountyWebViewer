"use client";

import "@/components/Sidebar.css";
import Image from "next/image";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useEventStore } from "@/stores/eventStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import { useReportsStore } from "@/stores/reportsStore";
import { useEffect, useState, Suspense, useCallback, useMemo } from "react";
import { lazy } from "react";
import { useSession } from "next-auth/react";
import ReportsNavBar from "@/components/ReportsNavBar";

// Lazy load tool components
const MeasureTool = lazy(() => import("@/components/tools/Measure/MeasureTool"));
const CoordinatesTool = lazy(() => import("@/components/tools/Coorfinates/CoordinatesTool"));
const SettingsTool = lazy(() => import("@/components/tools/Settings/SettingsTool"));
const PrintTool = lazy(() => import("@/components/tools/Print/PrintTool"));
const PrintLocalTool = lazy(() => import("@/components/tools/PrintLocal/PrintLocalTool"));
const WeatherTool = lazy(() => import("@/components/tools/Weather/WeatherTool"));
const LotAndConcessionTool = lazy(() => import("@/components/tools/LotAndConcession/LotAndConcessionTool"));
const ExternalServicesTool = lazy(() => import("@/components/tools/ExternalServices/ExternalServicesTool"));
const AddLayerTool = lazy(() => import("@/components/tools/AddLayer/AddLayerTool"));
const AvailableMapsTool = lazy(() => import("@/components/tools/AvailableMaps/AvailableMapsTool"));

// Lazy load theme components
const ForestryTheme = lazy(() => import("@/components/themes/Forestry/Forestry"));
const ChildCareFacilitiesTheme = lazy(() => import("@/components/themes/ChildCareFacilities/ChildCareFacilities"));
const TwoOneOneTheme = lazy(() => import("@/components/themes/TwoOneOne/TwoOneOne"));
const SolidWasteFacilitiesTheme = lazy(() => import("@/components/themes/SolidWasteFacilities/SolidWasteFacilities"));
const ImmigrationServicesTheme = lazy(() => import("@/components/themes/ImmigrationServices/ImmigrationServices"));
const BroadbandTheme = lazy(() => import("@/components/themes/Broadband/Broadband"));
const ZoningTheme = lazy(() => import("@/components/themes/Zoning/Zoning"));
const Five11Theme = lazy(() => import("@/components/themes/Five11/Five11"));
const CommercialRealEstateTheme = lazy(() => import("@/components/themes/CommercialRealEstate/CommercialRealEstate"));

// Lazy load TOC component
const TOC = lazy(() => import("@/components/TOC/TOC"));

// Lazy load MyMaps component
const MyMaps = lazy(() => import("@/components/myMaps/MyMaps"));

// Tab names in display order — used to compute dynamic tab indices
const ALL_TAB_NAMES = ["layers", "tools", "mymaps", "themes", "reports"] as const;

// Tool mapping for dynamic loading
const toolComponents: Record<
  string,
  React.LazyExoticComponent<
    React.ComponentType<{
      name?: string;
      helpLink?: string;
      hideHeader?: boolean;
      onClose: () => void;
      onSidebarVisibility?: () => void;
      config?: Record<string, unknown>;
      options?: Record<string, unknown>;
    }>
  >
> = {
  Measure: MeasureTool,
  Coordinates: CoordinatesTool,
  Settings: SettingsTool,
  Print: PrintTool,
  PrintLocal: PrintLocalTool,
  Weather: WeatherTool,
  LotAndConcession: LotAndConcessionTool,
  ExternalServices: ExternalServicesTool,
  AddLayer: AddLayerTool,
  AvailableMaps: AvailableMapsTool,
};

// Theme mapping for dynamic loading
const themeComponents: Record<
  string,
  React.LazyExoticComponent<
    React.ComponentType<{
      name?: string;
      helpLink?: string;
      hideHeader?: boolean;
      onClose: () => void;
      onSidebarVisibility?: () => void;
      config?: Record<string, unknown>;
      options?: Record<string, unknown>;
    }>
  >
> = {
  Forestry: ForestryTheme,
  ChildCareFacilities: ChildCareFacilitiesTheme,
  TwoOneOne: TwoOneOneTheme,
  "211": TwoOneOneTheme,
  SolidWasteFacilities: SolidWasteFacilitiesTheme,
  ImmigrationServices: ImmigrationServicesTheme,
  Five11: Five11Theme,
  Five11LiveFeeds: Five11Theme,
  "511": Five11Theme,
  CommercialRealEstate: CommercialRealEstateTheme,
  Broadband: BroadbandTheme,
  Zoning: ZoningTheme,
};

export default function Sidebar() {
  const { isOpen, themes, tools, activeTheme, activeTool, activeTab, setActiveTab, activateSidebarItem, openSidebar, hideLayers, hideTools, hideMyMaps, hideThemes, hideReports } = useSidebarStore();
  const { emitSidebarLoaded } = useEventStore();
  const { addLoadedItem } = useMapStore();
  const { setSidebarLoading } = useAppStore();
  const urlParameters = useAppStore((state) => state.urlParameters);
  const { currentReport } = useReportsStore();
  const { data: session } = useSession();

  // Filter out secure items when user is not authenticated
  const visibleThemes = useMemo(() => (session ? themes : themes.filter((t) => !t.secure)), [themes, session]);
  const visibleTools = useMemo(() => (session ? tools : tools.filter((t) => !t.secure)), [tools, session]);

  // When only one theme/tool exists, show its icon and name on the tab instead of generic "Themes"/"Tools"
  const isSingleTheme = visibleThemes.length === 1;
  const singleTheme = isSingleTheme ? visibleThemes[0] : null;

  // State for active components
  const [activeToolComponent, setActiveToolComponent] = useState<React.ReactNode>(null);
  const [activeThemeComponent, setActiveThemeComponent] = useState<React.ReactNode>(null);

  // Sync theme component when activeTheme changes (for URL parameter activation)
  useEffect(() => {
    if (activeTheme && visibleThemes.length > 0) {
      // Find the theme in the list
      const theme = visibleThemes.find((t) => t.id === activeTheme);
      if (theme) {
        const componentName = theme.component || theme.name;
        const ThemeComponent = themeComponents[componentName];
        if (ThemeComponent) {
          console.log(`[Sidebar] Syncing theme component for: ${theme.name} (${componentName})`);
          const component = (
            <Suspense fallback={<div style={{ padding: "20px" }}>Loading theme...</div>}>
              <ThemeComponent name={theme.name} hideHeader={isSingleTheme} onClose={() => setActiveThemeComponent(null)} onSidebarVisibility={() => console.log("Toggle sidebar visibility")} />
            </Suspense>
          );
          setActiveThemeComponent(component);
        }
      }
    } else if (!activeTheme) {
      // Clear theme component when no theme is active
      setActiveThemeComponent(null);
    }
  }, [activeTheme, visibleThemes, isSingleTheme]);

  // Auto-activate the single theme so it renders directly (no selector needed)
  useEffect(() => {
    if (isSingleTheme && singleTheme && !activeTheme) {
      const componentName = singleTheme.component || singleTheme.name;
      activateSidebarItem(componentName, "themes");
      const ThemeComponent = themeComponents[componentName];
      if (ThemeComponent) {
        setActiveThemeComponent(
          <Suspense fallback={<div style={{ padding: "20px" }}>Loading theme...</div>}>
            <ThemeComponent name={singleTheme.name} hideHeader={true} onClose={() => setActiveThemeComponent(null)} onSidebarVisibility={() => console.log("Toggle sidebar visibility")} />
          </Suspense>,
        );
      }
    }
  }, [isSingleTheme, singleTheme, activeTheme, activateSidebarItem]);

  // Sync tool component when activeTool changes (for URL parameter activation)
  useEffect(() => {
    if (activeTool && visibleTools.length > 0) {
      // Find the tool in the list
      const tool = visibleTools.find((t) => t.id === activeTool);
      if (tool) {
        const componentName = tool.component || tool.name;
        const ToolComponent = toolComponents[componentName];
        if (ToolComponent) {
          console.log(`[Sidebar] Syncing tool component for: ${tool.name} (${componentName})`);
          const component = (
            <Suspense fallback={<div style={{ padding: "20px" }}>Loading tool...</div>}>
              <ToolComponent name={tool.name} onClose={() => setActiveToolComponent(null)} onSidebarVisibility={() => console.log("Toggle sidebar visibility")} />
            </Suspense>
          );
          setActiveToolComponent(component);
        }
      }
    } else if (!activeTool) {
      // Clear tool component when no tool is active
      setActiveToolComponent(null);
    }
  }, [activeTool, visibleTools]);

  // Debug logging
  // console.log("Sidebar render:", { toolsCount: tools.length, themesCount: themes.length });

  // Build dynamic tab index mapping based on which tabs are visible
  const visibleTabs = ALL_TAB_NAMES.filter((tab) => {
    if (tab === "layers" && hideLayers) return false;
    if (tab === "tools" && hideTools) return false;
    if (tab === "mymaps" && hideMyMaps) return false;
    if (tab === "themes" && hideThemes) return false;
    if (tab === "reports" && hideReports) return false;
    return true;
  });

  const tabMapping: Record<string, number> = {};
  visibleTabs.forEach((tab, index) => {
    tabMapping[tab] = index;
    if (tab === "mymaps") tabMapping["my maps"] = index; // alias
  });

  // Function to activate tab by name
  const activateTab = useCallback(
    (tabName: string) => {
      const normalizedTabName = tabName.toLowerCase().trim();
      const tabIndex = tabMapping[normalizedTabName];

      if (tabIndex !== undefined) {
        setActiveTab(tabIndex);
      } else {
        console.warn(`Unknown tab name: ${tabName}`);
      }
    },
    [setActiveTab, tabMapping],
  );

  // Handle URL parameters for tab activation
  const handleURLParameters = useCallback(() => {
    const tabNameParameter = urlParameters.TAB;
    if (tabNameParameter) {
      // Open sidebar first, then activate the specified tab
      openSidebar();
      // Use a small delay to ensure sidebar is open before activating tab
      setTimeout(() => {
        activateTab(tabNameParameter);
      }, 100);
    }
  }, [urlParameters.TAB, openSidebar, activateTab]);

  useEffect(() => {
    // Mark sidebar as loaded (replaces window.emitter.emit("sidebarLoaded"))
    emitSidebarLoaded();
    addLoadedItem("sidebar");
    setSidebarLoading(false);
  }, [emitSidebarLoaded, addLoadedItem, setSidebarLoading]);

  // Handle URL parameters after component is loaded
  useEffect(() => {
    if (Object.keys(urlParameters).length > 0) {
      handleURLParameters();
    }
  }, [urlParameters, handleURLParameters]);

  const handleTabSelect = (index: number) => {
    setActiveTab(index);
  };

  const handleSidebarItemClick = (componentName: string, displayName: string, type: "tools" | "themes") => {
    activateSidebarItem(componentName, type);

    if (type === "tools") {
      const ToolComponent = toolComponents[componentName];
      if (ToolComponent) {
        const component = (
          <Suspense fallback={<div style={{ padding: "20px" }}>Loading tool...</div>}>
            <ToolComponent name={displayName} onClose={() => setActiveToolComponent(null)} onSidebarVisibility={() => console.log("Toggle sidebar visibility")} />
          </Suspense>
        );
        setActiveToolComponent(component);
      } else {
        // Fallback for unknown tools
        setActiveToolComponent(
          <div style={{ padding: "20px" }}>
            <h3>{displayName}</h3>
            <p>This tool is not yet implemented.</p>
            <button className="sc-button" onClick={() => setActiveToolComponent(null)}>
              Close
            </button>
          </div>,
        );
      }
    } else if (type === "themes") {
      const ThemeComponent = themeComponents[componentName];
      if (ThemeComponent) {
        const component = (
          <Suspense fallback={<div style={{ padding: "20px" }}>Loading theme...</div>}>
            <ThemeComponent name={displayName} hideHeader={isSingleTheme} onClose={() => setActiveThemeComponent(null)} onSidebarVisibility={() => console.log("Toggle sidebar visibility")} />
          </Suspense>
        );
        setActiveThemeComponent(component);
      } else {
        // Fallback for unknown themes
        setActiveThemeComponent(
          <div style={{ padding: "20px" }}>
            <h3>{displayName}</h3>
            <p>This theme is not yet implemented.</p>
            <button className="sc-button" onClick={() => setActiveThemeComponent(null)}>
              Close
            </button>
          </div>,
        );
      }
    }
  };

  const renderDefaultToolsContent = () => (
    <div className="sc-sidebar-items-container">
      {visibleTools.map((tool) => (
        <div key={tool.id} className={`sc-sidebar-item ${activeTool === tool.id ? "active" : ""}`} onClick={() => handleSidebarItemClick(tool.component || tool.name, tool.name, "tools")}>
          <div className="sc-sidebar-item-image">
            <Image src={`/images/${tool.imageName}`} alt={tool.name} width={32} height={32} />
          </div>
          <div className="sc-sidebar-item-content">
            <div className="sc-sidebar-item-title">{tool.name}</div>
            <div className="sc-sidebar-item-description">{tool.description}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDefaultThemesContent = () => (
    <div className="sc-sidebar-items-container">
      {visibleThemes.map((theme) => (
        <div key={theme.id} className={`sc-sidebar-item ${activeTheme === theme.id ? "active" : ""}`} onClick={() => handleSidebarItemClick(theme.component || theme.name, theme.name, "themes")}>
          <div className="sc-sidebar-item-image">
            <Image src={`/images/${theme.imageName}`} alt={theme.name} width={32} height={32} />
          </div>
          <div className="sc-sidebar-item-content">
            <div className="sc-sidebar-item-title">{theme.name}</div>
            <div className="sc-sidebar-item-description">{theme.description}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`sc-sidebar ${!isOpen ? "closed" : ""}`}>
      <Tabs selectedIndex={activeTab} onSelect={handleTabSelect} forceRenderTabPanel={true}>
        <TabList>
          {!hideLayers && (
            <Tab>
              <div className="tab-content">
                <Image src="/images/legend-32x32.png" alt="Layers" width={32} height={32} className="tab-icon" />
                <div className="tab-text">Layers</div>
              </div>
            </Tab>
          )}
          {!hideTools && (
            <Tab>
              <div className="tab-content">
                <Image src="/images/tools-32x32.png" alt="Tools" width={32} height={32} className="tab-icon" />
                <div className="tab-text">Tools</div>
              </div>
            </Tab>
          )}
          {!hideMyMaps && (
            <Tab>
              <div className="tab-content">
                <Image src="/images/map-32x32.png" alt="My Maps" width={32} height={32} className="tab-icon" />
                <div className="tab-text">My Maps</div>
              </div>
            </Tab>
          )}
          {!hideThemes && (
            <Tab>
              <div className="tab-content">
                <Image src={singleTheme ? `/images/${singleTheme.imageName}` : "/images/theme-32x32.png"} alt={singleTheme ? singleTheme.name : "Themes"} width={32} height={32} className="tab-icon" />
                <div className="tab-text">{singleTheme ? singleTheme.name : "Themes"}</div>
              </div>
            </Tab>
          )}
          {!hideReports && (
            <Tab>
              <div className="tab-content">
                <Image src="/images/report-32x32.png" alt="Reports" width={32} height={32} className="tab-icon" />
                <div className="tab-text">Reports</div>
              </div>
            </Tab>
          )}
        </TabList>

        {!hideLayers && (
          <TabPanel>
            <div className="sc-sidebar-content">
              <Suspense fallback={<div style={{ padding: "20px" }}>Loading layers...</div>}>
                <TOC visible={activeTab === 0} />
              </Suspense>
            </div>
          </TabPanel>
        )}

        {!hideTools && (
          <TabPanel>
            <div className="sc-sidebar-content">
              {activeToolComponent ? activeToolComponent : visibleTools.length === 0 ? <div style={{ fontSize: "12px", color: "#666" }}>Loading tools...</div> : renderDefaultToolsContent()}
            </div>
          </TabPanel>
        )}

        {!hideMyMaps && (
          <TabPanel>
            <div className="sc-sidebar-content">
              <Suspense fallback={<div style={{ padding: "20px" }}>Loading MyMaps...</div>}>
                <MyMaps visible={activeTab === 2} />
              </Suspense>
            </div>
          </TabPanel>
        )}

        {!hideThemes && (
          <TabPanel>
            <div className="sc-sidebar-content">
              {activeThemeComponent ? activeThemeComponent : visibleThemes.length === 0 ? <div style={{ fontSize: "12px", color: "#666" }}>Loading themes...</div> : renderDefaultThemesContent()}
            </div>
          </TabPanel>
        )}

        {!hideReports && (
          <TabPanel>
            <div className="sc-sidebar-content">
              <ReportsNavBar />
              {currentReport ? (
                <div className="sc-sidebar-report-container">
                  <div className="sc-sidebar-report-title">{currentReport.title}</div>
                  <div className="sc-sidebar-report-content">{currentReport.content}</div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: "10px", fontWeight: "bold", fontSize: "12px" }}>REPORTS</div>
                  <div style={{ fontSize: "12px", color: "#666" }}>No report currently loaded. Use the identify tool from the map context menu to generate a report.</div>
                </div>
              )}
            </div>
          </TabPanel>
        )}
      </Tabs>
    </div>
  );
}
