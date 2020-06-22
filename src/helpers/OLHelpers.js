import * as helpers from "./helpers";
// OPEN LAYERS
import { Image as ImageLayer,Tile as TileLayer, Vector as VectorLayer } from "ol/layer.js";
import { ImageWMS, OSM, TileArcGISRest, TileWMS, TileImage, Vector,Stamen,XYZ, ImageStatic, WMTS} from "ol/source.js";
import GML3 from "ol/format/GML3.js";
import GML2 from "ol/format/GML2.js";
import OSMXML from "ol/format/OSMXML.js"
//import {file as FileLoader} from "ol/featureloader.js";
import { GeoJSON,GPX,KML,EsriJSON,TopoJSON,IGC,Polyline,WKT,MVT,WMTSCapabilities,WMSCapabilities } from "ol/format.js"; 
import {all as LoadingStrategyAll, tile as LoadingStrategyTile} from "ol/loadingstrategy.js"
import TileGrid from "ol/tilegrid/TileGrid.js";

//OTHER
import { parseString } from "xml2js";

export const OL_DATA_TYPES = {
  GML3:"GML3",
  GML2:"GML2",
  GPX:"GPX",
  KML: "KML",
  OSMXML: "OSMXML",
  EsriJSON: "EsriJSON",
  GeoJSON:"GeoJSON",
  TopoJSON:"TopoJSON",
  IGC:"IGC",
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
  ImageStatic:"ImageStatic",
  WMTS: "WMTS",
  TileWMS: "TileWMS"
}

export class FeatureHelpers {
  static getVectorFormat(format, projection="EPSG:3857" ){
    switch(format){
      case OL_DATA_TYPES.GML3:
        return new GML3({srsName: projection});
      case OL_DATA_TYPES.GML2:
        return new GML2({srsName: projection});
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
      default:
        return;
    }
  }
  static setFeatures(features, target_format=OL_DATA_TYPES.GeoJSON){
    const mapProjection = window.map.getView().getProjection();
    const parser = this.getVectorFormat(target_format);
    return parser.writeFeatures(features,{featureProjection: mapProjection});
  }
  static getFeatures(features, source_format=OL_DATA_TYPES.GeoJSON, projection="EPSG:3857"){
    const mapProjection = window.map.getView().getProjection();
    const parser = this.getVectorFormat(source_format, projection);
    return parser.readFeature(features,{
                        dataProjection: parser.readProjection(features) || projection,
                        featureProjection: mapProjection});
  }
  static setGeometry(source_geometry, target_format = OL_DATA_TYPES.GeoJSON){
    const parser = this.getVectorFormat(target_format);
    return parser.writeGeometry(source_geometry);
  }
  static getGeometry(geometry, source_format = OL_DATA_TYPES.GeoJSON){
    const parser = this.getVectorFormat(source_format);
    return parser.readGeometry(geometry);
  }
}

export class LayerHelpers {
  static getCapabilities(url, type, callback) {
    type = type.toLowerCase();
    url = /\?/.test(url) ? url.split('?')[0] + '?' : url + '?';
    let layers = [];
    var parser;
    var response;
    var service;
    if (url.indexOf("GetCapabilities") === -1){
      switch (type) {
          case 'wmts': service = 'WMTS'; break;
          case 'wms':  service = 'WMS';  break;
          default:     service = 'WFS';  break;
      }
      url = url + 'REQUEST=GetCapabilities&SERVICE=' + service;
    }
    helpers.httpGetText(url, responseText => {
        try {
          switch (type){
            case 'wmts':
              parser = new WMTSCapabilities();
              response = parser.read(responseText);
              response.Contents.Layer.foreach(layer =>{
                layers.push({label:layer.Identifier, value:layer.Identifier, style: this.getSytle(layer)})
              });
              break;
            case 'wms':
              parser = new WMSCapabilities();
              response = parser.read(responseText);
              response.Capability.Layer.Layer.forEach(layer =>{
                var label = layer.Title !==""?layer.Title:layer.Name;
                var value = layer.Name;
                if (layer.layer === undefined) layers.push({label:label, value:value, style: this.getSytle(layer)})
              });
              break;
            default:
              parseString(responseText,function(err, result) {
                result['wfs:WFS_Capabilities'].FeatureTypeList[0].FeatureType.forEach(layer =>{
                  var layerTitle = layer.Title[0];
                  var layerName = layer.Name[0];
                  if (layerTitle===undefined || layerTitle === "") layerTitle = layerName;
                  layers.push({label:layerTitle, value:layerName})
                });
  
              });
              
              break;
          }
        } catch (error) {
            console.warn('Unexpected error: ' + error.message );
        }
        //fix to get react-select box to update on the fly
        layers = layers.concat([]);
        callback(layers);
    });
  }
  static getLayerSourceType(source){
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
    if (source instanceof TileImage) return OL_DATA_TYPES.TileImage;
    if (source instanceof Stamen) return OL_DATA_TYPES.Stamen;
    if (source instanceof ImageStatic) return OL_DATA_TYPES.ImageStatic;
    if (source instanceof WMTS) return OL_DATA_TYPES.WMTS;
    if (source instanceof TileWMS) return OL_DATA_TYPES.TileWMS; 
    return "unknown";
  }
  static getSytle (layer){
    let style = "";
    try {
      style = layer.Style[0].LegendURL[0].OnlineResource;
    }catch{}
    return style !== undefined ? style : "";
  }
  static getLayer(sourceType, source, projection="EPSG:3857", layerName,  url, tiled=false, file,extent=[], name="", callback){
    let Vector_FileLoader = undefined;
    switch (source){
      case "file":
        if (file === undefined){
          console.error("Missing File for Vector layer.");
          return;
        }
        else 
        {
          if (name.length < 1) name = file.name;
          url = undefined;
          const featureParser = FeatureHelpers.getVectorFormat(sourceType,projection);
          Vector_FileLoader = function(extent, resolution, proj) {
            try {
                const mapProjection = window.map.getView().getProjection();
                var _this = this;
                var fr = new FileReader();
                fr.onload = function (evt) {
                    var vectorData = evt.target.result;
                    _this.addFeatures(featureParser.readFeatures(vectorData, {
                      dataProjection: featureParser.readProjection(vectorData) || projection,
                      featureProjection: mapProjection
                  }));
                };
                fr.readAsText(file);
            } catch (error) {
                console.log(error);
            }
          }
        }
        break;
      case "wfs":
        const type = sourceType === OL_DATA_TYPES.GeoJSON ? "application/json" :sourceType;
        url = /^((http)|(https))(:\/\/)/.test(url) ? url : 'http://' + url;
        url = /\?/.test(url) ? url + '&' : url + '?';
        url = url + 'SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=' + layerName + '&SRSNAME=' + projection + '&OUTPUTFORMAT=' + type;
        if (tiled) url = function(extent, resolution, proj) {
                                    return url + '&bbox=' + extent.join(',') + ',' + proj.getCode();
                                  };
        if (name.length < 1) { name = layerName + ' WFS'; }
        break;
      default:
        if (name.length < 1) name = layerName;
        break;
    }

    switch (sourceType) {
        case OL_DATA_TYPES.GML3:
          callback(new VectorLayer({
              source: new Vector({
                name: name,
                url:  url,
                strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
                format: new GML3({srsName: projection}),
                loader: Vector_FileLoader,
                crossOrigin: "anonymous"
            })}));
          break;
        case OL_DATA_TYPES.GML2:
            callback(new VectorLayer({
              source:  new Vector({
                name: name,
                url:  url,
                strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
                format: new GML2({srsName: projection}),
                loader: Vector_FileLoader,
                crossOrigin: "anonymous"
            })}));
            break;
        case OL_DATA_TYPES.GPX:
            callback(new VectorLayer({
              source: new Vector({
                name: name,
                url:  url,
                strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
                format:  new GPX(),
                loader: Vector_FileLoader,
                crossOrigin: "anonymous"
            })}));
            break;
        case OL_DATA_TYPES.KML:
          callback(new VectorLayer({
            source: new Vector({
              name: name,
              url:  url,
              strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
              format:  new KML(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous"
          })}));
          break;
        case OL_DATA_TYPES.OSMXML:
          callback(new VectorLayer({
            source: new Vector({
              name: name,
              url:  url,
              strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
              format:  new OSMXML(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous"
          })}));
          break;
        case OL_DATA_TYPES.EsriJSON:
          callback(new VectorLayer({
            source: new Vector({
              name: name,
              url:  url,
              strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
              format:  new EsriJSON(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous"
          })}));
          break;
        case OL_DATA_TYPES.GeoJSON:
          callback(new VectorLayer({
            source: new Vector({
              name: name,
              url:  url,
              strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
              format:  new GeoJSON(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous"
          })}));
          break;    
        case OL_DATA_TYPES.TopoJSON:
          callback(new VectorLayer({
            source: new Vector({
            name: name,
            url:  url,
            strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
            format:  new TopoJSON(),
            loader: Vector_FileLoader,
            crossOrigin: "anonymous"
          })}));
          break;
        case OL_DATA_TYPES.IGC:
          callback (new VectorLayer({
            source: new Vector({
              name: name,
              url:  url,
              strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
              format:  new IGC(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous"
          })}));
          break;
        case OL_DATA_TYPES.Polyline:
          callback (new VectorLayer({
            source: new Vector({
              name: name,
              url:  url,
              strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
              format:  new Polyline(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous"
          })}));
          break;
        case OL_DATA_TYPES.WKT:
          callback(new VectorLayer({
            source:  new Vector({
              name: name,
              url:  url,
              strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
              format:  new WKT(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous"
          })}));
          break;  
        case OL_DATA_TYPES.MVT:
          callback(new VectorLayer({
            source:  new Vector({
              name: name,
              url:  url,
              strategy: (tiled ? LoadingStrategyTile(TileGrid.createXYZ({maxZoom: 19})) : LoadingStrategyAll),
              format:  new MVT(),
              loader: Vector_FileLoader,
              crossOrigin: "anonymous"
          })}));
          break;
        case OL_DATA_TYPES.ImageWMS:
            callback(new TileLayer({name: name,source: new TileWMS({url: url,projection: projection, params: { layers: layerName, tiled: true },crossOrigin:"anonymous" })}));
            break;
        case OL_DATA_TYPES.WMTS:
            url = /\?/.test(url) ? url + '&' : url + '?';
            const wmtsCap = (url,callback) => {
              helpers.httpGetText(url + 'REQUEST=GetCapabilities&SERVICE=WMTS', (responseText)=> {
                try {
                  var parser = new WMTSCapabilities();
                  callback(parser.read(responseText));
                } catch (error) {
                  console.warn('Unexpected error: ' + error.message );
                }
              });
            }
            callback(new TileLayer({name: name,source: new WMTS(WMTS.optionsFromCapabilities(wmtsCap(url,(response) => response),{ layer: layerName, matrixSet: projection }))}));
            break;
        case OL_DATA_TYPES.Stamen:
            if (name.length < 1) layerName = 'Stamen ' + layerName; 
            callback(new TileLayer({name: name,source: new Stamen({layer: layerName })}));
            break;
        case OL_DATA_TYPES.OSM:
            if (name.length < 1) { name = 'OpenStreetMap'; }
            callback(new TileLayer({name: name,source:  new OSM()}));
            break;
        case OL_DATA_TYPES.XYZ:
            callback(new TileLayer({name: name,source: new XYZ({urls: [url], projection: projection})}));
            break;
        case OL_DATA_TYPES.ImageStatic:
            if (file === undefined){
              console.error("Missing File for Raster layer.");
              return;
            }else if (!file.type.match('image.*')) {
                console.error('Warning! No raster file selected.');
                return;
            }
            const StaticImage_FileLoader = function (image, src){
              try {
                  var fr = new FileReader();
                  fr.onload = function (evt) {
                      image.getImage().src = evt.target.result;
                  };
                  fr.readAsDataURL(file);
              } catch (error) {
                  console.warn('Unexpected error: ' + error.message);
              }
            }
            const projExtent = window.map
            .getView()
            .getProjection()
            .getExtent();
            if (extent===[]) extent=projExtent;
            callback(new ImageLayer({name: name,source: new ImageStatic({
                url: '',
                imageExtent: [extent[0], extent[1], extent[2], extent[3]],
                projection: projection,
                imageLoadFunction: StaticImage_FileLoader
            })}));
            break;
      default:
        return;
    }
    
  }
}



  
  

  

  
  
