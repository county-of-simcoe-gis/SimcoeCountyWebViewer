import React, { Component } from "react";
import * as helpers from "../../../../helpers/helpers";
import Collapsible from "react-collapsible";
import url from "url";
import ThemePopupContent from "../themeComponents/ThemePopupContent.jsx";
import GeoJSON from "ol/format/GeoJSON.js";
import { unByKey } from "ol/Observable.js";
import { Fill, Icon, Stroke, Style, Circle as CircleStyle } from "ol/style.js";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source.js";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString.js";

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}

class Five11LayerToggler extends Component {
  constructor(props) {
    super(props);
    this._loaded = false;
    // STYLES
    this.styles = {
      lineJamLayer: new Style({
        stroke: new Stroke({
          color: "#ff0000",
          width: 4,
        }),
      }),
      lineIrregularityLayer: new Style({
        stroke: new Stroke({
          color: "#ff0000",
          width: 4,
        }),
      }),
      iconLayer: new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: images[this.props.layer.imageName],
        }),
      }),
    };

    this.state = {
      layerVisible: this.props.layer.visible,
      panelOpen: this.props.layer.expanded,
      layer: this.initLayer(),
      styleUrl: "",
      recordCount: 0,
    };
  }

  componentDidMount() {
    this._loaded = true;
  }

  componentWillUnmount() {
    this._loaded = false;

    // CLEAN UP
    window.map.removeLayer(this.state.layer);
    unByKey(this.mapClickEvent);
  }

  // GET LAYER
  initLayer = () => {
    const layer = new VectorLayer({
      source: new VectorSource({
        features: [],
      }),
      zIndex: 1000,
      projection: "EPSG:3857",
      dataProjection: "EPSG:3857",
    });
    layer.setVisible(this.props.layer.visible);
    layer.setZIndex(this.props.layer.zIndex);

    layer.setProperties({
      name: this.props.layer.layerName,
      tocDisplayName: this.props.layer.displayName,
      disableParcelClick: true,
      queryable: true,
    });

    helpers.getJSON(this.props.layer.apiUrl, (result) => {
      if (Array.isArray(result)) return;

      const geoJSON = new GeoJSON().readFeatures(result, {
        dataProjection: "EPSG:3857",
        featureProjection: "EPSG:3857",
      });
      if (geoJSON.length === 0) return;

      if (this.props.layer.layerName === "511-waze-irregularity-lines") layer.setStyle(this.styles["lineIrregularityLayer"]);
      else if (this.props.layer.layerName === "511-waze-jam-lines") layer.setStyle(this.styles["lineJamLayer"]);
      else layer.setStyle(this.styles["iconLayer"]);

      // CONVERT TO WEB MERCATOR
      geoJSON.forEach((feature) => {
        feature.setGeometry(feature.getGeometry().transform("EPSG:4326", "EPSG:3857"));
      });
      layer.getSource().addFeatures(geoJSON);
      this.setState({ recordCount: geoJSON.length });
      if (this._loaded) window.map.addLayer(layer);
    });

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

  render() {
    return (
      <div>
        <Header
          layer={this.props.layer}
          onCheckboxClick={this.onCheckboxClick}
          layerVisible={this.state.layerVisible}
          image={images[this.props.layer.imageName]}
          recordCount={this.state.recordCount}
        ></Header>
      </div>
    );
  }
}

export default Five11LayerToggler;

// HEADER TRIGGER
const Header = (props) => {
  var centerClassName = "sc-511-center";
  var chechboxClassName = "sc-511-checkbox";
  if (props.layer.layerName.indexOf("511-waze-irregularity-lines") !== -1 || props.layer.layerName.indexOf("511-waze-jam-lines") !== -1) {
    centerClassName = "sc-511-center-waze-lines";
    chechboxClassName = "sc-511-checkbox-waze-lines";
  }

  return (
    <div className="sc-511-layer-header">
      <div className={centerClassName}>
        <img src={props.image} alt="legend" />
        <input className={chechboxClassName} type="checkbox" onClick={props.onCheckboxClick} checked={props.layerVisible} readOnly />
        <label className="sc-511-layer-label" onClick={props.onCheckboxClick}>
          {props.layer.displayName}
        </label>
        <label className="sc-511-layer-count">{"(" + props.recordCount + ")"}</label>
      </div>
    </div>
  );
};
