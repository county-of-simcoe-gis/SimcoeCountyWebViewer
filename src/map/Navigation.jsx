import React, { Component } from "react";
import "./Navigation.css";
import { fromLonLat } from "ol/proj";
import * as helpers from "../helpers/helpers";
import mainConfig from "../config.json";
const storageMapDefaultsKey = "map_defaults";
class Navigation extends Component {
  constructor(props) {
    super(props);

    this.state = {
      containerClassName: "nav-container"
    };

    // LISTEN FOR SIDEPANEL CHANGES
    window.emitter.addListener("sidebarChanged", isSidebarOpen => this.sidebarChanged(isSidebarOpen));
  }

  // ZOOM IN BUTTON
  zoomIn() {
    window.map.getView().setZoom(window.map.getView().getZoom() + 1);
  }

  // ZOOM OUT BUTTON
  zoomOut() {
    window.map.getView().setZoom(window.map.getView().getZoom() - 1);
  }

  // ZOOM TO FULL EXTENT
  zoomFullExtent() {
    let centerCoords = mainConfig.centerCoords;
    let defaultZoom = mainConfig.defaultZoom;
    const defaultStorage = sessionStorage.getItem(storageMapDefaultsKey);
    if (defaultStorage !== null) {
      const detaults = JSON.parse(defaultStorage);
      if (detaults.zoom !== undefined) defaultZoom = detaults.zoom;
      if (detaults.center !== undefined) centerCoords = detaults.center;
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
      err => {
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

  render() {
    return (
      <div className={this.state.containerClassName}>
        <div className="zoomButton" onClick={this.zoomIn}>
          +
        </div>
        <div className="zoomButton" onClick={this.zoomOut}>
          -
        </div>
        <div className="fullExtentButton" onClick={this.zoomFullExtent}>
          <div className="fullExtentContent"></div>
        </div>
        <div className="zoomToCurrentLocationButton" onClick={this.zoomToCurrentLocation}>
          <div className="zoomToCurrentLocationContent"></div>
        </div>
      </div>
    );
  }
}

export default Navigation;
