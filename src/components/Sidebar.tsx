"use client";

import "@/components/Sidebar.css";
import Image from "next/image";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useEventStore } from "@/stores/eventStore";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import { useReportsStore } from "@/stores/reportsStore";
import { useEffect, useState, Suspense, useCallback } from "react";
import { lazy } from "react";

// Lazy load tool components
const MeasureTool = lazy(() => import("@/components/tools/Measure/MeasureTool"));
const CoordinatesTool = lazy(() => import("@/components/tools/Coorfinates/CoordinatesTool"));
const SettingsTool = lazy(() => import("@/components/tools/Settings/SettingsTool"));
const PrintTool = lazy(() => import("@/components/tools/Print/PrintTool"));
const PrintLocalTool = lazy(() => import("@/components/tools/PrintLocal/PrintLocalTool"));
const WeatherTool = lazy(() => import("@/components/tools/Weather/WeatherTool"));

// Lazy load theme components
const ForestryTheme = lazy(() => import("@/components/themes/ForestryTheme"));
const AvlTheme = lazy(() => import("@/components/themes/avl/AvlTheme"));

// Lazy load TOC component
const TOC = lazy(() => import("@/components/TOC/TOC"));

// Lazy load MyMaps component
const MyMaps = lazy(() => import("@/components/myMaps/MyMaps"));

// Tab name to index mapping (constant)
const TAB_MAPPING: Record<string, number> = {
  layers: 0,
  tools: 1,
  mymaps: 2,
  "my maps": 2,
  themes: 3,
  reports: 4,
};

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
  Avl: AvlTheme,
};

export default function Sidebar() {
  const { isOpen, themes, tools, activeTheme, activeTool, activeTab, setActiveTab, activateSidebarItem, openSidebar } = useSidebarStore();
  const { emitSidebarLoaded } = useEventStore();
  const { addLoadedItem } = useMapStore();
  const { setSidebarLoading } = useAppStore();
  const urlParameters = useAppStore((state) => state.urlParameters);
  const { currentReport } = useReportsStore();

  // State for active components
  const [activeToolComponent, setActiveToolComponent] = useState<React.ReactNode>(null);
  const [activeThemeComponent, setActiveThemeComponent] = useState<React.ReactNode>(null);

  // Debug logging
  // console.log("Sidebar render:", { toolsCount: tools.length, themesCount: themes.length });

  // Function to activate tab by name
  const activateTab = useCallback(
    (tabName: string) => {
      const normalizedTabName = tabName.toLowerCase().trim();
      const tabIndex = TAB_MAPPING[normalizedTabName];

      if (tabIndex !== undefined) {
        setActiveTab(tabIndex);
      } else {
        console.warn(`Unknown tab name: ${tabName}`);
      }
    },
    [setActiveTab]
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
          </div>
        );
      }
    } else if (type === "themes") {
      const ThemeComponent = themeComponents[componentName];
      if (ThemeComponent) {
        const component = (
          <Suspense fallback={<div style={{ padding: "20px" }}>Loading theme...</div>}>
            <ThemeComponent name={displayName} onClose={() => setActiveThemeComponent(null)} onSidebarVisibility={() => console.log("Toggle sidebar visibility")} />
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
          </div>
        );
      }
    }
  };

  const renderDefaultToolsContent = () => (
    <div className="sc-sidebar-items-container">
      {tools.map((tool) => (
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
      {themes.map((theme) => (
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
          <Tab>
            <div className="tab-content">
              <Image src="/images/legend-32x32.png" alt="Layers" width={32} height={32} className="tab-icon" />
              <div className="tab-text">Layers</div>
            </div>
          </Tab>
          <Tab>
            <div className="tab-content">
              <Image src="/images/tools-32x32.png" alt="Tools" width={32} height={32} className="tab-icon" />
              <div className="tab-text">Tools</div>
            </div>
          </Tab>
          <Tab>
            <div className="tab-content">
              <Image src="/images/map-32x32.png" alt="My Maps" width={32} height={32} className="tab-icon" />
              <div className="tab-text">My Maps</div>
            </div>
          </Tab>
          <Tab>
            <div className="tab-content">
              <Image src="/images/theme-32x32.png" alt="Themes" width={32} height={32} className="tab-icon" />
              <div className="tab-text">Themes</div>
            </div>
          </Tab>
          <Tab>
            <div className="tab-content">
              <Image src="/images/report-32x32.png" alt="Reports" width={32} height={32} className="tab-icon" />
              <div className="tab-text">Reports</div>
            </div>
          </Tab>
        </TabList>

        <TabPanel>
          <div className="sc-sidebar-content">
            <Suspense fallback={<div style={{ padding: "20px" }}>Loading layers...</div>}>
              <TOC visible={activeTab === 0} />
            </Suspense>
          </div>
        </TabPanel>

        <TabPanel>
          <div className="sc-sidebar-content">
            {activeToolComponent ? activeToolComponent : tools.length === 0 ? <div style={{ fontSize: "12px", color: "#666" }}>Loading tools...</div> : renderDefaultToolsContent()}
          </div>
        </TabPanel>

        <TabPanel>
          <div className="sc-sidebar-content">
            <Suspense fallback={<div style={{ padding: "20px" }}>Loading MyMaps...</div>}>
              <MyMaps visible={activeTab === 2} />
            </Suspense>
          </div>
        </TabPanel>

        <TabPanel>
          <div className="sc-sidebar-content">
            {activeThemeComponent ? activeThemeComponent : themes.length === 0 ? <div style={{ fontSize: "12px", color: "#666" }}>Loading themes...</div> : renderDefaultThemesContent()}
          </div>
        </TabPanel>

        <TabPanel>
          <div className="sc-sidebar-content">
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
      </Tabs>
    </div>
  );
}
