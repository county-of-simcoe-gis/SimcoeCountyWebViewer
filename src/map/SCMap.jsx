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
import Screenshot from "./Screenshot.jsx";
import ContextMenu from "ol-contextmenu";
import "ol-contextmenu/dist/ol-contextmenu.css";
import { fromLonLat } from "ol/proj";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";

import FloatingMenu, { FloatingMenuItem } from "../helpers/FloatingMenu.jsx";
import Menu, { SubMenu, Item as MenuItem, Divider } from "rc-menu";
import Portal from "../helpers/Portal.jsx";
import * as helpers from "../helpers/helpers";

const scaleLineControl = new ScaleLine();

class SCMap extends Component {
  constructor(props) {
    super(props);

    this.contextCoords = null;

    this.state = {
      mapClassName: "sc-map",
      shareURL: null,
      parcelClickText: "Disable Property Click",
      isIE: false
    };
  }

  componentDidMount() {
    const centerCoords = [-8875141.45, 5543492.45];
    var map = new Map({
      controls: defaultControls().extend([scaleLineControl, new FullScreen()]),
      layers: [],
      target: "map",
      view: new View({
        center: centerCoords,
        zoom: 10,
        maxZoom: 20
      }),
      interactions: defaultInteractions({ keyboard: true, altShiftDragRotate: false, pinchRotate: false }),
      keyboardEventTarget: document
    });

    window.map = map;
    window.popup = new Popup();
    window.map.addOverlay(window.popup);

    // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
    window.emitter.emit("mapLoaded");

    document.getElementById("map").focus();

    window.map.getViewport().addEventListener("contextmenu", evt => {
      evt.preventDefault();
      var evtClone = Object.assign({}, evt);

      this.contextCoords = window.map.getEventCoordinate(evt);

      const menu = (
        <Portal>
          <FloatingMenu key={helpers.getUID()} buttonEvent={evt} onMenuItemClick={this.onMenuItemClick} styleMode="left" autoY={true}>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-property-click">
              <FloatingMenuItem imageName={"report.png"} label="Property Report" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-add-mymaps">
              <FloatingMenuItem imageName={"point.png"} label="Add Marker Point" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-zoomin">
              <FloatingMenuItem imageName={"zoom-in.png"} label="Zoom In" />
            </MenuItem>
            <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-zoomout">
              <FloatingMenuItem imageName={"zoom-out.png"} label="Zoom Out" />
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

    if (x !== null || y !== null) {
      let coords = [x, y];
      if (sr === "WGS84") coords = fromLonLat([Math.round(x * 100000) / 100000, Math.round(y * 100000) / 100000]);

      helpers.flashPoint(coords);
    }

    // APP STAT
    helpers.addAppStat("STARTUP", "MAP_LOAD");

    // WARNING FOR IE
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");

    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
      // If Internet Explorer, return version number
      this.setState({ isIE: true });
      helpers.showURLWindow("https://opengis.simcoe.ca/public/ieWarning.html");
    }
  }

  onMenuItemClick = key => {
    if (key === "sc-floating-menu-zoomin") window.map.getView().setZoom(window.map.getView().getZoom() + 1);
    else if (key === "sc-floating-menu-zoomout") window.map.getView().setZoom(window.map.getView().getZoom() - 1);
    else if (key === "sc-floating-menu-property-click") window.emitter.emit("showPropertyReport", this.contextCoords);
    else if (key === "sc-floating-menu-add-mymaps") this.addMyMaps();

    helpers.addAppStat("Right Click", key);
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
