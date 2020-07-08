import React, { Component } from "react";
import ReactDOM from "react-dom";
import GitHubButton from "react-github-btn";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";

import "./SCMap.css";
import "./OLOverrides.css";
import "./Navigation";
import Navigation from "./Navigation";
import { defaults as defaultInteractions } from "ol/interaction.js";
import Popup from "../helpers/Popup.jsx";
import FooterTools from "./FooterTools.jsx";
import { defaults as defaultControls, ScaleLine, FullScreen,Rotate } from "ol/control.js";
import BasemapSwitcher from "./BasemapSwitcher";
import PropertyReportClick from "./PropertyReportClick.jsx";
import "ol-contextmenu/dist/ol-contextmenu.css";
import { fromLonLat,transform } from "ol/proj";

import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { MouseWheelZoom } from "ol/interaction";

import FloatingMenu, { FloatingMenuItem } from "../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../helpers/Portal.jsx";
import * as helpers from "../helpers/helpers";
import mainConfig from "../config.json";
import Identify from "./Identify";
import AttributeTable from "../helpers/AttributeTable.jsx";
import FloatingImageSlider from "../helpers/FloatingImageSlider.jsx";

const scaleLineControl = new ScaleLine({
                                  minWidth: 100
                                   });
const feedbackTemplate = (xmin, xmax, ymin, ymax, centerx, centery, scale) =>
  `${mainConfig.feedbackUrl}/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}&REPORT_PROBLEM=True`;
const googleMapsTemplate = (pointx, pointy) => `https://www.google.com/maps?q=${pointy},${pointx}`;
class SCMap extends Component {
  constructor(props) {
    super(props);
    this.storageMapDefaultsKey = "Map Defaults";
    this.contextCoords = null;
    this.storageExtentKey = "Map Extent";
    this.state = {
      mapClassName: "sc-map",
      shareURL: null,
      parcelClickText: "Disable Property Click",
      isIE: false,
      mapBottom: 0,
    };
    // LISTEN FOR MAP CURSOR TO CHANGE
    window.emitter.addListener("changeCursor", cursorStyle => this.changeCursor(cursorStyle));

    // LISTEN FOR TOC TO LOAD
    window.emitter.addListener("tocLoaded", () => this.handleUrlParameters());

    // LISTEN FOR ATTRIBUTE TABLE SIZE
    window.emitter.addListener("attributeTableResize", (height) => this.onAttributeTableResize(height));
  }
  
  componentDidMount() {
    
    if (mainConfig.leftClickIdentify) {
      this.setState({mapClassName:"sc-map identify"});
    }
    let centerCoords = mainConfig.centerCoords;
    let defaultZoom = mainConfig.defaultZoom;
    const defaultsStorage = sessionStorage.getItem(this.storageMapDefaultsKey);
    const extent = helpers.getItemsFromStorage(this.storageExtentKey);
    
    if (defaultsStorage !== null && extent === undefined) {
      const detaults = JSON.parse(defaultsStorage);
      if (detaults.zoom !== undefined) defaultZoom = detaults.zoom;
      if (detaults.center !== undefined) centerCoords = detaults.center;
    }
    
    var controls = [];
    if (window.mapControls.scaleLine) controls.push(scaleLineControl)
    if (window.mapControls.fullScreen) controls.push(new FullScreen())
    if (window.mapControls.rotate) controls.push(new Rotate())

    var map = new Map({
      controls: defaultControls().extend(controls.concat([])),
      layers: [],
      target: "map",
      view: new View({
        center: centerCoords,
        zoom: defaultZoom,
        maxZoom: mainConfig.maxZoom,
        //resolutions: resolutions
      }),
      interactions: defaultInteractions({ keyboard: true, altShiftDragRotate: window.mapControls.rotate, pinchRotate: window.mapControls.rotate, mouseWheelZoom: false }).extend([
        new MouseWheelZoom({
          duration: 0,
          constrainResolution: true,
        }),
      ]),
      keyboardEventTarget: document,
    });
    if (!window.mapControls.zoomInOut) helpers.removeMapControl(map,"zoom");
    if (!window.mapControls.rotate) helpers.removeMapControl(map,"rotate");

   
    if (extent !== undefined) {
      map.getView().fit(extent, map.getSize(), { duration: 1000 });
    }

    window.map = map;
    window.popup = new Popup();
    window.map.addOverlay(window.popup);

    window.map.getViewport().addEventListener("contextmenu", evt => {
      evt.preventDefault();
      this.contextCoords = window.map.getEventCoordinate(evt);

      const menu = (
        <Portal>
          <FloatingMenu key={helpers.getUID()} buttonEvent={evt} onMenuItemClick={this.onMenuItemClick} autoY={true} autoX={true}>
            <MenuItem className={helpers.isMobile() ? "sc-hidden" : "sc-floating-menu-toolbox-menu-item"} key="sc-floating-menu-basic-mode">
              <FloatingMenuItem imageName={"collased.png"} label="Switch To Basic" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-property-click">
              <FloatingMenuItem imageName={"report.png"} label="Property Report" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-add-mymaps">
              <FloatingMenuItem imageName={"point.png"} label="Add Marker Point" />
            </MenuItem>
           
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-save-map-extent">
              <FloatingMenuItem imageName={"globe-icon.png"} label="Save as Default Extent" />
            </MenuItem>
            {/*<MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-report-problem">
              <FloatingMenuItem imageName={"error.png"} label="Report a problem" />
      </MenuItem>*/}
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-identify">
              <FloatingMenuItem imageName={"identify.png"} label="Identify" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-google-maps">
              <FloatingMenuItem imageName={"google.png"} label="View in Google Maps" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-more">
              <FloatingMenuItem imageName={"more-16.png"} label="More..." />
            </MenuItem>
          </FloatingMenu>
        </Portal>
      );
      ReactDOM.render(menu, document.getElementById("portal-root"));
    });

    // APP STAT
    helpers.addAppStat("STARTUP", "MAP_LOAD");

    // WARNING FOR IE
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");

    // eslint-disable-next-line
    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
      // If Internet Explorer, return version number
      this.setState({ isIE: true });
      helpers.showURLWindow(mainConfig.ieWarningUrl);
    } else {
      // SHOW TERMS
      if (helpers.isMobile()) {
        window.emitter.emit("setSidebarVisiblity", "CLOSE");
        //helpers.showURLWindow(mainConfig.termsUrl, false, "full");
      }// else helpers.showURLWindow(mainConfig.termsUrl);
    }

    // MAP LOADED
    this.initialLoad = false;
    window.map.once("rendercomplete", (event) => {
      if (!this.initialLoad) {
        window.emitter.emit("mapLoaded");
        this.initialLoad = true;
      }
    });

    window.map.on("change:size", () => {
      if (!window.isAttributeTableResizing) {
        window.emitter.emit("mapResize");
      }
    });

    // SHOW FEEDBACK ON TIMER
    // if (mainConfig.showFeedbackMessageOnStartup !== undefined && mainConfig.showFeedbackMessageOnStartup) {
    //   setTimeout(() => {
    //     helpers.showMessage(
    //       "Feedback",
    //       <div>
    //         <label>Please provide us feedback! The feedback button is the star at top right of this window.</label>
    //         <span
    //           className="sc-fakeLink"
    //           style={{ display: "block" }}
    //           onClick={() => {
    //             window.emitter.emit("feedback", null);
    //           }}
    //         >
    //           Provide Feedback now!
    //         </span>
    //       </div>,
    //       undefined,
    //       10000
    //     );
    //   }, 60000);
    // }

    // SHOW WHATS NEW
    // if (mainConfig.showFeedbackMessageOnStartup !== undefined && mainConfig.showFeedbackMessageOnStartup) {
    //   helpers.showURLWindow(mainConfig.whatsNewUrl, true, "full", true, true);
    // }
    // ATTRIBUTE TABLE TESTING
    // window.emitter.emit("openAttributeTable", "https://opengis.simcoe.ca/geoserver/", "simcoe:Airport");
  }
  changeCursor = (cursorStyle) =>
  {
    let cursorStyles = ["standard", "identify", "draw"];
    cursorStyles.splice( cursorStyles.indexOf(cursorStyle), 1 );
    let classes = this.state.mapClassName.split(" ");
    if (classes.indexOf(cursorStyle) === -1){
      cursorStyles.forEach(styleName => {
        if (classes.indexOf(styleName) !== -1) classes.splice(classes.indexOf(styleName), 1 );
      });
      classes.push(cursorStyle);
      this.setState({mapClassName:classes.join(" ")});
    }
  }

  onAttributeTableResize = (height) => {
    this.setState({ mapBottom: Math.abs(height) }, () => {
      window.map.updateSize();
    });
  };

  handleUrlParameters = () => {
    const storage = localStorage.getItem(this.storageExtentKey);

    // GET URL PARAMETERS (ZOOM TO XY)
    const x = helpers.getURLParameter("X");
    const y = helpers.getURLParameter("Y");
    const sr = helpers.getURLParameter("SR") === null ? "WEB" : helpers.getURLParameter("SR");

    // GET URL PARAMETERS (ZOOM TO EXTENT)
    const xmin = helpers.getURLParameter("XMIN");
    const ymin = helpers.getURLParameter("YMIN");
    const xmax = helpers.getURLParameter("XMAX");
    const ymax = helpers.getURLParameter("YMAX");

    if (x !== null && y !== null) {
      // URL PARAMETERS (ZOOM TO XY)
      let coords = [x, y];
      if (sr === "WGS84") coords = fromLonLat([Math.round(x * 100000) / 100000, Math.round(y * 100000) / 100000]);

      setTimeout(() => {
        helpers.flashPoint(coords);
      }, 1000);
    } else if (xmin !== null && ymin !== null && xmax !== null && ymax !== null) {
      //URL PARAMETERS (ZOOM TO EXTENT)
      const extent = [parseFloat(xmin), parseFloat(ymin), parseFloat(xmax), parseFloat(ymax)];
      window.map.getView().fit(extent, window.map.getSize(), { duration: 1000 });
    } else if (storage !== null) {
      // ZOOM TO SAVED EXTENT
      const extent = JSON.parse(storage);
      window.map.getView().fit(extent, window.map.getSize(), { duration: 1000 });
    }

    window.emitter.emit("mapParametersComplete");
  };

  onMenuItemClick = key => {
    switch(key){
      case "sc-floating-menu-zoomin":
        window.map.getView().setZoom(window.map.getView().getZoom() + 1);
        break;
      case "sc-floating-menu-zoomout":
        window.map.getView().setZoom(window.map.getView().getZoom() - 1);
        break;
      case "sc-floating-menu-property-click":
        window.emitter.emit("showPropertyReport", this.contextCoords);
        break;
      case "sc-floating-menu-add-mymaps":
        this.addMyMaps();
        break;
      case "sc-floating-menu-save-map-extent":
        this.saveMapExtent();
        break;
      case "sc-floating-menu-report-problem":
        this.reportProblem();
        break;
      case "sc-floating-menu-identify":
        this.identify();
        break;
      case "sc-floating-menu-google-maps":
        this.googleLink();
        break;
      case "sc-floating-menu-more":
        this.moreOptions();
        break;
      case "sc-floating-menu-basic-mode":
        this.basicMode();
        break;
      default:
        break;
    }
    
    helpers.addAppStat("Right Click", key);
  };

  basicMode = () => {
    window.emitter.emit("setSidebarVisiblity", "CLOSE");
  };

  moreOptions = () => {
    // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
    window.emitter.emit("setSidebarVisiblity", "CLOSE");

    // OPEN MORE MENU
    window.emitter.emit("openMoreMenu");
  };

  identify = () => {
    const point = new Point(this.contextCoords);
    window.emitter.emit("loadReport", <Identify geometry={point} />);
  };

  reportProblem = () => {
    // APP STATS
    helpers.addAppStat("Report Problem", "Right Click Map");

    const scale = helpers.getMapScale();
    const extent = window.map.getView().calculateExtent(window.map.getSize());
    const xmin = extent[0];
    const xmax = extent[1];
    const ymin = extent[2];
    const ymax = extent[3];
    const center = window.map.getView().getCenter();

    const feedbackUrl = feedbackTemplate(xmin, xmax, ymin, ymax, center[0], center[1], scale);

    helpers.showURLWindow(feedbackUrl, false, "full");
  };
  googleLink = () => {
    // APP STATS
    helpers.addAppStat("Google Maps", "Right Click Map");

    const latLongCoords = transform(this.contextCoords, "EPSG:3857", "EPSG:4326");
    const googleMapsUrl = googleMapsTemplate(latLongCoords[0], latLongCoords[1]);

    helpers.showURLWindow(googleMapsUrl, false, "full");
  };

  saveMapExtent = () => {
    const extent = window.map.getView().calculateExtent(window.map.getSize());
    helpers.saveToStorage(this.storageExtentKey, extent);
    helpers.showMessage("Map Extent", "Your map extent has been saved.");
  };

  addMyMaps = () => {
    var marker = new Feature(new Point(this.contextCoords));
    window.emitter.emit("addMyMapsFeature", marker, this.contextCoords[0] + "," + this.contextCoords[1]);
  };

  onContextDisableParcelClick = () => {
    if (window.disableParcelClick) {
      window.disableParcelClick = false;
      this.setState({ parcelClickText: "Disable Property Click" });
    } else {
      window.disableParcelClick = true;
      this.setState({ parcelClickText: "Enable Property Click" });
    }
    this.contextmenu.close();

    // this.contextmenu.clear();
    // this.contextmenu.extend(this.getContextMenuItems())
  };

  getPropertyClickText = () => {
    if (window.disableParcelClick) return "Enable Property Click";
    else return "Disable Property Click";
  };

  sidebarChanged(isSidebarOpen) {
    let mapClassName = "sc-map";
    //  SIDEBAR IN AND OUT
    if (isSidebarOpen) {
      mapClassName = "sc-map sc-map-slideout";
    } else {
      mapClassName = "sc-map sc-map-closed sc-map-slidein";
    }
    this.setState({ mapClassName: mapClassName },() =>{
      window.map.updateSize();
    
      this.forceUpdate();
    });
    
    
    
  }

  
  

  render() {
    window.emitter.addListener("sidebarChanged", (isSidebarOpen) => this.sidebarChanged(isSidebarOpen));

    return (
      <div>
        <div id="map-modal-window" />
        <div id="map" className={this.state.mapClassName} tabIndex="0" style={{ bottom: this.state.mapBottom }} />
        <Navigation />
        <FooterTools />
        <BasemapSwitcher />
        <PropertyReportClick />
        {/* <Screenshot></Screenshot> */}
        {/* https://buttons.github.io/ */}
        <div
          className={window.sidebarOpen ? "sc-map-github-button slideout" : "sc-map-github-button slidein"}
          onClick={() => {
            helpers.addAppStat("GitHub", "Button");
          }}
        >
          <GitHubButton href="https://github.com/county-of-simcoe-gis" data-size="large" aria-label="Follow @simcoecountygis on GitHub">
            Follow @simcoecountygis
          </GitHubButton>
        </div>
        <AttributeTable />
        <FloatingImageSlider />
      </div>
    );
  }
}

export default SCMap;
