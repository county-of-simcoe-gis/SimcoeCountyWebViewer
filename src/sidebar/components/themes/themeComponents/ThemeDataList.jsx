import React, { Component } from "react";
import "./ThemeDataList.css";
import * as helpers from "../../../../helpers/helpers";
import { get, createObjectURL } from "../../../../helpers/api";
import { InfoRowValue } from "../../../../helpers/InfoRow.jsx";
import ThemePopupContent from "./ThemePopupContent.jsx";
import { getCenter } from "ol/extent";
class ThemeDataList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      panelOpen: props.layerConfig.expanded,
      features: [],
      styleUrl: null,
      visible: props.layerConfig.visible,
      onlyFeaturesWithinMap: props.onlyFeaturesWithinMap,
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

    get(styleUrl, { useBearerToken: this.props.layerConfig.secure || false, type: "blob" }, (results) => {
      var imgData = createObjectURL(results);
      this.setState({ styleUrl: imgData });
    });
    window.map.on("moveend", (evt) => {
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
        {
          serverUrl: this.props.layerConfig.serverUrl,
          layerName: this.props.layerConfig.layerName,
          sortField: this.props.layerConfig.displayFieldName,
          extent: extent,
          secure: this.props.layerConfig.secured,
        },
        (result) => {
          this.setState({ features: result });
        }
      );
    } else {
      helpers.getWFSGeoJSON(
        { serverUrl: this.props.layerConfig.serverUrl, layerName: this.props.layerConfig.layerName, sortField: this.props.layerConfig.displayFieldName, secure: this.props.layerConfig.secured },
        (result) => {
          this.setState({ features: result });
        }
      );
    }
  };

  onHeaderClick = () => {
    this.setState({ panelOpen: !this.state.panelOpen });
  };

  itemClick = (feature) => {
    const extent = feature.getGeometry().getExtent();
    const center = getCenter(extent);
    const entries = Object.entries(feature.getProperties());
    window.popup.show(center, <ThemePopupContent key={helpers.getUID()} values={entries} popupLogoImage={this.props.config.popupLogoImage} layerConfig={this.props.layerConfig} />);
    helpers.zoomToFeature(feature);
    window.map.getView().setCenter(center);
    window.map.getView().setZoom(15);
  };

  // HANDLES TOGGLE LAYER CHANGES
  onLayerVisibilityChange = (layer) => {
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
          {this.state.features.map((feature) => (
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
import { createImagesObject } from "../../../../helpers/imageHelper";
const images = createImagesObject(
  import.meta.glob('./images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
);
