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
import { defaults as defaultControls, ScaleLine, FullScreen } from "ol/control.js";
import BasemapSwitcher from "./BasemapSwitcher";
import PropertyReportClick from "./PropertyReportClick.jsx";
import "ol-contextmenu/dist/ol-contextmenu.css";
import { fromLonLat } from "ol/proj";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { MouseWheelZoom } from "ol/interaction";

import FloatingMenu, { FloatingMenuItem } from "../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../helpers/Portal.jsx";
import * as helpers from "../helpers/helpers";
import mainConfig from "../config.json";
import Identify from "./Identify";

const scaleLineControl = new ScaleLine();
const feedbackTemplate = (xmin, xmax, ymin, ymax, centerx, centery, scale) =>
  `${mainConfig.feedbackUrl}/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}&REPORT_PROBLEM=True`;

class SCMap extends Component {
  constructor(props) {
    super(props);
    this.storageMapDefaultsKey = "map_defaults";
    this.contextCoords = null;
    this.storageExtentKey = "map_extent";
    this.state = {
      mapClassName: "sc-map",
      shareURL: null,
      parcelClickText: "Disable Property Click",
      isIE: false
    };
    // LISTEN FOR MAP CURSOR TO CHANGE
    window.emitter.addListener("changeCursor", cursorStyle => this.changeCursor(cursorStyle));
  }

  componentDidMount() {
    if (mainConfig.leftClickIdentify) {
      this.setState({mapClassName:"sc-map identify"});
    }
    let centerCoords = mainConfig.centerCoords;
    let defaultZoom = mainConfig.defaultZoom;
    const defaultsStorage = sessionStorage.getItem(this.storageMapDefaultsKey); 
    const storage = localStorage.getItem(this.storageExtentKey);
    if (defaultsStorage !== null && storage === null) {
      const detaults = JSON.parse(defaultsStorage);
      if (detaults.zoom !== undefined) defaultZoom = detaults.zoom;
      if (detaults.center !== undefined) centerCoords = detaults.center;
    }
    const resolutions = [
      305.74811314055756,
      152.87405657041106,
      76.43702828507324,
      38.21851414253662,
      19.10925707126831,
      9.554628535634155,
      4.77731426794937,
      2.388657133974685,
      1.1943285668550503,
      0.5971642835598172,
      0.29858214164761665,
      0.1492252984505969
    ];
    var map = new Map({
      controls: defaultControls().extend([scaleLineControl, new FullScreen()]),
      layers: [],
      target: "map",
      view: new View({
        center: centerCoords,
        zoom: defaultZoom,
        maxZoom: mainConfig.maxZoom
        //resolutions: resolutions
      }),
      interactions: defaultInteractions({ keyboard: true, altShiftDragRotate: false, pinchRotate: false, mouseWheelZoom: false }).extend([
        new MouseWheelZoom({
          duration: 0,
          constrainResolution: true
        })
      ]),
      keyboardEventTarget: document
    });
    if (storage !== null) {
      const extent = JSON.parse(storage);
      map.getView().fit(extent, map.getSize(), { duration: 1000 });
    }

    window.map = map;
    window.popup = new Popup();
    window.map.addOverlay(window.popup);

    // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
    window.emitter.emit("mapLoaded");

    window.map.getViewport().addEventListener("contextmenu", evt => {
      evt.preventDefault();
      this.contextCoords = window.map.getEventCoordinate(evt);

      const menu = (
        <Portal>
          <FloatingMenu key={helpers.getUID()} buttonEvent={evt} onMenuItemClick={this.onMenuItemClick} styleMode="left" autoY={true}>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-basic-mode">
              <FloatingMenuItem imageName={"collased.png"} label="Switch To Basic" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-property-click">
              <FloatingMenuItem imageName={"report.png"} label="Property Report" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-add-mymaps">
              <FloatingMenuItem imageName={"point.png"} label="Add Marker Point" />
            </MenuItem>
            {/* <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-zoomin">
              <FloatingMenuItem imageName={"zoom-in.png"} label="Zoom In" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-zoomout">
              <FloatingMenuItem imageName={"zoom-out.png"} label="Zoom Out" />
            </MenuItem> */}
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-save-map-extent">
              <FloatingMenuItem imageName={"globe-icon.png"} label="Save as Default Extent" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-report-problem">
              <FloatingMenuItem imageName={"error.png"} label="Report a problem" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-identify">
              <FloatingMenuItem imageName={"identify.png"} label="Identify" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-more">
              <FloatingMenuItem imageName={"more-16.png"} label="More..." />
            </MenuItem>
          </FloatingMenu>
        </Portal>
      );
      ReactDOM.render(menu, document.getElementById("portal-root"));
    });

    // HANDLE URL PARAMETERS (ZOOM TO XY)
    const x = helpers.getURLParameter("X");
    const y = helpers.getURLParameter("Y");
    const sr = helpers.getURLParameter("SR") === null ? "WEB" : helpers.getURLParameter("SR");
    if (x !== null && y !== null) {
      let coords = [x, y];
      if (sr === "WGS84") coords = fromLonLat([Math.round(x * 100000) / 100000, Math.round(y * 100000) / 100000]);

      helpers.flashPoint(coords);
    }

    // HANDLE URL PARAMETERS (ZOOM TO EXTENT)
    const xmin = helpers.getURLParameter("XMIN");
    const ymin = helpers.getURLParameter("YMIN");
    const xmax = helpers.getURLParameter("XMAX");
    const ymax = helpers.getURLParameter("YMAX");
    if (xmin !== null && ymin !== null && xmax !== null && ymax !== null) {
      const extent = [xmin, xmax, ymin, ymax];
      window.map.getView().fit(extent, window.map.getSize(), { duration: 1000 });
    }

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
    }
  }
  changeCursor = (cursorStyle) =>
  {
    let cursorStyles = ["standard", "identify"];
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
  onMenuItemClick = key => {
    if (key === "sc-floating-menu-zoomin") window.map.getView().setZoom(window.map.getView().getZoom() + 1);
    else if (key === "sc-floating-menu-zoomout") window.map.getView().setZoom(window.map.getView().getZoom() - 1);
    else if (key === "sc-floating-menu-property-click") window.emitter.emit("showPropertyReport", this.contextCoords);
    else if (key === "sc-floating-menu-add-mymaps") this.addMyMaps();
    else if (key === "sc-floating-menu-save-map-extent") this.saveMapExtent();
    else if (key === "sc-floating-menu-report-problem") this.reportProblem();
    else if (key === "sc-floating-menu-identify") this.identify();
    else if (key === "sc-floating-menu-more") this.moreOptions();
    else if (key === "sc-floating-menu-basic-mode") this.basicMode();
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
    window.emitter.emit("loadReport", <Identify geometry={point}></Identify>);
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

  saveMapExtent = () => {
    const extent = window.map.getView().calculateExtent(window.map.getSize());
    localStorage.setItem(this.storageExtentKey, JSON.stringify(extent));
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
    //  SIDEBAR IN AND OUT
    if (isSidebarOpen) {
      this.setState({ mapClassName: "sc-map sc-map-slideout" });
    } else {
      this.setState({ mapClassName: "sc-map sc-map-closed sc-map-slidein" });
    }
    this.forceUpdate();
    setTimeout(function() {
      window.map.updateSize();
    }, 300);
  }

  render() {
    window.emitter.addListener("sidebarChanged", isSidebarOpen => this.sidebarChanged(isSidebarOpen));

    return (
      <div>
        <div id="map-modal-window" />
        <div id="map" className={this.state.mapClassName} tabIndex="0" />
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
      </div>
    );
  }
}

export default SCMap;
