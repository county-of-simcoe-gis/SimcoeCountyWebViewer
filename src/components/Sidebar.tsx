"use client";

import Image from "next/image";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import { useReportsStore } from "@/stores/reportsStore";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { useEffect, useState, Suspense, useCallback, useMemo, useRef } from "react";
import { lazy } from "react";
import { useSession } from "next-auth/react";
import { trackTheme, trackTool, trackMyMaps } from "@/lib/appStats";
import { FaLock } from "react-icons/fa";
import ReportsNavBar from "@/components/ReportsNavBar";
import { SectionTitle } from "@/components/ui";

// Lazy load tool components
const MeasureTool = lazy(() => import("@/components/tools/Measure/MeasureTool"));
const CoordinatesTool = lazy(() => import("@/components/tools/Coordinates/CoordinatesTool"));
const SettingsTool = lazy(() => import("@/components/tools/Settings/SettingsTool"));
const PrintTool = lazy(() => import("@/components/tools/Print/PrintTool"));
const PrintLocalTool = lazy(() => import("@/components/tools/PrintLocal/PrintLocalTool"));
const WeatherTool = lazy(() => import("@/components/tools/Weather/WeatherTool"));
const LotAndConcessionTool = lazy(() => import("@/components/tools/LotAndConcession/LotAndConcessionTool"));
const ExternalServicesTool = lazy(() => import("@/components/tools/ExternalServices/ExternalServicesTool"));
const AddLayerTool = lazy(() => import("@/components/tools/AddLayer/AddLayerTool"));
const AvailableMapsTool = lazy(() => import("@/components/tools/AvailableMaps/AvailableMapsTool"));

// Secure Road Closures tool
const RoadClosuresTool = lazy(() =>
  import("@/components/tools/secure/roadclosures/RoadClosuresTool").catch(() => ({
    default: () => <div className="p-5">Road Closures is not available in this build.</div>,
  })),
);

// Lazy load theme components
const ForestryTheme = lazy(() => import("@/components/themes/Forestry/Forestry"));
const ChildCareFacilitiesTheme = lazy(() => import("@/components/themes/ChildCareFacilities/ChildCareFacilities"));
const TwoOneOneTheme = lazy(() => import("@/components/themes/TwoOneOne/TwoOneOne"));
const SolidWasteFacilitiesTheme = lazy(() => import("@/components/themes/SolidWasteFacilities/SolidWasteFacilities"));
const ImmigrationServicesTheme = lazy(() => import("@/components/themes/ImmigrationServices/ImmigrationServices"));
const BroadbandTheme = lazy(() => import("@/components/themes/Broadband/Broadband"));
const ZoningTheme = lazy(() => import("@/components/themes/Zoning/Zoning"));
const CouchichingOHTTheme = lazy(() => import("@/components/themes/CouchichingOHT/CouchichingOHT"));
const Five11Theme = lazy(() => import("@/components/themes/Five11/Five11"));
const CommercialRealEstateTheme = lazy(() => import("@/components/themes/CommercialRealEstate/CommercialRealEstate"));

// Lazy load TOC component
const TOC = lazy(() => import("@/components/TOC/TOC"));

// Lazy load MyMaps component
const MyMaps = lazy(() => import("@/components/myMaps/MyMaps"));

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
  CouchichingOHT: CouchichingOHTTheme,
};

export default function Sidebar() {
  const isOpen = useSidebarStore((s) => s.isOpen);
  const closeSidebar = useSidebarStore((s) => s.closeSidebar);
  const themes = useSidebarStore((s) => s.themes);
  const tools = useSidebarStore((s) => s.tools);
  const activeTheme = useSidebarStore((s) => s.activeTheme);
  const activeTool = useSidebarStore((s) => s.activeTool);
  const activeTab = useSidebarStore((s) => s.activeTab);
  const activeContentTab = useSidebarStore((s) => s.activeContentTab);
  const setActiveTab = useSidebarStore((s) => s.setActiveTab);
  const activateSidebarItem = useSidebarStore((s) => s.activateSidebarItem);
  const setActiveTool = useSidebarStore((s) => s.setActiveTool);
  const setActiveTheme = useSidebarStore((s) => s.setActiveTheme);
  const openSidebar = useSidebarStore((s) => s.openSidebar);
  const pendingActivation = useSidebarStore((s) => s.pendingActivation);
  const clearPendingActivation = useSidebarStore((s) => s.clearPendingActivation);
  const hideLayers = useSidebarStore((s) => s.hideLayers);
  const hideTools = useSidebarStore((s) => s.hideTools);
  const hideMyMaps = useSidebarStore((s) => s.hideMyMaps);
  const hideThemes = useSidebarStore((s) => s.hideThemes);
  const hideReports = useSidebarStore((s) => s.hideReports);
  const addLoadedItem = useMapStore((s) => s.addLoadedItem);
  const setSidebarLoading = useAppStore((s) => s.setSidebarLoading);
  const urlParameters = useAppStore((state) => state.urlParameters);
  const appConfig = useAppStore((state) => state.config);
  const currentReport = useReportsStore((s) => s.currentReport);
  const isMyMapsEditing = useMyMapsStore((s) => s.isEditing);
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

  // Refs to avoid tracking the initial null render and double-fires from StrictMode
  const trackedThemeRef = useRef<string | null>(null);
  const trackedToolRef = useRef<string | null>(null);

  // Close handlers clear both the local component and the store-level active flag so the
  // tab indicator (green dot) doesn't reappear when tools/themes lists are rebuilt (e.g. switching layouts).
  const handleCloseTool = useCallback(() => {
    setActiveToolComponent(null);
    setActiveTool(null);
  }, [setActiveTool]);
  const handleCloseTheme = useCallback(() => {
    setActiveThemeComponent(null);
    setActiveTheme(null);
  }, [setActiveTheme]);
  const handleSidebarVisibility = useCallback(() => undefined, []);

  // Sync theme component when activeTheme changes (for URL parameter activation)
  useEffect(() => {
    if (activeTheme && visibleThemes.length > 0) {
      // Find the theme in the list. activeTheme may be the item id (default activation)
      // or the component/name key (sidebar/More menu click), so match either.
      const theme = visibleThemes.find((t) => t.id === activeTheme || (t.component || t.name) === activeTheme);
      if (theme) {
        const componentName = theme.component || theme.name;
        const ThemeComponent = themeComponents[componentName];
        if (ThemeComponent) {
          const component = (
            <Suspense fallback={<div className="p-5">Loading theme...</div>}>
              <ThemeComponent name={theme.name} hideHeader={isSingleTheme} config={theme.config} onClose={handleCloseTheme} onSidebarVisibility={handleSidebarVisibility} />
            </Suspense>
          );
          setActiveThemeComponent(component);
        }

        // Track theme activation once per distinct selection
        if (trackedThemeRef.current !== activeTheme) {
          trackedThemeRef.current = activeTheme;
          trackTheme(theme.name);
        }
      }
    } else if (!activeTheme) {
      // Clear theme component when no theme is active
      setActiveThemeComponent(null);
    }
  }, [activeTheme, visibleThemes, isSingleTheme, handleCloseTheme, handleSidebarVisibility]);

  // Auto-activate the single theme so it renders directly (no selector needed)
  useEffect(() => {
    if (isSingleTheme && singleTheme && !activeTheme) {
      const componentName = singleTheme.component || singleTheme.name;
      activateSidebarItem(componentName, "themes");
      const ThemeComponent = themeComponents[componentName];
      if (ThemeComponent) {
        setActiveThemeComponent(
          <Suspense fallback={<div className="p-5">Loading theme...</div>}>
            <ThemeComponent name={singleTheme.name} hideHeader={true} config={singleTheme.config} onClose={handleCloseTheme} onSidebarVisibility={handleSidebarVisibility} />
          </Suspense>,
        );
      }
    }
  }, [isSingleTheme, singleTheme, activeTheme, activateSidebarItem, handleCloseTheme, handleSidebarVisibility]);

  // Sync tool component when activeTool changes (for URL parameter activation)
  useEffect(() => {
    if (activeTool && visibleTools.length > 0) {
      // Find the tool in the list. activeTool may be the item id (default activation)
      // or the component/name key (sidebar/More menu click), so match either.
      const tool = visibleTools.find((t) => t.id === activeTool || (t.component || t.name) === activeTool);
      if (tool) {
        const componentName = tool.component || tool.name;
        const ToolComponent = toolComponents[componentName];
        if (ToolComponent) {
          const component = (
            <Suspense fallback={<div className="p-5">Loading tool...</div>}>
              <ToolComponent name={tool.name} config={tool.config} onClose={handleCloseTool} onSidebarVisibility={handleSidebarVisibility} />
            </Suspense>
          );
          setActiveToolComponent(component);
        }

        // Track tool activation once per distinct selection
        if (trackedToolRef.current !== activeTool) {
          trackedToolRef.current = activeTool;
          trackTool(tool.name);
        }
      }
    } else if (!activeTool) {
      // Clear tool component when no tool is active
      setActiveToolComponent(null);
    }
  }, [activeTool, visibleTools, handleCloseTool, handleSidebarVisibility]);

  // Tab names in display order
  const ALL_TAB_NAMES = ["layers", "tools", "mymaps", "themes", "reports"] as const;

  // Build dynamic tab index mapping based on which tabs are visible
  const visibleTabs = ALL_TAB_NAMES.filter((tab) => {
    if (tab === "layers" && hideLayers) return false;
    if (tab === "tools" && hideTools) return false;
    if (tab === "mymaps" && hideMyMaps) return false;
    if (tab === "themes" && hideThemes) return false;
    if (tab === "reports" && hideReports) return false;
    return true;
  });

  const tabMapping = useMemo(() => {
    const mapping: Record<string, number> = {};
    visibleTabs.forEach((tab, index) => {
      mapping[tab] = index;
      if (tab === "mymaps") mapping["my maps"] = index; // alias
    });
    return mapping;
  }, [visibleTabs]);

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
    // Mark sidebar as loaded
    addLoadedItem("sidebar");
    setSidebarLoading(false);
  }, [addLoadedItem, setSidebarLoading]);

  // Handle URL parameters after component is loaded
  useEffect(() => {
    if (Object.keys(urlParameters).length > 0) {
      handleURLParameters();
    }
  }, [urlParameters, handleURLParameters]);

  const handleTabSelect = (index: number) => {
    setActiveTab(index);

    // Track when the user selects the My Maps tab (not via URL params/programmatic activation)
    const selectedTab = visibleTabs[index];
    if (selectedTab === "mymaps") {
      trackMyMaps();
    }
  };

  // React to pendingActivation from sidebarStore (replaces activateSidebarItem event listener)
  useEffect(() => {
    if (!pendingActivation) return;
    const { itemName, itemType, options } = pendingActivation;

    // Find the item by name (case-insensitive)
    const items = itemType === "tools" ? visibleTools : visibleThemes;
    const item = items.find((i) => i.name.toLowerCase() === itemName.toLowerCase());
    clearPendingActivation();
    if (!item) return;

    // Ensure sidebar is open and switch to the correct tab
    openSidebar();
    activateTab(itemType);

    const componentName = item.component || item.name;
    handleSidebarItemClick(componentName, item.name, itemType, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingActivation]);

  const handleSidebarItemClick = (componentName: string, displayName: string, type: "tools" | "themes", options?: Record<string, unknown>) => {
    activateSidebarItem(componentName, type);

    if (type === "tools") {
      const ToolComponent = toolComponents[componentName];
      if (ToolComponent) {
        const toolItem = visibleTools.find((t) => t.name === displayName) ?? visibleTools.find((t) => (t.component || t.name) === componentName);
        const component = (
          <Suspense fallback={<div className="p-5">Loading tool...</div>}>
            <ToolComponent name={displayName} config={toolItem?.config} options={options} onClose={handleCloseTool} onSidebarVisibility={handleSidebarVisibility} />
          </Suspense>
        );
        setActiveToolComponent(component);
      } else {
        // Fallback for unknown tools
        setActiveToolComponent(
          <div className="p-5">
            <h3>{displayName}</h3>
            <p>This tool is not yet implemented.</p>
            <button className="btn btn-sm btn-primary" onClick={handleCloseTool}>
              Close
            </button>
          </div>,
        );
      }
    } else if (type === "themes") {
      const ThemeComponent = themeComponents[componentName];
      if (ThemeComponent) {
        const component = (
          <Suspense fallback={<div className="p-5">Loading theme...</div>}>
            <ThemeComponent name={displayName} hideHeader={isSingleTheme} onClose={handleCloseTheme} onSidebarVisibility={handleSidebarVisibility} />
          </Suspense>
        );
        setActiveThemeComponent(component);
      } else {
        // Fallback for unknown themes
        setActiveThemeComponent(
          <div className="p-5">
            <h3>{displayName}</h3>
            <p>This theme is not yet implemented.</p>
            <button className="btn btn-sm btn-primary" onClick={handleCloseTheme}>
              Close
            </button>
          </div>,
        );
      }
    }
  };

  const renderDefaultToolsContent = () => (
    <div className="flex flex-col gap-px flex-auto min-h-0 max-h-full overflow-y-auto">
      {visibleTools.map((tool) => (
        <div
          key={tool.id}
          className={`flex items-start px-1.5 pb-1.5 pt-px border border-transparent border-b-base-300 rounded-sm cursor-pointer bg-base-100 select-none min-h-[72px] mt-1.5 text-base-content hover:border-[#90b5d5] hover:bg-[image:var(--sc-gradient-hover)] ${
            activeTool === tool.id ? "bg-[image:var(--sc-gradient-active)] !border-[#90b5d5]" : ""
          }`}
          onClick={() => handleSidebarItemClick(tool.component || tool.name, tool.name, "tools")}
        >
          <div className="relative w-[60px] h-[60px] shrink-0 flex items-center justify-center bg-[image:linear-gradient(to_bottom,#f2f5f6,#e6e6e6)] dark:bg-[image:linear-gradient(to_bottom,#252d37,#1d232a)] rounded-sm border border-base-300 mr-4 text-center pt-1.5">
            {tool.secure && <FaLock className="absolute top-0.5 left-0.5 text-[10px] text-base-content/50 drop-shadow-sm" />}
            <Image src={`/images/${tool.imageName}`} alt={tool.name || ""} width={48} height={48} className="w-[48px] h-[48px] object-contain" />
          </div>
          <div className="flex-1 flex flex-col justify-start min-h-[60px]">
            <div className="text-[15px] font-bold text-base-content/80 mb-1.5 leading-tight">{tool.name}</div>
            <div className="text-[10px] text-base-content/70 leading-snug text-left pl-[18px] pr-1 bg-[url('/images/arrow_curve.gif')] bg-no-repeat">{tool.description}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDefaultThemesContent = () => (
    <div className="flex flex-col gap-px flex-auto min-h-0 max-h-full overflow-y-auto">
      {visibleThemes.map((theme) => (
        <div
          key={theme.id}
          className={`flex items-start px-1.5 pb-1.5 pt-px border border-transparent border-b-base-300 rounded-sm cursor-pointer bg-base-100 select-none min-h-[72px] mt-1.5 text-base-content hover:border-[#90b5d5] hover:bg-[image:var(--sc-gradient-hover)] ${
            activeTheme === theme.id ? "bg-[image:var(--sc-gradient-active)] !border-[#90b5d5]" : ""
          }`}
          onClick={() => handleSidebarItemClick(theme.component || theme.name, theme.name, "themes")}
        >
          <div className="relative w-[60px] h-[60px] shrink-0 flex items-center justify-center bg-[image:linear-gradient(to_bottom,#f2f5f6,#e6e6e6)] dark:bg-[image:linear-gradient(to_bottom,#252d37,#1d232a)] rounded-sm border border-base-300 mr-4 text-center pt-1.5">
            {theme.secure && <FaLock className="absolute top-0.5 left-0.5 text-[10px] text-base-content/50 drop-shadow-sm" />}
            <Image src={`/images/${theme.imageName}`} alt={theme.name} width={50} height={50} className="w-[50px] h-[50px] object-contain" />
          </div>
          <div className="flex-1 flex flex-col justify-start min-h-[60px]">
            <div className="text-[15px] font-bold text-base-content/80 mb-1.5 leading-tight">{theme.name}</div>
            <div className="text-[10px] text-base-content/70 leading-snug text-left pl-[18px] pr-1 bg-[url('/images/arrow_curve.gif')] bg-no-repeat">{theme.description}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile overlay backdrop — visible only on mobile when sidebar is open */}
      {isOpen && <div className="fixed inset-0 top-[52px] bg-black/30 z-[999] hidden max-[770px]:block" onClick={closeSidebar} aria-label="Close sidebar" />}
      <div
        className={`absolute top-[52px] left-0 bottom-0 w-[370px] bg-base-200 border-r border-base-300 z-[1000] overflow-hidden transition-transform duration-300 ease-in-out max-[770px]:fixed max-[770px]:h-[calc(100vh-52px)] ${!isOpen ? "-translate-x-[370px]" : ""}`}
      >
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
                  {activeToolComponent && <span className="tab-dot" />}
                  <Image src="/images/tools-32x32.png" alt={appConfig?.toolsTitle || "Tools"} width={32} height={32} className="tab-icon" />
                  <div className="tab-text">{appConfig?.toolsTitle || "Tools"}</div>
                </div>
              </Tab>
            )}
            {!hideMyMaps && (
              <Tab>
                <div className="tab-content">
                  {isMyMapsEditing && <span className="tab-dot" />}
                  <Image src="/images/map-32x32.png" alt="My Maps" width={32} height={32} className="tab-icon" />
                  <div className="tab-text">My Maps</div>
                </div>
              </Tab>
            )}
            {!hideThemes && (
              <Tab>
                <div className="tab-content">
                  {activeThemeComponent && <span className="tab-dot" />}
                  <Image
                    src={singleTheme ? `/images/${singleTheme.imageName}` : "/images/theme-32x32.png"}
                    alt={singleTheme ? singleTheme.name : appConfig?.themesTitle || "Themes"}
                    width={32}
                    height={32}
                    className="tab-icon"
                  />
                  <div className="tab-text">{singleTheme ? singleTheme.name : appConfig?.themesTitle || "Themes"}</div>
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
              <div className="h-[calc(100vh-130px)] max-h-[calc(100vh-130px)] overflow-hidden flex flex-col">
                <Suspense fallback={<div className="p-5">Loading layers...</div>}>
                  <TOC visible={activeTab === 0} />
                </Suspense>
              </div>
            </TabPanel>
          )}

          {!hideTools && (
            <TabPanel>
              <div className="h-[calc(100vh-130px)] max-h-[calc(100vh-130px)] overflow-hidden flex flex-col">
                {activeToolComponent ? activeToolComponent : visibleTools.length === 0 ? <div className="text-xs text-base-content/70">Loading tools...</div> : renderDefaultToolsContent()}
              </div>
            </TabPanel>
          )}

          {!hideMyMaps && (
            <TabPanel>
              <div className="h-[calc(100vh-130px)] max-h-[calc(100vh-130px)] overflow-hidden flex flex-col">
                <Suspense fallback={<div className="p-5">Loading MyMaps...</div>}>
                  <MyMaps visible={activeTab === 2} />
                </Suspense>
              </div>
            </TabPanel>
          )}

          {!hideThemes && (
            <TabPanel>
              <div className="h-[calc(100vh-130px)] max-h-[calc(100vh-130px)] overflow-hidden flex flex-col">
                {activeThemeComponent ? activeThemeComponent : visibleThemes.length === 0 ? <div className="text-xs text-base-content/70">Loading themes...</div> : renderDefaultThemesContent()}
              </div>
            </TabPanel>
          )}

          {!hideReports && (
            <TabPanel>
              <div className="h-[calc(100vh-130px)] max-h-[calc(100vh-130px)] overflow-hidden flex flex-col ml-[5px]">
                <ReportsNavBar />
                {currentReport ? (
                  <div key={currentReport.id} className="h-full overflow-y-auto">
                    <SectionTitle className="mb-2.5 border-base-300 text-base-content">{currentReport.title}</SectionTitle>
                    <div className="text-xs">{currentReport.content}</div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-2.5 font-bold text-xs">REPORTS</div>
                    <div className="text-xs text-base-content/70">No report currently loaded. Use the identify tool from the map context menu to generate a report.</div>
                  </div>
                )}
              </div>
            </TabPanel>
          )}
        </Tabs>

        {/* Content override for hidden tabs - renders on top of TabPanels when activeContentTab is set */}
        {activeContentTab && (
          <div className="absolute top-[78px] left-0 right-0 bottom-0 bg-base-200 z-10">
            <div className="h-[calc(100vh-130px)] max-h-[calc(100vh-130px)] overflow-hidden flex flex-col">
              {activeContentTab === "layers" && (
                <Suspense fallback={<div className="p-5">Loading layers...</div>}>
                  <TOC visible={true} />
                </Suspense>
              )}
              {activeContentTab === "tools" &&
                (activeToolComponent ? activeToolComponent : visibleTools.length === 0 ? <div className="text-xs text-base-content/70">Loading tools...</div> : renderDefaultToolsContent())}
              {activeContentTab === "mymaps" && (
                <Suspense fallback={<div className="p-5">Loading MyMaps...</div>}>
                  <MyMaps visible={true} />
                </Suspense>
              )}
              {activeContentTab === "themes" &&
                (activeThemeComponent ? activeThemeComponent : visibleThemes.length === 0 ? <div className="text-xs text-base-content/70">Loading themes...</div> : renderDefaultThemesContent())}
              {activeContentTab === "reports" && (
                <div className="ml-[5px]">
                  <ReportsNavBar />
                  {currentReport ? (
                    <div key={currentReport.id} className="h-full overflow-y-auto">
                      <SectionTitle className="mb-2.5 border-base-300 text-base-content">{currentReport.title}</SectionTitle>
                      <div className="text-xs">{currentReport.content}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2.5 font-bold text-xs">REPORTS</div>
                      <div className="text-xs text-base-content/70">No report currently loaded. Use the identify tool from the map context menu to generate a report.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
