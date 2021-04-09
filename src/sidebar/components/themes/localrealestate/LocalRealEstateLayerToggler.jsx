import React, { Component } from "react";
import "./LocalRealEstateLayerToggler.css";
import * as helpers from "../../../../helpers/helpers";
import url from "url";
import GeoJSON from "ol/format/GeoJSON.js";
import { getCenter } from "ol/extent";
import { unByKey } from "ol/Observable.js";
import LocalRealEstatePopupContent from "./LocalRealEstatePopupContent.jsx";

class LocalRealEstateLayerToggler extends Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: props.layerConfig.visible,
      layer: this.initLayer(),
      styleUrl: null,
      recordCount: null
    };
  }

  handleUrlParameter = () => {
    if (this.props.layerConfig.UrlParameter === undefined) return;

    let urlParam = null;
    let query = null;
    this.props.layerConfig.UrlParameter.forEach((item) => {
      if (urlParam === null) urlParam = helpers.getURLParameter(item.parameterName);
      if (urlParam !== null) query = item.fieldName + "=" + urlParam;
    });
    
    if (urlParam === null) return;
    helpers.getWFSGeoJSON(
      this.props.layerConfig.serverUrl,
      this.props.layerConfig.layerName,
      result => {
        if (result.length === 0) return;

        const feature = result[0];
        const extent = feature.getGeometry().getExtent();
        const center = getCenter(extent);
        helpers.zoomToFeature(feature);
        window.popup.show(
          center,
          <LocalRealEstatePopupContent key={helpers.getUID()} feature={feature} photosUrl={this.props.photosUrl} onViewed={this.props.onViewed} />,
          this.props.layerConfig.displayName
        );
      },
      null,
      null,
      query
    );
  };

  initLayer = () => {
    // GET LAYER
    const layer = helpers.getImageWMSLayer(url.resolve(this.props.layerConfig.serverUrl, "wms"), this.props.layerConfig.layerName, "geoserver", null, 50);
    layer.setVisible(this.props.layerConfig.visible);
    layer.setZIndex(this.props.layerConfig.zIndex);
    layer.setProperties({ name: this.props.layerConfig.layerName, tocDisplayName: this.props.layerConfig.displayName, queryable:true, disableParcelClick: true });
    window.map.addLayer(layer);
    return layer;
  };

  componentDidMount() {
    // GET LEGEND
    const styleUrlTemplate = (serverURL, layerName, styleName) =>
      `${serverURL}/wms?REQUEST=GetLegendGraphic&VERSION=1.1&FORMAT=image/png&WIDTH=20&HEIGHT=20&TRANSPARENT=true&LAYER=${layerName}&STYLE=${styleName === undefined ? "" : styleName}`;
    const styleUrl = styleUrlTemplate(this.props.layerConfig.serverUrl, this.props.layerConfig.layerName, this.props.layerConfig.legendStyleName);
    this.setState({ styleUrl: styleUrl });

    // GET RECORD COUNT
    helpers.getWFSLayerRecordCount(this.props.layerConfig.serverUrl, this.props.layerConfig.layerName, count => {
      this.setState({ recordCount: count });
    });

    this.mapClickEvent = window.map.on("click", evt => {
      // DISABLE POPUPS
      if (window.isDrawingOrEditing || window.isCoordinateToolOpen || window.isMeasuring ) return;

      if (!this.state.visible) return;

      var viewResolution = window.map.getView().getResolution();
      var url = this.state.layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", { INFO_FORMAT: "application/json" });
      if (url) {
        helpers.getJSON(url, result => {
          const features = result.features;
          if (features.length === 0) {
            return;
          }

          const geoJSON = new GeoJSON().readFeatures(result);
          const feature = geoJSON[0];
          window.popup.show(
            evt.coordinate,
            <LocalRealEstatePopupContent key={helpers.getUID()} feature={feature} photosUrl={this.props.config.photosUrl} onViewed={this.props.onViewed} />,
            this.props.layerConfig.displayName
          );
        });
      }
    });

    // URL PARAMETERS
    this.handleUrlParameter();
  }

  onCheckboxChange = evt => {
    this.setState({ visible: evt.target.checked });
    this.state.layer.setVisible(evt.target.checked);
    this.props.onLayerVisiblityChange(this.props.layerConfig.displayName, evt.target.checked);
  };

  componentWillUnmount() {
    // CLEAN UP
    window.map.removeLayer(this.state.layer);
    unByKey(this.mapClickEvent);
  }

  render() {
    return (
      <div className="sc-theme-local-real-estate-layer-container">
        <div
          className={
            this.props.layerConfig.boxStyle === undefined || !this.props.layerConfig.boxStyle
              ? "sc-theme-local-real-estate-layer-toggler-symbol"
              : "sc-theme-local-real-estate-layer-toggler-symbol-with-box"
          }
        >
          <img src={this.state.styleUrl} alt="style" />
        </div>
        <div className={this.props.layerConfig.boxStyle === undefined || !this.props.layerConfig.boxStyle ? "" : "sc-theme-local-real-estate-layer-toggler-label-with-box-container"}>
          <label
            className={
              this.props.layerConfig.boxStyle === undefined || !this.props.layerConfig.boxStyle
                ? "sc-theme-local-real-estate-layer-toggler-label"
                : "sc-theme-local-real-estate-layer-toggler-label-with-box"
            }
          >
            <input type="checkbox" checked={this.state.visible} style={{ verticalAlign: "middle" }} onChange={this.onCheckboxChange} />
            {this.props.layerConfig.displayName}
          </label>
          <label
            className={
              this.props.layerConfig.boxStyle === undefined || !this.props.layerConfig.boxStyle
                ? "sc-theme-local-real-estate-layer-toggler-count"
                : "sc-theme-local-real-estate-layer-toggler-count-with-box"
            }
          >
            {" (" + this.state.recordCount + ")"}
          </label>
        </div>

        <div>{this.props.children}</div>
      </div>
    );
  }
}

export default LocalRealEstateLayerToggler;
