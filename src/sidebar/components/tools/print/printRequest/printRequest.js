import * as helpers from "../../../../../helpers/helpers";
import mainConfig from "../../../../../config.json";
import config from "../config.json";
import utils from "./utils";
import { FeatureHelpers, OL_DATA_TYPES } from "../../../../../helpers/OLHelpers";
import * as drawingHelpers from "../../../../../helpers/drawingHelpers";

import { Vector as VectorLayer, Tile as TileLayer, Image as ImageLayer, Group as LayerGroup } from "ol/layer.js";

// ..........................................................................
// Load Tile matrix and build out WMTS Object
// ..........................................................................

//pulls in tile matrix from each basemap tilelayer capabilities
export async function loadTileMatrix(url) {
  let response = await fetch(url);
  let data = await response.text();
  let xml = new window.DOMParser().parseFromString(data, "text/xml");
  let json = utils.xmlToJson(xml);
  let flatTileMatrix = json.Capabilities.Contents.TileMatrixSet[0].TileMatrix;
  let tileMatrix = flatTileMatrix.map((m) => {
    return {
      identifier: m["ows:Identifier"]["#text"],
      scaleDenominator: Number(m["ScaleDenominator"]["#text"]),
      topLeftCorner: [Number(m["TopLeftCorner"]["#text"].split(" ")[0]), Number(m["TopLeftCorner"]["#text"].split(" ")[1])],
      tileSize: [256, 256],
      matrixSize: [Number(m["MatrixWidth"]["#text"]), Number(m["MatrixHeight"]["#text"])],
    };
  });
  return tileMatrix;
}

//build and loads wmts config for each layer
export async function loadWMTSConfig(url, opacity) {
  let wmtsCongif = {};

  wmtsCongif.type = "WMTS";
  wmtsCongif.imageFormat = "image/png";
  wmtsCongif.opacity = opacity;
  wmtsCongif.style = "Default Style";
  wmtsCongif.version = "1.0.0";
  wmtsCongif.dimensions = [];
  wmtsCongif.dimensionParams = {};
  wmtsCongif.requestEncoding = "REST";
  wmtsCongif.customParams = {
    TRANSPARENT: "true",
  };
  wmtsCongif.matrixSet = "EPSG:3857";
  wmtsCongif.baseURL = url + "/tile/{TileMatrix}/{TileRow}/{TileCol}";
  wmtsCongif.layer = utils.extractServiceName(url);
  wmtsCongif.matrices = await loadTileMatrix(url + "/WMTS/1.0.0/WMTSCapabilities.xml");

  return wmtsCongif;
}
//build vector layer 
const buildVectorLayer = (layer, callback = undefined)=> {
  let returnLayers = [];
  let olFeatures = [];
  var extent = window.map.getView().calculateExtent(window.map.getSize());
  layer.getSource().forEachFeatureInExtent(extent, function(feature){
    olFeatures.push(feature);
  }); 
  olFeatures.forEach((item)=>{
    let styles = {version: "2",};
    let itemSymbolizers = [];
    const itemFilter = `*`;
    let olStyle = item.getStyle();
    if (olStyle === null || olStyle.fill_ === undefined || olStyle.stroke_ === undefined || olStyle.text_ === undefined){
      olStyle = drawingHelpers.getDefaultDrawStyle("#e809e5");
    }
    let olFill = olStyle.fill_ !== null && olStyle.fill_ !== undefined ? olStyle.getFill() : null;
    let olStroke = olStyle.stroke_ !== null && olStyle.stroke_ !== undefined ? olStyle.getStroke() : null;
    let olText = olStyle.text_ !== null && olStyle.text_ !== undefined ? olStyle.getText() : null;
    const olImage = olStyle.image_ !== null && olStyle.image_ !== undefined ? olStyle.getImage() : null;
    if (olFill === null && olImage !== null) {
      olFill = olImage.fill_;
    }
    if (olStroke === null && olImage !== null) {
      olStroke = olImage.stroke_;
    }
    if (olFill === null && olImage !== null) {
      olText = olImage.text_;
    }
    let itemStrokeFill = {};
    itemStrokeFill.type = config.drawTypes[item.get("drawType")];
    //if drawType is undefined try setting based on geometry type
    if (itemStrokeFill.type === undefined) itemStrokeFill.type = config.drawTypes[item.getGeometry().getType()];
    //if unsupported geometry type, default to Polygon
    if (itemStrokeFill.type === undefined) itemStrokeFill.type = "Polygon";

    if (olFill !== null) {
      itemStrokeFill.fillColor = utils.rgbToHex(...olFill.color_);
      itemStrokeFill.fillOpacity = olFill.color_[3];
    }
    if (olStroke !== null) {
      itemStrokeFill.strokeColor = utils.rgbToHex(...olStroke.color_);
      itemStrokeFill.strokeOpacity =olStroke.color_[3];
      itemStrokeFill.strokeWidth =olStroke.width_;
    }
    itemSymbolizers.push(itemStrokeFill);
    const lookupFont = (font) => {
      const foundFont = config.fonts.find(item=> font.toLowerCase() === item.toLowerCase());
      if (foundFont){
        return foundFont;
      }else{
        return config.fonts[0];
      }
    };

    if (olText !== null){
      const font = olText.font_.split(" ");

      let itemText = {
        "type": "text",
        "fontFamily": lookupFont(font[2]),
        "fontSize": font[1],
        "fontStyle": "normal",
        "fontWeight": font[0],
        "haloColor": olText.stroke_.color_,
        "haloOpacity": 1,
        "haloRadius": Number(olText.stroke_.width_)+1,
        "label": olText.text_,
        "fillColor": olText.fill_.color_,
        "labelAlign": `${olText.textAlign_.substring(0,1)}${olText.textBaseline_.substring(0,1)}`,
        "labelRotation": drawingHelpers._degrees(olText.rotation_),
        "labelXOffset": olText.offsetX_ * -1,
        "labelYOffset": olText.offsetY_ * -1,
        "goodnessOfFit": 0
      }
      itemSymbolizers.push(itemText);
    }
    styles[itemFilter] = {
      "symbolizers": itemSymbolizers
    }
    let itemLayer = {
      type: "geojson",
      geoJson: {},
      name: `${layer.get("name")}-${item.ol_uid}`,
      style: styles,
    };

    let feature = FeatureHelpers.setFeatures([item], OL_DATA_TYPES.GeoJSON, "EPSG:4326", "EPSG:4326");
    if (feature !== undefined){
      feature = JSON.parse(feature);
      
      itemLayer.geoJson=feature.features.map(item =>{
                          if (item.properties === null) item.properties = {};
                          return item;
                        });
      returnLayers.push(itemLayer)
    } 
  });
  if (returnLayers.length === 0) returnLayers = undefined;
  if (callback !== undefined) callback(returnLayers);
  else return returnLayers;
}

let configureTileLayer = async (l) => {
  let tileUrl = null;
  const layerSource = l.getSource();
  tileUrl = layerSource.getUrls();
  tileUrl = tileUrl[0].split("/tile")[0];
  // if (l.values_.source.key_ === "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}") {
  //   tileUrl = l.values_.source.key_.split("/tile")[0];
  // } else {
  //   let entries = l.values_.source.tileCache.entries_;
  //   tileUrl = entries[Object.keys(entries)[0]].value_.src_.split("/tile")[0];
  // }
  let retLayer = await loadWMTSConfig(tileUrl, l.values_.opacity);
  retLayer.customParams.zIndex = l.getZIndex() + l.get("printIndex");
  return retLayer;
};

const configureImageLayer = (l) => {
  return ({
    type: "wms",
    baseURL: mainConfig.geoserverUrl + "wms",
    serverType: "geoserver",
    opacity: l.values_.opacity,
    layers: [l.values_.source.params_.LAYERS],
    imageFormat: "image/png",
    customParams: {
      TRANSPARENT: "true",
      zIndex: l.getZIndex() + l.get("printIndex"),
    },
    version: "1.3.0",
  });
};

const getLayerByType = async (layer, callback=undefined) => {
  if (layer instanceof VectorLayer) {
    //let retLayer = configureVectorMyMapsLayer(layer);
    let retLayer = buildVectorLayer(layer);
    
    if (callback !== undefined) callback(retLayer);
    else return retLayer;
  } else if (layer instanceof ImageLayer) {
    let retLayer = configureImageLayer(layer);
    if (callback !== undefined) callback(retLayer);
    else return retLayer;
  } else if (layer instanceof TileLayer){
    //console.log(layer);
    let retLayer = await configureTileLayer(layer);
    if (callback !== undefined) callback(retLayer);
    else return retLayer;
  } else if (layer instanceof LayerGroup){
    let layers = [];
    let groupLayers = layer.getLayers().getArray();
    if (groupLayers !== undefined){
      let layersPromise = groupLayers.map((item) => getLayerByType(item, (retLayers)=>{ 
          if (retLayers !== undefined ){
            if (Array.isArray(retLayers)) layers = layers.concat(retLayers);
            else layers.push(retLayers);
          }
        })
      );
      //wait for list of layer promises to be resolved
      await Promise.all(layersPromise);
    }

    //let layers = await configureLayerGroup(layer);
    if (callback !== undefined) callback(layers);
    else return layers;
  } else {
    console.warn("Unsupported Layer Type", layer);
    if (callback !== undefined) callback();
    else return;
  }  
};
const sortLayers = (layers, callback = undefined) => {
  let sorted = layers.sort((a, b) => {
    let indexA = a.customParams === undefined ? 99999999 : a.customParams.zIndex;
    let indexB = b.customParams === undefined ? 99999999 : b.customParams.zIndex;

    if (indexA > indexB) {
      return -1;
    }
    if (indexA < indexB) {
      return 1;
    }
    return 0;
  });
  if (callback !== undefined) callback(sorted);
  else return sorted;
};

const isOverviewLayer = (layerName) => {
  return config.overviewMapLayers.includes(layerName); 
}

// ..........................................................................
// Print Request Template Switcher
// ..........................................................................
const switchTemplates = (options, callback=undefined) => {
  //shared print request properties
  const mapProjection = window.map.getView().getProjection().code_;
  const longitudeFirst = true;
  const currentMapViewCenter = window.map.getView().values_.center;
  const mapExtent = window.map.getView().calculateExtent();
  const currentMapScale = helpers.getMapScale();
  const mapScale = 2990000;
  const rotation = 0;
  const dpi = parseInt(options.mapResolutionOption);
  const printSize = options.printSizeSelectedOption.size === []? window.map.getSize() : options.printSizeSelectedOption.size

  const attributes = {
    title: options.mapTitle,
    description: options.termsOfUse,
    map: {},
    scaleBar: {
      geodetic: currentMapScale,
    },
    scale: "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
};
  attributes.map.projection = mapProjection;
  attributes.map.longitudeFirst = longitudeFirst;
  attributes.map.rotation = rotation;
  attributes.map.dpi = dpi;
  switch (options.mapScaleOption) {
    case "forceScale":
      attributes.map.scale = options.forceScale;
      attributes.map.center = currentMapViewCenter;
      break;
    case "preserveMapExtent":
      attributes.map.height = utils.computeDimension(...printSize, mapExtent).newHeight;
      attributes.map.width = utils.computeDimension(...printSize, mapExtent).newWidth;
      attributes.map.bbox = mapExtent;
      break;
    default:
      attributes.map.scale = currentMapScale;
      attributes.map.center = currentMapViewCenter;
      break;
  }

  if (options.printSizeSelectedOption.size.length === 0){
    if (options.mapOnlyHeight) attributes.map.height  = options.mapOnlyHeight;
    if (options.mapOnlyWidth) attributes.map.width  = options.mapOnlyWidth;
  }

  if (options.printSizeSelectedOption.overview){
    const overviewMap = {
      projection: mapProjection,
      center: currentMapViewCenter,
      scale: mapScale,
      longitudeFirst: longitudeFirst,
      rotation: rotation,
      dpi: dpi,
    };
    attributes["overviewMap"] = overviewMap;
  }
  if (callback !== undefined) callback(attributes);
  else return attributes;
};
// ..........................................................................
// Building pring request According to mapfish v3 config standards
// ..........................................................................
export async function printRequest(mapLayers, printSelectedOption) {
  //alternative osm layer used from maptiler:api.maptiler.com due to osm user agent user restriction policy
  //"https://api.maptiler.com/maps/streets/256/{z}/{x}/{y}.png?key=6vlppHmCcPoEbI6f1RBX";

  // init print request object
  let printRequest = {
    layout: "",
    outputFormat: "",
    dpi: parseInt(printSelectedOption.mapResolutionOption),
    compressed: true,
  };
  printRequest.outputFormat = printSelectedOption.printFormatSelectedOption.value;

  let mainMap = [];
  let overviewMap = [];
  let sortedMainMap = [];
  let sortedOverviewMap = [];
  
  //iterate through each map layer passed in the window.map
  let layerOrder = 0;
  mapLayers.forEach((layer) => {
    layerOrder++;
    layer.setProperties({printIndex: layerOrder});
  });
  let mapLayerPromises = mapLayers.map((layer) => getLayerByType(layer, (retLayers)=>{ 
        if (retLayers !== undefined ){
          if (Array.isArray(retLayers)) mainMap = mainMap.concat(retLayers);
          else mainMap.push(retLayers);
          if (Array.isArray(retLayers)){
            retLayers.forEach(item=>{
                if (isOverviewLayer(item.layer)) overviewMap.push(item);
              } 
            );
          }else{
            if (isOverviewLayer(retLayers.layer)) overviewMap.push(retLayers);
          }
        }
      
    })
  );

  //wait for list of layer promises to be resolved
  await Promise.all(mapLayerPromises);
    
  //ensures that the sorted layers executes after the intitial mapLayerList is resolved
  sortedMainMap = sortLayers(mainMap);
  
  //ensures that template configuration is executed before print request object is sent
  printRequest.attributes = switchTemplates(printSelectedOption);
  printRequest.layout = printSelectedOption.printSizeSelectedOption.layout;
  
  printRequest.attributes.map["layers"] = sortedMainMap;
  if (printRequest.attributes.overviewMap !== undefined){
    sortedOverviewMap = sortLayers(overviewMap);
    printRequest.attributes.overviewMap["layers"] = sortedOverviewMap;
  }
  return printRequest;
}
