import React, { Component } from "react";
import "./ThemeDataList.css";
import * as helpers from "../../../../helpers/helpers";
import { InfoRowValue } from "../../../../helpers/InfoRow.jsx";
import ThemePopupContent from "./ThemePopupContent.jsx";

class ThemeDataList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      panelOpen: props.layerConfig.expanded,
      features: [],
      styleUrl: null,
      visible: props.layerConfig.visible,
      onlyFeaturesWithinMap: props.onlyFeaturesWithinMap
    };

    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;

    // GET FEATURES
    this.fetchFeatures();

    // GET LEGEND
    const styleUrlTemplate = (serverURL, layerName, styleName) =>
      `${serverURL}/wms?REQUEST=GetLegendGraphic&VERSION=1.1&FORMAT=image/png&WIDTH=30&HEIGHT=30&LAYER=${layerName}&STYLE=${styleName}&transparent=true`;
    const styleUrl = styleUrlTemplate(this.props.layerConfig.serverUrl, this.props.layerConfig.layerName, this.props.layerConfig.legendStyleName);
    this.setState({ styleUrl: styleUrl });

    window.map.on("moveend", evt => {
      // GET FEATURES
      this.fetchFeatures();
    });
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  fetchFeatures = () => {
    if (!this._isMounted) return;

    if (this.state.onlyFeaturesWithinMap) {
      const extent = window.map.getView().calculateExtent();
      helpers.getWFSGeoJSON(
        this.props.layerConfig.serverUrl,
        this.props.layerConfig.layerName,
        result => {
          this.setState({ features: result });
        },
        this.props.layerConfig.displayFieldName,
        extent
      );
    } else {
      helpers.getWFSGeoJSON(
        this.props.layerConfig.serverUrl,
        this.props.layerConfig.layerName,
        result => {
          this.setState({ features: result });
        },
        this.props.layerConfig.displayFieldName
      );
    }
  };

  onHeaderClick = () => {
    this.setState({ panelOpen: !this.state.panelOpen });
  };

  itemClick = feature => {
    helpers.getGeometryCenter(feature.getGeometry(), center => {
      // SHOW POPUP
      const entries = Object.entries(feature.getProperties());
      window.popup.show(
        center.flatCoordinates,
        <ThemePopupContent key={helpers.getUID()} values={entries} popupLogoImage={this.props.config.popupLogoImage} layerConfig={this.props.layerConfig} />
      );
      helpers.zoomToFeature(feature);
      window.map.getView().setZoom(15);
    });
  };

  // HANDLES TOGGLE LAYER CHANGES
  onLayerVisibilityChange = layer => {
    if (layer.getProperties().name === this.props.layerConfig.layerName) this.setState({ visible: layer.getVisible() });
  };

  render() {
    return (
      <div className={this.state.visible ? "sc-theme-data-list-container" : "sc-hidden"}>
        <div className={this.state.panelOpen ? "sc-theme-data-list-header open" : "sc-theme-data-list-header"} onClick={this.onHeaderClick}>
          <div className="sc-theme-data-list-header-table-icon">
            <img src={images["table-icon.png"]} alt="tableicon" />
          </div>
          <div className="sc-theme-data-list-header-symbol">
            <img src={this.state.styleUrl} alt="style" />
          </div>
          <div style={{ paddingTop: "12px", width: "90%" }}>{this.props.layerConfig.displayName}</div>
        </div>
        <div className={this.state.panelOpen ? "sc-theme-data-list-item-container" : "sc-hidden"}>
          {this.state.features.map(feature => (
            <InfoRowValue
              className="sc-theme-data-list-item"
              key={helpers.getUID()}
              value={feature.getProperties()[this.props.layerConfig.displayFieldName]}
              onClick={this.itemClick}
              feature={feature}
            />
          ))}
        </div>
      </div>
    );
  }
}

export default ThemeDataList;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
