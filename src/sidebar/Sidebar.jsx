import React, { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import "./Sidebar.css";
import * as helpers from "../helpers/helpers";

import TOC from "./components/toc/TOC.jsx";

import SidebarItemList from "./SidebarItemList";
import Reports from "./components/reports/Reports";
import MyMaps from "./components/mymaps/MyMaps";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import SidebarComponent from "../components/sc-sidebar.jsx";
import SidebarSlim from "./SidebarSlim.jsx";
import MenuButton from "./MenuButton.jsx";

const Sidebar = (props) => {
  const toolComponentsRef = useRef([]);
  const mapLoadingRef = useRef(props.mapLoading);
  const headerLoadingRef = useRef(props.headerLoading);

  const tabClassName = "sidebar-advanced-tab";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [isMyMapsEditing, setIsMyMapsEditing] = useState(false);
  const [hideTools, setHideTools] = useState(false);
  const [hideThemes, setHideThemes] = useState(false);
  const [hideLayers, setHideLayers] = useState(false);
  const [hideMyMaps, setHideMyMaps] = useState(false);
  const [hideReports, setHideReports] = useState(false);

  const layers = {
    title: "Layers",
    icon: "legend-32x32.png",
  };
  const [tools, setTools] = useState({
    title: "Tools",
    icon: "tools-32x32.png",
  });
  const myMaps = {
    title: "My Maps",
    icon: "map-32x32.png",
  };
  const [themes, setThemes] = useState({
    title: "Themes",
    icon: "theme-32x32.png",
  });
  const reports = {
    title: "Reports",
    icon: "report-32x32.png",
  };
  const onMyMapsEditing = (isMyMapsEditingLocal) => {
    // DISABLE PARCEL CLICK
    window.disableParcelClick = isMyMapsEditingLocal;

    // DISABLE POPUPS
    window.isDrawingOrEditing = isMyMapsEditingLocal;
    setIsMyMapsEditing(isMyMapsEditingLocal);
  };
  // TOOL AND THEME ITEMS CLICK
  const activateSidebarItem = (name, type, options = undefined) => {
    // THIS HANDLES WHAT TOOL/THEME IS LOADED IN THE SIDEBAR
    if (type === "tools") {
      toolComponentsRef.current.map((Component) => {
        if (Component.props.name.toLowerCase() === name.toLowerCase()) {
          // CREATE TOOL COMPONENT
          var comp = (
            <Component
              key={helpers.getUID()}
              name={Component.props.name}
              helpLink={Component.props.helpLink}
              hideHeader={Component.props.hideHeader}
              onClose={onPanelComponentClose}
              onSidebarVisibility={() => togglePanelVisibility()}
              config={Component.props.config}
              options={options}
            />
          );
          setToolTabComponent(comp);
          return comp;
        } else return null;
      });

      helpers.addAppStat("Tool", name);
    } else {
      toolComponentsRef.current.map((Component) => {
        if (Component.props.name.toLowerCase() === name.toLowerCase()) {
          // CREATE THEME COMPONENT
          var comp = (
            <Component
              key={helpers.getUID()}
              name={Component.props.name}
              helpLink={Component.props.helpLink}
              hideHeader={Component.props.hideHeader}
              onClose={onPanelComponentClose}
              onSidebarVisibility={() => togglePanelVisibility()}
              config={Component.props.config}
              options={options}
            />
          );
          setThemeTabComponent(comp);
          return comp;
        } else return null;
      });

      helpers.addAppStat("Theme", name);
    }
  };
  const defaultLayersTabComponentGUID = helpers.getUID();
  const defaultToolTabComponentGUID = helpers.getUID();
  const defaultThemeTabComponentGUID = helpers.getUID();
  const defaultMyMapTabComponentGUID = helpers.getUID();
  const defaultReportTabComponentGUID = helpers.getUID();
  const defaultLayersTabComponent = <TOC key={defaultLayersTabComponentGUID} type="LIST" />;
  const defaultToolTabComponent = <SidebarItemList key={defaultToolTabComponentGUID} listtype="tools" onClick={activateSidebarItem} />;
  const defaultThemeTabComponent = <SidebarItemList key={defaultThemeTabComponentGUID} listtype="themes" onClick={activateSidebarItem} />;
  const defaultMyMapTabComponent = <MyMaps key={defaultMyMapTabComponentGUID} onMyMapsEditing={onMyMapsEditing} />;
  const defaultReportTabComponent = <Reports key={defaultReportTabComponentGUID} />;

  const [activeLayersTabComponent, setLayersTabComponent] = useState(defaultLayersTabComponent);
  const [activeToolTabComponent, setToolTabComponent] = useState(null);
  const [activeThemeTabComponent, setThemeTabComponent] = useState(null);
  const [activeMyMapTabComponent, setMyMapTabComponent] = useState(defaultMyMapTabComponent);
  const [activeReportTabComponent, setReportTabComponent] = useState(null);

  useEffect(() => {
    // LISTEN FOR ITEM ACTIVATION FROM OTHER COMPONENTS
    window.emitter.addListener("activateSidebarItem", activateItemFromEmmiter);

    // LISTEN FOR OPEN OR CLOSE FROM OTHER COMPONENTS (CLOSE OR OPEN)
    window.emitter.addListener("setSidebarVisiblity", sidebarVisiblityEventHandler);

    // LISTEN FOR TAB ACTIVATION FROM OTHER COMPONENTS
    window.emitter.addListener("activateTab", activateTab);

    // LISTEN FOR REPORT LOADING
    window.emitter.addListener("loadReport", loadReport);
    initSidebar();

    return () => {
      window.emitter.removeListener("activateSidebarItem", activateItemFromEmmiter);
      window.emitter.removeListener("setSidebarVisiblity", sidebarVisiblityEventHandler);
      window.emitter.removeListener("activateTab", activateTab);
      window.emitter.removeListener("loadReport", loadReport);
    };
  }, []);

  const initSidebar = () => {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      // IMPORT TOOLS FROM CONFIG and CHECK VISIBILITY
      let tools = window.config.sidebarToolComponents;
      tools = tools.filter((item) => item.enabled === undefined || item.enabled);
      if (tools.length === 1) {
        setTools({ title: tools[0].name, icon: tools[0].imageName });
        tools[0]["hideHeader"] = true;
      }
      if (tools.length === 0 || (window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideTools"])) setHideTools(true);
      let componentPromises = [];
      componentPromises.push(
        ...tools.map((component) => {
          return new Promise((resolve, reject) => {
            addComponent(component, "tools", (result) => {
              if (result) {
                resolve({ component: result, type: "tools", loadedComponent: component });
              } else {
                window.config.sidebarToolComponents = window.config.sidebarToolComponents.map((item) => {
                  if (component.name === item.name) item["enabled"] = false;
                  return item;
                });
                reject();
              }
            });
          });
        })
      );

      // IMPORT THEMES FROM CONFIG
      let themes = window.config.sidebarThemeComponents;
      themes = themes.filter((item) => item.enabled === undefined || item.enabled);
      if (themes.length === 1) {
        setThemes({ title: themes[0].name, icon: themes[0].imageName });
        themes[0]["hideHeader"] = true;
      }
      if (themes.length === 0 || (window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideThemes"])) setHideThemes(true);
      componentPromises.push(
        ...themes.map((component) => {
          return new Promise((resolve, reject) => {
            addComponent(component, "themes", (result) => {
              if (result) {
                resolve({ component: result, type: "themes", loadedComponent: component });
              } else {
                window.config.sidebarThemeComponents = window.config.sidebarThemeComponents.map((item) => {
                  if (component.name === item.name) item["enabled"] = false;
                  return item;
                });
                reject();
              }
            });
          });
        })
      );
      let loadedThemes = [];
      let loadedTools = [];
      Promise.allSettled(componentPromises).then((results) => {
        let loadedComponents = [];
        results
          .filter((result) => result.status === "fulfilled")
          .forEach((result) => {
            const { value } = result;
            if (value.type === "themes") loadedThemes.push(value.loadedComponent);
            if (value.type === "tools") loadedTools.push(value.loadedComponent);
            loadedComponents.push(value.component);
          });

        toolComponentsRef.current = loadedComponents;
        helpers.addIsLoaded("tools");
        helpers.addIsLoaded("themes");
      });

      // CHECK VISIBILITY OF LAYERS MENUE
      if (window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideLayers"]) setHideLayers(true);
      // CHECK VISIBILITY OF MY MAPS
      if (window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideMyMaps"]) setHideMyMaps(true);
      // CHECK VISIBILITY OF REPORTS
      if (window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideReports"]) setHideReports(true);

      const shortcuts = window.config.sidebarShortcutParams;
      // HANDLE ADVANCED MODE PARAMETER
      window.sidebarOpen = false;
      if (window.config.viewerMode !== undefined && window.config.viewerMode !== null) {
        if (window.config.viewerMode.toUpperCase() === "ADVANCED") sidebarVisiblityEventHandler("OPEN");
      }

      helpers.waitForLoad(["tools", "themes", "header", "map", "toc"], Date.now(), 30, () => {
        initToolAndThemeUrlParameter({ tools: loadedTools, themes: loadedThemes, shortcuts: shortcuts }, () => {
          // TAB PARAMETER
          const tabNameParameter = helpers.getURLParameter("TAB");
          if (tabNameParameter != null) {
            sidebarVisiblityEventHandler("OPEN", () => {
              activateTab(tabNameParameter.toLowerCase());
            });
          }
          window.emitter.emit("sidebarLoaded");
          helpers.addIsLoaded("sidebar");
        });
      });
    });
  };

  useEffect(() => {
    mapLoadingRef.current = props.mapLoading;
  }, [props.mapLoading]);

  useEffect(() => {
    headerLoadingRef.current = props.headerLoading;
  }, [props.headerLoading]);
  const onSetSidebarOpen = (open) => {
    setSidebarOpen(open);
  };

  const addComponent = (componentConfig, typeFolder, callback = undefined) => {
    // THIS IMPORTS THE COMPONENTS
    const typeLowerCase = `${componentConfig.componentName}`.toLowerCase().replace(/\s/g, "");
    const path = `./components/${typeFolder}/${typeLowerCase}/${componentConfig.componentName}.jsx`;

    import(`${path}`)
      .then((component) => {
        // SET PROPS FROM CONFIG
        let comp = component.default;
        comp.props = [];
        comp.props.active = false;
        comp.props.id = helpers.getUID();
        comp.props.description = componentConfig.description;
        comp.props.name = componentConfig.name;
        comp.props.componentName = componentConfig.componentName;
        comp.props.helpLink = componentConfig.helpLink;
        comp.props.config = componentConfig.config;
        if (componentConfig.hideHeader !== undefined) comp.props.hideHeader = componentConfig.hideHeader;

        // ADD COMPONENT TO LIST
        callback(comp);
      })
      .catch((error) => {
        console.log(error);
        console.error(`"${componentConfig.name}" not yet supported`);
        callback();
      })
      .finally(() => {
        if (callback === undefined) return "Done";
      });
  };

  const initToolAndThemeUrlParameter = (components, callback) => {
    if (components.tools.length + components.themes.length === toolComponentsRef.current.length && !mapLoadingRef.current && !headerLoadingRef.current) {
      // HANDLE ADVANCED MODE PARAMETER
      callback();
      const queryString = window.location.search;
      if (queryString !== "") {
        const urlParams = new URLSearchParams(queryString.toLowerCase());
        let shortcuts = [];
        let params = [];
        components.tools.forEach((item) => {
          shortcuts.push({
            name: item.name.toLowerCase(),
            component: item.name,
            type: "tools",
            url_param: "TOOL",
          });
          if (!params.includes("tool")) params.push("tool");
        });
        components.themes.forEach((item) => {
          shortcuts.push({
            name: item.name.toLowerCase(),
            component: item.name,
            type: "themes",
            url_param: "THEME",
          });
          if (!params.includes("theme")) params.push("theme");
        });
        components.shortcuts.forEach((item) => {
          shortcuts.push({
            name: item.matchValue,
            component: item.component,
            type: item.type.toLowerCase(),
            url_param: item.url_param.toLowerCase(),
            hidden: item.hidden,
            timeout: item.timeout,
          });
          if (!params.includes(item.url_param.toLowerCase())) params.push(item.url_param.toLowerCase());
        });
        params.forEach((param) => {
          var shortcutParam = urlParams.get(param);
          if (shortcutParam !== null) {
            const shortcut = shortcuts.filter(
              (item) => (item.name === undefined && param.toLowerCase() === item.url_param.toLowerCase()) || (item.name !== undefined && item.name.toLowerCase() === shortcutParam.toLowerCase())
            )[0];
            if (shortcut !== undefined) {
              if (shortcut.type === "search") {
                window.emitter.emit("searchItem", shortcut.component, shortcutParam, shortcut.hidden, shortcut.timeout);
              } else {
                sidebarVisiblityEventHandler("OPEN", () => {
                  activateItemFromEmmiter(shortcut.component, shortcut.type);
                });
              }
            }
          }
        });
      }
    } else {
      setTimeout(() => {
        initToolAndThemeUrlParameter(components, callback);
      }, 500);
    }
  };

  const loadReport = (content) => {
    helpers.waitForLoad("sidebar", Date.now(), 30, () => {
      setReportTabComponent(<Reports>{content}</Reports>);
      sidebarVisiblityEventHandler("OPEN");
      activateTab("reports");
    });
  };

  const activateItemFromEmmiter = (name, type, options = undefined) => {
    helpers.waitForLoad("sidebar", Date.now(), 30, () => {
      if (type === "tools") {
        //SAME TOOL WAS SELECTED
        if (activeToolTabComponent != null && type === "tools" && activeToolTabComponent.props.name === name) {
          activateTab("tools");
          return;
        }
        flushSync(() => {
          setTabIndex(1);
          //CLEAR LOADED TOOL
          setToolTabComponent(null);
        });
        // ASK TOOLS TO CLOSE
        window.emitter.emit("closeToolsOrThemes", type);

        // ACTIVATE THE NEW ITEM
        activateSidebarItem(name, type, options);
      } else if (type === "themes") {
        // SAME THEME WAS SELECTED
        if (activeThemeTabComponent != null && type === "themes" && activeThemeTabComponent.props.name === name) {
          activateTab("themes");
          return;
        }
        flushSync(() => {
          setTabIndex(3);
          //CLEAR LOADED THEME
          setThemeTabComponent(null);
        });
        // ASK THEMES TO CLOSE
        window.emitter.emit("closeToolsOrThemes", type);

        // ACTIVATE THE NEW ITEM
        activateSidebarItem(name, type, options);
      } else if (type === "mymaps") {
        activateTab("mymaps");
      } else if (type === "reports") {
        activateTab("reports");
      }

      // OPEN PANEL
      sidebarVisiblityEventHandler("OPEN");
    });
  };

  const activateTab = (tabName) => {
    helpers.waitForLoad("sidebar", Date.now(), 30, () => {
      // OPEN PANEL
      sidebarVisiblityEventHandler("OPEN");
      flushSync(() => {
        // SET SELECTED TAB
        if (tabName === "layers") setTabIndex(0);
        else if (tabName === "tools") setTabIndex(1);
        else if (tabName === "mymaps") setTabIndex(2);
        else if (tabName === "themes") setTabIndex(3);
        else if (tabName === "reports") setTabIndex(4);
        else console.log("NO VALID TAB FOUND");
      });
    });
  };

  const sidebarVisiblityEventHandler = (openOrClose, callback = undefined) => {
    helpers.waitForLoad("sidebar", Date.now(), 30, () => {
      // CHECK IF NEED TO DO ANYTHING
      if ((openOrClose === "CLOSE" && window.sidebarOpen === false) || (openOrClose === "OPEN" && window.sidebarOpen === true)) {
        if (callback === undefined) return;
        else callback();
      } else {
        // TOGGLE IT
        togglePanelVisibility(callback);
      }
    });
  };

  const togglePanelVisibility = (callback = undefined) => {
    //  PANEL IN AND OUT CLASSES
    window.sidebarOpen = !window.sidebarOpen;
    setSidebarOpen(window.sidebarOpen);
    // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
    window.emitter.emit("sidebarChanged", window.sidebarOpen);
    if (callback !== undefined && typeof callback === "function") callback();
  };

  const onPanelComponentClose = (evt) => {
    // HANDLES UNLOADING OF TOOL/THEME
    if (tabIndex === 1) {
      // SET TOOLS
      setToolTabComponent(null);
    } else if (tabIndex === 3) {
      // SET THEMES
      setThemeTabComponent(null);
    }
  };

  const slimSidebarButtonClick = (name) => {
    sidebarVisiblityEventHandler("OPEN", () => {
      activateTab(name);
      helpers.addAppStat("Sidebar Slim", name);
    });
  };

  const onTabSelect = (tabIndexLocal) => {
    setTabIndex(tabIndexLocal);
    if (tabIndexLocal === 0) helpers.addAppStat("Tab", "Layers");
    else if (tabIndexLocal === 1) helpers.addAppStat("Tab", "Tools");
    else if (tabIndexLocal === 2) helpers.addAppStat("Tab", "MyMaps");
    else if (tabIndexLocal === 3) helpers.addAppStat("Tab", "Themes");
    else if (tabIndexLocal === 4) helpers.addAppStat("Tab", "Reports");
  };

  return (
    <SidebarComponent
      touch={false}
      id="sc-sidebar"
      contentId="sc-sidebar-content"
      overlayId="sc-sidebar-overlay"
      rootClassName="sc-sidebar-root"
      sidebarClassName="sc-sidebar"
      children={""}
      sidebar={
        <React.Fragment>
          <Tabs forceRenderTabPanel={true} selectedIndex={tabIndex} onSelect={onTabSelect}>
            <TabList>
              <Tab id="tab-layers" className={hideLayers ? "d-none" : "react-tabs__tab"}>
                <TabButton imageURL={images[layers.icon]} name={layers.title} />
              </Tab>
              <Tab id="tab-tools" className={hideTools ? "d-none" : "react-tabs__tab"}>
                <TabButton imageURL={images[tools.icon]} name={tools.title} active={activeToolTabComponent} />
              </Tab>
              <Tab id="tab-mymaps" className={hideMyMaps ? "d-none" : "react-tabs__tab"}>
                <TabButton imageURL={images[myMaps.icon]} name={myMaps.title} active={isMyMapsEditing} />
              </Tab>
              <Tab id="tab-themes" className={hideThemes ? "d-none" : "react-tabs__tab"}>
                <TabButton imageURL={images[themes.icon]} name={themes.title} active={activeThemeTabComponent} />
              </Tab>
              <Tab id="tab-reports" className={hideReports ? "d-none" : "react-tabs__tab"}>
                <TabButton imageURL={images[reports.icon]} name={reports.title} />
              </Tab>
            </TabList>

            <TabPanel key="tab-layers-content" id="tab-layers-content">
              {activeLayersTabComponent}
            </TabPanel>
            <TabPanel key="tab-tools-content" id="tab-tools-content">
              {activeToolTabComponent ? activeToolTabComponent : defaultToolTabComponent}
            </TabPanel>
            <TabPanel key="tab-mymaps-content" id="tab-mymaps-content">
              {activeMyMapTabComponent}
            </TabPanel>
            <TabPanel key="tab-themes-content" id="tab-themes-content">
              {activeThemeTabComponent ? activeThemeTabComponent : defaultThemeTabComponent}
            </TabPanel>
            <TabPanel key="tab-reports-content" id="tab-reports-content">
              {activeReportTabComponent ? activeReportTabComponent : defaultReportTabComponent}
            </TabPanel>
          </Tabs>

          <div id="sc-sidebar-advanced-tab" className={tabClassName} onClick={() => togglePanelVisibility()}>
            <img src={require("./images/close-tab.png")} alt="Close Tab" />
          </div>
          <SidebarSlim
            onClick={slimSidebarButtonClick}
            themeActive={activeThemeTabComponent}
            toolActive={activeToolTabComponent}
            isMyMapsEditing={isMyMapsEditing}
            tabIndex={tabIndex}
            hideLayers={hideLayers}
            hideMyMaps={hideMyMaps}
            hideTools={hideTools}
            hideThemes={hideThemes}
            hideReports={hideReports}
            themes={themes}
            tools={tools}
            layers={layers}
            myMaps={myMaps}
            reports={reports}
          />
          <div id="sc-sidebar-message-container" />
          {sidebarOpen ? <MenuButton showLabel={false} className="sideBarOpen" /> : ""}
        </React.Fragment>
      }
      open={sidebarOpen}
      onSetOpen={onSetSidebarOpen}
      styles={{ sidebar: { background: "white" } }}
    />
  );
};

export default Sidebar;

// TAB BUTTON
const TabButton = (props) => {
  return (
    <div className={"sc-tab-button"}>
      <span className={props.active ? "sc-tab-button-dot" : "sc-hidden"} />
      <img src={props.imageURL} alt={props.name} />
      <br />
      <span>{props.name}</span>
    </div>
  );
};

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
