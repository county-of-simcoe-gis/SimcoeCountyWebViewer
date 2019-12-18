import React, { Component } from "react";
import "./Sidebar.css";
import * as helpers from "../helpers/helpers";
import TOC from "./components/toc/TOC";
//import TOCv1 from './components/toc/TOCV1.jsx'
//import TOCv2 from './components/toc/TOCv2.jsx'
import SidebarItemList from "./SidebarItemList";
import Reports from "./components/reports/Reports";
import MyMaps from "./components/mymaps/MyMaps";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import SidebarComponent from "react-sidebar";
//import MenuButton from './MenuButton.jsx';
import ComponentsConfig from "../config.json";
import SidebarSlim from "./SidebarSlim.jsx";

// TEST COMMENT
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

      // SELECTED TAB
      tabIndex: 0,

      isMyMapsEditing: false,

      // COMPONENTS
      activeTabComponents: {
        layers: <TOC key={helpers.getUID()} />,
        // layers: <TOCv2 key={helpers.getUID()}></TOCv2>,
        mymaps: <MyMaps key={helpers.getUID()} onMyMapsEditing={this.onMyMapsEditing} />,
        reports: {
          default: <Reports key={helpers.getUID()} />,
          loadedComponent: null
        },
        tools: {
          default: <SidebarItemList key={helpers.getUID()} listtype="tools" onClick={this.activateSidebarItem} />,
          loadedComponent: null
        },
        themes: {
          default: <SidebarItemList key={helpers.getUID()} listtype="themes" onClick={this.activateSidebarItem} />,
          loadedComponent: null
        }
      }
    };
  }

  onMyMapsEditing = isMyMapsEditing => {
    // DISABLE PARCEL CLICK
    window.disableParcelClick = isMyMapsEditing;

    // DISABLE POPUPS
    window.isDrawingOrEditing = isMyMapsEditing;

    this.setState({ isMyMapsEditing });
  };

  onSetSidebarOpen(open) {
    this.setState({ sidebarOpen: open });
  }

  addComponent = async (componentConfig, typeFolder) => {
    // THIS IMPORTS THE COMPONENTS
    //console.log(`Loading ${componentConfig.name} component...`);
    const typeLowerCase = `${componentConfig.componentName}`.toLowerCase().replace(/\s/g, "");
    const path = `./components/${typeFolder}/${typeLowerCase}/${componentConfig.componentName}.jsx`;
    import(`${path}`)
      .then(component => {
        // SET PROPS FROM CONFIG
        let comp = component.default;
        comp.props = [];
        comp.props.active = false;
        comp.props.id = helpers.getUID();
        comp.props.description = componentConfig.description;
        comp.props.name = componentConfig.name;
        comp.props.componentName = componentConfig.componentName;
        comp.props.config = componentConfig.config;

        // ADD COMPONENT TO LIST
        this.setState({
          toolComponents: this.state.toolComponents.concat(comp)
        });
      })
      .catch(error => {
        console.log(error);
        console.error(`"${componentConfig.name}" not yet supported`);
      });

    return "Done";
  };

  async componentDidMount() {
    // IMPORT TOOLS FROM CONFIG
    const tools = ComponentsConfig.sidebarToolComponents;
    let index = 0;
    tools.map(async component => await this.addComponent(component, "tools"));

    // IMPORT THEMES FROM CONFIG
    const themes = ComponentsConfig.sidebarThemeComponents;
    themes.map(async component => await this.addComponent(component, "themes"));

    this.initToolAndThemeUrlParameter();

    // HANDLE ADVANCED MODE PARAMETER
    const url = new URL(window.location.href.toUpperCase());
    const viewerMode = url.searchParams.get("MODE");
    window.sidebarOpen = false;
    if (viewerMode !== null && viewerMode === "ADVANCED") {
      this.togglePanelVisibility();
      window.sidebarOpen = true;
      this.setState({ sidebarOpen: true });
    }

    // TAB PARAMETER
    const tabNameParameter = helpers.getURLParameter("TAB");
    if (tabNameParameter != null) {
      this.togglePanelVisibility();
      window.sidebarOpen = true;
      this.setState({ sidebarOpen: true });
      this.activateTab(tabNameParameter.toLowerCase());
    }

    // LISTEN FOR OPEN OR CLOSE FROM OTHER COMPONENTS (CLOSE OR OPEN)
    window.emitter.addListener("setSidebarVisiblity", openOrClose => this.sidebarVisiblityEventHandler(openOrClose));

    // LISTEN FOR TAB ACTIVATION FROM OTHER COMPONENTS
    window.emitter.addListener("activateTab", tabName => this.activateTab(tabName));

    // LISTEN FOR REPORT LOADING
    window.emitter.addListener("loadReport", content => this.loadReport(content));

    // LISTEN FOR ITEM ACTIVATION FROM OTHER COMPONENTS
    window.emitter.addListener("activateSidebarItem", (name, type) => {
      this.activateItemFromEmmiter(name, type);
    });
  }

  initToolAndThemeUrlParameter = () => {
    var i = 0;
    var isLoading = false;
    for (var i = 1; i <= 100; i++) {
      if (isLoading) return;
      // eslint-disable-next-line
      (index => {
        setTimeout(() => {
          if (isLoading) return;

          if (ComponentsConfig.sidebarToolComponents.length + ComponentsConfig.sidebarThemeComponents.length === this.state.toolComponents.length) {
            isLoading = true;
            // HANDLE ADVANCED MODE PARAMETER
            var toolParam = helpers.getURLParameter("TOOL");
            var themeParam = helpers.getURLParameter("THEME");
            if (toolParam != null) {
              window.sidebarOpen = true;
              this.setState({ sidebarOpen: true });
              this.togglePanelVisibility();

              // TRIED TO USE PROMISES...
              this.activateItemFromEmmiter(toolParam, "tools");
            } else if (themeParam != null) {
              window.sidebarOpen = true;
              this.setState({ sidebarOpen: true });
              this.togglePanelVisibility();

              // TRIED TO USE PROMISES...
              this.activateItemFromEmmiter(themeParam, "themes");
            }
          }
        }, i * 100);
      })(i);
    }
  };

  loadReport = content => {
    let activeTabComponents = this.state.activeTabComponents;
    activeTabComponents.reports.loadedComponent = <Reports>{content}</Reports>;
    this.setState({ activeTabComponents: activeTabComponents });
    this.sidebarVisiblityEventHandler("OPEN");
    this.activateTab("reports");
  };

  activateItemFromEmmiter(name, type) {
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
        this.setState({ activeTabComponents: activeTabComponents });

        // ASK TOOLS TO CLOSE
        window.emitter.emit("closeToolsOrThemes", type);

        // ACTIVATE THE NEW ITEM
        this.activateSidebarItem(name, type);
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
        this.activateSidebarItem(name, type);
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
    // SET SELECTED TAB
    if (tabName === "layers") this.setState({ tabIndex: 0 });
    else if (tabName === "tools") this.setState({ tabIndex: 1 });
    else if (tabName === "mymaps") this.setState({ tabIndex: 2 });
    else if (tabName === "themes") this.setState({ tabIndex: 3 });
    else if (tabName === "reports") this.setState({ tabIndex: 4 });
    else console.log("NO VALID TAB FOUND");
  }

  sidebarVisiblityEventHandler(openOrClose) {
    // CHECK IF NEED TO DO ANYTHING
    if ((openOrClose === "CLOSE" && window.sidebarOpen === false) || (openOrClose === "OPEN" && window.sidebarOpen === true)) return;

    // TOGGLE IT
    this.togglePanelVisibility();
  }

  togglePanelVisibility() {
    //  PANEL IN AND OUT CLASSES
    if (window.sidebarOpen) {
      window.sidebarOpen = false;
      this.setState({ sidebarOpen: false });
    } else {
      window.sidebarOpen = true;
      this.setState({ sidebarOpen: true });
    }

    // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
    window.emitter.emit("sidebarChanged", window.sidebarOpen);
  }

  // TOOL AND THEME ITEMS CLICK
  activateSidebarItem(name, type) {
    // THIS HANDLES WHAT TOOL/THEME IS LOADED IN THE SIDEBAR
    if (type === "tools") {
      var loadedTool = this.state.activeTabComponents.tools.loadedComponent;
      if (loadedTool != null) {
        this.setState({ activeComponent: loadedTool });
      } else {
        this.state.toolComponents.map(Component => {
          if (Component.props.name === name) {
            // CREATE TOOL COMPONENT
            var comp = (
              <Component key={helpers.getUID()} name={Component.props.name} onClose={this.onPanelComponentClose} onSidebarVisibility={this.togglePanelVisibility} config={Component.props.config} />
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
        this.state.toolComponents.map(Component => {
          if (Component.props.name === name) {
            // CREATE THEME COMPONENT
            var comp = (
              <Component key={helpers.getUID()} name={Component.props.name} onClose={this.onPanelComponentClose} onSidebarVisibility={this.togglePanelVisibility} config={Component.props.config} />
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

  slimSidebarButtonClick = name => {
    this.togglePanelVisibility();
    window.sidebarOpen = true;
    this.setState({ sidebarOpen: true });
    this.activateTab(name);
    helpers.addAppStat("Sidebar Slim", name);
  };

  onTabSelect = tabIndex => {
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
                <Tab id="tab-layers">
                  <TabButton imageURL={images["legend-32x32.png"]} name="Layers" />
                </Tab>
                <Tab id="tab-tools">
                  <TabButton imageURL={images["tools-32x32.png"]} name="Tools" active={this.state.activeTabComponents.tools.loadedComponent} />
                </Tab>
                <Tab id="tab-mymaps">
                  <TabButton imageURL={images["map-32x32.png"]} name="My Maps" active={this.state.isMyMapsEditing} />
                </Tab>
                <Tab id="tab-themes">
                  <TabButton imageURL={images["theme-32x32.png"]} name="Themes" active={this.state.activeTabComponents.themes.loadedComponent} />
                </Tab>
                <Tab id="tab-reports">
                  <TabButton imageURL={images["report-32x32.png"]} name="Reports" />
                </Tab>
              </TabList>

              <TabPanel id="tab-layers-content">{this.state.activeTabComponents.layers}</TabPanel>
              <TabPanel id="tab-tools-content">
                {this.state.activeTabComponents.tools.loadedComponent ? this.state.activeTabComponents.tools.loadedComponent : this.state.activeTabComponents.tools.default}
              </TabPanel>
              <TabPanel id="tab-mymaps-content">{this.state.activeTabComponents.mymaps}</TabPanel>
              <TabPanel id="tab-themes-content" >
                {this.state.activeTabComponents.themes.loadedComponent ? this.state.activeTabComponents.themes.loadedComponent : this.state.activeTabComponents.themes.default}
              </TabPanel>
              <TabPanel id="tab-reports-content">
                {this.state.activeTabComponents.reports.loadedComponent ? this.state.activeTabComponents.reports.loadedComponent : this.state.activeTabComponents.reports.default}
              </TabPanel>
            </Tabs>

            <div id="sc-sidebar-advanced-tab" className={this.state.tabClassName} onClick={this.togglePanelVisibility}>
              <img src={require("./images/close-tab.png")} alt="Close Tab" />
            </div>
            <SidebarSlim
              onClick={this.slimSidebarButtonClick}
              themeActive={this.state.activeTabComponents.themes.loadedComponent}
              toolActive={this.state.activeTabComponents.tools.loadedComponent}
              isMyMapsEditing={this.state.isMyMapsEditing}
            />
            <div id="sc-sidebar-message-container" />
            {/* <MenuButton /> */}
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
const TabButton = props => {
  return (
    <div>
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
