import React, { Component } from "react";
import ThemeBaseLayers from "./ThemeBaseLayers.jsx";
import ThemeLayers from "./ThemeLayers.jsx";
import ThemeData from "./ThemeData.jsx";
import "./ThemeContainer.css";

class ThemeContainer extends Component {
  state = {};

  // CALLED FROM LAYERS.  CALL THEME DATA THROUGH A REF TO PASS ON THE CHANGE FOR VISIBLITY
  onLayerVisibilityChange = (layer) => {
    this.data.onLayerVisibilityChange(layer);
  };

  componentDidMount() {
    // DISABLE PARCEL CLICK
    if (this.props.config.disableParcelClick !== undefined && this.props.config.disableParcelClick) window.disableParcelClick = true;
  }

  componentWillUnmount() {
    // RE-ENABLE PARCEL CLICK
    window.disableParcelClick = false;
  }

  render() {
    return (
      <div className={`${this.props.className ? this.props.className : ""} sc-theme-container`}>
        <ThemeBaseLayers className={this.props.config.hideBasemap ? "sc-hidden" : ""} config={this.props.config}></ThemeBaseLayers>
        <ThemeLayers
          key={`${this.props.config.toggleLayersKey}-ThemeLayers`}
          config={this.props.config}
          onLayerVisiblityChange={(layer) => {
            this.onLayerVisibilityChange(layer);
          }}
          className={this.props.config.hideLayers ? "sc-hidden" : ""}
          onMapClick={this.props.onMapClick}
        ></ThemeLayers>
        <ThemeData
          config={this.props.config}
          className={this.props.config.hideData ? "sc-hidden" : ""}
          ref={(data) => {
            this.data = data;
          }}
        ></ThemeData>
        <div id="sc-panel-component-content">{this.props.children}</div>
      </div>
    );
  }
}

export default ThemeContainer;
