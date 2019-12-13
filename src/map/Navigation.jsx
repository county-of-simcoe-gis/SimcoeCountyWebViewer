import React, { Component } from "react";
import "./Navigation.css";
import { fromLonLat } from "ol/proj";
import * as helpers from "../helpers/helpers";

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
    if (window.sidebarOpen) window.map.getView().animate({ center: [-8796181, 5782715], zoom: 8 });
    else window.map.getView().animate({ center: [-8796181, 5782715], zoom: 8 });
  }

  // ZOOM TO CURRENT LOCATION
  zoomToCurrentLocation() {
    navigator.geolocation.getCurrentPosition(function(pos) {
      const coords = fromLonLat([pos.coords.longitude, pos.coords.latitude]);
      helpers.flashPoint(coords);
    });

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
