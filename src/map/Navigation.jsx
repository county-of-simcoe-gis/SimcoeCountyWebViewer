import React, { Component } from "react";
import "./Navigation.css";
import { fromLonLat } from "ol/proj";
import * as helpers from "../helpers/helpers";
import mainConfig from "../config.json";
const storageMapDefaultsKey = "Map Defaults";
class Navigation extends Component {
  constructor(props) {
    super(props);

    this.state = {
      containerClassName: "nav-container",
      showCurrentLocation: true,
      showZoomExtent: true,
    };

    // LISTEN FOR SIDEPANEL CHANGES
    window.emitter.addListener("sidebarChanged", (isSidebarOpen) => this.sidebarChanged(isSidebarOpen));

    // LISTEN FOR CONTROL VISIBILITY CHANGES
    window.emitter.addListener("mapControlsChanged", (control, visible) => this.controlStateChange(control, visible));
  }

  componentDidMount() {
    this.setState({ showCurrentLocation: window.mapControls.currentLocation, showZoomExtent: window.mapControls.zoomExtent });
  }

  // ZOOM TO FULL EXTENT
  zoomFullExtent() {
    let centerCoords = mainConfig.centerCoords;
    let defaultZoom = mainConfig.defaultZoom;
    const defaultStorage = sessionStorage.getItem(storageMapDefaultsKey);
    if (defaultStorage !== null) {
      const defaults = JSON.parse(defaultStorage);
      if (defaults.zoom !== undefined) defaultZoom = defaults.zoom;
      if (defaults.center !== undefined) centerCoords = defaults.center;
    }
    window.map.getView().animate({ center: centerCoords, zoom: defaultZoom });
  }

  // ZOOM TO CURRENT LOCATION
  zoomToCurrentLocation() {
    var options = { timeout: 5000 };
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        const coords = fromLonLat([pos.coords.longitude, pos.coords.latitude]);
        helpers.flashPoint(coords);
      },
      (err) => {
        helpers.showMessage("Location", "Getting your location failed: " + err.message);
      },
      options
    );

    helpers.addAppStat("Current Location", "Click");
  }

  // HANDLE SIDEBAR CHANGES
  sidebarChanged(isSidebarOpen) {
    //  SIDEBAR IN AND OUT
    if (isSidebarOpen) {
      this.setState({ containerClassName: "nav-container nav-container-slideout" });
    } else {
      this.setState({ containerClassName: "nav-container nav-container-slidein" });
    }
  }
  controlStateChange(control, state) {
    switch (control) {
      case "fullExtent":
        this.setState({ showZoomExtent: state });
        break;
      case "zoomToCurrentLocation":
        this.setState({ showCurrentLocation: state });
        break;
      default:
        break;
    }
  }

  render() {
    return (
      <div>
        <div id="map-theme-mto">
          <div id={"sc-map-nav-container"} className={mainConfig.mapTheme === "MTO" ? this.state.containerClassName : "sc-hidden"}>
            {/*<div className="zoomButton" onClick={this.zoomIn}>
          +
        </div>
        <div className="zoomButton" onClick={this.zoomOut}>
          -
    </div>*/}
            <div className={"fullExtentButton" + (!this.state.showZoomExtent ? " sc-hidden" : "")} onClick={this.zoomFullExtent}>
              <div className="fullExtentContent" />
            </div>
            <div className={"zoomToCurrentLocationButton" + (!this.state.showCurrentLocation ? " sc-hidden" : "")} onClick={this.zoomToCurrentLocation}>
              <div className="zoomToCurrentLocationContent" />
            </div>
          </div>
        </div>

        <div id="map-theme-simcoe-county">
          <div className={mainConfig.mapTheme === "SIMCOE_COUNTY" ? this.state.containerClassName : "sc-hidden"}>
            <div
              className="zoomButton"
              onClick={() => {
                window.map.getView().setZoom(window.map.getView().getZoom() + 1);
              }}
            >
              +
            </div>
            <div
              className="zoomButton"
              onClick={() => {
                window.map.getView().setZoom(window.map.getView().getZoom() - 1);
              }}
            >
              -
            </div>
            <div className="fullExtentButton" onClick={this.zoomFullExtent}>
              <div className="fullExtentContent" />
            </div>
            <div className="zoomToCurrentLocationButton" onClick={this.zoomToCurrentLocation}>
              <div className="zoomToCurrentLocationContent" />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Navigation;
