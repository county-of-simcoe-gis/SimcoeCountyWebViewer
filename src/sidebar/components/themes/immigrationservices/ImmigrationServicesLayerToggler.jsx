import React, { Component } from "react";
import * as helpers from "../../../../helpers/helpers";
import Collapsible from "react-collapsible";
import information from "./images/information.png";
import url from "url";
import ThemePopupContent from "../themeComponents/ThemePopupContent.jsx";
import GeoJSON from "ol/format/GeoJSON.js";
import { unByKey } from "ol/Observable.js";

class ImmigrationServicesLayerToggler extends Component {
  constructor(props) {
    super(props);
    this.state = {
      layerVisible: this.props.layer.visible,
      panelOpen: this.props.layer.expanded,
      layer: this.initLayer(),
      styleUrl: "",
      recordCount: 0,
    };
  }

  componentDidMount() {
    // LEGEND
    const styleUrlTemplate = (serverURL, layerName, styleName) => `${serverURL}wms?REQUEST=GetLegendGraphic&VERSION=1.1&FORMAT=image/png&WIDTH=30&HEIGHT=30&TRANSPARENT=true&LAYER=${layerName}`;
    const styleUrl = styleUrlTemplate(this.props.layer.serverUrl, this.props.layer.layerName);
    this.setState({ styleUrl: styleUrl });

    // RECORD COUNT
    helpers.getWFSLayerRecordCount({ serverUrl: this.props.layer.serverUrl, layerName: this.props.layer.layerName }, (count) => {
      this.setState({ recordCount: count });
    });

    // MAP CLICK FOR POPUP INFO
    this.mapClickEvent = window.map.on("click", (evt) => {
      if (window.isDrawingOrEditing || window.isCoordinateToolOpen || window.isMeasuring || !this.state.layer.getVisible()) return;

      var viewResolution = window.map.getView().getResolution();
      var url = this.state.layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", {
        INFO_FORMAT: "application/json",
      });
      if (url) {
        helpers.getJSON(url, (result) => {
          const features = result.features;
          if (features.length === 0) {
            return;
          }
          const geoJSON = new GeoJSON().readFeatures(result);
          geoJSON.forEach((feature) => {
            const entries = Object.entries(feature.getProperties());
            window.popup.show(evt.coordinate, <ThemePopupContent key={helpers.getUID()} values={entries} layerConfig={this.props.layer} />, this.props.layer.displayName);
          });
        });
      }
    });
  }

  componentWillUnmount() {
    // CLEAN UP
    window.map.removeLayer(this.state.layer);
    unByKey(this.mapClickEvent);
  }

  // GET LAYER
  initLayer = () => {
    const layer = helpers.getImageWMSLayer(url.resolve(this.props.layer.serverUrl, "wms"), this.props.layer.layerName, "geoserver", null, 50);
    layer.setVisible(this.props.layer.visible);
    layer.setZIndex(this.props.layer.zIndex);

    layer.setProperties({
      name: this.props.layer.layerName,
      tocDisplayName: this.props.layer.displayName,
      disableParcelClick: true,
      queryable: true,
    });

    window.map.addLayer(layer);
    return layer;
  };

  onCheckboxClick = () => {
    this.setState(
      (prevState) => ({
        layerVisible: !prevState.layerVisible,
      }),
      () => {
        this.state.layer.setVisible(this.state.layerVisible);
      }
    );
  };

  onPanelTrigger = (evt) => {
    this.setState((prevState) => ({
      panelOpen: !prevState.panelOpen,
    }));
  };

  render() {
    return (
      <div>
        <Collapsible
          trigger={Header(this.props.layer, this.onCheckboxClick, this.onPanelTrigger, this.state.layerVisible, this.state.styleUrl, this.state.recordCount)}
          open={this.state.panelOpen}
          triggerDisabled={true}
        >
          <div className="sc-immigration-layer-content">{this.props.layer.description}</div>
        </Collapsible>
      </div>
    );
  }
}

export default ImmigrationServicesLayerToggler;

// HEADER TRIGGER
const Header = (layer, onCheckboxClick, onPanelTrigger, layerVisible, styleUrl, recordCount) => {
  return (
    <div className="sc-immigration-layer-header">
      <div className="sc-immigration-center">
        <img src={styleUrl} alt="legend" />
        <input className="sc-immigration-checkbox" type="checkbox" onClick={onCheckboxClick} checked={layerVisible} readOnly />
        <label className="sc-immigration-layer-label" onClick={onCheckboxClick}>
          {layer.displayName}
        </label>
        <label className="sc-immigration-layer-count">{"(" + recordCount + ")"}</label>
        <img className="sc-immigration-information-icon" src={information} alt="show info" onClick={onPanelTrigger} title="Show Details" />
      </div>
    </div>
  );
};
