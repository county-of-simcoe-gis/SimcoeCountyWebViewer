import * as helpers from "./helpers";
// OPEN LAYERS
import { Image as ImageLayer, Tile as TileLayer, Vector as VectorLayer, Group as LayerGroup, VectorTile as VectorTileLayer } from "ol/layer.js";
import { ImageWMS, OSM, TileArcGISRest, ImageArcGISRest, TileWMS, TileImage, Vector, Stamen, XYZ, ImageStatic } from "ol/source.js";
import WMTS, { optionsFromCapabilities } from "ol/source/WMTS";
import VectorTileSource from "ol/source/VectorTile";
// import stylefunction from "ol-mapbox-style/dist/stylefunction";
import { stylefunction } from "ol-mapbox-style";
import GML3 from "ol/format/GML3.js";
import GML2 from "ol/format/GML2.js";
import OSMXML from "ol/format/OSMXML.js";
//import {file as FileLoader} from "ol/featureloader.js";
import { GeoJSON, GPX, KML, EsriJSON, TopoJSON, IGC, Polyline, WKT, MVT, WMTSCapabilities, WMSCapabilities } from "ol/format.js";
import { all as LoadingStrategyAll, tile as LoadingStrategyTile } from "ol/loadingstrategy.js";

import { getTopLeft } from "ol/extent";
import { transform } from "ol/proj.js";

import TileGrid from "ol/tilegrid/TileGrid.js";

//import { Circle, Fill, Stroke, Style,Icon,Text } from "ol/style.js";

//OTHER
import { parseString } from "xml2js";

export const OL_LAYER_TYPES = {
  Image: "Image",
  Tile: "Tile",
  Vector: "Vector",
  Group: "Group",
};
export const OL_DATA_TYPES = {
  GML3: "GML3",
  GML2: "GML2",
  GPX: "GPX",
  KML: "KML",
  OSMXML: "OSMXML",
  EsriJSON: "EsriJSON",
  GeoJSON: "GeoJSON",
  TopoJSON: "TopoJSON",
  IGC: "IGC",
  Polyline: "Polyline",
  WKT: "WKT",
  MVT: "MVT",
  XYZ: "XYZ",
  OSM: "OSM",
  Vector: "Vector",
  ImageWMS: "ImageWMS",
  TileArcGISRest: "TileArcGISRest",
  TileImage: "TileImage",
  Stamen: "Stamen",
  ImageStatic: "ImageStatic",
  WMTS: "WMTS",
  TileWMS: "TileWMS",
  ImageArcGISRest: "ImageArcGISRest",
  LayerGroup: "LayerGroup",
  VectorTile: "VectorTile",
};

export class FeatureHelpers {
  static getVectorFormat(format, projection = "EPSG:3857") {
    switch (format) {
      case OL_DATA_TYPES.GML3:
        return new GML3({ srsName: projection });
      case OL_DATA_TYPES.GML2:
        return new GML2({ srsName: projection });
      case OL_DATA_TYPES.GPX:
        return new GPX();
      case OL_DATA_TYPES.KML:
        return new KML();
      case OL_DATA_TYPES.OSMXML:
        return new OSMXML();
      case OL_DATA_TYPES.EsriJSON:
        return new EsriJSON();
      case OL_DATA_TYPES.GeoJSON:
        return new GeoJSON();
      case OL_DATA_TYPES.TopoJSON:
        return new TopoJSON();
      case OL_DATA_TYPES.IGC:
        return new IGC();
      case OL_DATA_TYPES.Polyline:
        return new Polyline();
      case OL_DATA_TYPES.WKT:
        return new WKT();
      case OL_DATA_TYPES.MVT:
        return new MVT();
      case OL_DATA_TYPES.VectorTile:
        return new VectorTileSource();
      default:
        return;
    }
  }

  static setFeatures(features, target_format = OL_DATA_TYPES.GeoJSON, dataProjection = null, featureProjection = null) {
    if (features.length === 0) return;
    const mapProjection = featureProjection || window.map.getView().getProjection();
    const parser = this.getVectorFormat(target_format);
    let output = undefined;
    try {
      output = parser.writeFeatures(features, {
        dataProjection: dataProjection || parser.readProjection(features),
        featureProjection: mapProjection,
      });
    } catch (err) {
      helpers.showMessage("Error", "Unsupported Feature.", helpers.messageColors.red);
      console.log(err);
    }
    return output;
  }
  static getFeatures(features, source_format = OL_DATA_TYPES.GeoJSON, projection = "EPSG:3857") {
    if (features.length === 0) return;
    const mapProjection = window.map.getView().getProjection();
    const parser = this.getVectorFormat(source_format, projection);
    let output = undefined;

    try {
      output = parser.readFeatures(features, {
        dataProjection: parser.readProjection(features) || projection,
        featureProjection: mapProjection,
      });
    } catch (err) {
      helpers.showMessage("Error", "Unsupported Feature.", helpers.messageColors.red);
      console.log(err);
    }
    return output;
  }
  static setGeometry(source_geometry, target_format = OL_DATA_TYPES.GeoJSON) {
    const parser = this.getVectorFormat(target_format);
    let output = undefined;
    try {
      output = parser.writeGeometry(source_geometry);
    } catch (err) {
      helpers.showMessage("Error", "Unsupported Geometry.", helpers.messageColors.red);
      console.log(err);
    }
    return output;
  }
  static getGeometry(geometry, source_format = OL_DATA_TYPES.GeoJSON) {
    const parser = this.getVectorFormat(source_format);
    let output = undefined;
    try {
      output = parser.readGeometry(geometry);
    } catch (err) {
      helpers.showMessage("Error", "Unsupported Geometry.", helpers.messageColors.red);
      console.log(err);
    }
    return output;
  }
}

export class LayerHelpers {
  static async identifyFeaturesWait(layer, coordinate, callback = undefined) {
    const viewResolution = window.map.getView().getResolution();
    const isArcGISLayer = LayerHelpers.getLayerSourceType(layer.getSource()) === OL_DATA_TYPES.ImageArcGISRest;
    var url = isArcGISLayer
      ? layer.get("wfsUrl")
      : layer.getSource().getFeatureInfoUrl(coordinate, viewResolution, "EPSG:3857", {
          INFO_FORMAT: "application/json",
        });
    const params = {};
    const secureKey = layer.get("secureKey");
    if (secureKey !== undefined) {
      const headers = {};
      headers[secureKey] = "GIS";
      params["headers"] = headers;
    }
    if (isArcGISLayer) {
      const arcgisResolution = `${window.map.getSize()[0]},${window.map.getSize()[1]},96`;
      const extent = window.map.getView().calculateExtent();
      const zoom = window.map.getView().getZoom();
      const tolerance = 20 - zoom;
      url = url
        .replace("#GEOMETRY#", coordinate)
        .replace("#TOLERANCE#", tolerance >= 10 ? tolerance : 10)
        .replace("#EXTENT#", extent.join(","))
        .replace("#RESOLUTION#", arcgisResolution);
    }
    if (url) {
      await helpers.getJSONWaitWithParams(url, params, (result) => {
        let features = isArcGISLayer ? LayerHelpers.parseESRIIdentify(result) : new GeoJSON().readFeatures(result);
        if (callback === undefined) {
          return features.length > 0 ? features[0] : undefined;
        } else {
          callback(features.length > 0 ? features[0] : undefined);
        }
      });
    }
  }
  static identifyFeatures(layer, coordinate, callback) {
    const viewResolution = window.map.getView().getResolution();
    const isArcGISLayer = LayerHelpers.getLayerSourceType(layer.getSource()) === OL_DATA_TYPES.ImageArcGISRest;
    var url = isArcGISLayer
      ? layer.get("wfsUrl")
      : layer.getSource().getFeatureInfoUrl(coordinate, viewResolution, "EPSG:3857", {
          INFO_FORMAT: "application/json",
        });
    const params = {};
    const secureKey = layer.get("secureKey");
    if (secureKey !== undefined) {
      const headers = {};
      headers[secureKey] = "GIS";
      params["headers"] = headers;
    }
    if (isArcGISLayer) {
      const arcgisResolution = `${window.map.getSize()[0]},${window.map.getSize()[1]},96`;
      const extent = window.map.getView().calculateExtent();
      const zoom = window.map.getView().getZoom();
      const tolerance = 20 - zoom;
      url = url
        .replace("#GEOMETRY#", coordinate)
        .replace("#TOLERANCE#", tolerance >= 10 ? tolerance : 10)
        .replace("#EXTENT#", extent.join(","))
        .replace("#RESOLUTION#", arcgisResolution);
    }
    if (url) {
      helpers.getJSONWithParams(url, params, (result) => {
        let features = isArcGISLayer ? LayerHelpers.parseESRIIdentify(result) : new GeoJSON().readFeatures(result);
        callback(features.length > 0 ? features[0] : undefined);
      });
    }
  }
  static parseESRIIdentify(data) {
    let features = [];
    if (data.results !== undefined) {
      data.results.forEach((item) => {
        item["dataProjection"] = item.geometry.spatialReference.latestWkid;
        delete item.geometry.spatialReference;
        delete item.geometryType;
        let keys = Object.keys(item.attributes);
        keys.forEach((key) => {
          if (item.attributes[key] === "Null" || item.attributes[key] === "") delete item.attributes[key];
        });

        let tempFeature = new EsriJSON().readFeature(item);
        tempFeature.setProperties({ displayFieldName: item.displayFieldName });
        tempFeature.setProperties({ displayFieldValue: item.value });
        features.push(tempFeature);
      });
    }
    return features;
  }
  static getCapabilities(options, callback) {
    let { root_url, type } = options;

    type = type.toLowerCase();
    var url = "";
    if (root_url.indexOf("GetCapabilities") === -1) {
      url = /\?/.test(root_url) ? root_url.split("?")[0] + "?" : root_url + "?";
    } else {
      url = root_url;
    }
    let layers = [];
    var parser;
    var response;
    var service;
    if (url.indexOf("Capabilities") === -1) {
      switch (type) {
        case "wmts":
          service = "WMTS";
          url = url + "REQUEST=GetCapabilities&SERVICE=" + service;
          break;
        case "wms":
          service = "WMS";
          url = url + "REQUEST=GetCapabilities&SERVICE=" + service;
          break;
        case "rest":
          service = "json";
          url = root_url + "/layers?f=json";
          break;
        default:
          service = "WFS";
          url = url + "REQUEST=GetCapabilities&SERVICE=" + service;
          break;
      }
    }
    const params = {};
    if (options.requireToken) {
      const headers = {};
      //headers["token"] = "GIS";
      params["headers"] = headers;
    }
    helpers.httpGetTextWithParams(url, params, (responseText) => {
      if (responseText === null) {
        callback([]);
        return;
      }
      try {
        switch (type) {
          case "wmts":
            parser = new WMTSCapabilities();
            response = parser.read(responseText);
            response.Contents.Layer.forEach((layer) => {
              layers.push({
                label: layer.Title,
                value: helpers.getUID(),
                style: this.getSytle(layer),
                layer_name: layer.Identifier,
              });
            });
            //fix to get react-select box to update on the fly
            layers = layers.concat([]);
            callback(layers);
            break;
          case "wms":
            parser = new WMSCapabilities();
            response = parser.read(responseText);
            let layerGroup = response.Capability.Layer.Layer;
            if (layerGroup[0].Layer !== undefined) layerGroup = layerGroup[0].Layer;
            layerGroup.forEach((layer) => {
              this.getWMSLayers(layer, (item) => {
                if (item !== undefined) {
                  item["url"] = root_url;
                  layers.push(item);
                }
              });
            });
            //fix to get react-select box to update on the fly
            layers = layers.concat([]);
            callback(layers);
            break;
          case "rest":
            response = JSON.parse(responseText);
            if (response.layers !== undefined) {
              this.getESRILegend(`${root_url}/legend?f=json`, (legends) => {
                response.layers.forEach((item) => {
                  if (item !== undefined) {
                    item["layer_name"] = item.name;
                    item["rootUrl"] = root_url;
                    item["originalMinScale"] = item.minScale;
                    item["originalMaxScale"] = item.maxScale;
                    item.minScale = item.originalMaxScale;
                    item.maxScale = item.originalMinScale;
                    if (item.minScale === item.maxScale) {
                      item.minScale = undefined;
                      item.maxScale = undefined;
                    }
                    item["value"] = helpers.getUID();
                    item["label"] = item.name;
                    item["queryable"] = true;
                    item["legend"] = legends.filter((legend) => {
                      return legend.layerId === item.id;
                    })[0];
                    if (item.drawingInfo !== undefined && item.drawingInfo.renderer !== undefined && item.drawingInfo.renderer.symbol !== undefined && item.legend === undefined)
                      item["style"] = `data:${item.drawingInfo.renderer.symbol.contentType};base64,${item.drawingInfo.renderer.symbol.imageData}`;
                    item["url"] = `${root_url}/${item.id}`;
                    layers.push(item);
                  }
                });
                //fix to get react-select box to update on the fly
                layers = layers.concat([]);
                callback(layers);
              });
            } else {
              callback([]);
              return;
            }
            break;
          default:
            parseString(responseText, function (err, result) {
              result["wfs:WFS_Capabilities"].FeatureTypeList[0].FeatureType.forEach((layer) => {
                var layerTitle = layer.Title[0];
                var layerName = layer.Name[0];
                if (layerTitle === undefined || layerTitle === "") layerTitle = layerName;
                layers.push({
                  label: layerTitle,
                  value: helpers.getUID(),
                  layer_name: layerName,
                });
              });
            });
            //fix to get react-select box to update on the fly
            layers = layers.concat([]);
            callback(layers);
            break;
        }
      } catch (error) {
        console.warn("Unexpected error: " + error.message);
        callback(layers);
      }
    });
  }
  static getESRILegend(url, callback) {
    helpers.httpGetText(url, (responseText) => {
      var response = JSON.parse(responseText);
      if (response.layers === undefined) callback();
      else callback(response.layers);
    });
  }
  static getWMSLayers(layer, callback) {
    var label = layer.Title !== "" ? layer.Title : layer.Name;
    var value = layer.Name;
    var queryable = layer.queryable;
    var opaque = layer.opaque;
    var keywords = layer.KeywordList;
    if (layer.Layer === undefined) {
      callback({
        label: label,
        value: helpers.getUID(),
        layer_name: value,
        style: this.getSytle(layer),
        queryable: queryable,
        opaque: opaque,
        keywords: keywords,
      });
    } else {
      callback();
    }
  }
  static getAllWMSLayers(layer, callback) {
    let layers = [];
    var label = layer.Title !== "" ? layer.Title : layer.Name;
    var value = layer.Name;
    var queryable = layer.queryable;
    var opaque = layer.opaque;
    var keywords = layer.KeywordList;
    if (layer.Layer === undefined) {
      layers.push({
        label: label,
        value: helpers.getUID(),
        layer_name: value,
        style: this.getSytle(layer),
        queryable: queryable,
        opaque: opaque,
        keywords: keywords,
      });
    } else {
      layer.Layer.forEach((item) => {
        this.getAllWMSLayers(item, (result) => {
          layers = layers.concat(result);
        });
      });
    }
    layers = layers.concat([]);
    callback(layers);
  }

  static getLayerType(layer) {
    if (layer instanceof TileLayer) return OL_LAYER_TYPES.Tile;
    if (layer instanceof ImageLayer) return OL_LAYER_TYPES.Image;
    if (layer instanceof VectorLayer) return OL_LAYER_TYPES.Vector;
    if (layer instanceof LayerGroup) return OL_LAYER_TYPES.Group;
    return "unknown";
  }

  static getLayerSourceType(source) {
    if (source instanceof GML3) return OL_DATA_TYPES.GML3;
    if (source instanceof GML2) return OL_DATA_TYPES.GML2;
    if (source instanceof GPX) return OL_DATA_TYPES.GPX;
    if (source instanceof KML) return OL_DATA_TYPES.KML;
    if (source instanceof OSMXML) return OL_DATA_TYPES.OSMXML;
    if (source instanceof EsriJSON) return OL_DATA_TYPES.EsriJSON;
    if (source instanceof GeoJSON) return OL_DATA_TYPES.GeoJSON;
    if (source instanceof TopoJSON) return OL_DATA_TYPES.TopoJSON;
    if (source instanceof IGC) return OL_DATA_TYPES.IGC;
    if (source instanceof Polyline) return OL_DATA_TYPES.Polyline;
    if (source instanceof WKT) return OL_DATA_TYPES.WKT;
    if (source instanceof MVT) return OL_DATA_TYPES.MVT;
    if (source instanceof XYZ) return OL_DATA_TYPES.XYZ;
    if (source instanceof OSM) return OL_DATA_TYPES.OSM;
    if (source instanceof Vector) return OL_DATA_TYPES.Vector;
    if (source instanceof ImageWMS) return OL_DATA_TYPES.ImageWMS;
    if (source instanceof TileArcGISRest) return OL_DATA_TYPES.TileArcGISRest;
    if (source instanceof ImageArcGISRest) return OL_DATA_TYPES.ImageArcGISRest;
    if (source instanceof TileImage) return OL_DATA_TYPES.TileImage;
    if (source instanceof Stamen) return OL_DATA_TYPES.Stamen;
    if (source instanceof ImageStatic) return OL_DATA_TYPES.ImageStatic;
    if (source instanceof WMTS) return OL_DATA_TYPES.WMTS;
    if (source instanceof TileWMS) return OL_DATA_TYPES.TileWMS;
    if (source instanceof VectorTileSource) return OL_DATA_TYPES.VectorTile;

    return "unknown";
  }
  static getSytle(layer) {
    let style = "";
    try {
      style = layer.Style[0].LegendURL[0].OnlineResource;
    } catch {}
    return style !== undefined ? style : "";
  }
  static getGroupedLayer(options, callback) {
    let layerOptions = options.layers;
    let name = options.name !== undefined ? options.name : "";
    let layers = [];
    const rebuildParams = {
      name: name,
      layers: layerOptions,
    };
    layerOptions.forEach((layerOption) => {
      this.getLayer(
        {
          sourceType: layerOption.sourceType,
          source: "rest",
          layerName: layerOption.name,
          url: layerOption.url,
          tiled: false,
          extent: layerOption.extent,
          name: layerOption.name,
        },
        (layer) => {
          layers.push(layer);
          if (layers.length >= layerOptions.length) {
            callback(
              new LayerGroup({
                name: name,
                rebuildParams: rebuildParams,
                layers: layers,
              })
            );
          }
        }
      );
    });
  }

  static getLayer(options, callback) {
    let sourceType = options.sourceType;
    let source = options.source;
    let projection = options.projection !== undefined ? options.projection : "EPSG:3857";
    let layerName = options.layerName;
    let url = options.url;
    let tiled = options.tiled !== undefined ? options.tiled : false;
    let file = options.file;
    let extent = options.extent !== undefined ? options.extent : [];
    let name = options.name !== undefined ? options.name : "";
    let secureKey = options.secureKey;
    let background = options.background !== undefined ? options.background : null;
    let rootPath = options.rootPath !== undefined ? options.rootPath : null;
    let spritePath = options.spritePath !== undefined ? options.spritePath : null;
    let pngPath = options.pngPath !== undefined ? options.pngPath : null;
    let minZoom = options.minZoom !== undefined ? options.minZoom : null;
    let maxZoom = options.maxZoom !== undefined ? options.maxZoom : null;

    const rebuildParams = {
      sourceType: sourceType,
      source: source,
      projection: projection,
      layerName: layerName,
      url: url,
      tiled: tiled,
      file: file !== undefined ? "STORED FEATURES" : undefined,
      extent: extent,
      name: name,
      background: background,
    };
    let Vector_FileLoader = undefined;
    let style = undefined;

    // console.log(url);
    switch (source) {
      case "remote":
        const featureParser = FeatureHelpers.getVectorFormat(sourceType, projection);
        Vector_FileLoader = function (extent, resolution, proj) {
          try {
            console.log(extent, resolution, proj);
            const mapProjection = window.map.getView().getProjection();
            var _this = this;
            var remoteUrl = `${url}/query?f=json`;
            remoteUrl += `&returnGeometry=true`;
            remoteUrl += `&geometryType=esriGeometryEnvelope`;
            remoteUrl += `&spatialRel=esriSpatialRelIntersects`;
            remoteUrl += `&geometry=`;
            remoteUrl += encodeURIComponent(`{"xmin":${proj.extent_[0]},"ymin":${proj.extent_[1]},"xmax":${proj.extent_[2]},"ymax":${proj.extent_[3]},"spatialReference":{"wkid":102100}}`);
            remoteUrl += `&inSR=3857`;
            remoteUrl += `&outFields=*`;
            remoteUrl += `&outSR=3857`;
            helpers.getJSON(remoteUrl, (response) => {
              _this.addFeatures(
                featureParser.readFeatures(response, {
                  dataProjection: featureParser.readProjection(response) || projection,
                  featureProjection: mapProjection,
                })
              );
            });
          } catch (error) {
            console.log(error);
          }
        };
        break;
      case "file":
        if (file === undefined) {
          console.error("Missing File for Vector layer.");
          return;
        }
        //return empty vector layer if file
        else if (file === "STORED FEATURES") {
          callback(
            new VectorLayer({
              rebuildParams: rebuildParams,
              source: new Vector({
                name: name,
              }),
            })
          );
          return;
        } else {
          if (name.length < 1) name = file.name;
          url = undefined;
          const featureParser = FeatureHelpers.getVectorFormat(sourceType, projection);
          Vector_FileLoader = function (extent, resolution, proj) {
            try {
              const mapProjection = window.map.getView().getProjection();
              var _this = this;
              var fr = new FileReader();
              fr.onload = function (evt) {
                var vectorData = evt.target.result;
                _this.addFeatures(
                  featureParser.readFeatures(vectorData, {
                    dataProjection: featureParser.readProjection(vectorData) || projection,
                    featureProjection: mapProjection,
                  })
                );
              };
              fr.readAsText(file);
            } catch (error) {
              console.log(error);
            }
          };
        }
        break;
      case "wfs":
        const type = sourceType === OL_DATA_TYPES.GeoJSON ? "application/json" : sourceType;
        url = /^((http)|(https))(:\/\/)/.test(url) ? url : "https://" + url;
        url = /\?/.test(url) ? url + "&" : url + "?";
        url = url + "SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=" + layerName + "&SRSNAME=" + projection + "&OUTPUTFORMAT=" + type;
        if (tiled)
          url = function (extent, resolution, proj) {
            return url + "&bbox=" + extent.join(",") + "," + proj.getCode();
          };
        if (name.length < 1) {
          name = layerName + " WFS";
        }
        break;
      default:
        if (name.length < 1) name = layerName;
        break;
    }

    switch (sourceType) {
      case OL_DATA_TYPES.GML3:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ maxZoom: 19 })) : LoadingStrategyAll,
              format: new GML3({ srsName: projection }),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.GML2:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ maxZoom: 19 })) : LoadingStrategyAll,
              format: new GML2({ srsName: projection }),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.GPX:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ maxZoom: 19 })) : LoadingStrategyAll,
              format: new GPX(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.KML:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ maxZoom: 19 })) : LoadingStrategyAll,
              format: new KML(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.OSMXML:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ maxZoom: 19 })) : LoadingStrategyAll,
              format: new OSMXML(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.EsriJSON:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ tileSize: 512, maxZoom: 19 })) : LoadingStrategyAll,
              format: new EsriJSON(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
            style: style,
          })
        );
        break;
      case OL_DATA_TYPES.GeoJSON:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ maxZoom: 19 })) : LoadingStrategyAll,
              format: new GeoJSON(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.TopoJSON:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ maxZoom: 19 })) : LoadingStrategyAll,
              format: new TopoJSON(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.IGC:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ maxZoom: 19 })) : LoadingStrategyAll,
              format: new IGC(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.Polyline:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ maxZoom: 19 })) : LoadingStrategyAll,
              format: new Polyline(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.WKT:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ maxZoom: 19 })) : LoadingStrategyAll,
              format: new WKT(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.MVT:
        callback(
          new VectorLayer({
            rebuildParams: rebuildParams,
            source: new Vector({
              name: name,
              url: url,
              strategy: tiled ? LoadingStrategyTile(TileGrid.createXYZ({ maxZoom: 19 })) : LoadingStrategyAll,
              format: new MVT(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.VectorTile:
        let layer = new VectorTileLayer({
          rebuildParams: rebuildParams,
          renderMode: "hybrid",
          reload: Infinity,
          declutter: true,
          tilePixelRatio: 8,
          background: background,

          source: new VectorTileSource({
            name: name,
            format: new MVT(),
            url: url + "/tile/{z}/{y}/{x}.pbf",
            minZoom: minZoom || undefined,
            maxZoom: maxZoom || undefined,
            crossOrigin: "anonymous",
          }),
        });
        rootPath = rootPath || url + "/resources/styles/root.json";

        fetch(rootPath).then(function (response) {
          response.json().then(function (glStyle) {
            fetch(spritePath || `${glStyle.sprite}.json`).then(function (response) {
              response.json().then(function (spriteData) {
                stylefunction(layer, glStyle, "esri", undefined, spriteData, pngPath || `${glStyle.sprite}.png`);
              });
            });
          });
        });
        callback(layer);
        break;
      case OL_DATA_TYPES.ImageWMS:
        const securedImageWMS = function (image, src) {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", src);
          xhr.responseType = "arraybuffer";
          if (secureKey !== undefined) xhr.setRequestHeader(secureKey, "GIS");
          xhr.onload = function () {
            var arrayBufferView = new Uint8Array(this.response);
            var blob = new Blob([arrayBufferView], { type: "image/png" });
            var urlCreator = window.URL || window.webkitURL;
            var imageUrl = urlCreator.createObjectURL(blob);
            image.getImage().src = imageUrl;
          };
          xhr.send();
        };
        callback(
          new ImageLayer({
            rebuildParams: rebuildParams,
            name: name,
            source: new ImageWMS({
              url: url,
              params: {
                VERSION: "1.3.0",
                LAYERS: layerName,
                cql_filter: null,
              },
              ratio: 1,
              hidpi: false,
              serverType: "geoserver",
              crossOrigin: "anonymous",
              imageLoadFunction: securedImageWMS,
            }),
          })
        );
        break;
      case OL_DATA_TYPES.TileWMS:
        callback(
          new TileLayer({
            rebuildParams: rebuildParams,
            name: name,
            source: new TileWMS({
              url: url,
              projection: projection,
              params: {
                VERSION: "1.3.0",
                LAYERS: layerName,
                tiled: true,
                cql_filter: null,
              },
              tileOptions: { crossOriginKeyword: "anonymous" },
              ratio: 1,
              hidpi: false,
              serverType: "geoserver",
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.ImageArcGISRest:
        let urlArray = url.split("/");
        let url_layer = urlArray[urlArray.length - 1];
        urlArray.pop();
        url = urlArray.join("/");
        const sourceParams = {
          url: url,
          params: { LAYERS: `SHOW:${url_layer}` },
          ratio: 1,
          projection: projection,
          crossOrigin: "anonymous",
        };
        if (extent !== undefined) sourceParams["extent"] = [extent.xmin, extent.ymin, extent.xmax, extent.ymax];
        callback(
          new ImageLayer({
            rebuildParams: rebuildParams,
            name: name,
            source: new ImageArcGISRest(sourceParams),
          })
        );
        break;
      case OL_DATA_TYPES.WMTS:
        const rootUrl = url.replace("1.0.0/WMTSCapabilities.xml", "");
        const convertExtent = (extent, sourceCoord, targetCoord) => {
          return transform([extent[0], extent[1]], sourceCoord, targetCoord).concat(transform([extent[2], extent[3]], sourceCoord, targetCoord));
        };
        const wmtsCap = (url, callback) => {
          helpers.httpGetText(url.indexOf("Capabilities") === -1 ? (/\?/.test(url) ? url + "&" : url + "?") + "REQUEST=GetCapabilities&SERVICE=WMTS" : url, (responseText) => {
            try {
              var parser = new WMTSCapabilities();
              callback(parser.read(responseText));
            } catch (error) {
              console.warn("Unexpected error: " + error.message);
            }
          });
        };

        wmtsCap(url, (capabilities) => {
          var tileMatrixSet = capabilities.Contents.TileMatrixSet[0];
          var projection = "3857";
          if (!tileMatrixSet.SupportedCRS.split(":").includes("3857")) projection = tileMatrixSet.SupportedCRS.split(":")[1];
          helpers.registerCustomProjection(projection, () => {
            var wmtsOptions = optionsFromCapabilities(capabilities, {
              layer: layerName,
              requestEncoding: "REST",
            });
            if (!wmtsOptions) wmtsOptions = { layer: layerName, requestEncoding: "REST" };
            callback(
              new TileLayer({
                rebuildParams: rebuildParams,
                name: name,
                source: new WMTS(wmtsOptions),
              })
            );
          });
        });
        break;
      case OL_DATA_TYPES.Stamen:
        if (name.length < 1) layerName = "Stamen " + layerName;
        callback(
          new TileLayer({
            rebuildParams: rebuildParams,
            name: name,
            source: new Stamen({ layer: layerName }),
          })
        );
        break;
      case OL_DATA_TYPES.OSM:
        if (name.length < 1) {
          name = "OpenStreetMap";
        }
        callback(
          new TileLayer({
            rebuildParams: rebuildParams,
            name: name,
            source: new OSM(),
          })
        );
        break;
      case OL_DATA_TYPES.XYZ:
        callback(
          new TileLayer({
            rebuildParams: rebuildParams,
            name: name,
            source: new XYZ({
              url: url,
              //projection: projection ,
              crossOrigin: "anonymous",
            }),
          })
        );
        break;
      case OL_DATA_TYPES.TileImage:
        const resolutions = [
          305.74811314055756, 152.87405657041106, 76.43702828507324, 38.21851414253662, 19.10925707126831, 9.554628535634155, 4.77731426794937, 2.388657133974685, 1.1943285668550503,
          0.5971642835598172, 0.29858214164761665, 0.1492252984505969,
        ];
        const projExtent_ti = window.map.getView().getProjection().getExtent();
        var tileGrid = new TileGrid({
          resolutions: resolutions,
          tileSize: [256, 256],
          origin: getTopLeft(projExtent_ti),
        });
        let source = new TileImage({
          url: url,
          tileGrid: tileGrid,
          crossOrigin: "anonymous",
        });
        // source.on("tileloaderror", function(event) {
        //   event.tile.getImage().src = "";
        // });
        callback(
          new TileLayer({
            rebuildParams: rebuildParams,
            name: name,
            projection: projection,
            source: source,
          })
        );
        break;

      case OL_DATA_TYPES.ImageStatic:
        if (file === undefined) {
          console.error("Missing File for Raster layer.");
          return;
        } else if (!file.type.match("image.*")) {
          console.error("Warning! No raster file selected.");
          return;
        }
        const StaticImage_FileLoader = function (image, src) {
          try {
            var fr = new FileReader();
            fr.onload = function (evt) {
              image.getImage().src = evt.target.result;
            };
            fr.readAsDataURL(file);
          } catch (error) {
            console.warn("Unexpected error: " + error.message);
          }
        };
        const projExtent = window.map.getView().getProjection().getExtent();
        if (extent === []) extent = projExtent;
        callback(
          new ImageLayer({
            rebuildParams: rebuildParams,
            name: name,
            source: new ImageStatic({
              url: "",
              imageExtent: [extent[0], extent[1], extent[2], extent[3]],
              projection: projection,
              imageLoadFunction: StaticImage_FileLoader,
            }),
          })
        );
        break;
      case OL_DATA_TYPES.LayerGroup:
        this.getGroupedLayer(options, (newLayer) => {
          callback(newLayer);
        });
        break;
      default:
        return;
    }
  }
}
