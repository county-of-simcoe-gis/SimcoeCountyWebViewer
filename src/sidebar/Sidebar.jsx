import React, { Component } from "react";
import "./Sidebar.css";
import * as helpers from "../helpers/helpers";

import TOC from "./components/toc/TOC.jsx";

import SidebarItemList from "./SidebarItemList";
import Reports from "./components/reports/Reports";
import MyMaps from "./components/mymaps/MyMaps";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
// import SidebarComponent from "react-sidebar";
import SidebarComponent from "../components/sc-sidebar.jsx";
import SidebarSlim from "./SidebarSlim.jsx";
import MenuButton from "./MenuButton.jsx";

class Sidebar extends Component {
  constructor(props) {
    super(props);

    // BIND THIS FUNCTIONS
    this.togglePanelVisibility = this.togglePanelVisibility.bind(this);
    this.activateSidebarItem = this.activateSidebarItem.bind(this);
    this.onPanelComponentClose = this.onPanelComponentClose.bind(this);
    this.onSetSidebarOpen = this.onSetSidebarOpen.bind(this);

    this.state = {
      // TOOLS AND THEMES ARE IN HERE
      toolComponents: [],

      // CLASSES
      tabClassName: "sidebar-advanced-tab",
      sidebarOpen: false,
      tocLoaded: false,
      // SELECTED TAB
      tabIndex: 0,
      isMyMapsEditing: false,
      //hide components
      hideTools: false,
      hideThemes: false,
      hideLayers: false,
      hideMyMaps: false,
      hideReports: false,
      //TAB CONFIG ITEMS
      layers: {
        title: "Layers",
        icon: "legend-32x32.png",
      },
      tools: {
        title: "Tools",
        icon: "tools-32x32.png",
      },
      myMaps: {
        title: "My Maps",
        icon: "map-32x32.png",
      },
      themes: {
        title: "Themes",
        icon: "theme-32x32.png",
      },
      reports: {
        title: "Reports",
        icon: "report-32x32.png",
      },
      // COMPONENTS
      activeTabComponents: {
        layers: <TOC key={helpers.getUID()} type="LIST" />,
        mymaps: <MyMaps key={helpers.getUID()} onMyMapsEditing={this.onMyMapsEditing} />,
        reports: {
          default: <Reports key={helpers.getUID()} />,
          loadedComponent: null,
        },
        tools: {
          default: <SidebarItemList key={helpers.getUID()} listtype="tools" onClick={this.activateSidebarItem} />,
          loadedComponent: null,
        },
        themes: {
          default: <SidebarItemList key={helpers.getUID()} listtype="themes" onClick={this.activateSidebarItem} />,
          loadedComponent: null,
        },
      },
    };
    // LISTEN FOR TOC TO LOAD
    window.emitter.addListener("tocLoaded", () => this.setState({ tocLoaded: true }));
  }

  onMyMapsEditing = (isMyMapsEditing) => {
    // DISABLE PARCEL CLICK
    window.disableParcelClick = isMyMapsEditing;

    // DISABLE POPUPS
    window.isDrawingOrEditing = isMyMapsEditing;

    this.setState({ isMyMapsEditing });
  };

  onSetSidebarOpen(open) {
    this.setState({ sidebarOpen: open });
  }

  addComponent = (componentConfig, typeFolder, callback = undefined) => {
    // THIS IMPORTS THE COMPONENTS
    //console.log(`Loading ${componentConfig.name} component...`);
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
        this.setState(
          {
            toolComponents: this.state.toolComponents.concat(comp),
          },
          callback("success")
        );
      })
      .catch((error) => {
        console.log(error);
        console.error(`"${componentConfig.name}" not yet supported`);
        callback("failure");
      })
      .finally(() => {
        if (callback === undefined) return "Done";
      });
  };

  componentDidMount() {
    // LISTEN FOR ITEM ACTIVATION FROM OTHER COMPONENTS
    window.emitter.addListener("activateSidebarItem", (name, type, options = undefined) => {
      helpers.waitForLoad("sidebar", Date.now(), 30, () => {
        this.activateItemFromEmmiter(name, type, options);
      });
    });
    // LISTEN FOR OPEN OR CLOSE FROM OTHER COMPONENTS (CLOSE OR OPEN)
    window.emitter.addListener("setSidebarVisiblity", (openOrClose) => {
      helpers.waitForLoad("sidebar", Date.now(), 30, () => {
        this.sidebarVisiblityEventHandler(openOrClose);
      });
    });

    // LISTEN FOR TAB ACTIVATION FROM OTHER COMPONENTS
    window.emitter.addListener("activateTab", (tabName) => {
      helpers.waitForLoad("sidebar", Date.now(), 30, () => {
        this.activateTab(tabName);
      });
    });

    // LISTEN FOR REPORT LOADING
    window.emitter.addListener("loadReport", (content) => {
      helpers.waitForLoad("sidebar", Date.now(), 30, () => {
        this.loadReport(content);
      });
    });
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      // IMPORT TOOLS FROM CONFIG and CHECK VISIBILITY
      let tools = window.config.sidebarToolComponents;
      tools = tools.filter((item) => item.enabled === undefined || item.enabled);
      if (tools.length === 1) {
        this.setState({ tools: { title: tools[0].name, icon: tools[0].imageName } });
        tools[0]["hideHeader"] = true;
      }
      if (tools.length === 0 || (window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideTools"])) this.setState({ hideTools: true });
      let loadedTools = [];
      let toolsProcessed = 0;
      tools.map((component) =>
        this.addComponent(component, "tools", (result) => {
          if (result === "success") loadedTools.push(component);
          else {
            window.config.sidebarToolComponents = window.config.sidebarToolComponents.map((item) => {
              if (component.name === item.name) item["enabled"] = false;
              return item;
            });
          }
          toolsProcessed++;
          if (toolsProcessed >= tools.length) {
            helpers.addIsLoaded("tools");
          }
        })
      );

      // IMPORT THEMES FROM CONFIG
      let themes = window.config.sidebarThemeComponents;
      themes = themes.filter((item) => item.enabled === undefined || item.enabled);
      if (themes.length === 1) {
        this.setState({ themes: { title: themes[0].name, icon: themes[0].imageName } });
        themes[0]["hideHeader"] = true;
      }
      if (themes.length === 0 || (window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideThemes"])) this.setState({ hideThemes: true });
      let loadedThemes = [];
      let themesProcessed = 0;
      themes.map((component) =>
        this.addComponent(component, "themes", (result) => {
          if (result === "success") loadedThemes.push(component);
          else {
            window.config.sidebarThemeComponents = window.config.sidebarThemeComponents.map((item) => {
              if (component.name === item.name) item["enabled"] = false;
              return item;
            });
          }
          themesProcessed++;
          if (themesProcessed >= themes.length) {
            helpers.addIsLoaded("themes");
          }
        })
      );
      // CHECK VISIBILITY OF LAYERS MENUE
      if (window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideLayers"]) this.setState({ hideLayers: true });
      // CHECK VISIBILITY OF MY MAPS
      if (window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideMyMaps"]) this.setState({ hideMyMaps: true });
      // CHECK VISIBILITY OF REPORTS
      if (window.config.mainSidebarItems !== undefined && window.config.mainSidebarItems["hideReports"]) this.setState({ hideReports: true });

      const shortcuts = window.config.sidebarShortcutParams;
      // HANDLE ADVANCED MODE PARAMETER
      window.sidebarOpen = false;
      if (window.config.viewerMode !== undefined && window.config.viewerMode !== null) {
        if (window.config.viewerMode.toUpperCase() === "ADVANCED") this.sidebarVisiblityEventHandler("OPEN");
      }
      helpers.waitForLoad(["tools", "themes"], Date.now(), 30, () => {
        this.initToolAndThemeUrlParameter({ tools: loadedTools, themes: loadedThemes, shortcuts: shortcuts }, () => {
          // TAB PARAMETER
          const tabNameParameter = helpers.getURLParameter("TAB");
          if (tabNameParameter != null) {
            this.sidebarVisiblityEventHandler("OPEN", () => {
              this.activateTab(tabNameParameter.toLowerCase());
            });
          }

          window.emitter.emit("sidebarLoaded");
          helpers.addIsLoaded("sidebar");
        });
      });
    });
  }

  initToolAndThemeUrlParameter = (components, callback) => {
    if (components.tools.length + components.themes.length === this.state.toolComponents.length && !this.props.mapLoading && !this.props.headerLoading) {
      // HANDLE ADVANCED MODE PARAMETER
      callback();
      const queryString = window.location.search;
      if (queryString !== "") {
        const urlParams = new URLSearchParams(queryString.toLowerCase());
        const item = undefined;
        let shortcuts = [];
        let params = [];
        components.tools.map((item) => {
          shortcuts.push({
            name: item.name.toLowerCase(),
            component: item.name,
            type: "tools",
            url_param: "TOOL",
          });
          if (!params.includes("tool")) params.push("tool");
        });
        components.themes.map((item) => {
          shortcuts.push({
            name: item.name.toLowerCase(),
            component: item.name,
            type: "themes",
            url_param: "THEME",
          });
          if (!params.includes("theme")) params.push("theme");
        });
        components.shortcuts.map((item) => {
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
        params.map((param) => {
          var shortcutParam = urlParams.get(param);
          if (shortcutParam !== null) {
            const shortcut = shortcuts.filter(
              (item) => (item.name === undefined && param.toLowerCase() === item.url_param.toLowerCase()) || (item.name !== undefined && item.name.toLowerCase() === shortcutParam.toLowerCase())
            )[0];
            if (shortcut !== undefined) {
              if (shortcut.type === "search") {
                window.emitter.emit("searchItem", shortcut.component, shortcutParam, shortcut.hidden, shortcut.timeout);
              } else {
                this.sidebarVisiblityEventHandler("OPEN", () => {
                  this.activateItemFromEmmiter(shortcut.component, shortcut.type);
                });
              }
            }
          }
        });
      }
    } else {
      setTimeout(() => {
        this.initToolAndThemeUrlParameter(components, callback);
      }, 50);
    }
  };

  loadReport = (content) => {
    let activeTabComponents = this.state.activeTabComponents;
    activeTabComponents.reports.loadedComponent = <Reports>{content}</Reports>;
    this.setState({ activeTabComponents: activeTabComponents });
    this.sidebarVisiblityEventHandler("OPEN");
    this.activateTab("reports");
  };

  activateItemFromEmmiter(name, type, options = undefined) {
    const active = this.state.activeTabComponents;
    if (type === "tools") {
      //SAME TOOL WAS SELECTED
      if (active.tools.loadedComponent != null && type === "tools" && active.tools.loadedComponent.props.name === name) {
        this.activateTab("tools");
        return;
      }

      this.setState({ tabIndex: 1 }, () => {
        //CLEAR LOADED TOOL
        let activeTabComponents = this.state.activeTabComponents;
        activeTabComponents.tools.loadedComponent = null;
        this.setState({ activeTabComponents: activeTabComponents }, () => {
          // ASK TOOLS TO CLOSE
          window.emitter.emit("closeToolsOrThemes", type);

          // ACTIVATE THE NEW ITEM
          this.activateSidebarItem(name, type, options);
        });
      });
    } else if (type === "themes") {
      // SAME THEME WAS SELECTED
      if (active.themes.loadedComponent != null && type === "themes" && active.themes.loadedComponent.props.name === name) {
        this.activateTab("themes");
        return;
      }

      this.setState({ tabIndex: 3 }, () => {
        //CLEAR LOADED THEME
        let activeTabComponents = this.state.activeTabComponents;
        activeTabComponents.themes.loadedComponent = null;
        this.setState({ activeTabComponents: activeTabComponents });

        // ASK THEMES TO CLOSE
        window.emitter.emit("closeToolsOrThemes", type);

        // ACTIVATE THE NEW ITEM
        this.activateSidebarItem(name, type, options);
      });
    } else if (type === "mymaps") {
      this.activateTab("mymaps");
    } else if (type === "reports") {
      this.activateTab("reports");
    }

    // OPEN PANEL
    this.sidebarVisiblityEventHandler("OPEN");
  }

  activateTab(tabName) {
    // OPEN PANEL
    this.sidebarVisiblityEventHandler("OPEN");

    // SET SELECTED TAB
    if (tabName === "layers") this.setState({ tabIndex: 0 });
    else if (tabName === "tools") this.setState({ tabIndex: 1 });
    else if (tabName === "mymaps") this.setState({ tabIndex: 2 });
    else if (tabName === "themes") this.setState({ tabIndex: 3 });
    else if (tabName === "reports") this.setState({ tabIndex: 4 });
    else console.log("NO VALID TAB FOUND");
  }

  sidebarVisiblityEventHandler(openOrClose, callback = undefined) {
    // CHECK IF NEED TO DO ANYTHING
    if ((openOrClose === "CLOSE" && window.sidebarOpen === false) || (openOrClose === "OPEN" && window.sidebarOpen === true)) {
      if (callback === undefined) return;
      else callback();
    } else {
      // TOGGLE IT
      this.togglePanelVisibility(callback);
    }
  }

  togglePanelVisibility(callback = undefined) {
    //  PANEL IN AND OUT CLASSES
    window.sidebarOpen = !window.sidebarOpen;
    this.setState({ sidebarOpen: window.sidebarOpen }, () => {
      // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
      window.emitter.emit("sidebarChanged", window.sidebarOpen);
      if (callback !== undefined && typeof callback === "function") callback();
    });
  }

  // TOOL AND THEME ITEMS CLICK
  activateSidebarItem(name, type, options = undefined) {
    // THIS HANDLES WHAT TOOL/THEME IS LOADED IN THE SIDEBAR
    if (type === "tools") {
      var loadedTool = this.state.activeTabComponents.tools.loadedComponent;
      if (loadedTool != null) {
        this.setState({ activeComponent: loadedTool });
      } else {
        this.state.toolComponents.map((Component) => {
          if (Component.props.name.toLowerCase() === name.toLowerCase()) {
            // CREATE TOOL COMPONENT
            var comp = (
              <Component
                key={helpers.getUID()}
                name={Component.props.name}
                helpLink={Component.props.helpLink}
                hideHeader={Component.props.hideHeader}
                onClose={this.onPanelComponentClose}
                onSidebarVisibility={() => this.togglePanelVisibility()}
                config={Component.props.config}
                options={options}
              />
            );
            let activeTabComponents = this.state.activeTabComponents;
            activeTabComponents.tools.loadedComponent = comp;
            this.setState({ activeTabComponents: activeTabComponents });
            return comp;
          } else return null;
        });
      }

      helpers.addAppStat("Tool", name);
    } else {
      var loadedTheme = this.state.activeTabComponents.themes.loadedComponent;
      if (loadedTheme != null) this.setState({ activeComponent: loadedTheme });
      else {
        this.state.toolComponents.map((Component) => {
          if (Component.props.name.toLowerCase() === name.toLowerCase()) {
            // CREATE THEME COMPONENT
            var comp = (
              <Component
                key={helpers.getUID()}
                name={Component.props.name}
                helpLink={Component.props.helpLink}
                hideHeader={Component.props.hideHeader}
                onClose={this.onPanelComponentClose}
                onSidebarVisibility={() => this.togglePanelVisibility()}
                config={Component.props.config}
                options={options}
              />
            );
            let activeTabComponents = this.state.activeTabComponents;
            activeTabComponents.themes.loadedComponent = comp;
            this.setState({ activeTabComponents: activeTabComponents });
            //helpers.showMessage("Property Report", "Property Report Click is disabled while theme is active.", "green" , 5000);
            return comp;
          } else return null;
        });
      }
      helpers.addAppStat("Theme", name);
    }
  }

  onPanelComponentClose(evt) {
    // HANDLES UNLOADING OF TOOL/THEME
    if (this.state.tabIndex === 1) {
      // SET TOOLS
      let activeTabComponents = this.state.activeTabComponents;
      activeTabComponents.tools.loadedComponent = null;
      this.setState({ activeTabComponents: activeTabComponents });
    } else if (this.state.tabIndex === 3) {
      // SET THEMES
      let activeTabComponents = this.state.activeTabComponents;
      activeTabComponents.themes.loadedComponent = null;
      this.setState({ activeTabComponents: activeTabComponents });
    }
  }

  slimSidebarButtonClick = (name) => {
    this.sidebarVisiblityEventHandler("OPEN", () => {
      this.activateTab(name);
      helpers.addAppStat("Sidebar Slim", name);
    });
  };

  onTabSelect = (tabIndex) => {
    this.setState({ tabIndex });
    if (tabIndex === 0) helpers.addAppStat("Tab", "Layers");
    else if (tabIndex === 1) helpers.addAppStat("Tab", "Tools");
    else if (tabIndex === 2) helpers.addAppStat("Tab", "MyMaps");
    else if (tabIndex === 3) helpers.addAppStat("Tab", "Themes");
    else if (tabIndex === 4) helpers.addAppStat("Tab", "Reports");
  };

  //<Tabs forceRenderTabPanel={true} onSelect={tabIndex => this.setState({ tabIndex })} selectedIndex={this.state.tabIndex}>
  render() {
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
            <Tabs forceRenderTabPanel={true} selectedIndex={this.state.tabIndex} onSelect={this.onTabSelect}>
              <TabList>
                <Tab id="tab-layers" className={this.state.hideLayers ? "d-none" : "react-tabs__tab"}>
                  <TabButton imageURL={images[this.state.layers.icon]} name={this.state.layers.title} />
                </Tab>
                <Tab id="tab-tools" className={this.state.hideTools ? "d-none" : "react-tabs__tab"}>
                  <TabButton imageURL={images[this.state.tools.icon]} name={this.state.tools.title} active={this.state.activeTabComponents.tools.loadedComponent} />
                </Tab>
                <Tab id="tab-mymaps" className={this.state.hideMyMaps ? "d-none" : "react-tabs__tab"}>
                  <TabButton imageURL={images[this.state.myMaps.icon]} name={this.state.myMaps.title} active={this.state.isMyMapsEditing} />
                </Tab>
                <Tab id="tab-themes" className={this.state.hideThemes ? "d-none" : "react-tabs__tab"}>
                  <TabButton imageURL={images[this.state.themes.icon]} name={this.state.themes.title} active={this.state.activeTabComponents.themes.loadedComponent} />
                </Tab>
                <Tab id="tab-reports" className={this.state.hideReports ? "d-none" : "react-tabs__tab"}>
                  <TabButton imageURL={images[this.state.reports.icon]} name={this.state.reports.title} />
                </Tab>
              </TabList>

              <TabPanel id="tab-layers-content">{this.state.activeTabComponents.layers}</TabPanel>
              <TabPanel id="tab-tools-content">
                {this.state.activeTabComponents.tools.loadedComponent ? this.state.activeTabComponents.tools.loadedComponent : this.state.activeTabComponents.tools.default}
              </TabPanel>
              <TabPanel id="tab-mymaps-content">{this.state.activeTabComponents.mymaps}</TabPanel>
              <TabPanel id="tab-themes-content">
                {this.state.activeTabComponents.themes.loadedComponent ? this.state.activeTabComponents.themes.loadedComponent : this.state.activeTabComponents.themes.default}
              </TabPanel>
              <TabPanel id="tab-reports-content">
                {this.state.activeTabComponents.reports.loadedComponent ? this.state.activeTabComponents.reports.loadedComponent : this.state.activeTabComponents.reports.default}
              </TabPanel>
            </Tabs>

            <div id="sc-sidebar-advanced-tab" className={this.state.tabClassName} onClick={() => this.togglePanelVisibility()}>
              <img src={require("./images/close-tab.png")} alt="Close Tab" />
            </div>
            <SidebarSlim
              onClick={this.slimSidebarButtonClick}
              themeActive={this.state.activeTabComponents.themes.loadedComponent}
              toolActive={this.state.activeTabComponents.tools.loadedComponent}
              isMyMapsEditing={this.state.isMyMapsEditing}
              tabIndex={this.state.tabIndex}
              hideLayers={this.state.hideLayers}
              hideMyMaps={this.state.hideMyMaps}
              hideTools={this.state.hideTools}
              hideThemes={this.state.hideThemes}
              hideReports={this.state.hideReports}
              themes={this.state.themes}
              tools={this.state.tools}
              layers={this.state.layers}
              myMaps={this.state.myMaps}
              reports={this.state.reports}
            />
            <div id="sc-sidebar-message-container" />
            {this.state.sidebarOpen ? <MenuButton showLabel={false} className="sideBarOpen" /> : ""}
          </React.Fragment>
        }
        open={this.state.sidebarOpen}
        onSetOpen={this.onSetSidebarOpen}
        styles={{ sidebar: { background: "white" } }}
      />
    );
  }
}

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
