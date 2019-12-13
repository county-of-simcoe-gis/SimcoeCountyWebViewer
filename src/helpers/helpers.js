// REACT
import React from "react";
import ReactDOM from "react-dom";

// OPEN LAYERS
import Feature from "ol/Feature";
import * as ol from "ol";
import { Image as ImageLayer } from "ol/layer.js";
import ImageWMS from "ol/source/ImageWMS.js";
import { GeoJSON } from "ol/format.js";
import { OSM, TileArcGISRest, TileImage, Vector as VectorSource } from "ol/source.js";
import TileLayer from "ol/layer/Tile.js";
import TileGrid from "ol/tilegrid/TileGrid.js";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import Vector from "ol/source/Vector";
import { getTopLeft } from "ol/extent.js";
import { easeOut } from "ol/easing";
import { Fill, Stroke, Style, Circle as CircleStyle, Text as TextStyle } from "ol/style";
import XYZ from "ol/source/XYZ.js";
import { unByKey } from "ol/Observable.js";
import WKT from "ol/format/WKT.js";
import { transform } from "ol/proj.js";
import Projection from "ol/proj/Projection.js";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import { fromLonLat } from "ol/proj";
import { getVectorContext } from "ol/render";

//OTHER
import { parseString } from "xml2js";
import shortid from "shortid";
import ShowMessage from "./ShowMessage.jsx";
import URLWindow from "./URLWindow.jsx";
import mainConfig from "../config.json";
import { InfoRow } from "./InfoRow.jsx";

// REGISTER CUSTOM PROJECTIONS
proj4.defs([["EPSG:26917", "+proj=utm +zone=17 +ellps=GRS80 +datum=NAD83 +units=m +no_defs "]]);
register(proj4);

// UTM NAD 83
const _nad83Proj = new Projection({
  code: "EPSG:26917",
  extent: [194772.8107, 2657478.7094, 805227.1893, 9217519.4415]
});

// APP STAT
export function addAppStat(type, description) {
  if (mainConfig.includeAppStats === false) return;

  // IGNORE LOCAL HOST DEV
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return;

  const appStatsTemplate = (type, description) => `${mainConfig.appStatsUrl}opengis/${type}/${description}`;

  httpGetText(appStatsTemplate(type, description));
}

// GLOW CONTAINER
export function glowContainer(id, color = "blue") {
  const elem = document.getElementById(id);
  if (elem === undefined) return;

  const className = "sc-glow-container-" + color;
  elem.classList.add(className);
  setTimeout(function() {
    elem.classList.remove(className);
  }, 1000);
}

// MOBILE VIEW
export function isMobile() {
  if (window.innerWidth < 770) return true;
  else return false;
}

// SHOW URL WINDOW
export function showURLWindow(url, showFooter = false, mode = "normal") {
  ReactDOM.render(<URLWindow key={shortid.generate()} mode={mode} showFooter={showFooter} url={url} />, document.getElementById("map-modal-window"));
}

// GET ARCGIS TILED LAYER
export function getArcGISTiledLayer(url) {
  return new TileLayer({
    source: new TileArcGISRest({
      url: url,
      crossOrigin: "anonymous"
    }),
    crossOrigin: "anonymous"
  });
}

export function getESRITileXYZLayer(url) {
  return new TileLayer({
    source: new XYZ({
      attributions: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer">ArcGIS</a>',
      url: url + "/tile/{z}/{y}/{x}",
      crossOrigin: "anonymous"
    }) //,
    //crossOrigin: "anonymous"
  });
}

export function getOSMTileXYZLayer(url) {
  return new TileLayer({
    source: new OSM({ url: url + "/{z}/{x}/{y}.png" }),
    crossOrigin: "anonymous"
  });
}

export function getSimcoeTileXYZLayer(url) {
  const resolutions = [
    305.74811314055756,
    152.87405657041106,
    76.43702828507324,
    38.21851414253662,
    19.10925707126831,
    9.554628535634155,
    4.77731426794937,
    2.388657133974685,
    1.1943285668550503,
    0.5971642835598172,
    0.29858214164761665,
    0.1492252984505969
  ];
  const projExtent = window.map
    .getView()
    .getProjection()
    .getExtent();
  var tileGrid = new TileGrid({
    resolutions: resolutions,
    tileSize: [256, 256],
    origin: getTopLeft(projExtent)
    //origin: [-20037500.342787,20037378.342787 ]
    // origin: [-20037508.342787,20037508.342787 ]
  });

  var source = new TileImage({
    tileUrlFunction: function(tileCoord, pixelRatio, projection) {
      if (tileCoord === null) return undefined;

      const z = tileCoord[0];
      const x = tileCoord[1];
      const y = tileCoord[2];

      //if ( z < 17 || x < 0 || y < 0) return undefined;

      return url + "/tile/" + z + "/" + y + "/" + x;
    },
    tileGrid: tileGrid,
    crossOrigin: "anonymous"
  });
  source.on("tileloaderror", function() {});

  return new TileLayer({
    projection: "EPSG:4326",
    //projection: 'EPSG:3857',
    //matrixSet: 'EPSG:3857',
    source: source,
    maxResolution: 400,
    useInterimTiles: true
  });
}

// GET OPEN STREET MAP LAYER
export function getOSMLayer() {
  return new TileLayer({
    source: new OSM(),
    crossOrigin: "anonymous"
  });
}

// GET WMS Image Layer
export function getImageWMSLayer(serverURL, layers, serverType = "geoserver", cqlFilter = null, zIndex = null, disableParcelClick = null) {
  let imageLayer = new ImageLayer({
    visible: false,
    zIndex: zIndex,
    source: new ImageWMS({
      url: serverURL,
      params: { LAYERS: layers, cql_filter: cqlFilter },
      ratio: 1,
      serverType: serverType,
      crossOrigin: "anonymous"
    })
  });

  const wfsUrlTemplate = (serverUrl, layer) => `${serverUrl}/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layer}&outputFormat=application/json&cql_filter=`;
  const wfsUrl = wfsUrlTemplate(serverURL.replace("/wms", ""), layers);

  const workspace = layers.split(":")[0];
  const layerNameOnly = layers.split(":")[1];
  const rootInfoTemplate = (serverUrl, workspace, layerNameOnly) => `${serverUrl}/rest/workspaces/${workspace}/layers/${layerNameOnly}.json`;
  const rootInfoUrl = rootInfoTemplate(serverURL.replace("/wms", ""), workspace, layerNameOnly);

  //if (layerNameOnly === "Assessment Parcel") disableParcelClick = false;

  imageLayer.setProperties({ wfsUrl: wfsUrl, name: layerNameOnly, rootInfoUrl: rootInfoUrl, disableParcelClick: disableParcelClick });
  return imageLayer;
}
// GET CURRENT MAP SCALE
export function getMapScale() {
  const DOTS_PER_INCH = 96;
  const INCHES_PER_METER = 39.37;
  var resolution = window.map.getView().getResolution();
  var projection = window.map.getView().getProjection();
  const pointResolution = projection.getMetersPerUnit() * resolution;
  return Math.round(pointResolution * DOTS_PER_INCH * INCHES_PER_METER);
}

// SHOW MESSAGE
export function showMessage(title = "Info", messageText = "Message", color = "green", timeout = 2000) {
  const domId = "sc-show-message-content";
  var existingMsg = document.getElementById(domId);
  if (existingMsg !== undefined && existingMsg !== null) existingMsg.remove();

  const message = ReactDOM.render(<ShowMessage id={domId} key={domId} title={title} message={messageText} color={color} />, document.getElementById("sc-sidebar-message-container"));

  setTimeout(() => {
    try {
      ReactDOM.unmountComponentAtNode(message.myRef.current.parentNode);
    } catch (err) {
      console.log(err);
    }
  }, timeout);
}

export function searchArrayByKey(nameKey, myArray) {
  for (var i = 0; i < myArray.length; i++) {
    if (myArray[i].name === nameKey) {
      return myArray[i];
    }
  }
}

// GET URL PARAMETER
export function getURLParameter(parameterName, decoded = true) {
  const url = new URL(window.location.href);
  const param = url.searchParams.get(parameterName);
  if (param === null) return null;

  if (decoded) return param;
  else return encodeURIComponent(param);
}

// HTTP GET
export function httpGetText(url, callback) {
  return fetch(url)
    .then(response => response.text())
    .then(responseText => {
      // CALLBACK WITH RESULT
      if (callback !== undefined) callback(responseText);
    })
    .catch(error => {
      console.error(error);
    });
}

// GET JSON (NO WAITING)
export function getJSON(url, callback) {
  console.log("getJSON", url);
  return fetch(url)
    .then(response => response.json())
    .then(responseJson => {
      // CALLBACK WITH RESULT
      if (callback !== undefined) callback(responseJson);
    })
    .catch(error => {
      console.error(error);
    });
}

// GET JSON WAIT
export async function getJSONWait(url, callback) {
  console.log("getJSONWait", url);
  let data = await await fetch(url)
    .then(res => {
      const resp = res.json();
      console.log(resp);
      return resp;
    })
    .catch(err => {
      console.log("Error: ", err);
    });
  if (callback !== undefined) {
    //console.log(data);
    callback(data);
  }

  return await data;
}

export function getObjectFromXMLUrl(url, callback) {
  console.log("getObjectFromXMLUrl", url);
  return fetch(url)
    .then(response => response.text())
    .then(responseText => {
      // CALLBACK WITH RESULT
      if (callback !== undefined) {
        parseString(responseText, function(err, result) {
          callback(result);
        });
      }
    })
    .catch(error => {
      console.error(error);
    });
}

export function isParcelClickEnabled() {
  // READ INFO FROM LOCAL STORAGE (GLOBAL SETTING)

  // FOR NOW JUST RETURN
  return window.disableParcelClick;
}

//https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Bag%20Tag%20Locations&outputFormat=application/json
export function getWFSVectorSource(serverUrl, layerName, callback, sortField = "") {
  const wfsUrlTemplate = (serverURL, layerName, sortField) => `${serverURL}wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerName}&outputFormat=application/json&sortBy=${sortField}`;
  const wfsUrl = wfsUrlTemplate(serverUrl, layerName, sortField);
  getJSON(wfsUrl, result => {
    const geoJSON = new GeoJSON().readFeatures(result);
    var vectorSource = new VectorSource({ features: geoJSON });
    callback(vectorSource);
  });
}

//https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Bag%20Tag%20Locations&outputFormat=application/json
export function getWFSGeoJSON(serverUrl, layerName, callback, sortField = null, extent = null, cqlFilter = null, count = null) {
  // SORTING
  let additionalParams = "";
  if (sortField !== null) additionalParams += "&sortBy=" + sortField;

  // BBOX EXTENT
  if (extent !== null) {
    const extentString = extent[0] + "," + extent[1] + "," + extent[2] + "," + extent[3];
    additionalParams += "&bbox=" + extentString;
  }

  // ATTRIBUTE WHERECLAUSE
  if (cqlFilter !== null && cqlFilter.length !== 0) additionalParams += "&cql_filter=" + cqlFilter;

  // COUNT
  if (count !== null) additionalParams += "&count=" + count;

  // USE TEMPLATE FOR READABILITY
  const wfsUrlTemplate = (serverURL, layerName) => `${serverURL}wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerName}&outputFormat=application/json`;
  const wfsUrl = wfsUrlTemplate(serverUrl, layerName) + additionalParams;
  getJSON(wfsUrl, result => {
    const geoJSON = new GeoJSON().readFeatures(result);
    callback(geoJSON);
  });
}


export function getWFSLayerRecordCount(serverUrl, layerName, callback) {
  const recordCountUrlTemplate = (serverURL, layerName) => `${serverURL}wfs?REQUEST=GetFeature&VERSION=1.1&typeName=${layerName}&RESULTTYPE=hits`;
  const recordCountUrl = recordCountUrlTemplate(serverUrl, layerName);

  getObjectFromXMLUrl(recordCountUrl, result => {
    callback(result["wfs:FeatureCollection"]["$"].numberOfFeatures);
  });
}

export function zoomToFeature(feature) {
  window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize(), { duration: 1000 });
}

// THIS RETURNS THE ACTUAL REACT ELEMENT USING DOM ID
export function findReact(domId) {
  var dom = document.getElementById(domId);
  let key = Object.keys(dom).find(key => key.startsWith("__reactInternalInstance$"));
  let internalInstance = dom[key];
  if (internalInstance == null) return null;

  if (internalInstance.return) {
    // react 16+
    return internalInstance._debugOwner ? internalInstance._debugOwner.stateNode : internalInstance.return.stateNode;
  } else {
    // react <16
    return internalInstance._currentElement._owner._instance;
  }
}

// URL FRIENDLY STRING ID
export function getUID() {
  return shortid.generate();
}

export function flashPoint(coords, zoom = 15, duration = 5000) {
  var marker = new Feature(new Point(coords));
  var vectorLayer = new VectorLayer({
    zIndex: 1000,
    source: new Vector({
      features: [marker]
    })
  });
  window.map.addLayer(vectorLayer);
  var mstyle = new Style({
    image: new CircleStyle({
      radius: 5,
      fill: new Fill({
        color: "#fff"
      }),
      stroke: new Stroke({
        color: "blue",
        width: 2
      })
    }),
    zIndex: 100
  });
  marker.setStyle(mstyle);

  pulsate(vectorLayer, "blue", marker, 5000, mstyle, () => {
    window.map.removeLayer(vectorLayer);
  });

  window.map.getView().animate({ center: coords, zoom: zoom });
}

function pulsate(vectorLayer, color, feature, duration, mstyle, callback) {
  var start = new Date().getTime();

  var key = vectorLayer.on("postrender", function(event) {
    var vectorContext = getVectorContext(event);
    var frameState = event.frameState;
    var flashGeom = feature.getGeometry().clone();
    var elapsed = frameState.time - start;
    var elapsedRatio = elapsed / duration;
    var radius = easeOut(elapsedRatio) * 35 + 5;
    var opacity = easeOut(1 - elapsedRatio);
    var fillOpacity = easeOut(0.5 - elapsedRatio);

    vectorContext.setStyle(
      new Style({
        image: new CircleStyle({
          radius: radius,
          snapToPixel: false,
          fill: new Fill({
            color: "rgba(119, 170, 203, " + fillOpacity + ")"
          }),
          stroke: new Stroke({
            color: "rgba(119, 170, 203, " + opacity + ")",
            width: 2 + opacity
          })
        })
      })
    );

    vectorContext.drawGeometry(flashGeom);

    // Draw the marker (again)
    vectorContext.setStyle(mstyle);
    vectorContext.drawGeometry(feature.getGeometry());

    if (elapsed > duration) {
      unByKey(key);
      //pulsate(color, feature, duration); // recursive function
      callback();
    }

    window.map.render();
  });

}

export function centerMap(coords, zoom) {
  var extent = window.map.getView().calculateExtent();
  console.log(extent);
  var xMin = extent[0];
  var xMax = extent[2];
  var total = (Math.abs(xMin) - Math.abs(xMax)) * 0.04;
  var newCoords = [coords[0] - total, coords[1]];
  //var newExtent = [extent[0], extent[1], extent[2], total];

  window.map.setView(
    new ol.View({
      center: newCoords,
      //extent: newExtent,
      zoom: 13
    })
  );
}

export function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

// GET FEATURE FROM GEOJSON
export function getFeatureFromGeoJSON(geoJSON) {
  return new GeoJSON().readFeature(geoJSON);
}

// SEE EXAMPLE VALUES FROM HERE:  https://openlayers.org/en/latest/examples/vector-labels.html
export function createTextStyle(
  feature,
  fieldName = "name",
  maxScale = 100000000,
  align = "center",
  baseline = "middle",
  size = "10px",
  offsetX = 0,
  offsetY = 0,
  weight = "normal",
  placement = "point",
  maxAngleDegrees = 78,
  overflow = false,
  rotation = 0,
  font = "arial",
  fillColor = "black",
  outlineColor = "black",
  outlineWidth = 1
) {
  //console.log(align)
  offsetX = parseInt(offsetX, 10);
  offsetY = parseInt(offsetY, 10);
  maxAngleDegrees = parseFloat(maxAngleDegrees * 0.0174533);
  rotation = parseFloat(rotation * 0.0174533);
  var fullFont = weight + " " + size + " " + font;
  outlineWidth = parseInt(outlineWidth, 10);

  var texts = new TextStyle({
    textAlign: align,
    textBaseline: baseline,
    font: fullFont,
    text: _getText(feature, fieldName, maxScale),
    fill: new Fill({ color: fillColor }),
    stroke: new Stroke({ color: outlineColor, width: outlineWidth }),
    offsetX: offsetX,
    offsetY: offsetY,
    placement: placement,
    maxAngle: maxAngleDegrees,
    overflow: overflow,
    rotation: rotation
  });

  //console.log(texts)
  return texts;
}

function _getText(feature, fieldName = "name", maxScale, type = "normal", placement = "point") {
  var text = feature.get(fieldName);
  if (getMapScale() > maxScale) {
    text = "";
  } else if (type === "hide") {
    text = "";
  } else if (type === "shorten") {
    text = text.trunc(12);
  } else if (type === "wrap" && (!placement || placement.value !== "line")) {
    text = stringDivider(text, 16, "\n");
  }

  return text;
}

// https://stackoverflow.com/questions/14484787/wrap-text-in-javascript
function stringDivider(str, width, spaceReplacer) {
  if (str.length > width) {
    var p = width;
    while (p > 0 && (str[p] !== " " && str[p] !== "-")) {
      p--;
    }
    if (p > 0) {
      var left;
      if (str.substring(p, p + 1) === "-") {
        left = str.substring(0, p + 1);
      } else {
        left = str.substring(0, p);
      }
      var right = str.substring(p + 1);
      return left + spaceReplacer + stringDivider(right, width, spaceReplacer);
    }
  }
  return str;
}

export function getItemsFromStorage(key) {
  const storage = localStorage.getItem(key);
  if (storage === null) return [];

  const data = JSON.parse(storage);
  return data;
}

export function getJsonFromUrl(url) {
  
  var question = url.indexOf("?");
  var hash = url.indexOf("#");
  if(hash==-1 && question==-1) return {};
  if(hash==-1) hash = url.length;
  var query = question==-1 || hash==question+1 ? url.substring(hash) : 
  url.substring(question+1,hash);
  var result = {};
  query.split("&").forEach(function(part) {
    if(!part) return;
    part = part.split("+").join(" "); // replace every + with space, regexp-free version
    var eq = part.indexOf("=");
    var key = eq>-1 ? part.substr(0,eq) : part;
    var val = eq>-1 ? decodeURIComponent(part.substr(eq+1)) : "";
    var from = key.indexOf("[");
    if(from==-1) result[decodeURIComponent(key)] = val;
    else {
      var to = key.indexOf("]",from);
      var index = decodeURIComponent(key.substring(from+1,to));
      key = decodeURIComponent(key.substring(0,from));
      if(!result[key]) result[key] = [];
      if(!index) result[key].push(val);
      else result[key][index] = val;
    }
  });
  return result;
}

export function postJSON(url, data = {}, callback) {
  // Default options are marked with *
  return fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, cors, *same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json"
      //'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrer: "no-referrer", // no-referrer, *client
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  })
    .then(res => {
      return res.json();
    })
    .then(json => {
      callback(json);
    });
}

export function featureToGeoJson(feature) {
  return new GeoJSON({ dataProjection: "EPSG:3857", featureProjection: "EPSG:3857" }).writeFeature(feature, {
    dataProjection: "EPSG:3857",
    featureProjection: "EPSG:3857"
  });
}

export function getWKTFeature(wktString) {
  if (wktString === undefined) return;

  // READ WKT
  var wkt = new WKT();
  var feature = wkt.readFeature(wktString, {
    dataProjection: "EPSG:3857",
    featureProjection: "EPSG:3857"
  });
  return feature;
}

export function formatReplace(fmt, ...args) {
  if (!fmt.match(/^(?:(?:(?:[^{}]|(?:\{\{)|(?:\}\}))+)|(?:\{[0-9]+\}))+$/)) {
    throw new Error("invalid format string.");
  }
  return fmt.replace(/((?:[^{}]|(?:\{\{)|(?:\}\}))+)|(?:\{([0-9]+)\})/g, (m, str, index) => {
    if (str) {
      return str.replace(/(?:{{)|(?:}})/g, m => m[0]);
    } else {
      if (index >= args.length) {
        throw new Error("argument index is out of range in format");
      }
      return args[index];
    }
  });
}

export function toLatLongFromWebMercator(coords) {
  return transform(coords, "EPSG:3857", "EPSG:4326");
}

export function toWebMercatorFromLatLong(coords) {
  return fromLonLat(coords);
  //return transform(coords, "EPSG:4326", "EPSG:3857");
}

export function getGeoJSONFromGeometry(geometry) {
  const parser = new GeoJSON();
  return parser.writeGeometry(geometry);
}

export function getGeometryFromGeoJSON(geometry) {
  const parser = new GeoJSON();
  return parser.readGeometry(geometry);
}

export function bufferGeometry(geometry, distanceMeters, callback) {
  const url = mainConfig.apiUrl + "postBufferGeometry/";

  // PROJECT TO UTM FOR ACCURACY
  const utmNad83Geometry = geometry.transform("EPSG:3857", _nad83Proj);
  const geoJSON = getGeoJSONFromGeometry(utmNad83Geometry);
  const obj = { geoJSON: geoJSON, distance: distanceMeters, srid: "26917" };

  postJSON(url, obj, result => {
    // REPROJECT BACK TO WEB MERCATOR
    const olGeoBuffer = getGeometryFromGeoJSON(result.geojson);
    const utmNad83GeometryBuffer = olGeoBuffer.transform("EPSG:26917", "EPSG:3857");

    callback(utmNad83GeometryBuffer);
  });
}

export function getGeometryCenter(geometry, callback) {
  const url = mainConfig.apiUrl + "postGetGeometryCenter/";
  const geoJSON = getGeoJSONFromGeometry(geometry);
  const obj = { geoJSON: geoJSON, srid: "3857" };

  postJSON(url, obj, result => {
    const olGeo = getGeometryFromGeoJSON(result.geojson);
    callback(olGeo);
  });
}

export function replaceAllInString(str, find, replace) {
  return str.replace(new RegExp(_escapeRegExp(find), "g"), replace);
}
function _escapeRegExp(str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

export function showFeaturePopup(coord, feature) {
  window.popup.show(coord, <FeaturePopupContent feature={feature}></FeaturePopupContent>);
}

function FeaturePopupContent(props) {
  return (
    <div>
      {Object.entries(props.feature.getProperties()).map(row => {
        if (row[0] !== "geometry" && row[0].substring(0, 1) !== "_") {
          return <InfoRow key={getUID()} value={row[1]} label={row[0]} />;
        } else return null;
      })}
    </div>
  );
}
