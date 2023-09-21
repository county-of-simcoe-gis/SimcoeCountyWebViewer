import React, { Component, useState, useEffect } from "react";
import "./Identify.css";
import * as helpers from "../helpers/helpers";
import { LayerHelpers, OL_LAYER_TYPES, OL_DATA_TYPES } from "../helpers/OLHelpers";
import Collapsible from "react-collapsible";
import { GeoJSON, EsriJSON } from "ol/format.js";
import Feature from "ol/Feature";
import { Vector as VectorSource } from "ol/source.js";
import VectorLayer from "ol/layer/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style.js";
import useIframeContentHeight from "../components/react-use-iframe-content-height";

class Identify extends Component {
  constructor(props) {
    super(props);
    this.state = {
      layers: [],
      isLoading: false,
      excludeIdentifyTitleName: false,
    };
    this.htmlIdentify = false;
    this.createShadowLayer();
  }

  componentDidMount() {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      this.wmsGeoJsonTemplate = window.config.wmsGeoJsonTemplate;
      this.htmlIdentify = window.config.htmlIdentify;
      this.setState({ excludeIdentifyTitleName: window.config.excludeIdentifyTitleName }, () => {
        this.refreshLayers(this.props);
      });
    });
  }

  componentWillReceiveProps(nextProps) {
    this.refreshLayers(nextProps);
  }

  componentWillUnmount() {
    window.map.removeLayer(this.vectorLayerShadow);
    window.map.removeLayer(this.vectorLayerShadowSecondary);
  }

  clearIdentify = () => {
    window.emitter.emit("clearIdentify");
  };

  refreshLayers = (props) => {
    this.setState({ layers: [], isLoading: true });

    const { geometry, layerFilter } = props;
    let layers = window.map.getLayers().getArray();
    if (layerFilter) layers = layers.filter((item) => item.get("displayName") === layerFilter);
    let layerList = [];

    for (let index = 0; index < layers.length; index++) {
      const layer = layers[index];
      if (layer.getVisible() || layerFilter) {
        const queryable = layer.get("queryable");
        if (queryable) {
          if (LayerHelpers.getLayerType(layer) !== OL_LAYER_TYPES.Vector) {
            const name = layer.get("name");
            let displayName = "";
            let type = layer.get("tocDisplayName");
            let wfsUrl = layer.get("wfsUrl");
            let attachmentUrl = layer.get("attachmentUrl");
            // https://maps2.simcoe.ca/arcgis/rest/services/OroMedonte/Oro_OperationalLayers_Dynamic/MapServer/74/queryAttachments?objectIds=56&globalIds=&definitionExpression=&attachmentsDefinitionExpression=&attachmentTypes=&size=&keywords=&resultOffset=&resultRecordCount=&returnUrl=true&f=pjson
            const secureKey = layer.get("secureKey");
            const minScale = layer.get("minScale");
            const hasAttachments = layer.get("hasAttachments");

            const params = {};
            params["headers"] = {};
            if (secureKey !== undefined) {
              const headers = {};
              headers[secureKey] = "GIS";
              params["mode"] = "cors";
              params.headers = headers;
            }
            const isArcGISLayer = LayerHelpers.getLayerSourceType(layer.getSource()) === OL_DATA_TYPES.ImageArcGISRest;
            if (wfsUrl !== undefined && (geometry.getType() !== "Point" || isArcGISLayer)) {
              const feature = new Feature(geometry);
              const wktString = helpers.getWKTStringFromFeature(feature);
              if (isArcGISLayer) {
                var esri = new EsriJSON();
                const esriFeature = esri.writeGeometry(geometry);
                const arcgisResolution = `${window.map.getSize()[0]},${window.map.getSize()[1]},96`;
                const extent = window.map.getView().calculateExtent();
                wfsUrl = wfsUrl
                  .replace("#GEOMETRY#", encodeURIComponent(esriFeature))
                  .replace("#GEOMETRYTYPE#", geometry.getType() !== "Point" ? "esriGeometryPolygon" : "esriGeometryPoint")
                  .replace("#TOLERANCE#", 3)
                  .replace("#EXTENT#", extent.join(","))
                  .replace("#RESOLUTION#", arcgisResolution);
              } else {
                if (geometry.getType() === "MultiPolygon") {
                  let intersectQuery = [];
                  geometry.getPolygons().forEach((poly) => {
                    const tmpFeature = new Feature(poly);
                    const tmpWKTString = helpers.getWKTStringFromFeature(tmpFeature);
                    intersectQuery.push("INTERSECTS(geom," + tmpWKTString + ")");
                  });
                  wfsUrl += intersectQuery.join(" OR ");
                } else {
                  wfsUrl += "INTERSECTS(geom," + wktString + ")";
                }
              }
              // QUERY USING WFS
              // eslint-disable-next-line
              if (wfsUrl.length > 8000) {
                helpers.showMessage("Geometry too complex", "The geometry you are trying to use is too complex to identify.", helpers.messageColors.red);
              } else {
                helpers.getJSONWithParams(wfsUrl, params, (result) => {
                  const featureList = isArcGISLayer ? LayerHelpers.parseESRIIdentify(result) : new GeoJSON().readFeatures(result);
                  if (featureList.length > 0) {
                    if (displayName === "" || displayName === undefined) displayName = this.getDisplayNameFromFeature(featureList[0]);
                    let features = [];
                    featureList.forEach((feature) => {
                      const keys = feature.getKeys();
                      const objectId = feature.get(keys.filter((item) => item.indexOf("OBJECTID") !== -1)[0]);
                      if (hasAttachments) feature.values_["attachmentUrl"] = attachmentUrl.replace("#OBJECTID#", objectId);
                      features.push(feature);
                    });
                    if (features.length > 0)
                      layerList.push({
                        name: name,
                        features: features,
                        displayName: displayName,
                        type: type,
                        minScale: minScale,
                      });
                    this.setState({ layers: layerList });
                  }
                });
              }
            } else {
              let infoFormat = layer.get("INFO_FORMAT");
              //console.log(infoFormat);
              // let infoFormat = "text/plain";
              // let xslTemplate = layer.get("XSL_TEMPLATE");
              let xslTemplate = this.wmsGeoJsonTemplate;
              // QUERY USING WMS
              let getInfoOption = { INFO_FORMAT: "application/json" };
              if (infoFormat !== undefined && infoFormat !== "") getInfoOption["INFO_FORMAT"] = infoFormat;
              if (xslTemplate !== undefined && xslTemplate !== "") getInfoOption["XSL_TEMPLATE"] = xslTemplate;
              //console.log(xslTemplate);
              var url = layer.getSource().getFeatureInfoUrl(geometry.flatCoordinates, window.map.getView().getResolution(), "EPSG:3857", getInfoOption);
              let html_url = this.htmlIdentify
                ? layer.getSource().getFeatureInfoUrl(geometry.flatCoordinates, window.map.getView().getResolution(), "EPSG:3857", { INFO_FORMAT: "text/html" }) + "&feature_count=1000000"
                : "";
              if (url) {
                url += "&feature_count=1000000";
                //console.log(url);
                params.headers["Content-Type"] = "application/text";
                helpers.httpGetTextWithParams(url, params, (result) => {
                  let tempResult = helpers.tryParseJSON(result);
                  //console.log(tempResult);
                  if (tempResult !== false) {
                    result = tempResult;
                  } else {
                    return;
                  }
                  //console.log(result);
                  const featureList = new GeoJSON().readFeatures(result);
                  if (featureList.length === 0) {
                    return;
                  } else if (featureList.length > 0) {
                    if (displayName === "" || displayName === undefined) displayName = this.getDisplayNameFromFeature(featureList[0]);
                    let features = [];
                    featureList.forEach((feature) => {
                      features.push(feature);
                    });
                    if (features.length > 0)
                      layerList.push({
                        name: name,
                        features: features,
                        displayName: displayName,
                        type: type,
                        html_url: html_url,
                        minScale: minScale,
                      });
                    this.setState({ layers: layerList });
                  }
                });
              }
            }
          } else {
            const name = layer.get("name");
            let displayName = "";
            let type = layer.get("tocDisplayName");
            const minScale = layer.get("minScale");
            const params = {};
            let featureList = [];
            let pixel = window.map.getPixelFromCoordinate(geometry.flatCoordinates);
            window.map.forEachFeatureAtPixel(pixel, (feature, layer) => {
              if (layer.get("name") !== undefined && layer.get("name") === name) featureList.push(feature);
            });

            if (featureList.length > 0) {
              if (displayName === "" || displayName === undefined) displayName = this.getDisplayNameFromFeature(featureList[0]);
              let features = [];
              featureList.forEach((feature) => {
                features.push(feature);
              });
              if (features.length > 0)
                layerList.push({
                  name: name,
                  features: features,
                  displayName: displayName,
                  type: type,
                  minScale: minScale,
                });
              this.setState({ layers: layerList });
            }
          }
        }
      }
    }

    this.setState({ isLoading: false });
  };

  onMouseEnter = (feature) => {
    if (feature.values_.geometry !== undefined && feature.values_.geometry !== null) {
      this.vectorLayerShadow.getSource().clear();
      this.vectorLayerShadowSecondary.getSource().clear();

      if (feature.values_.extent_geom !== undefined && feature.values_.extent_geom !== null) {
        var extentFeature = helpers.getFeatureFromGeoJSON(feature.values_.extent_geom);
        this.vectorLayerShadowSecondary.getSource().addFeature(extentFeature);
      }
      this.vectorLayerShadow.getSource().addFeature(feature);
    }
  };

  onMouseLeave = () => {
    this.vectorLayerShadow.getSource().clear();
    this.vectorLayerShadowSecondary.getSource().clear();
  };

  createShadowLayer = () => {
    const shadowStyle = new Style({
      stroke: new Stroke({
        color: [0, 255, 255, 0.3],
        width: 6,
      }),
      fill: new Fill({
        color: [0, 255, 255, 0.3],
      }),
      image: new CircleStyle({
        radius: 10,
        stroke: new Stroke({
          color: [0, 255, 255, 0.3],
          width: 6,
        }),
        fill: new Fill({
          color: [0, 255, 255, 0.3],
        }),
      }),
    });

    const shadowStyleSecondary = new Style({
      stroke: new Stroke({
        color: [0, 255, 68, 0.4],
        width: 4,
      }),
      fill: new Fill({
        color: [255, 0, 0, 0],
      }),
      image: new CircleStyle({
        radius: 10,
        stroke: new Stroke({
          color: [0, 255, 68, 0.4],
          width: 4,
        }),
        fill: new Fill({
          color: [255, 0, 0, 0],
        }),
      }),
    });
    this.vectorLayerShadow = new VectorLayer({
      source: new VectorSource({
        features: [],
      }),
      zIndex: 100000,
      style: shadowStyle,
    });
    this.vectorLayerShadowSecondary = new VectorLayer({
      source: new VectorSource({
        features: [],
      }),
      zIndex: 100000,
      style: shadowStyleSecondary,
    });
    window.map.addLayer(this.vectorLayerShadow);
    window.map.addLayer(this.vectorLayerShadowSecondary);
  };

  getDisplayNameFromFeature = (feature) => {
    // LOOK FOR EXISTING FIELDS
    const nameFields = ["name", "display_name", "Name", "Display Name"];
    let displayName = "";
    const displayFieldName = feature.get("displayFieldName");
    if (displayFieldName !== undefined && displayFieldName !== null) nameFields.push(displayFieldName);
    nameFields.forEach((fieldName) => {
      if (fieldName.substring(0, 1) !== "_") {
        const name = feature.get(fieldName);
        if (name !== undefined) {
          displayName = fieldName;
          return displayName;
        }
      }
    });

    // FIND FIRST STRING FIELD
    if (displayName === "") {
      for (const [fieldName, value] of Object.entries(feature.values_)) {
        if (fieldName.substring(0, 1) !== "_") {
          if (typeof value === "string" || value instanceof String) {
            displayName = fieldName;
            return displayName;
          }
        }
      }
    }

    //console.log(displayName);
    // STILL NOTHING, SO TAKE FIRST FIELD
    if (displayName === "") displayName = Object.keys(feature.values_)[0];

    return displayName;
  };

  onZoomClick = (feature) => {
    helpers.zoomToFeature(feature);
  };

  render() {
    return (
      <div>
        <button className="sc-button sc-identify-clear-button" onClick={this.clearIdentify}>
          Clear Results
        </button>
        <div className={this.state.layers.length === 0 && !this.state.isLoading ? "sc-identify-loading" : "sc-hidden"}>
          No Features were selected. Please try again.
          {/* <img src={images["loading.gif"]}></img> */}
        </div>
        <div className={this.state.isLoading ? "sc-identify-loading" : "sc-hidden"}>
          <img src={images["loading.gif"]} alt="Loading" />
        </div>
        <div className={this.state.layers.length === 0 ? "sc-hidden" : "sc-identify-container"}>
          {this.state.layers.map((layer) => (
            <Layer key={helpers.getUID()} layer={layer} expanded={this.state.layers.length <= 5} onZoomClick={this.onZoomClick} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} />
          ))}
        </div>
      </div>
    );
  }
}

export default Identify;

function _getLayerObj(layerName, callback = undefined) {
  let data = {};
  window.emitter.emit("getLayerList", (groups) => {
    Object.entries(groups).forEach((row) => {
      const layerItems = row[1];
      layerItems.forEach((layer) => {
        if (layer.name !== undefined && layer.name.toLowerCase() === layerName.toLowerCase()) data = layer;
      });
    });

    if (callback !== undefined) {
      callback(data);
    } else {
      return data;
    }
  });
}

const onExportClick = (title, data) => {
  var fields = helpers.FilterKeys(data[0]);
  var headers = fields.map((field) => `"${field}"`).join(",");
  var csv = data.map(function (row) {
    return fields
      .map(function (fieldName) {
        return row.values_[fieldName] === null ? "" : `"${row.values_[fieldName]}"`;
      })
      .join(",");
  });
  csv.unshift(headers); // add header column
  csv = csv.join("\r\n");
  console.log(csv);
  csv = csv.replaceAll("#", "Number");
  let csvContent = "data:text/csv;charset=utf-8," + csv;
  console.log(csvContent);
  var encodedUri = encodeURI(csvContent);
  console.log(encodedUri);
  helpers.download(encodedUri, `${title} export.csv`);
};

const Layer = (props) => {
  const [open, setOpen] = useState(props.expanded !== undefined ? props.expanded : true);

  const { layer } = props;

  //console.log(layer);
  let layerObj = {};
  //layerObj = _getLayerObj(layer.name);
  _getLayerObj(layer.name, (returnData) => {
    layerObj = returnData;
  });
  return (
    <div id="sc-identify-layer-container">
      <div className={"sc-identify-content-count"}>{props.layer.features.length}</div>
      <Collapsible trigger={layer.type} open={open}>
        <div className={props.layer.features.length > 1 && window.config.allowIdentifyExport ? "sc-identify-export-csv" : "sc-hidden"}>
          [&nbsp;
          <span className="sc-fakeLink " onClick={() => onExportClick(layer.type, props.layer.features)}>
            Export to csv
          </span>
          &nbsp;]
        </div>
        <div className="sc-identify-layer-content-container">
          {props.layer.features.map((feature) => (
            <FeatureItem
              key={helpers.getUID()}
              displayName={layer.displayName}
              identifyTitleColumn={layerObj !== undefined ? layerObj.identifyTitleColumn : ""}
              identifyIdColumn={layerObj !== undefined ? layerObj.identifyIdColumn : ""}
              feature={feature}
              html_url={layer.html_url}
              onZoomClick={props.onZoomClick}
              onMouseEnter={props.onMouseEnter}
              onMouseLeave={props.onMouseLeave}
              minScale={layer.minScale !== undefined ? layer.minScale : 0}
              layerName={props.layer.name}
            />
          ))}
        </div>
      </Collapsible>
    </div>
  );
};

const IFrame = (props) => {
  let src = props.src;
  const [iframeRef, iframeHeight] = useIframeContentHeight();
  if (props.filter === "") {
    return "";
  } else {
    src += "&CQL_FILTER=" + props.filter;
  }

  return (
    <div className="sc-identiy-feature-iframe">
      <iframe key={helpers.getUID()} title={helpers.getUID()} ref={iframeRef} height={iframeHeight} src={src} />
    </div>
  );
};

const FeatureItem = (props) => {
  const [open, setOpen] = useState(false);
  const [excludeIdentifyTitleName, setExcludeIdentifyTitleName] = useState(false);
  let { feature, displayName, html_url, identifyTitleColumn, identifyIdColumn } = props;

  const onMyMapsClick = (feature, featureName) => {
    window.emitter.emit("addMyMapsFeature", feature, featureName);
  };
  useEffect(() => {
    helpers.waitForLoad("settings", Date.now(), 30, () => setExcludeIdentifyTitleName(window.config.excludeIdentifyTitleName));
  }, []);

  if (identifyTitleColumn !== undefined && identifyTitleColumn !== "") displayName = identifyTitleColumn;

  //console.log(feature);
  var hasGeom = feature.values_.geometry !== undefined && feature.values_.geometry !== null;
  var extentFeature = undefined;
  if (feature.values_.extent_geom !== undefined && feature.values_.extent_geom !== null) {
    extentFeature = helpers.getFeatureFromGeoJSON(feature.values_.extent_geom);
  }
  feature["minScale"] = props.minScale;
  const featureProps = feature.getProperties();
  const keys = Object.keys(featureProps);
  let featureName = feature.get(displayName);

  let layerName = props.layerName;
  if (layerName.split(":").length > 1) {
    layerName = layerName.split(":")[1];
    layerName = helpers.replaceAllInString(layerName, "_", " ");
  }
  //HANDLE ARCGIS FEATURE TITLE
  let displayFieldName = feature.get("displayFieldName");
  if (displayFieldName !== undefined && displayFieldName !== "") {
    displayName = displayFieldName;
    let displayFieldValue = feature.get("displayFieldValue");
    if (displayFieldValue !== undefined && displayFieldValue !== "") featureName = displayFieldValue;
  }
  // THIS IS FALLBACK IN CASE THERE ARE NO ATTRIBUTES EXCEPT GEOMETRY
  if (displayName === "geometry") {
    if (keys.length === 1) displayName = "No attributes found";
    featureName = "";
  }
  if (featureName === null || featureName === undefined || featureName === "") featureName = "N/A";
  let cql_filter = "";

  let isSameOrigin = true;
  if (html_url !== undefined) isSameOrigin = html_url.toLowerCase().indexOf(window.location.origin.toLowerCase()) !== -1;

  keys
    .filter((keyName) => {
      const val = featureProps[keyName];
      if (identifyIdColumn !== undefined && identifyIdColumn !== "" && keyName.substring(0, 1) !== "_") {
        if (cql_filter === "" && keyName.toLowerCase().indexOf(identifyIdColumn.toLowerCase()) !== -1 && val !== null && this.htmlIdentify && isSameOrigin) return true;
        else return false;
      } else return false;
    })
    .map((keyName) => (cql_filter += keyName + "=" + featureProps[keyName]));
  return (
    <div>
      <div className="sc-identify-feature-header" onMouseEnter={() => props.onMouseEnter(feature)} onMouseLeave={props.onMouseLeave}>
        <div className="sc-fakeLink sc-identify-feature-header-label" onClick={() => setOpen(!open)}>
          {excludeIdentifyTitleName ? featureName : `${helpers.formatTitleCase(displayName)}: ${featureName}`}
        </div>
        {hasGeom ? <img className="sc-identify-feature-header-img" src={images["zoom-in.png"]} onClick={() => props.onZoomClick(feature)} title="Zoom In" alt="Zoom In" /> : ""}
        {extentFeature !== undefined ? (
          <img className="sc-identify-feature-header-img" src={images["extent-zoom-in.png"]} onClick={() => props.onZoomClick(extentFeature)} title="Zoom In To Extent" alt="Zoom In To Extent" />
        ) : (
          ""
        )}
        <div className={"sc-identify-add-my-map"}>
          [&nbsp;
          <span className="sc-fakeLink " onClick={() => onMyMapsClick(feature, featureName)}>
            Add to My Maps
          </span>
          &nbsp;]
        </div>
      </div>
      <div className={open ? "sc-identify-feature-content" : "sc-hidden"}>
        <IFrame key={helpers.getUID()} src={html_url} filter={cql_filter} />
        {cql_filter === "" ? helpers.FeatureContent({ feature: feature }) : ""}
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
