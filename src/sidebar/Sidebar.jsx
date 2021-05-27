import React, { Component, useEffect, useState } from "react";
import "./Sidebar.css";
import * as helpers from "../helpers/helpers";

import TOC from "./components/toc/TOC.jsx";

import SidebarItemList from "./SidebarItemList";
import Reports from "./components/reports/Reports";
import MyMaps from "./components/mymaps/MyMaps";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import SidebarComponent from "react-sidebar";
import mainConfig from "../config.json";
import SidebarSlim from "./SidebarSlim.jsx";
import { BsGeoAlt } from "react-icons/bs";

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
      tocLoaded:false,
      // SELECTED TAB
      tabIndex: 0,
      isMyMapsEditing: false,

      // COMPONENTS
      activeTabComponents: {
        layers: <TOC key={helpers.getUID()} type="LIST" /> ,
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

  addComponent = async (componentConfig, typeFolder) => {
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

        // ADD COMPONENT TO LIST
        this.setState({
          toolComponents: this.state.toolComponents.concat(comp),
        });
      })
      .catch((error) => {
        console.log(error);
        console.error(`"${componentConfig.name}" not yet supported`);
      });

    return "Done";
  };

  async componentDidMount() {
    // IMPORT TOOLS FROM CONFIG
    const tools = mainConfig.sidebarToolComponents;
    tools.map(async (component) => await this.addComponent(component, "tools"));

    // IMPORT THEMES FROM CONFIG
    const themes = mainConfig.sidebarThemeComponents;
    themes.map(async (component) => await this.addComponent(component, "themes"));
    if (!this.props.mapLoading && !this.props.headerLoading) {
      this.initToolAndThemeUrlParameter();
    }else{
      setTimeout(()=>this.initToolAndThemeUrlParameter(), 1500);
    }
    // HANDLE ADVANCED MODE PARAMETER
    const url = new URL(window.location.href.toUpperCase());
    const viewerMode = url.searchParams.get("MODE");
    window.sidebarOpen = false;
    if ((viewerMode !== null && viewerMode === "ADVANCED") || window.zoning) {
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
    window.emitter.addListener("setSidebarVisiblity", (openOrClose) => this.sidebarVisiblityEventHandler(openOrClose));

    // LISTEN FOR TAB ACTIVATION FROM OTHER COMPONENTS
    window.emitter.addListener("activateTab", (tabName) => this.activateTab(tabName));

    // LISTEN FOR REPORT LOADING
    window.emitter.addListener("loadReport", (content) => this.loadReport(content));

    // LISTEN FOR ITEM ACTIVATION FROM OTHER COMPONENTS
    window.emitter.addListener("activateSidebarItem", (name, type) => {
      this.activateItemFromEmmiter(name, type);
    });
    window.emitter.emit("sidebarLoaded");
  }

  initToolAndThemeUrlParameter = () => {
    var i = 0;
    var isLoading = false;
    for (i = 1; i <= 100; i++) {
      if (isLoading) return;
      // eslint-disable-next-line
      ((index) => {
        setTimeout(() => {
          if (isLoading) return;

          if (mainConfig.sidebarToolComponents.length + mainConfig.sidebarThemeComponents.length === this.state.toolComponents.length) {
            isLoading = true;
            
            // HANDLE ADVANCED MODE PARAMETER
            var toolParam = helpers.getURLParameter("TOOL");
            var themeParam = helpers.getURLParameter("THEME");
            
            if (toolParam != null && mainConfig.sidebarToolComponents.find(item => item.name.toLowerCase() === toolParam.toLowerCase())) {
              window.sidebarOpen = true;
              this.setState({ sidebarOpen: true });
              this.togglePanelVisibility();

              // TRIED TO USE PROMISES...
              this.activateItemFromEmmiter(toolParam, "tools");
            } else if (themeParam != null && mainConfig.sidebarThemeComponents.find(item => item.name.toLowerCase() === themeParam.toLowerCase())) {
              window.sidebarOpen = true;
              this.setState({ sidebarOpen: true });
              this.togglePanelVisibility();

              // TRIED TO USE PROMISES...
              this.activateItemFromEmmiter(themeParam, "themes");
            }else{
              const queryString = window.location.search;
              if (mainConfig.sidebarShortcutParams && queryString.length > 0){
                const urlParams = new URLSearchParams(queryString.toLowerCase());
                mainConfig.sidebarShortcutParams.forEach((item)=> {
                  var shortcutParam = urlParams.get(item.url_param.toLowerCase());
                  if (shortcutParam !== null){
                    if (item.type === "search"){
                      window.emitter.emit("searchItem", item.component, shortcutParam);
                    }
                    if (item.matchValue === undefined || item.matchValue.toLowerCase() === shortcutParam.toLowerCase()){
                      window.sidebarOpen = true;
                      this.setState({ sidebarOpen: true });
                      this.togglePanelVisibility();

                      // TRIED TO USE PROMISES...
                      this.activateItemFromEmmiter(item.component, item.type);
                    }
                    
                  }
                });
              }
            }
          }
        }, i * 100);
      })(i);
    }
  };

  loadReport = (content) => {
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
        this.state.toolComponents.map((Component) => {
          if (Component.props.name.toLowerCase() === name.toLowerCase()) {
            // CREATE TOOL COMPONENT
            var comp = (
              <Component key={helpers.getUID()} name={Component.props.name} helpLink={Component.props.helpLink} onClose={this.onPanelComponentClose} onSidebarVisibility={this.togglePanelVisibility} config={Component.props.config} />
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
              <Component key={helpers.getUID()} name={Component.props.name} helpLink={Component.props.helpLink} onClose={this.onPanelComponentClose} onSidebarVisibility={this.togglePanelVisibility} config={Component.props.config} />
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
    this.togglePanelVisibility();
    window.sidebarOpen = true;
    this.setState({ sidebarOpen: true });
    this.activateTab(name);
    helpers.addAppStat("Sidebar Slim", name);
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
            <ZoningSidebar className={!window.zoning?"sc-hidden":""} >
            </ZoningSidebar>
            <Tabs forceRenderTabPanel={true} selectedIndex={this.state.tabIndex} onSelect={this.onTabSelect} className={window.zoning?"sc-hidden":""}>
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
              <TabPanel id="tab-themes-content">
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
const ZoningResults = (props) => {
  if (!props.returnResults) return (<div>Please search for a location to see results... </div>);
  return (
  <div>
    <div className="heading">
        Address Information
    </div>
    <div className="well">
        <div className="row">
            <div className="col-md-3 addressLabel">Roll Number:</div>
            <div id="txtRollNumber" className="col-md-9">435101000303400</div>
        </div>

        <div className="row">
            <div className="col-md-3 addressLabel">Address:</div>
            <div className="col-md-9"><span id="txtAddress">1575 Telford Line</span> <span id="txtAddressZoom"><button id="linkAddressZoom" style={{"width":"100px"}} type="button" className="btn btn-warning btn-xs"> 
            <BsGeoAlt /> <span className="highlight-text">Highlight</span></button></span></div>

        </div>

    </div>


    <div className="heading">
        Zoning Information
      <span style={{"fontSize": "14px"}}>
        <a id="bylawLink" href="https://www.severn.ca/en/build-and-invest/resources/documents/Zoning-By-law.pdf" target="_blank">[ Review By-Law ]</a>
      </span>
    </div>
    <table id="tblZones" className="table table-hover table-striped table-bordered" style={{"width": "100%", "marginBottom": "2px"}}>
        <thead>
          <tr>
              <th style={{"width": "100%"}}>Zone </th>
              <th>Description</th>
              <th style={{"width": "200px"}}>Area</th>
              <th style={{"width": "100px"}}>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
        <tr>
          <td>EP</td>
          <td id="zoneName_6580">Environmental Protection</td>
          <td className="areaText" id="txtArea-6580">2,994 m<sup>2</sup></td>
          <td><button style={{"width": "100%"}} type="button" className="btn btn-warning btn-xs zoneHighlightButton"> <BsGeoAlt /> <span className="highlight-text">Highlight</span></button></td>
        </tr>
        <tr>
          <td>EP</td>
          <td id="zoneName_6581">Environmental Protection</td>
          <td className="areaText" id="txtArea-6581">1,904 m<sup>2</sup></td>
          <td><button style={{"width": "100%"}} type="button" className="btn btn-warning btn-xs zoneHighlightButton"> <BsGeoAlt /> <span className="highlight-text">Highlight</span></button></td>
        </tr>
        <tr>
          <td>EP</td>
          <td id="zoneName_6582">Environmental Protection</td>
          <td className="areaText" id="txtArea-6582">46,643 m<sup>2</sup></td>
          <td><button style={{"width": "100%"}} type="button" className="btn btn-warning btn-xs zoneHighlightButton"> <BsGeoAlt /> <span className="highlight-text">Highlight</span></button></td>
        </tr>
        <tr>
          <td>EP</td>
          <td id="zoneName_6583">Environmental Protection</td>
          <td className="areaText" id="txtArea-6583">7,483 m<sup>2</sup></td>
          <td><button style={{"width": "100%"}}  type="button" className="btn btn-warning btn-xs zoneHighlightButton"> <BsGeoAlt /> <span className="highlight-text">Highlight</span></button></td>
        </tr>
        <tr>
          <td>EP</td>
          <td id="zoneName_6584">Environmental Protection</td>
          <td className="areaText" id="txtArea-6584">23,140 m<sup>2</sup></td>
          <td><button style={{"width": "100%"}}  type="button" className="btn btn-warning btn-xs zoneHighlightButton"> <BsGeoAlt /> <span className="highlight-text">Highlight</span></button></td>
        </tr>
        <tr>
          <td>RU</td>
          <td id="zoneName_6585">Rural</td>
          <td className="areaText" id="txtArea-6585">369,214 m<sup>2</sup></td>
          <td><button style={{"width": "100%"}}  type="button" className="btn btn-warning btn-xs zoneHighlightButton"> <BsGeoAlt /> <span className="highlight-text">Highlight</span></button></td>
        </tr>
        <tr>
          <td>RU</td>
          <td id="zoneName_6586">Rural</td>
          <td className="areaText" id="txtArea-6586">4,577 m<sup>2</sup></td>
          <td><button style={{"width": "100%"}}  type="button" className="btn btn-warning btn-xs zoneHighlightButton"> <BsGeoAlt /> <span className="highlight-text">Highlight</span></button></td>
        </tr>
        <tr>
          <td>RU</td>
          <td id="zoneName_6587">Rural</td>
          <td className="areaText" id="txtArea-6587">405,352 m<sup>2</sup></td>
          <td><button style={{"width": "100%"}}  type="button" className="btn btn-warning btn-xs zoneHighlightButton"> <BsGeoAlt /> <span className="highlight-text">Highlight</span></button></td>
        </tr>
        <tr>
          <td>RU</td>
          <td id="zoneName_6588">Rural</td>
          <td className="areaText" id="txtArea-6588">26,923 m<sup>2</sup></td>
          <td><button style={{"width": "100%"}}  type="button" className="btn btn-warning btn-xs zoneHighlightButton"> <BsGeoAlt /> <span className="highlight-text">Highlight</span></button></td>
        </tr>
    </tbody>
    </table>
  </div>
  );
}
const ZoningSidebar = (props) => {
  const [returnResults, setReturnResults] = useState(false);
  useEffect(()=>{
    window.emitter.addListener("searchComplete", () => setReturnResults(true));
    
  },[]);
  const headerStyle = {
    "textAlign": "center",
    "backgroundColor": "#d7d7d7",
    "background": "linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(229, 229, 229, 1) 100%)",
    "height": "50px",
    "fontFamily": "Arial",
    "color": "#5b5b5b",
    "fontWeight":"bold",
    "paddingTop": "25px",
  };
  const bodyStyle = {
   
  };
  return (
    <div className={props.className}>
      <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css"></link>
      <div style={headerStyle}>Zoning Results</div>
      <div style={bodyStyle}><ZoningResults returnResults={returnResults} /></div>
      <div style={{"position": "fixed", "bottom":"10px", "display":"inline-flex"}}>
      <div className="" style={{"padding":"5px"}}>
          <a href="http://maps.simcoe.ca/terms.html" className="btn btn-primary" style={{"width": "100%"}} role="button" target="_blank">
              <span className="glyphicon glyphicon-list-alt"></span>&nbsp;Terms
          </a>
      </div>
      <div className="" style={{"padding":"5px"}}>
          <a href="https://www.severn.ca/en/build-and-invest/resources/documents/Zoning-By-law.pdf" className="btn btn-primary" style={{"width": "100%"}} role="button" target="_blank">
              <span className="glyphicon glyphicon-asterisk"></span>&nbsp;Zoning By Law
          </a>
      </div>
      <div className="" style={{"padding":"5px"}}>
          <a href="mailto:kmandeville@townshipofsevern.com" className="btn btn-info" style={{"width": "100%"}} role="button">
              <span className="glyphicon glyphicon-envelope"></span>&nbsp;Contact Us
          </a>
      </div>
      </div>
    </div>
  );
}
// TAB BUTTON
const TabButton = (props) => {
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
