import React, { Component, useState } from "react";
import "./Identify.css";
import * as helpers from "../helpers/helpers";
import Collapsible from "react-collapsible";
import WKT from "ol/format/WKT.js";
import { GeoJSON } from "ol/format.js";
import InfoRow from "../helpers/InfoRow.jsx";
import { Vector as VectorSource } from "ol/source.js";
import VectorLayer from "ol/layer/Vector";
import { Circle as CircleStyle, Icon, Fill, Stroke, Style } from "ol/style.js";

class Identify extends Component {
  constructor(props) {
    super(props);
    this.state = {
      layers: [],
      isLoading: false
    };

    this.createShadowLayer();
  }

  componentDidMount() {
    this.refreshLayers(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.refreshLayers(nextProps);
  }

  componentWillUnmount() {
    window.map.removeLayer(this.vectorLayerShadow);
  }

  refreshLayers = props => {
    this.setState({ layers: [], isLoading: true });

    const { geometry } = props;
    const wktGeometry = new WKT().writeGeometry(geometry);

    const layers = window.map.getLayers().getArray();

    let layerList = [];
    for (let index = 0; index < layers.length; index++) {
      const layer = layers[index];
      if (layer.getVisible() && layer.get("wfsUrl") !== undefined) {
        const name = layer.get("name");
        const wfsUrl = layer.get("wfsUrl");
        let displayName = layer.get("displayName");

        if (name !== null && wfsUrl !== null) {
          let features = [];

          let wfsUrlTemplate = (baseWfs, geometry) => `${baseWfs}INTERSECTS(geom,${geometry})`;

          // ADD A SMAL BUFFER TO PICK UP POINTS
          const scale = helpers.getMapScale();
          if (scale < 20000) wfsUrlTemplate = (baseWfs, geometry) => `${baseWfs}DWITHIN(geom,${geometry}, 15,meters)`;
          // if (helpers.getMapScale() > 2000) wfsUrlTemplate = (baseWfs, geometry) => `${baseWfs}DWITHIN(geom,${geometry}, 30,meters)`;
          // else if (helpers.getMapScale() > 40000) wfsUrlTemplate = (baseWfs, geometry) => `${baseWfs}DWITHIN(geom,${geometry}, 10000,meters)`;

          const wfsUrlQuery = wfsUrlTemplate(wfsUrl, wktGeometry);
          helpers.getJSON(wfsUrlQuery, result => {
            const featureList = new GeoJSON().readFeatures(result);
            if (featureList.length > 0) {
              if (displayName === "" || displayName === undefined) displayName = this.getDisplayNameFromFeature(featureList[0]);
              featureList.forEach(feature => {
                features.push(feature);
              });
              if (features.length > 0) layerList.push({ name: name, features: features, displayName: displayName });
              this.setState({ layers: layerList });
            }
          });
        }
      }
    }

    this.setState({ isLoading: false });
  };

  onMouseEnter = feature => {
    this.vectorLayerShadow.getSource().clear();
    this.vectorLayerShadow.getSource().addFeature(feature);
  };

  onMouseLeave = () => {
    this.vectorLayerShadow.getSource().clear();
  };

  createShadowLayer = () => {
    const shadowStyle = new Style({
      stroke: new Stroke({
        color: [0, 255, 255, 0.3],
        width: 6
      }),
      fill: new Fill({
        color: [0, 255, 255, 0.3]
      }),
      image: new CircleStyle({
        radius: 10,
        stroke: new Stroke({
          color: [0, 255, 255, 0.3],
          width: 6
        }),
        fill: new Fill({
          color: [0, 255, 255, 0.3]
        })
      })
    });

    this.vectorLayerShadow = new VectorLayer({
      source: new VectorSource({
        features: []
      }),
      zIndex: 100000,
      style: shadowStyle
    });
    window.map.addLayer(this.vectorLayerShadow);
  };

  getDisplayNameFromFeature = feature => {
    // LOOK FOR EXISTING FIELDS
    const nameFields = ["name", "display_name", "Name", "Display Name"];
    let displayName = "";
    nameFields.forEach(fieldName => {
      const name = feature.get(fieldName);
      if (name !== undefined) {
        displayName = fieldName;
        return displayName;
      }
    });

    // FIND FIRST STRING FIELD
    if (displayName === "") {
      for (const [fieldName, value] of Object.entries(feature.values_)) {
        if (typeof value === "string" || value instanceof String) {
          displayName = fieldName;
          return displayName;
        }
      }
    }

    console.log(displayName);
    // STILL NOTHING, SO TAKE FIRST FIELD
    if (displayName === "") displayName = Object.keys(feature.values_)[0];

    return displayName;
  };

  onZoomClick = feature => {
    helpers.zoomToFeature(feature);
  };

  render() {
    return (
      
      <div>
        <div className={this.state.layers.length === 0 && !this.state.isLoading ? "sc-identify-loading" : "sc-hidden"}>
          No Features were selected. Please try again.
          {/* <img src={images["loading.gif"]}></img> */}
        </div>
        <div className={this.state.isLoading ? "sc-identify-loading" : "sc-hidden"}>
          <img src={images["loading.gif"]} alt="Loading"></img>
        </div>
        <div className={this.state.layers.length === 0 ? "sc-hidden" : "sc-identify-container"}>
          {this.state.layers.map(layer => (
            <Layer key={helpers.getUID()} layer={layer} onZoomClick={this.onZoomClick} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}></Layer>
          ))}
        </div>
      </div>
    );
  }
}
export default Identify;

const Layer = props => {
  const [open, setOpen] = useState(true);

  const { layer } = props;

  return (
    <div id="sc-identify-layer-container">
      <Collapsible trigger={layer.name} open={open}>
        <div className="sc-identify-layer-content-container">
          {props.layer.features.map(feature => (
            <FeatureItem key={helpers.getUID()} displayName={props.layer.displayName} feature={feature} onZoomClick={props.onZoomClick} onMouseEnter={props.onMouseEnter} onMouseLeave={props.onMouseLeave}></FeatureItem>
          ))}
        </div>
      </Collapsible>
    </div>
  );
};

const FeatureItem = props => {
  const [open, setOpen] = useState(false);
  const { feature, displayName } = props;

  const featureProps = feature.getProperties();
  const keys = Object.keys(featureProps);

  return (
    <div>
      <div className="sc-identify-feature-header" onMouseEnter={() => props.onMouseEnter(feature)} onMouseLeave={props.onMouseLeave}>
        <div className="sc-fakeLink sc-identify-feature-header-label" onClick={() => setOpen(!open)}>
          {displayName + ": " + feature.get(displayName)}
        </div>
        <img className="sc-identify-feature-header-img" src={images["zoom-in.png"]} onClick={() => props.onZoomClick(feature)} alt="Zoom In"></img>
      </div>
      <div className={open ? "sc-identify-feature-content" : "sc-hidden"}>
        {Object.keys(featureProps).map((keyName, i) => {
          const val = featureProps[keyName];
          if (keyName !== "geometry" && keyName !== "geom") return <InfoRow key={helpers.getUID()} label={keyName} value={val}></InfoRow>;
          // <div key={helpers.getUID()}>TEST</div>
        })}
      </div>
    </div>
  );
};

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
