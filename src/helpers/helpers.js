// REACT
import React from "react";
import ReactDOM from "react-dom";

// OPEN LAYERS
import Feature from "ol/Feature";
import * as ol from "ol";
import { Image as ImageLayer, Tile as TileLayer, Vector as VectorLayer, VectorTile as VectorTileLayer } from "ol/layer.js";
import { ImageWMS, OSM, TileArcGISRest, TileImage, Vector, XYZ } from "ol/source.js";
import MVT from "ol/format/MVT";
import VectorTileSource from "ol/source/VectorTile";
// import stylefunction from "ol-mapbox-style/dist/stylefunction";
import { stylefunction } from "ol-mapbox-style";
//import {file as FileLoader} from "ol/featureloader.js";
import { GeoJSON, WKT } from "ol/format.js";
import TileGrid from "ol/tilegrid/TileGrid.js";
import Point from "ol/geom/Point";
import { getTopLeft } from "ol/extent.js";
import { easeOut } from "ol/easing";
import { Fill, Stroke, Style, Circle as CircleStyle, Text as TextStyle } from "ol/style";
import { ScaleLine, FullScreen, Rotate, Zoom } from "ol/control.js";
import { unByKey } from "ol/Observable.js";
import { transform } from "ol/proj.js";
import Projection from "ol/proj/Projection.js";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import { fromLonLat } from "ol/proj";
import { getVectorContext } from "ol/render";
import { KeyboardPan, KeyboardZoom } from "ol/interaction.js";
import { Polygon } from "ol/geom.js";
import { fromExtent } from "ol/geom/Polygon";

//OTHER
import { parseString } from "xml2js";
// import shortid from "shortid";
import { v4 as uuidv4 } from "uuid";

import ShowMessage from "./ShowMessage.jsx";
import ShowTerms from "./ShowTerms.jsx";
import URLWindow from "./URLWindow.jsx";
import ShowWindow from "./ShowWindow.jsx";
import mainConfig from "../config.json";
import { InfoRow } from "./InfoRow.jsx";
import blankImage from "./images/blank.png";

// REGISTER CUSTOM PROJECTIONS
proj4.defs([["EPSG:26917", "+proj=utm +zone=17 +ellps=GRS80 +datum=NAD83 +units=m +no_defs "]]);
register(proj4);

// UTM NAD 83
const _nad83Proj = new Projection({
  code: "EPSG:26917",
  extent: [194772.8107, 2657478.7094, 805227.1893, 9217519.4415],
});

export function registerCustomProjection(wkt, callback) {
  if (proj4.defs(`EPSG:${wkt}`)) callback();
  else {
    const epsgUrl = (wkt) => `https://epsg.io/${wkt}.proj4`;
    httpGetText(epsgUrl(wkt), (projection) => {
      if (projection !== "ERROR") {
        proj4.defs(`EPSG:${wkt}`, projection);
        register(proj4);
      }
      callback();
    });
  }
}
export function tryParseJSON(jsonString) {
  try {
    var obj = JSON.parse(jsonString);
    if (obj && typeof obj === "object") {
      return obj;
    }
  } catch (e) {}
  return false;
}

export function sortByKey(array, key) {
  return array.sort(function (a, b) {
    var x = a[key];
    var y = b[key];
    return x < y ? -1 : x > y ? 1 : 0;
  });
}
// APP STAT
export function addAppStat(type, description) {
  waitForLoad("settings", Date.now(), 30, () => {
    if (window.config.includeAppStats === false) return;
    // IGNORE LOCAL HOST DEV
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return;
    const build = (appName, version) => `${appName}-${version}`;
    const appStatsTemplate = (build, type, description) => `${window.config.appStatsUrl}${build}/${type}/${description}`;
    let buildname = "";
    if (window.homepage) buildname += window.homepage;
    if (window.version) {
      buildname = build(window.app ? window.app : window.location.pathname.split("/").join(""), window.version);
    }
    if (window.homepage) buildname += "-" + window.homepage;
    if (buildname === "") buildname = "Unknown";
    httpGetText(appStatsTemplate(buildname, type, description));
  });
}

// GLOW CONTAINER
export function glowContainer(id, color = "blue") {
  const elem = document.getElementById(id);
  if (elem === undefined || elem === null) return;
  const className = "sc-glow-container-" + color;
  elem.classList.add(className);
  setTimeout(function () {
    elem.classList.remove(className);
  }, 1000);
}

// MOBILE VIEW
export function isMobile() {
  if (window.innerWidth < 770) return true;
  else return false;
}

// SHOW CONTENT WINDOW
export function showWindow(contents, options = { title: "Information", showFooter: false, mode: "normal", hideScroll: false }) {
  ReactDOM.render(
    <ShowWindow key={uuidv4()} title={options.title} mode={options.mode} showFooter={options.showFooter} contents={contents} hideScroll={options.hideScroll} style={options.style} />,
    document.getElementById("map-modal-window")
  );
}

// SHOW URL WINDOW
export function showURLWindow(url, showFooter = false, mode = "normal", honorDontShow = false, hideScroll = false) {
  console.log(url);
  let isSameOrigin = true;
  waitForLoad("settings", Date.now(), 30, () => {
    if (window.config.restrictOriginForUrlWindow) {
      if (url !== undefined) isSameOrigin = url.toLowerCase().indexOf(window.location.origin.toLowerCase()) !== -1;
    }

    if (isSameOrigin) {
      ReactDOM.render(<URLWindow key={uuidv4()} mode={mode} showFooter={showFooter} url={url} honorDontShow={honorDontShow} hideScroll={hideScroll} />, document.getElementById("map-modal-window"));
    } else {
      window.open(url, "_blank");
    }
  });
}

export function export_file(filename, content) {
  download("data:text/plain;charset=utf-8," + encodeURIComponent(content), filename);
}
// GET ARCGIS TILED LAYER
export function getArcGISTiledLayer(url) {
  return new TileLayer({
    source: new TileArcGISRest({
      url: url,
      crossOrigin: "anonymous",
      // tileLoadFunction: function(tile, src) {
      //   var xhr = new XMLHttpRequest();

      //   // var to = null;
      //   // var handle = setTimeout(() => {
      //   //   console.log("image took too long");
      //   //   to = "yes";
      //   //   return null;
      //   // }, 1000);
      //   // console.log(handle);
      //   xhr.open("GET", src);
      //   xhr.responseType = "arraybuffer";

      //   xhr.onload = function() {
      //     // console.log(handle);
      //     // console.log(to);

      //     var arrayBufferView = new Uint8Array(this.response);
      //     var blob = new Blob([arrayBufferView], { type: "image/png" });
      //     var urlCreator = window.URL || window.webkitURL;
      //     var imageUrl = urlCreator.createObjectURL(blob);
      //     tile.getImage().src = imageUrl;
      //   };
      //   xhr.send();
      // },
    }),
    crossOrigin: "anonymous",
  });
}

export function getESRITileXYZLayer(url) {
  const rebuildParams = {
    sourceType: "ESRITileXYZ",
    url: url,
  };
  return new TileLayer({
    rebuildParams: rebuildParams,
    source: new XYZ({
      attributions: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer">ArcGIS</a>',
      url: url + "/tile/{z}/{y}/{x}",
      crossOrigin: "anonymous",
    }),
  });
}

export function getOSMTileXYZLayer(url) {
  const rebuildParams = {
    sourceType: "OSMTileXYZ",
    url: url,
  };
  return new TileLayer({
    rebuildParams: rebuildParams,
    source: new OSM({ url: url + "/{z}/{x}/{y}.png" }),
    crossOrigin: "anonymous",
  });
}

export function getXYZLayer(url) {
  return new TileLayer({
    source: new XYZ({ url: url + "/{z}/{x}/{y}.png" }),
    crossOrigin: "anonymous",
  });
}

export function getSimcoeTileXYZLayer(url) {
  // console.log(url);
  const resolutions = [
    305.74811314055756, 152.87405657041106, 76.43702828507324, 38.21851414253662, 19.10925707126831, 9.554628535634155, 4.77731426794937, 2.388657133974685, 1.1943285668550503, 0.5971642835598172,
    0.29858214164761665, 0.1492252984505969,
  ];
  const projExtent = window.map.getView().getProjection().getExtent();
  var tileGrid = new TileGrid({
    resolutions: resolutions,
    tileSize: [256, 256],
    origin: getTopLeft(projExtent),
    //origin: [-20037500.342787,20037378.342787 ]
    // origin: [-20037508.342787,20037508.342787 ]
  });

  const rebuildParams = {
    sourceType: "SimcoeTileXYZ",
    url: url,
  };
  var source = new TileImage({
    tileUrlFunction: function (tileCoord, pixelRatio, projection) {
      if (tileCoord === null) return undefined;

      const z = tileCoord[0];
      const x = tileCoord[1];
      const y = tileCoord[2];

      //if ( z < 17 || x < 0 || y < 0) return undefined;

      return url + "/tile/" + z + "/" + y + "/" + x;
    },
    tileGrid: tileGrid,
    crossOrigin: "anonymous",
  });
  source.on("tileloaderror", function (event) {
    // BROWSER STILL KICKS OUT 404 ERRORS.  ANYBODY KNOW A WAY TO PREVENT THE ERRORS IN THE BROWSER?
    event.tile.getImage().src = blankImage;

    // var tileLoadFunction = function(imageTile, src) {
    //   imageTile.getImage().src = blankImage;
    // };
    //  if (event.tile.tileLoadFunction_ !== tileLoadFunction) {
    //   event.tile.tileLoadFunction_ = tileLoadFunction;
    //   event.tile.load();
    // }
  });

  return new TileLayer({
    rebuildParams: rebuildParams,
    projection: "EPSG:4326",
    //projection: 'EPSG:3857',
    //matrixSet: 'EPSG:3857',
    source: source,
    maxResolution: 400,
    useInterimTiles: true,
  });
}

// GET OPEN STREET MAP LAYER
export function getOSMLayer() {
  const rebuildParams = {
    sourceType: "OSM",
  };
  return new TileLayer({
    rebuildParams: rebuildParams,
    source: new OSM(),
    crossOrigin: "anonymous",
  });
}
export function shouldCancelPopup(coord, startTime) {
  //HAS THE USER CLICKED ON SOMETHING ELSE?
  return window.activeClick && window.activeClick.time > startTime && (window.activeClick.coordinates[0] !== coord[0] || window.activeClick.coordinates[1] !== coord[1]);
}
export function getViewRotation() {
  var rotation = parseFloat(0);
  if (window.map === undefined) return rotation;
  rotation = window.map.getView().getProperties().rotation;
  return rotation * (180 / Math.PI);
}

export function updateWMSRotation() {
  const layers = window.map.getLayers();
  let currentRotation = getViewRotation();
  console.log(getViewRotation());
  if (layers.array_.length > 0) {
    layers.forEach((layer) => {
      if (layer instanceof ImageLayer) {
        let source = layer.getSource();
        source.updateParams({ angle: currentRotation });
        layer.setSource(source);
      }
    });
    window.map.getView().setProperties({ rotation: 0 });
  }
}
// GET WMS Image Layer
export function getImageWMSLayer(serverURL, layers, serverType = "geoserver", cqlFilter = null, zIndex = null, disableParcelClick = null) {
  const rebuildParams = {
    sourceType: "ImageWMS",
    url: serverURL,
    layers: layers,
    serverType: serverType,
    cqlFilter: cqlFilter,
    zIndex: zIndex,
    disableParcelClick: disableParcelClick,
  };
  let imageLayer = new ImageLayer({
    rebuildParams: rebuildParams,
    visible: false,
    zIndex: zIndex,
    source: new ImageWMS({
      url: serverURL,
      params: { VERSION: "1.3.0", LAYERS: layers, cql_filter: cqlFilter },
      ratio: 1,
      serverType: serverType,
      crossOrigin: "anonymous",
    }),
  });

  const wfsUrlTemplate = (serverUrl, layer) => `${serverUrl}/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layer}&outputFormat=application/json&cql_filter=`;
  const wfsUrl = wfsUrlTemplate(serverURL.replace("/wms", ""), layers);

  const workspace = layers.split(":")[0];
  const layerNameOnly = layers.split(":")[1];
  const rootInfoTemplate = (serverUrl, workspace, layerNameOnly) => `${serverUrl}/rest/workspaces/${workspace}/layers/${layerNameOnly}.json`;
  const rootInfoUrl = rootInfoTemplate(serverURL.replace("/wms", ""), workspace, layerNameOnly);

  if (layerNameOnly === "Assessment Parcel") disableParcelClick = false;

  imageLayer.setProperties({
    wfsUrl: wfsUrl,
    name: layerNameOnly,
    rootInfoUrl: rootInfoUrl,
    disableParcelClick: disableParcelClick,
    tocDisplayName: layerNameOnly,
    queryable: true,
  });
  return imageLayer;
}

//GET VectorTie Layer
export function getVectorTileLayer(url) {
  let layer = new VectorTileLayer({
    renderMode: "vector",
    reload: Infinity,
    declutter: true,
    //extent: extent,
    source: new VectorTileSource({
      attributions: "LIO VectorTiles Test",
      format: new MVT(),
      url: url + "/tile/{z}/{y}/{x}.pbf",
      maxZoom: 26,
      //rootPath: url + "/resources/styles/root.json",
      //spritePath: url + "/resources/sprites/sprite.json",
      //pngPath: url + "/resources/sprites/sprite.png",
    }),
    id: "TileLayer",
    tilePixelRatio: 8,
  });
  //let rootPath= url + "/tile/{z}/{y}/{x}.pbf"; // rootPath for applySytle
  let rootPath = url + "/resources/styles/root.json";
  let spritePath = url + "/resources/sprites/sprite.json";
  let pngPath = url + "/resources/sprites/sprite.png";
  fetch(rootPath).then(function (response) {
    response.json().then(function (glStyle) {
      fetch(spritePath).then(function (response) {
        response.json().then(function (spriteData) {
          stylefunction(layer, glStyle, "esri", undefined, spriteData, pngPath);
        });
      });
    });
  });

  return layer; //StyledLayer is returned;
}

export function scaleToResolution(scale) {
  const DOTS_PER_INCH = 96;
  const INCHES_PER_METER = 39.37;
  const pointResolution = parseFloat(scale) / (DOTS_PER_INCH * INCHES_PER_METER);
  var projection = window.map.getView().getProjection();
  return pointResolution / projection.getMetersPerUnit();
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

// SET CURRENT MAP SCALE
export function setMapScale(scale) {
  const DOTS_PER_INCH = 96;
  const INCHES_PER_METER = 39.37;
  const pointResolution = parseFloat(scale) / (DOTS_PER_INCH * INCHES_PER_METER);
  var projection = window.map.getView().getProjection();
  var resolution = pointResolution / projection.getMetersPerUnit();
  window.map.getView().setResolution(resolution);
}

// SHOW DISCLAIMER
export const messageColors = {
  gray: "gray",
  green: "green",
  blue: "blue",
  red: "red",
  yellow: "yellow",
  orange: "orange",
};
export function getHash(input) {
  return input.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
}
export function showTerms(title = "Terms and Condition", messageText = "Message", url = "", color = messageColors.green, accept, decline, options = undefined) {
  const domId = "portal-root";
  const termsDomId = "sc-show-terms-root";

  ReactDOM.render(
    <ShowTerms
      id={domId}
      key={termsDomId}
      title={title}
      message={messageText}
      color={color}
      url={url}
      onAcceptClick={accept}
      onDeclineClick={decline}
      options={options}
      onClose={(ref) => {
        try {
          ReactDOM.unmountComponentAtNode(ref.current.parentNode);
        } catch (err) {
          console.log(err);
        }
      }}
    />,
    document.getElementById("portal-root")
  );
}

// SHOW MESSAGE
export function showMessage(title = "Info", messageText = "Message", color = messageColors.green, timeout = 2000, hideButton = false) {
  const domId = "sc-show-message-content";
  var existingMsg = document.getElementById(domId);
  if (existingMsg !== undefined && existingMsg !== null) existingMsg.remove();
  try {
    ReactDOM.unmountComponentAtNode(document.getElementById("sc-sidebar-message-container"));
  } catch {}
  const message = ReactDOM.render(
    <ShowMessage id={domId} key={domId} title={title} message={messageText} color={color} hideButton={hideButton} />,
    document.getElementById("sc-sidebar-message-container"),
    () => {
      setTimeout(() => {
        try {
          ReactDOM.unmountComponentAtNode(document.getElementById("sc-sidebar-message-container"));
        } catch (err) {
          console.log(err);
        }
      }, timeout);
    }
  );

  //console.log(message);
  // setTimeout(() => {
  //   try {
  //     ReactDOM.unmountComponentAtNode(message.myRef.current.parentNode);
  //   } catch (err) {
  //     const domId = "sc-show-message-content";
  //     var existingMsg = document.getElementById(domId);
  //     if (existingMsg !== undefined && existingMsg !== null) existingMsg.remove();
  //     console.log(err);
  //   }
  // }, timeout);
}

export function searchArrayByKey(nameKey, myArray) {
  for (var i = 0; i < myArray.length; i++) {
    if (myArray[i].name === nameKey) {
      return myArray[i];
    }
  }
}

// GET URL PARAMETER
export function getURLParameter(parameterName, decoded = true, caseSensitive = false) {
  const queryString = window.location.search;
  if (queryString.length < 1) return null;
  const urlParams = new URLSearchParams(caseSensitive ? queryString : queryString.toLowerCase());
  const param = urlParams.get(caseSensitive ? parameterName : parameterName.toLowerCase());
  if (param === null) return null;

  if (decoded) return param;
  else return encodeURIComponent(param);
}

// HTTP GET (NO WAITING)
export function httpGetText(url, callback) {
  return fetch(url)
    .then((response) => response.text())
    .then((responseText) => {
      // CALLBACK WITH RESULT
      if (callback !== undefined) callback(responseText);
    })
    .catch((error) => {
      //httpGetText(url.replace("opengis.simcoe.ca", "opengis2.simcoe.ca"), callback);
      console.error(url, error);
      if (callback !== undefined) callback();
    });
}

// HTTP GET (NO WAITING)
export function httpGetTextWithParams(url, params = undefined, callback) {
  return fetch(url, params)
    .then((response) => response.text())
    .then((responseText) => {
      // CALLBACK WITH RESULT
      if (callback) callback(responseText);
    })
    .catch((error) => {
      //httpGetText(url.replace("opengis.simcoe.ca", "opengis2.simcoe.ca"), callback);
      console.error(url, error);
      if (callback) callback();
    });
}

// HTTP GET WAIT
export async function httpGetTextWait(url, callback) {
  let data = await fetch(url)
    .then((response) => {
      const resp = response.text();
      //console.log(resp);
      return resp;
    })
    .catch((err) => {
      console.log("Error: ", err);
    });
  if (callback !== undefined) {
    //console.log(data);
    callback(data);
  }
  return data;
}

// GET JSON (NO WAITING)
export function getJSON(url, callback) {
  return fetch(url)
    .then((response) => response.json())
    .then((responseJson) => {
      // CALLBACK WITH RESULT
      if (callback !== undefined) callback(responseJson);
    })
    .catch((error) => {
      console.error("Error: ", error, "URL:", url);
    });
}

// GET JSON (NO WAITING)
export function getJSONWithParams(url, params = undefined, callback) {
  return fetch(url, params)
    .then((response) => response.json())
    .then((responseJson) => {
      // CALLBACK WITH RESULT
      if (callback !== undefined) callback(responseJson);
    })
    .catch((error) => {
      console.error("Error: ", error, "URL:", url);
    });
}
// GET JSON WAIT
export async function getJSONWaitWithParams(url, params = undefined, callback) {
  let data = await await fetch(url, params)
    .then((res) => {
      const resp = res.json();
      //console.log(resp);
      return resp;
    })
    .catch((err) => {
      console.log("Error: ", err, "URL:", url);
    });
  if (callback !== undefined) {
    //console.log(data);
    callback(data);
  }

  return await data;
}
// GET JSON WAIT
export async function getJSONWait(url, callback) {
  let data = await await fetch(url)
    .then((res) => {
      const resp = res.json();
      //console.log(resp);
      return resp;
    })
    .catch((err) => {
      console.log("Error: ", err, "URL:", url);
    });
  if (callback !== undefined) {
    //console.log(data);
    callback(data);
  }

  return await data;
}

export function getObjectFromXMLUrl(url, callback) {
  return fetch(url)
    .then((response) => response.text())
    .then((responseText) => {
      // CALLBACK WITH RESULT
      if (callback !== undefined) {
        parseString(responseText, function (err, result) {
          callback(result);
        });
      }
    })
    .catch((error) => {
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
  getJSON(wfsUrl, (result) => {
    const geoJSON = new GeoJSON().readFeatures(result);
    var vectorSource = new Vector({ features: geoJSON });
    callback(vectorSource);
  });
}

//https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Bag%20Tag%20Locations&outputFormat=application/json
export function getWFSGeoJSON(serverUrl, layerName, callback, sortField = null, extent = null, cqlFilter = null, count = null) {
  // SORTING
  let additionalParams = "";
  if (sortField !== null) additionalParams += "&sortBy=" + sortField;

  // BBOX EXTENT
  if (extent !== null && (cqlFilter === null || cqlFilter.length === 0)) {
    const extentString = extent[0] + "," + extent[1] + "," + extent[2] + "," + extent[3];
    additionalParams += "&bbox=" + extentString;
  }

  // ATTRIBUTE WHERECLAUSE
  if (cqlFilter !== null && cqlFilter.length !== 0) {
    additionalParams += "&cql_filter=" + cqlFilter;
    if (extent !== null) {
      const extentString = extent[0] + "," + extent[1] + "," + extent[2] + "," + extent[3];
      additionalParams += " AND BBOX(geom, " + extentString + ")";
    }
  }

  // COUNT
  if (count !== null) additionalParams += "&count=" + count;

  // USE TEMPLATE FOR READABILITY
  const wfsUrlTemplate = (serverURL, layerName) => `${serverURL}wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerName}&maxFeatures=Y&outputFormat=application/json`;
  const wfsUrl = wfsUrlTemplate(serverUrl, layerName) + additionalParams;
  getJSON(wfsUrl, (result) => {
    const geoJSON = new GeoJSON().readFeatures(result);
    callback(geoJSON);
  });
}

export function getWFSLayerRecordCount(serverUrl, layerName, callback) {
  const recordCountUrlTemplate = (serverURL, layerName) => `${serverURL}wfs?REQUEST=GetFeature&VERSION=1.1&typeName=${layerName}&RESULTTYPE=hits`;
  const recordCountUrl = recordCountUrlTemplate(serverUrl, layerName);

  getObjectFromXMLUrl(recordCountUrl, (result) => {
    callback(result["wfs:FeatureCollection"]["$"].numberOfFeatures);
  });
}

export function zoomToFeature(feature, animate = true) {
  let geom = feature.getGeometry();
  let duration = animate ? 1000 : 0;
  let minResolution = scaleToResolution(feature.minScale);
  minResolution = minResolution > 1 ? Math.ceil(minResolution) : 1;
  if (geom.getType() === "Point") {
    window.map.getView().fit(geom, { duration: duration, minResolution: minResolution });
  } else if (geom.getType() === "GeometryCollection") {
    window.map.getView().fit(geom.getGeometries()[0], {
      duration: duration,
      minResolution: minResolution,
    });
  } else {
    window.map.getView().fit(geom, { duration: duration, minResolution: minResolution });
  }
}

// THIS RETURNS THE ACTUAL REACT ELEMENT USING DOM ID
export function findReact(domId) {
  var dom = document.getElementById(domId);
  let key = Object.keys(dom).find((key) => key.startsWith("__reactInternalInstance$"));
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
  return uuidv4();
}

export function flashPoint(coords, zoom = 15, duration = 5000) {
  var marker = new Feature(new Point(coords));
  var vectorLayer = new VectorLayer({
    zIndex: 1000,
    source: new Vector({
      features: [marker],
    }),
  });
  window.map.addLayer(vectorLayer);
  var mstyle = new Style({
    image: new CircleStyle({
      radius: 5,
      fill: new Fill({
        color: "#fff",
      }),
      stroke: new Stroke({
        color: "blue",
        width: 2,
      }),
    }),
    zIndex: 100,
  });
  marker.setStyle(mstyle);

  pulsate(vectorLayer, "blue", marker, 5000, mstyle, () => {
    window.map.removeLayer(vectorLayer);
  });

  window.map.getView().animate({ center: coords, zoom: zoom });
}

function pulsate(vectorLayer, color, feature, duration, mstyle, callback) {
  var start = new Date().getTime();

  var key = vectorLayer.on("postrender", function (event) {
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
            color: "rgba(119, 170, 203, " + fillOpacity + ")",
          }),
          stroke: new Stroke({
            color: "rgba(119, 170, 203, " + opacity + ")",
            width: 2 + opacity,
          }),
        }),
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

  // var key = window.map.on("postrender", function(event) {
  //   console.log(event);
  //   //var vectorContext = getVectorContext(event);
  //   if (event.vectorContext === undefined) return;
  //   var vectorContext = event.vectorContext;
  //   var frameState = event.frameState;
  //   var flashGeom = feature.getGeometry().clone();
  //   var elapsed = frameState.time - start;
  //   var elapsedRatio = elapsed / duration;
  //   var radius = easeOut(elapsedRatio) * 35 + 5;
  //   var opacity = easeOut(1 - elapsedRatio);
  //   var fillOpacity = easeOut(0.5 - elapsedRatio);

  //   vectorContext.setStyle(
  //     new Style({
  //       image: new CircleStyle({
  //         radius: radius,
  //         snapToPixel: false,
  //         fill: new Fill({
  //           color: "rgba(119, 170, 203, " + fillOpacity + ")"
  //         }),
  //         stroke: new Stroke({
  //           color: "rgba(119, 170, 203, " + opacity + ")",
  //           width: 2 + opacity
  //         })
  //       })
  //     })
  //   );

  //   vectorContext.drawGeometry(flashGeom);

  //   // Draw the marker (again)
  //   vectorContext.setStyle(mstyle);
  //   vectorContext.drawGeometry(feature.getGeometry());

  //   if (elapsed > duration) {
  //     unByKey(key);
  //     //pulsate(color, feature, duration); // recursive function
  //     callback();
  //   }

  //   window.map.render();
  // });
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
      zoom: 13,
    })
  );
}

export function formatTitleCase(str, maxLength = undefined) {
  //replace title case with space
  //replace underscore with space
  let formattedTitle = toTitleCase(
    str
      .split(/(?=[A-Z]{1}[a-z]+)|(?=[_ .])/)
      .join(" ")
      .replace(/[_.]/gm, "")
      .toLowerCase()
  );
  if (maxLength && maxLength < formattedTitle.length) formattedTitle = formattedTitle.substring(0, maxLength) + "...";
  return formattedTitle;
}

export function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

// OL BUG
// WORKAROUND - OL BUG -- https://github.com/openlayers/openlayers/issues/6948#issuecomment-374915823
// OL BUG
// export function convertMouseUpToClick(e) {
//   const evt = new CustomEvent("click", { bubbles: true });
//   evt.pageY = e.pageY;
//   evt.pageX = e.pageX;
//   evt.stopPropagation = () => {};
//   e.target.dispatchEvent(evt);
// }

// GET FEATURES FROM GEOJSON
export function getFeaturesFromGeoJSON(geoJSON) {
  return new GeoJSON().readFeatures(geoJSON);
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
    rotation: rotation,
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
export function stringDivider(str, width, spaceReplacer) {
  if (str.length > width) {
    var p = width;
    while (p > 0 && str[p] !== " " && str[p] !== "-") {
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

export function saveToStorage(storageKey, item) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(item));
  } catch (e) {
    console.log(e);
    cleanupStorage();
  }
}
export function cleanupStorage() {
  const keys = ["searchHistory"];
  keys.forEach((key) => {
    let localStore = JSON.parse(window.localStorage.getItem(key));
    window.localStorage.removeItem(key);
    if (key === "searchHistory") {
      if (localStore.length > 0) {
        let cleanedSearchHistory = [];
        localStore.forEach((item) => {
          delete item["geojson"];
          cleanedSearchHistory.push(item);
        });
        localStore = JSON.stringify(cleanedSearchHistory);
      }
    }
    window.localStorage.setItem(key, localStore);
  });
}

export function appendToStorage(storageKey, item, limit = undefined) {
  let items = getItemsFromStorage(storageKey);
  if (items === undefined) items = [];
  item.dateAdded = new Date().toLocaleString();
  items.unshift(item);
  if (limit !== undefined) {
    if (items.length > limit) items.pop();
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch (e) {
    console.log(e);
    cleanupStorage();
  }
}

export function getItemsFromStorage(key) {
  const storage = window.localStorage.getItem(key);
  if (storage === null) return undefined;

  const data = JSON.parse(storage);
  return data;
}

export function postJSON(url, data = {}, callback) {
  // Default options are marked with *
  return fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, cors, *same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      //'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrer: "no-referrer", // no-referrer, *client
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  })
    .then((res) => {
      return res.json();
    })
    .then((json) => {
      callback(json);
    });
}
export function postUrl(url, callback) {
  // Default options are marked with *
  return fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, cors, *same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    redirect: "follow", // manual, *follow, error
    referrer: "no-referrer", // no-referrer, *client
  }).then((res) => {
    callback(res);
  });
}
export function featureToGeoJson(feature) {
  return new GeoJSON({
    dataProjection: "EPSG:3857",
    featureProjection: "EPSG:3857",
  }).writeFeature(feature, {
    dataProjection: "EPSG:3857",
    featureProjection: "EPSG:3857",
  });
}

export function getWKTFeature(wktString) {
  if (wktString === undefined) return;

  // READ WKT
  var wkt = new WKT();
  var feature = wkt.readFeature(wktString, {
    dataProjection: "EPSG:3857",
    featureProjection: "EPSG:3857",
  });
  return feature;
}

export function getWKTStringFromFeature(feature) {
  var wkt = new WKT();
  const wktString = wkt.writeFeature(feature);
  //console.log(wktString);
  return wktString;

  // if (wktString === undefined) return;

  // // READ WKT
  // var wkt = new WKT();
  // var feature = wkt.readFeature(wktString, {
  //   dataProjection: "EPSG:3857",
  //   featureProjection: "EPSG:3857"
  // });
  // return feature;
}

export function formatReplace(fmt, ...args) {
  if (!fmt.match(/^(?:(?:(?:[^{}]|(?:\{\{)|(?:\}\}))+)|(?:\{[0-9]+\}))+$/)) {
    throw new Error("invalid format string.");
  }
  return fmt.replace(/((?:[^{}]|(?:\{\{)|(?:\}\}))+)|(?:\{([0-9]+)\})/g, (m, str, index) => {
    if (str) {
      return str.replace(/(?:{{)|(?:}})/g, (m) => m[0]);
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

//Generate Feature Reports for a Polygon (reproting area)
export function generateReport(feature, report, buffer = 0, callback = undefined) {
  const url = mainConfig.reportsUrl + report;
  let geom = feature.getGeometry();
  //const utmNad83Geometry = geom.transform("EPSG:3857", _nad83Proj);
  const geoJSON = getGeoJSONFromGeometry(geom);
  const obj = { geoJSON: geoJSON, srid: "3857", buffer: buffer };
  return fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, cors, *same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      //'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrer: "no-referrer", // no-referrer, *client
    body: JSON.stringify(obj), // body data type must match "Content-Type" header
    xhrFields: {
      responseType: "blob",
    },
  })
    .then((response) => response.blob())
    .then((blob) => {
      var d = new Date(Date.now());
      download(blob, "Report " + d.toISOString().slice(0, 10).replace(/-/g, "") + d.toTimeString().slice(0, 8).replace(/:/g, "") + ".xlsx", { isBlob: true });
      callback(true);
    });
}

export function download(url, filename = undefined, options = undefined) {
  if (!options) options = {};
  try {
    var link = document.createElement("a");

    if (options.isBlob) {
      url = window.URL.createObjectURL(url);
    }
    link.setAttribute("href", `${url}`);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
    if (filename) {
      link.setAttribute("download", filename);
      document.body.appendChild(link); // Required for FF
      link.click();
      document.body.removeChild(link); //afterwards we remove the element again
      if (options.isBlob) URL.revokeObjectURL(link.href);
    } else {
      window.open(url, `_blank`);
    }
  } catch (e) {
    window.open(url, `_blank`);
  }
}

export function previewReport(feature, report, buffer = 0, callback) {
  const url = mainConfig.reportsUrl + report;
  let geom = feature.getGeometry();
  //const utmNad83Geometry = geom.transform("EPSG:3857", _nad83Proj);
  const geoJSON = getGeoJSONFromGeometry(geom);
  const obj = { geoJSON: geoJSON, srid: "3857", buffer: buffer };
  return fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, cors, *same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      //'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrer: "no-referrer", // no-referrer, *client
    body: JSON.stringify(obj), // body data type must match "Content-Type" header
  })
    .then((res) => {
      return res.json();
    })
    .then((json) => {
      callback(json);
    });
}

export function bufferGeometry(geometry, distanceMeters, callback) {
  waitForLoad("settings", Date.now(), 30, () => {
    const url = window.config.apiUrl + "public/map/geometry/buffer/";

    // PROJECT TO UTM FOR ACCURACY
    const utmNad83Geometry = geometry.transform("EPSG:3857", _nad83Proj);
    const geoJSON = getGeoJSONFromGeometry(utmNad83Geometry);
    const obj = { geoJSON: geoJSON, distance: distanceMeters, srid: "26917" };

    postJSON(url, obj, (result) => {
      // REPROJECT BACK TO WEB MERCATOR
      const olGeoBuffer = getGeometryFromGeoJSON(result.geojson);
      const utmNad83GeometryBuffer = olGeoBuffer.transform("EPSG:26917", "EPSG:3857");

      callback(utmNad83GeometryBuffer);
    });
  });
}

export function disableKeyboardEvents(disable) {
  if (window.map !== undefined && window.map !== null) {
    window.map.getInteractions().forEach(function (interaction) {
      if (interaction instanceof KeyboardPan || interaction instanceof KeyboardZoom) {
        interaction.setActive(!disable);
      }
    });
  }
}

export function getGeometryCenter(geometry, callback) {
  waitForLoad("settings", Date.now(), 30, () => {
    const url = window.config.apiUrl + "public/map/geometry/center/";
    const geoJSON = getGeoJSONFromGeometry(geometry);
    const obj = { geoJSON: geoJSON, srid: "3857" };

    postJSON(url, obj, (result) => {
      const olGeo = getGeometryFromGeoJSON(result.geojson);
      callback(olGeo);
    });
  });
}
export async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

export function replaceAllInString(str, find, replace) {
  return str.replace(new RegExp(_escapeRegExp(find), "g"), replace);
}
function _escapeRegExp(str) {
  // eslint-disable-next-line
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

export function showFeaturePopup(coord, feature) {
  window.popup.show(coord, <FeatureContent feature={feature} class="sc-live-layer-popup-content" />);
}

export function removeURLParameter(url, parameter) {
  //prefer to use l.search if you have a location/link object
  var urlparts = url.split("?");
  if (urlparts.length >= 2) {
    var prefix = encodeURIComponent(parameter) + "=";
    var pars = urlparts[1].split(/[&;]/g);

    //reverse iteration as may be destructive
    for (var i = pars.length; i-- > 0; ) {
      //idiom for string.startsWith
      if (pars[i].lastIndexOf(prefix, 0) !== -1) {
        pars.splice(i, 1);
      }
    }

    return urlparts[0] + (pars.length > 0 ? "?" + pars.join("&") : "");
  }
  return url;
}

export function FilterKeys(feature) {
  //WILDCARD = .*
  //LITERAL STRING = [] EG: [_][.]
  //NOT STRING = (?!string) EG: geostasis[.](?!test).*
  const filterKeys = ["[_].*", "id", "geometry", "geom", "extent_geom", ".*gid.*", "globalid", "objectid.*", "shape.*", "displayfieldname", "displayfieldvalue", "geostasis[.].*", ".*fid.*"];
  const featureProps = feature.getProperties();

  let keys = Object.keys(featureProps);
  const filterByKeyName = (keyName) => {
    return (
      filterKeys.filter((filterItem) => {
        let returnValue = false;
        var regexTest = new RegExp(`^${filterItem}$`);
        returnValue = regexTest.test(keyName);
        return returnValue;
      }).length === 0
    );
  };
  keys = keys.filter((key, i) => {
    const keyName = key.toLowerCase();
    let val = feature.get(key);
    if (val === null) val = "";
    if (typeof val === "object") return false; //EXCLUDE ALL OBJECT FIELDS
    return filterByKeyName(keyName);
  });
  return keys;
}
export function FeatureContent(props) {
  let keys = FilterKeys(props.feature);
  return (
    <div className={props.class}>
      {keys.map((keyName, i) => {
        let val = props.feature.get(keyName);
        return <InfoRow key={getUID()} value={val} label={formatTitleCase(keyName)} />;
      })}
    </div>
  );
}

export function removeMapControl(map, controlType) {
  const remove = (control) => {
    map.removeControl(control);
  };
  map.getControls().forEach(function (control) {
    if (controlType === "zoom" && control instanceof Zoom) {
      remove(control);
    }
    if (controlType === "rotate" && control instanceof Rotate) {
      remove(control);
    }
    if (controlType === "fullscreen" && control instanceof FullScreen) {
      remove(control);
    }
    if (controlType === "scaleLine" && control instanceof ScaleLine) {
      remove(control);
    }
  }, this);
}

export function addMapControl(map, controlType, newControl = undefined) {
  const add = (control) => {
    if (!hasMapControl(map, controlType)) map.addControl(control);
  };
  switch (controlType) {
    case "rotate":
      if (newControl !== undefined) {
        add(newControl);
      } else add(new Rotate());
      break;
    case "zoom":
      if (newControl !== undefined) {
        add(newControl);
      } else add(new Zoom());
      break;
    case "fullscreen":
      if (newControl !== undefined) {
        add(newControl);
      } else add(new FullScreen());
      break;
    case "scaleLine":
      if (newControl !== undefined) {
        add(newControl);
      } else add(new ScaleLine({ minWidth: 100 }));
      break;
    default:
      break;
  }
}
function hasMapControl(map, controlType) {
  let returnResult = false;
  map.getControls().forEach(function (control) {
    if (controlType === "zoom" && control instanceof Zoom) {
      returnResult = true;
    }
    if (controlType === "rotate" && control instanceof Rotate) {
      returnResult = true;
    }
    if (controlType === "fullscreen" && control instanceof FullScreen) {
      returnResult = true;
    }
    if (controlType === "scaleLine" && control instanceof ScaleLine) {
      returnResult = true;
    }
  }, this);
  return returnResult;
}

export function TableDisplay(props) {
  const { info } = props;
  if (info === null) return <div />;
  return (
    <table>
      <tbody>
        <tr key={getUID()}>
          {Object.keys(info[0]).map((key) => (
            <th key={getUID()}>{key}</th>
          ))}
        </tr>
        {info.map((item) => (
          <tr key={getUID()}>
            {Object.values(item).map((val) => (
              <td key={getUID()} style={{ border: "1px solid black", padding: "5px 5px" }}>
                {val}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function getBase64FromImageUrlWithParams(url, params = undefined, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url);
  if (params !== undefined) {
    for (const [key, value] of Object.entries(params)) {
      xhr.setRequestHeader(key, value);
    }
  }

  xhr.onload = function () {
    var response = xhr.responseText;
    var binary = "";

    for (var i = 0; i < response.length; i++) {
      binary += String.fromCharCode(response.charCodeAt(i) & 0xff);
    }
    var img = new Image();

    img.setAttribute("crossOrigin", "anonymous");

    img.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = this.width;
      canvas.height = this.height;

      var ctx = canvas.getContext("2d");
      ctx.drawImage(this, 0, 0);

      var dataURL = canvas.toDataURL("image/png");

      callback(this.height, dataURL);
    };

    img.src = "data:image/png;base64," + btoa(binary);
  };
  xhr.overrideMimeType("text/plain; charset=x-user-defined");
  xhr.send();
}

export function getBase64FromImageUrl(url, callback) {
  var img = new Image();

  img.setAttribute("crossOrigin", "anonymous");

  img.onload = function () {
    var canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    var ctx = canvas.getContext("2d");
    ctx.drawImage(this, 0, 0);

    var dataURL = canvas.toDataURL("image/png");

    //var data = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
    callback(this.height, dataURL);
  };

  img.src = url;
}

export function waitForLoad(items, startTime = Date.now(), timeout = 30, callback) {
  if (startTime + timeout * 1000 <= Date.now()) {
    showMessage("Timeout", "Items Failed to load in a timely manner. Please reload the page", messageColors.red);
    console.error("timeout loading", items);
  } else {
    if (isLoaded(items)) {
      //console.log("wait for load", items, Date.now() - startTime);
      callback();
    } else {
      setTimeout(() => waitForLoad(items, startTime, timeout, callback), 50);
    }
  }
}
export function isLoaded(items) {
  if (Array.isArray(items)) {
    let returnResult = true;
    items.forEach((item) => {
      if (returnResult) returnResult = window.loaded.includes(item.toLowerCase());
    });
    return returnResult;
  } else {
    return window.loaded.includes(items.toLowerCase());
  }
}
export function addIsLoaded(item) {
  if (!window.loaded.includes(item.toLowerCase())) window.loaded.push(item.toLowerCase());
}
export function removeIsLoaded(item) {
  if (window.loaded.includes(item.toLowerCase())) window.loaded.splice(window.loaded.indexOf(item.toLowerCase()), 1);
}

export function loadConfig(callback) {
  const storageMapDefaultsKey = "Map Defaults";

  //url parameters
  //local config
  //settings api
  //local storage

  //get url parameters
  let config = mainConfig;
  //let localSettings = localStorage;
  //config = mergeObj(config, localSettings);

  const queryString = window.location.search;
  let mapId = null;
  let loaderType = "DEFAULT"; //MAPID, ARCGIS, GEOSERVER
  let geoserverUrl = config.toc.geoserverLayerGroupsUrl;
  let geoserverUrlType = config.toc.geoserverLayerGroupsUrlType;
  let tocType = config.toc.tocType;

  let esriServiceUrl = config.toc.esriServiceUrl;
  if (queryString.length > 0) {
    const urlParams = new URLSearchParams(queryString);
    const url_mapId = urlParams.get("MAP_ID");
    const url_geoserverUrlType = urlParams.get("GEO_TYPE");
    const url_tocType = urlParams.get("TOCTYPE");
    const url_geoserverUrl = urlParams.get("GEO_URL");
    const url_esriServiceUrl = urlParams.get("ARCGIS_SERVICE");
    const viewerMode = urlParams.get("MODE");

    if (url_geoserverUrlType !== null) geoserverUrlType = url_geoserverUrlType;
    if (url_mapId !== null) {
      mapId = url_mapId.toLowerCase();
      loaderType = "MAPID";
      config["mapId"] = mapId;
    }
    if (viewerMode !== null) {
      config["viewerMode"] = viewerMode;
    }
    if (url_geoserverUrl !== null) {
      geoserverUrl = url_geoserverUrl;
      loaderType = "GEOSERVER";
    }
    if (url_esriServiceUrl !== null) {
      esriServiceUrl = url_esriServiceUrl;
      loaderType = "ARCGIS";
    }
    if (url_tocType !== null) tocType = url_tocType;
  }

  if (tocType !== config.toc.tocType) config.toc["tocType"] = tocType;
  if (geoserverUrl !== config.toc.geoserverLayerGroupsUrl) {
    if (!geoserverUrl.toLowerCase().includes("request=GetCapabilities")) geoserverUrl = `${geoserverUrl}/ows?service=wms&version=1.3.0&request=GetCapabilities`;
    config.toc["geoserverLayerGroupsUrl"] = geoserverUrl;
  }
  if (geoserverUrlType !== config.toc.geoserverLayerGroupsUrlType) config.toc["geoserverLayerGroupsUrlType"] = geoserverUrlType;
  if (esriServiceUrl !== config.toc.esriServiceUrl) config.toc["esriServiceUrl"] = esriServiceUrl;

  if (loaderType === "DEFAULT") {
    if (mapId !== null && mapId !== undefined && mapId.trim() !== "") {
      config["mapId"] = mapId;
      loaderType = "MAPID";
    } else if (geoserverUrl !== null && geoserverUrl !== undefined && geoserverUrl.trim() !== "") {
      loaderType = "GEOSERVER";
    } else if (esriServiceUrl !== null && esriServiceUrl !== undefined && esriServiceUrl.trim() !== "") {
      loaderType = "ARCGIS";
    }
  }

  config.toc["loaderType"] = loaderType;
  if (mapId === null) mapId = config.mapId;
  if (config.useMapConfigApi || (mapId !== null && mapId !== undefined && mapId.trim() !== "")) {
    config.toc["loaderType"] = "MAPID";
    const mapSettingURL = (apiUrl, mapId) => {
      if (mapId === null || mapId === undefined || mapId.trim() === "") return `${apiUrl}public/map/default`;
      else return `${apiUrl}public/map/${mapId}`;
    };
    getJSON(mapSettingURL(config.apiUrl, mapId), (result) => {
      if (result.json === undefined) {
        setTimeout(() => {
          showMessage("Map ID Failed", "Map ID failed to load", messageColors.red);
        }, 1500);
        window.config = config;
        callback();
      }
      const settings = JSON.parse(result.json);
      if (settings.name !== undefined) document.title = settings.name;
      if (settings.zoom_level !== undefined) {
        settings["defaultZoom"] = settings.zoom_level;
        delete settings.zoom_level;
      }
      if (settings.center !== undefined) {
        settings["centerCoords"] = Array.isArray(settings.center) ? settings.center : settings.center.replace(" ", "").split(",");
        delete settings.center;
      }
      sessionStorage.setItem(
        storageMapDefaultsKey,
        JSON.stringify({
          center: settings.centerCoords,
          zoom: settings.defaultZoom,
        })
      );
      if (settings.sidebarToolComponents !== undefined) settings.sidebarToolComponents = mergeObjArray(config.sidebarToolComponents, settings.sidebarToolComponents);
      if (settings.sidebarThemeComponents !== undefined) settings.sidebarThemeComponents = mergeObjArray(config.sidebarThemeComponents, settings.sidebarThemeComponents);
      if (settings.sidebarShortcutParams !== undefined) settings.sidebarShortcutParams = mergeObjArray(config.sidebarShortcutParams, settings.sidebarShortcutParams);
      // if (settings.baseMapType !== undefined) settings.baseMapType = config.baseMapType;
      // if (settings.baseMapServices !== undefined) settings.baseMapServices = mergeObjArray(config.baseMapServices, settings.baseMapServices);

      //TRANSPOSE LEGACY TOC SETTINGS
      if (settings.toc === undefined) settings["toc"] = {};
      if (settings.default_toc_style !== undefined) {
        settings.toc["tocType"] = settings.default_toc_style;
        delete settings.default_toc_style;
      }

      if (settings.default_group !== undefined) {
        settings.toc["default_group"] = settings.default_group;
        delete settings.default_group;
      }
      if (settings.sources !== undefined) {
        settings.toc["sources"] = settings.sources;
        delete settings.sources;
      }

      //TODO: OVERRIDE INDIVIDUAL THEME, TOOL, OR BASEMAP SETTINGS????
      config = mergeObj(config, settings);
      window.config = config;
      callback();
    });
  } else {
    window.config = config;
    callback();
  }
}

export function getConfig(component, name) {
  let configArray = [];
  switch (component.toLowerCase()) {
    case "tools":
      configArray = window.config["sidebarToolComponents"];
      break;
    case "themes":
      configArray = window.config["sidebarThemeComponents"];
      break;
    default:
      break;
  }
  return configArray.filter((item) => item.name !== undefined && item.name.toLowerCase() === name.toLowerCase())[0];
}

export function mergeObjArray(targetArray, sourceArray) {
  let resultArray = [];
  targetArray.forEach((targetObj) => {
    let sourceObj = sourceArray.filter((source) => targetObj.id == source.id)[0];
    if (sourceObj !== undefined) {
      resultArray.push(mergeObj(targetObj, sourceObj));
      sourceArray = sourceArray.filter((source) => sourceObj.id !== source.id);
    } else resultArray.push(targetObj);
  });
  return resultArray.concat(sourceArray);
}
export function mergeObj(targetObj, sourceObj, append = false) {
  Object.keys(sourceObj).forEach((key) => {
    if (typeof targetObj[key] === "object" && !(targetObj[key] instanceof Array)) {
      targetObj[key] = mergeObj(targetObj[key], sourceObj[key]);
    } else {
      if (targetObj[key] instanceof Array && append) {
        targetObj[key] = [].concat(sourceObj[key], targetObj[key]);
      } else targetObj[key] = sourceObj[key];
    }
  });
  return targetObj;
}

export function extentHistory(action, center = undefined, zoom = undefined) {
  const mapExtentHistoryKey = "mapExtentHistory";
  const mapExtentHistoryCurrentKey = "mapExtentHistoryCurrent";
  let index = parseInt(sessionStorage.getItem(mapExtentHistoryCurrentKey));
  let extents = sessionStorage.getItem(mapExtentHistoryKey) === null ? [] : JSON.parse(sessionStorage.getItem(mapExtentHistoryKey));

  switch (action) {
    case "init":
      sessionStorage.setItem(mapExtentHistoryKey, JSON.stringify([{ center: center, zoom: zoom }]));
      sessionStorage.setItem(mapExtentHistoryCurrentKey, 0);
      break;
    case "save":
      if (!zoom) zoom = window.map.getView().getZoom();
      if (!center) center = window.map.getView().getCenter();
      const currentExtentItem = extents[index];
      if (currentExtentItem.zoom !== zoom || (currentExtentItem.center[0] !== center[0] && currentExtentItem.center[1] !== center[1])) {
        index++;
        extents.push({ center: center, zoom: zoom });
        sessionStorage.setItem(mapExtentHistoryKey, JSON.stringify(extents));
        sessionStorage.setItem(mapExtentHistoryCurrentKey, index);
      }

      break;
    case "next":
      if (index === extents.length - 1) return;
      if (extents[index + 1] !== undefined) {
        sessionStorage.setItem(mapExtentHistoryCurrentKey, index + 1);
        window.map.getView().setZoom(extents[index + 1].zoom);
        window.map.getView().setCenter(extents[index + 1].center);
      }
      break;
    case "previous":
      if (index === 0) return;
      if (extents[index - 1] !== undefined) {
        sessionStorage.setItem(mapExtentHistoryCurrentKey, index - 1);
        window.map.getView().setZoom(extents[index - 1].zoom);
        window.map.getView().setCenter(extents[index - 1].center);
      }
      break;
    default:
      break;
  }
  window.emitter.emit("extentHistoryChanged", index, extents.length);
}
export function getARNListFromGeom(geom, callback) {
  const arnURLTemplate = (mainURL, wkt) => `${mainURL}&cql_filter=INTERSECTS(geom,${wkt})`;

  const feature = new Feature(geom);
  const wktString = getWKTStringFromFeature(feature);
  const parcelURL = arnURLTemplate(window.config.parcelLayer.url, wktString);

  const tmpArnArray = [];
  getJSON(parcelURL, (result) => {
    if (result.features.length === 0) return;
    const features = result.features;
    features.forEach((feature) => {
      tmpArnArray.push(feature.properties[window.config.parcelLayer.rollNumberFieldName.toLowerCase()]);
    });

    callback(tmpArnArray);
  });
}
export function getFeaturesFromGeom(wfsUrl, geomFieldName, queryGeom, callback) {
  const urlTemplate = (mainURL, geomField, wkt) => `${mainURL}&cql_filter=INTERSECTS(${geomField},${wkt})`;
  let bufferDistance = -1;

  if (!(queryGeom instanceof Polygon)) {
    let geomExtent = queryGeom.getExtent();
    queryGeom = fromExtent(geomExtent);
    bufferDistance = 1;
  }
  bufferGeometry(queryGeom, bufferDistance, (resultGeom) => {
    const feature = new Feature(resultGeom);
    const wktString = getWKTStringFromFeature(feature);
    const queryUrl = urlTemplate(wfsUrl, geomFieldName, wktString);
    getJSON(queryUrl, (result) => {
      if (result.features.length === 0) callback([]);
      else {
        const features = new GeoJSON().readFeatures(result);
        callback(features);
      }
    });
  });
}

export function getBaseUrl(url) {
  let splitUrl = url.split("/");
  splitUrl.slice(0, 3);
  return splitUrl.slice(0, 3).join("/");
}

export function getCentroidCoords(geom) {
  const area = geom.getArea();
  const points = geom.getCoordinates();
  const allPoints = points.flatMap((point) => point);
  let x = 0;
  let y = 0;
  for (let i = 0, j = allPoints.length - 1; i < allPoints.length; j = i, i++) {
    const point1 = allPoints[i];
    const point2 = allPoints[j];
    const f = point1[0] * point2[1] - point2[0] * point1[1];
    x += (point1[0] + point2[0]) * f;
    y += (point1[1] + point2[1]) * f;
  }

  const f = area * 6;
  return [x / f, y / f];
}

export const roundTime = (date) => {
  var coeff = 1000 * 60 * 10;
  var rounded = new Date(Math.round(date.getTime() / coeff) * coeff);
  return rounded;
};

export const arrayMoveMutable = (array, fromIndex, toIndex) => {
  const startIndex = fromIndex < 0 ? array.length + fromIndex : fromIndex;

  if (startIndex >= 0 && startIndex < array.length) {
    const endIndex = toIndex < 0 ? array.length + toIndex : toIndex;

    const [item] = array.splice(fromIndex, 1);
    array.splice(endIndex, 0, item);
  }
};
export const arrayMoveImmutable = (array, fromIndex, toIndex) => {
  const newArray = [...array];
  arrayMoveMutable(newArray, fromIndex, toIndex);
  return newArray;
};
