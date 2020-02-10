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
import { Image as ImageLayer } from "ol/layer.js";
import mainConfig from "../config.json";

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
    const layers = window.map.getLayers().getArray();
    let featureObjs = [];
    

    for (let index = 0; index < layers.length; index++) {
      if (layer.getVisible() && layer instanceof ImageLayer) {
        const name = layer.get("name");
        let displayName ="";// layer.get("displayName");
        let type = layer.get("displayName")
        // QUERY USING WMS
        var url = layer.getSource().getFeatureInfoUrl(geometry.flatCoordinates, window.map.getView().getResolution(), "EPSG:3857", { INFO_FORMAT: "application/json" });
        url += "&feature_count=1000000";
        if (url) {
          let featureObj = this.getFeatureObj(name,displayName,type,url);
          if (featureObjs.indexOf(featureObj) ===-1) featureObjs.push(featureObj);
        }
      }
    }
    this.getFeatures(featureObjs);
  };

  getFeatureObj = (name, displayName, type, url) => {
    let urlSearch = new URL(url);
    let featureObj = {
        name: name, 
        displayName:displayName, 
        type:type, 
        url: url,
        url_origin: urlSearch.origin + urlSearch.pathname,
        url_service: urlSearch.searchParams.get("SERVICE"),
        url_version: urlSearch.searchParams.get("VERSION"),
        url_request: urlSearch.searchParams.get("REQUEST"),
        url_format: urlSearch.searchParams.get("FORMAT"),
        url_transparent: urlSearch.searchParams.get("TRANSPARENT"),
        url_query_layers: urlSearch.searchParams.get("QUERY_LAYERS"),
        url_layers: urlSearch.searchParams.get("LAYERS"),
        url_info_format: urlSearch.searchParams.get("INFO_FORMAT"),
        url_i: urlSearch.searchParams.get("I"),
        url_j: urlSearch.searchParams.get("J"),
        url_crs: urlSearch.searchParams.get("CRS"),
        url_styles: urlSearch.searchParams.get("STYLES"),
        url_width: urlSearch.searchParams.get("WIDTH"),
        url_height: urlSearch.searchParams.get("HEIGHT"),
        url_bbox: urlSearch.searchParams.get("BBOX")};
      return featureObj;
  }
  getFeatures = (featureObjs) => {
    if (featureObjs.length > 0){
      let common_url = {};
      
      featureObjs.forEach(featureObj => {
        if (common_url.url_origin === undefined){
          common_url = {url_origin: featureObj.url_origin,
            url_service:  featureObj.url_service,
            url_version:  featureObj.url_version,
            url_request:  featureObj.url_request,
            url_format:  featureObj.url_format,
            url_transparent: featureObj.url_transparent ,
            url_query_layers: [],
            url_layers: [] ,
            url_info_format:  featureObj.url_info_format,
            url_i: featureObj.url_i ,
            url_j: featureObj.url_j ,
            url_crs:  featureObj.url_crs,
            url_styles: featureObj.url_styles ,
            url_width: featureObj.url_width ,
            url_height: featureObj.url_height ,
            url_bbox: featureObj.url_bbox };
        }
        if (common_url.url_origin === featureObj.url_origin 
            && common_url.url_service ===  featureObj.url_service
            && common_url.url_version===  featureObj.url_version
            && common_url.url_request===  featureObj.url_request
            && common_url.url_format=== featureObj.url_format
            && common_url.url_transparent=== featureObj.url_transparent 
            && common_url.url_layers.indexOf(featureObj.url_layers) === -1
            && common_url.url_info_format===  featureObj.url_info_format
            && common_url.url_i=== featureObj.url_i 
            && common_url.url_j===featureObj.url_j 
            && common_url.url_crs===  featureObj.url_crs
            && common_url.url_styles=== featureObj.url_styles 
            && common_url.url_width=== featureObj.url_width 
            && common_url.url_height=== featureObj.url_height 
            && common_url.url_bbox=== featureObj.url_bbox ){
              common_url.url_query_layers.push(featureObj.url_query_layers);
              common_url.url_layers.push(featureObj.url_layers);
              if (featureObjs.indexOf(featureObj) === (featureObjs.length -1) ) this.addFeatureInfo(common_url, featureObjs);
          }else{
              this.addFeatureInfo(common_url, featureObjs);
              common_url = {};
            }
      });
    }
    
    this.setState({ isLoading: false });
  }

  addFeatureInfo = (common_url, featureObjs) =>{
    let submitURL = new URL(common_url.url_origin);
    submitURL.searchParams.append("SERVICE",common_url.url_service );
    submitURL.searchParams.append("VERSION",common_url.url_version );
    submitURL.searchParams.append("REQUEST",common_url.url_request );
    submitURL.searchParams.append("FORMAT",common_url.url_format );
    submitURL.searchParams.append("TRANSPARENT",common_url.url_transparent );
    submitURL.searchParams.append("QUERY_LAYERS",common_url.url_query_layers.join(",") );
    submitURL.searchParams.append("LAYERS",common_url.url_layers.join(",") );
    submitURL.searchParams.append("INFO_FORMAT",common_url.url_info_format );
    submitURL.searchParams.append("I",common_url.url_i );
    submitURL.searchParams.append("J",common_url.url_j );
    submitURL.searchParams.append("CRS",common_url.url_crs );
    submitURL.searchParams.append("STYLES",common_url.url_styles );
    submitURL.searchParams.append("WIDTH",common_url.url_width );
    submitURL.searchParams.append("HEIGHT",common_url.url_height );
    submitURL.searchParams.append("BBOX",common_url.url_bbox );
    submitURL.searchParams.append("FEATURE_COUNT",1000000 );

    helpers.getJSON(submitURL, result => {
      const features = result.features;
      if (features.length === 0) {
        return;
      }
      const featureList = new GeoJSON().readFeatures(result);
      
      if (featureList.length > 0) {
        let layerList = [];
        featureObjs.forEach(featureObj =>{
          
          let filteredFeatureList = featureList.filter(f => {
                if (featureObj.name.indexOf(f.id_.split(".")[0]) !== -1) return f;
          });
          if (filteredFeatureList.length > 0) {
            if (featureObj.displayName === "" || featureObj.displayName === undefined) featureObj.displayName = this.getDisplayNameFromFeature(filteredFeatureList[0]);
            layerList.push({ name: featureObj.name, features: filteredFeatureList, displayName: featureObj.displayName, type: featureObj.type });
            
          }
        });
        if (layerList.length > 0) this.setState({ layers: layerList });
      }
    });
  }

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

    //console.log(displayName);
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
      <Collapsible trigger={layer.type} open={open}>
        <div className="sc-identify-layer-content-container">
          {props.layer.features.map(feature => (
            <FeatureItem
              key={helpers.getUID()}
              displayName={props.layer.displayName}
              feature={feature}
              onZoomClick={props.onZoomClick}
              onMouseEnter={props.onMouseEnter}
              onMouseLeave={props.onMouseLeave}
            ></FeatureItem>
          ))}
        </div>
      </Collapsible>
    </div>
  );
};

const FeatureItem = props => {
  const [open, setOpen] = useState(false);
  const { feature, displayName } = props;

  //console.log(feature);
  const featureProps = feature.getProperties();
  const keys = Object.keys(featureProps);
  const featureName =feature.get(displayName) ;
  return (
    <div>
      <div className="sc-identify-feature-header" onMouseEnter={() => props.onMouseEnter(feature)} onMouseLeave={props.onMouseLeave}>
        <div className="sc-fakeLink sc-identify-feature-header-label" onClick={() => setOpen(!open)}>
          {displayName + ": " + featureName}
        </div>
        <img className="sc-identify-feature-header-img" src={images["zoom-in.png"]} onClick={() => props.onZoomClick(feature)} alt="Zoom In"></img>
      </div>
      <div className={open ? "sc-identify-feature-content" : "sc-hidden"}>
        {keys.map((keyName, i) => {
          const val = featureProps[keyName];
          if (keyName !== "geometry" && keyName !== "geom" && typeof val !== "object") return <InfoRow key={helpers.getUID()} label={keyName} value={val}></InfoRow>;
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
