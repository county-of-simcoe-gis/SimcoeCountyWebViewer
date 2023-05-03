import * as helpers from "../../../../../helpers/helpers";
import printConfig from "../config.json";
import utils from "./utils";
import { asArray } from "ol/color";
import { FeatureHelpers, LayerHelpers, OL_DATA_TYPES } from "../../../../../helpers/OLHelpers";
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
  let flatTileMatrix = json.Capabilities.Contents.TileMatrixSet.TileMatrix || json.Capabilities.Contents.TileMatrixSet[0].TileMatrix;
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
    zIndex: null,
  };
  wmtsCongif.matrixSet = "EPSG:3857";
  wmtsCongif.baseURL = url + "/tile/{TileMatrix}/{TileRow}/{TileCol}";
  wmtsCongif.layer = utils.extractServiceName(url);
  wmtsCongif.matrices = await loadTileMatrix(url + "/WMTS/1.0.0/WMTSCapabilities.xml");

  return wmtsCongif;
}
//build vector layer
const buildVectorLayer = (layer, callback = undefined) => {
  let returnLayers = [];
  let olFeatures = [];
  var extent = window.map.getView().calculateExtent(window.map.getSize());
  layer.getSource().forEachFeatureInExtent(extent, function (feature) {
    olFeatures.push(feature);
  });
  let olLayerStyle = layer.getStyle();

  olFeatures.forEach((item) => {
    let isHidden = false;
    let styles = { version: "2" };
    let itemSymbolizers = [];
    const itemFilter = `*`;
    let olStyle = item.getStyle();
    if (olStyle === null || (olStyle.fill_ === null && olStyle.stroke_ === null && olStyle.text_ === null && olStyle.image_ === null)) {
      isHidden = true;
    } else if (olStyle.fill_ === undefined || olStyle.stroke_ === undefined || olStyle.text_ === undefined) {
      olStyle = drawingHelpers.getDrawStyle({ drawColor: "#000000", opacity: 0 });
      if (olLayerStyle.fill_ !== null && olLayerStyle.fill_ !== undefined) olStyle.setFill(olLayerStyle.getFill());
      if (olLayerStyle.stroke_ !== null && olLayerStyle.stroke_ !== undefined) olStyle.setStroke(olLayerStyle.getStroke());
      if (olLayerStyle.text_ !== null && olLayerStyle.text_ !== undefined) olStyle.setText(olLayerStyle.getText());
      if (olLayerStyle.image_ !== null && olLayerStyle.image_ !== undefined) olStyle.setImage(olLayerStyle.getImage());
    }
    let olFill = olStyle && olStyle.fill_ !== null && olStyle.fill_ !== undefined ? olStyle.getFill() : null;
    let olStroke = olStyle && olStyle.stroke_ !== null && olStyle.stroke_ !== undefined ? olStyle.getStroke() : null;
    let olText = olStyle && olStyle.text_ !== null && olStyle.text_ !== undefined ? olStyle.getText() : null;
    const olImage = olStyle && olStyle.image_ !== null && olStyle.image_ !== undefined ? olStyle.getImage() : null;
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
    itemStrokeFill.type = printConfig.drawTypes[item.get("drawType")];
    //if drawType is undefined try setting based on geometry type
    if (itemStrokeFill.type === undefined) itemStrokeFill.type = printConfig.drawTypes[item.getGeometry().getType()];
    //if unsupported geometry type, default to Polygon
    if (itemStrokeFill.type === undefined) itemStrokeFill.type = "Polygon";

    if (olFill) {
      itemStrokeFill.fillColor = Array.isArray(olFill.color_) ? utils.rgbToHex(...olFill.color_) : olFill.color_;
      itemStrokeFill.fillOpacity = Array.isArray(olFill.color_) ? olFill.color_[3] : asArray(olFill.color_)[3];
    }
    if (olStroke) {
      itemStrokeFill.strokeColor = olStroke.color_ && Array.isArray(olStroke.color_) ? utils.rgbToHex(...olStroke.color_) : olStroke.color_;
      itemStrokeFill.strokeOpacity = olStroke.color_ && Array.isArray(olStroke.color_) ? olStroke.color_[3] : asArray(olStroke.color_)[3];
      itemStrokeFill.strokeWidth = olStroke.width_;
      if (olStroke.lineDash_ !== undefined && olStroke.lineDash_ !== null) {
        itemStrokeFill.strokeDashstyle = olStroke.lineDash_[0] === 1 ? "dot" : "dash";
        itemStrokeFill.strokeLinejoin = "round";
        itemStrokeFill.strokeLinecap = "round";
      }
    }
    if (olImage && olImage.iconImage_) {
      itemStrokeFill.rotation = parseFloat(olImage.rotation_) * (180 / Math.PI);
      itemStrokeFill.externalGraphic = olImage.iconImage_.src_;
      itemStrokeFill.graphicName = "icon";
      itemStrokeFill.graphicOpacity = olImage.opacity_;
    }
    itemSymbolizers.push(itemStrokeFill);
    const lookupFont = (font) => {
      const foundFont = printConfig.fonts.find((item) => font.toLowerCase() === item.toLowerCase());
      if (foundFont) {
        return foundFont;
      } else {
        return printConfig.fonts[0];
      }
    };

    if (olText !== null) {
      const font = olText.font_.split(" ");

      let itemText = {
        type: "text",
        fontFamily: lookupFont(font[2]),
        fontSize: font[1],
        fontStyle: "normal",
        fontWeight: font[0],
        haloColor: olText.stroke_.color_,
        haloOpacity: 1,
        haloRadius: Number(olText.stroke_.width_) + 1,
        label: olText.text_,
        fillColor: olText.fill_.color_,
        labelAlign: `${olText.textAlign_.substring(0, 1)}${olText.textBaseline_.substring(0, 1)}`,
        labelRotation: drawingHelpers._degrees(olText.rotation_),
        labelXOffset: olText.offsetX_ * -1,
        labelYOffset: olText.offsetY_ * -1,
        goodnessOfFit: 0,
      };
      itemSymbolizers.push(itemText);
    }
    styles[itemFilter] = {
      symbolizers: itemSymbolizers,
    };
    let itemLayer = {
      type: "geojson",
      geoJson: {},
      name: `${layer.get("name")}-${item.ol_uid}`,
      style: styles,
    };

    let feature = FeatureHelpers.setFeatures([item], OL_DATA_TYPES.GeoJSON, "EPSG:4326", "EPSG:4326");
    if (feature !== undefined && !isHidden) {
      feature = JSON.parse(feature);

      itemLayer.geoJson = feature.features.map((item) => {
        if (item.properties === null) item.properties = {};
        return item;
      });
      returnLayers.push(itemLayer);
    }
  });
  if (returnLayers.length === 0) returnLayers = undefined;
  if (callback !== undefined) callback(returnLayers);
  else return returnLayers;
};

let configureTileLayer = async (l) => {
  let tileUrl = null;
  const layerSource = l.getSource();
  tileUrl = layerSource.getUrls();
  tileUrl = tileUrl[0].indexOf("/MapServer/WMTS/") !== -1 ? `${tileUrl[0].split("/WMTS/")[0]}` : `${tileUrl[0].split("/tile/")[0]}`;
  let retLayer = {};
  if (l.values_.source.key_.includes("openstreetmap.org")) {
    retLayer = {
      baseURL: l.values_.source.key_.split("\n")[0],
      type: "OSM",
      imageExtension: "png",
      customParams: {
        zIndex: 1,
      },
    };
    return retLayer;
  } else {
    retLayer = await loadWMTSConfig(tileUrl, l.values_.opacity);
    const layerIndex = l.getZIndex();
    const printIndex = l.get("printIndex");
    retLayer.customParams.zIndex = layerIndex ? layerIndex + printIndex : 0 + printIndex ? printIndex : 0;
    return retLayer;
  }
};

const configureImageLayer = (l, options) => {
  var url = new URL(l.values_.source.image_.src_);
  //  console.log("original:", url.href);
  let urlParams = new URLSearchParams(url.searchParams);
  let urlDPI = parseInt(urlParams.get("DPI"));
  let urlSIZE = urlParams.get("SIZE").split(",");
  let urlBBOX = urlParams.get("BBOX").split(",");
  let printSize = !options.map.height ? window.map.getSize() : [parseInt(options.map.height), parseInt(options.map.width)];
  var extent = options.map.bbox ? options.map.bbox : utils.computeExtent(...printSize, 72, options.map.scale, options.map.center);
  let outputDPI = options.map.dpi;
  let outputSize = [
    parseInt((parseInt(urlSIZE[0]) / ((parseFloat(urlBBOX[0]) - parseFloat(urlBBOX[2])) / (parseFloat(extent[0]) - parseFloat(extent[2])))) * (outputDPI / urlDPI)),
    parseInt((parseInt(urlSIZE[1]) / ((parseFloat(urlBBOX[1]) - parseFloat(urlBBOX[3])) / (parseFloat(extent[1]) - parseFloat(extent[3])))) * (outputDPI / urlDPI)),
  ];
  if (outputSize[0] > 4096 || outputSize[1] > 4096) {
    let outputScaler = 4096 / (outputSize[0] >= outputSize[1] ? outputSize[0] : outputSize[1]);
    outputDPI = parseInt(outputDPI * outputScaler);
    outputSize = [parseInt(outputSize[0] * outputScaler), parseInt(outputSize[1] * outputScaler)];
  }
  url.searchParams.set("SIZE", outputSize.join(","));
  url.searchParams.set("DPI", outputDPI);
  url.searchParams.set("BBOX", extent.join(","));
  url.searchParams.set("BBOXSR", "3857");
  url.searchParams.set("IMAGESR", "3857");
  // console.log("calculated:", url.href);
  return {
    type: "image",
    baseURL: url,
    opacity: l.values_.opacity,
    imageFormat: "image/png",
    extent: extent,
    name: "image",
  };
};

const configureWMSImageLayer = (l) => {
  return {
    type: "wms",
    baseURL: l.values_.source.url_.split("?")[0],
    serverType: l.values_.source.serverType_,
    opacity: l.values_.opacity,
    layers: [l.values_.source.params_.LAYERS],
    imageFormat: "image/png",
    customParams: {
      TRANSPARENT: "true",
      zIndex: l.getZIndex() + l.get("printIndex"),
    },
    version: "1.3.0",
  };
};

const getLayerByType = async (layer, printoptions, callback = undefined) => {
  if (layer instanceof VectorLayer) {
    //let retLayer = configureVectorMyMapsLayer(layer);
    let retLayer = buildVectorLayer(layer);

    if (callback !== undefined) callback(retLayer);
    else return retLayer;
  } else if (layer instanceof ImageLayer) {
    let retLayer = undefined;
    if (LayerHelpers.getLayerSourceType(layer.getSource()) === OL_DATA_TYPES.ImageArcGISRest) {
      retLayer = configureImageLayer(layer, printoptions);
    } else {
      retLayer = configureWMSImageLayer(layer);
    }
    if (callback !== undefined) callback(retLayer);
    else return retLayer;
  } else if (layer instanceof TileLayer) {
    let retLayer = await configureTileLayer(layer);
    if (callback !== undefined) callback(retLayer);
    else return retLayer;
  } else if (layer instanceof LayerGroup) {
    let layers = [];
    let groupLayers = layer.getLayers().getArray();
    if (groupLayers !== undefined) {
      let layersPromise = groupLayers.map((item) =>
        getLayerByType(item, printoptions, (retLayers) => {
          if (retLayers !== undefined) {
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
  return printConfig.overviewMapLayers.includes(layerName);
};

// ..........................................................................
// Print Request Template Switcher
// ..........................................................................
const switchTemplates = (options, callback = undefined) => {
  //shared print request properties
  const mapProjection = window.map.getView().getProjection().code_;
  const longitudeFirst = true;
  const currentMapViewCenter = window.map.getView().values_.center;
  const mapExtent = window.map.getView().calculateExtent();
  const currentMapScale = helpers.getMapScale();
  const mapScale = 2990000;
  const rotation = 0;
  const dpi = parseInt(options.mapResolutionOption);
  let printSize = options.printSizeSelectedOption.size === [] ? window.map.getSize() : options.printSizeSelectedOption.size;

  const attributes = {
    title: options.mapTitle,
    description: options.termsOfUse,
    map: {},
    scalebar: {
      geodetic: currentMapScale,
    },
    scale: "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  };
  attributes.map.projection = mapProjection;
  attributes.map.longitudeFirst = longitudeFirst;
  attributes.map.rotation = rotation;
  attributes.map.dpi = dpi;

  if (options.printSizeSelectedOption.size.length === 0) {
    if (options.mapOnlyHeight) attributes.map.height = options.mapOnlyHeight;
    if (options.mapOnlyWidth) attributes.map.width = options.mapOnlyWidth;
    printSize = [options.mapOnlyWidth, options.mapOnlyHeight];
  }
  switch (options.mapScaleOption) {
    case "forceScale":
      attributes.scalebar.geodetic = parseInt(options.forceScale);
      attributes.map.scale = parseInt(options.forceScale);
      attributes.scale = "1 : " + options.forceScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

  if (options.printSizeSelectedOption.overview) {
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
  if (window.config.printLogo !== undefined) attributes["imageName"] = options.printSizeSelectedOption.imageName || window.config.printLogo;
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
  //ensures that template configuration is executed before print request object is sent
  printRequest.attributes = switchTemplates(printSelectedOption);
  printRequest.layout = printSelectedOption.printSizeSelectedOption.layout;

  let mainMap = [];
  let overviewMap = [];
  let sortedMainMap = [];
  let sortedOverviewMap = [];

  //iterate through each map layer passed in the window.map
  let layerOrder = 0;
  mapLayers.forEach((layer) => {
    if (layer instanceof LayerGroup) {
      layer.getLayers().forEach((item) => {
        layerOrder++;
        item.setProperties({ printIndex: layerOrder });
      });
    } else {
      layerOrder++;
      layer.setProperties({ printIndex: layerOrder });
    }
  });
  let mapLayerPromises = mapLayers.map((layer) =>
    getLayerByType(layer, printRequest.attributes, (retLayers) => {
      if (retLayers !== undefined) {
        if (Array.isArray(retLayers)) mainMap = mainMap.concat(retLayers);
        else mainMap.push(retLayers);
        if (Array.isArray(retLayers)) {
          retLayers.forEach((item) => {
            if (isOverviewLayer(item.layer)) overviewMap.push(item);
          });
        } else {
          if (isOverviewLayer(retLayers.layer)) overviewMap.push(retLayers);
        }
      }
    })
  );

  //wait for list of layer promises to be resolved
  await Promise.all(mapLayerPromises);

  //ensures that the sorted layers executes after the intitial mapLayerList is resolved
  sortedMainMap = sortLayers(mainMap);
  printRequest.attributes.map["layers"] = sortedMainMap;
  if (printRequest.attributes.overviewMap !== undefined) {
    sortedOverviewMap = sortLayers(overviewMap);
    printRequest.attributes.overviewMap["layers"] = sortedOverviewMap;
  }
  return printRequest;
}
