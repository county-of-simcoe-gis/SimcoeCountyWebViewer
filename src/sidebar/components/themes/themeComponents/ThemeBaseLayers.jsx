import React, { Component } from "react";
import "./ThemeBaseLayers.css";
import * as helpers from "../../../../helpers/helpers";
import ThemePopupContent from "./ThemePopupContent.jsx";
import url from "url";
import Slider from "rc-slider";
import GeoJSON from "ol/format/GeoJSON.js";
import { unByKey } from "ol/Observable.js";

class ThemeBaseLayers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      layers: [],
      visible: this.props.config.baseLayers.defaultVisibility,
      sliderValue: this.props.config.baseLayers.opacity,
      sliderMin: 0,
      sliderMax: 1,
      legendImageName: this.props.config.baseLayers.legendImageName,
    };
  }

  componentDidMount() {
    this.getLayers();

    this.mapClickEvent = window.map.on("click", (evt) => {
      console.log(this.state.visible);
      if (window.isDrawingOrEditing || !this.state.visible) return;

      var viewResolution = window.map.getView().getResolution();
      this.state.layers.forEach((layer) => {
        if (!layer.getProperties().clickable) return;

        var url = layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", { INFO_FORMAT: "application/json" });
        if (url) {
          helpers.getJSON(url, (result) => {
            const features = result.features;
            if (features.length === 0) {
              return;
            }

            const geoJSON = new GeoJSON().readFeatures(result);
            const feature = geoJSON[0];

            const entries = Object.entries(feature.getProperties());
            const layerName = layer.getProperties().name;
            const layerConfig = this.getLayerConfigByName(layerName);
            console.log("showing");
            window.popup.show(
              evt.coordinate,
              <ThemePopupContent key={helpers.getUID()} values={entries} popupLogoImage={this.props.config.popupLogoImage} layerConfig={layerConfig} />,
              layer.getProperties().name
            );
          });
        }
      });
    });
  }

  getLayerConfigByName = (name) => {
    let config = {};
    this.props.config.baseLayers.layers.forEach((layerConfig) => {
      //console.log(name);
      //console.log(layerConfig.displayName);
      if (layerConfig.displayName === name) {
        config = layerConfig;
        return;
      }
    });
    return config;
  };

  getLayers = () => {
    let layers = [];
    this.props.config.baseLayers.layers.forEach((layerObj) => {
      const layer = helpers.getImageWMSLayer(url.resolve(layerObj.serverUrl, "wms"), layerObj.layerName, "geoserver", null, 50);
      layer.setVisible(this.state.visible);
      layer.setOpacity(this.state.sliderValue);
      layer.setZIndex(this.props.config.baseLayers.zIndex);
      layer.setProperties({ name: layerObj.displayName, clickable: layerObj.clickable, disableParcelClick: layerObj.clickable });
      window.map.addLayer(layer);
      layers.push(layer);
    });

    this.setState({ layers: layers });
  };

  onCheckboxChange = (evt) => {
    this.setState({ visible: evt.target.checked });

    this.state.layers.forEach((layer) => {
      layer.setVisible(evt.target.checked);
    });
  };

  // SLIDER CHANGE EVENT
  onSliderChange = (value) => {
    this.state.layers.forEach((layer) => {
      layer.setOpacity(value);
    });

    this.setState({ sliderValue: value });
  };

  componentWillUnmount() {
    // REMOVE THE LAYERS
    this.state.layers.forEach((layer) => {
      window.map.removeLayer(layer);
    });

    // REMOVE EVENT
    unByKey(this.mapClickEvent);
  }

  render() {
    // MARKS FOR SLIDER
    const marks = {
      "0": {
        style: {
          fontSize: "7pt",
        },
        label: <div>0</div>,
      },
      1: {
        style: {
          fontSize: "7pt",
        },
        label: <div>100</div>,
      },
    };

    //

    return (
      <div className={this.props.config.baseLayers.layers.length > 0 ? "sc-base-layers-container" : "sc-hidden"}>
        <div className="sc-title sc-underline" style={{ marginLeft: "7px" }}>
          BASE DATA
        </div>
        <div className="sc-base-layers-controls">
          <label className="sc-base-layers-label">
            <input type="checkbox" checked={this.state.visible} style={{ verticalAlign: "middle" }} onChange={this.onCheckboxChange} />
            Turn on/off theme base data
          </label>
          <div className="sc-base-layers-slider-container">
            <Slider
              included={false}
              //style={sliderWrapperStyle}
              marks={marks}
              vertical={false}
              max={this.state.sliderMax}
              min={this.state.sliderMin}
              step={0.01}
              defaultValue={this.state.sliderValue}
              onChange={this.onSliderChange}
              value={this.state.sliderValue}
            />
            <span className="sc-base-layers-transparency">Transparency</span>
          </div>
        </div>
        <div className={this.state.legendImageName === undefined ? "sc-hidden" : "sc-base-layers-legend sc-container"}>
          <img className="sc-base-layers-legend-img" src={images[this.state.legendImageName]} alt="legend" />
        </div>
      </div>
    );
  }
}

export default ThemeBaseLayers;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
