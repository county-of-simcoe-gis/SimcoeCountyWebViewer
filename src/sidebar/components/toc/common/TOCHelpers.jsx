import * as helpers from "../../../../helpers/helpers";
import * as drawingHelpers from "../../../../helpers/drawingHelpers";
import { LayerHelpers, FeatureHelpers, OL_DATA_TYPES } from "../../../../helpers/OLHelpers";
import TOCConfig from "../common/TOCConfig.json";
import { WMSCapabilities } from "ol/format.js";

// INDEX WHERE THE TOC LAYERS SHOULD START DRAWING AT
const layerIndexStart = 100;

// LOCAL STORAGE KEY
const storageKey = "Layers";
const storageKeyFolder = "Layers_Folder_View";
const storageMapDefaultsKey = "Map Defaults";
const storageExtentKey = "Map Extent";

const myMapLayerName = "local:myMaps";
const excludedProps = ["_layerProperties", "rebuildParams", "_layerVisible", "_layerOpacity", "_layerType", "layerFeatures"];
const includedLayerProps = ["name", "rebuildParams", "displayName", "disableParcelClick", "wfsUrl", "rootInfoUrl", "liveLayer", "queryable", "opaque"];

/*
map config example object
  {
    "name":"Open GIS",
    "zoom_level": 10,
    "center": "-8878504.68, 5543492.45",
    "default_group": "simcoe:All_Layers",
    "sources":
    [ 
      {
        "layerUrl":"https://opengis.simcoe.ca/geoserver/simcoe/Config_Public_Default/ows?service=wms&version=1.3.0&request=GetCapabilities",
        "secure": false,
        "primary":true
      },
      {
        "layerUrl":"https://opengis2.simcoe.ca/geoserver/simcoe/Config_Secure_Default/ows?service=wms&version=1.3.0&request=GetCapabilities",
        "secure": true,
        "primary":false
      }
    ]
  }
*/

/**
 * Create functions for the following
 * - getSources
 *    - get api config
 *    - get toc config sources
 *    - get url parameter sources
 *    - get local storage sources
 *    - 
 * - loadGroups (array of sources)
 *    - getGeoserverWMSGroup
 *    - getLocalGroup
 **/

export function makeGroup(groupDisplayName, isDefault, groupUrl, groupPrefix, visibleLayers, wmsGroupUrl, customGroupUrl, layers = []) {
  const groupObj = {
    value: helpers.getUID(),
    label: groupDisplayName,
    defaultGroup: isDefault,
    url: groupUrl,
    prefix: groupPrefix,
    visibleLayers: visibleLayers,
    wmsGroupUrl: wmsGroupUrl,
    customRestUrl: customGroupUrl,
    layers: layers,
  };

  return groupObj;
}

export function makeLayer(
  layerName,
  layerId = helpers.getUID(),
  group,
  layerIndex = 0,
  visible = false,
  opacity = 1,
  layer,
  minScale = 0,
  maxScale = 100000000000,
  liveLayer = false,
  styleUrl = "",
  callback
) {
  let newLayer = layer;
  let existingLayer = drawingHelpers.getLayerByName(layerId);
  if (existingLayer !== undefined) {
    newLayer = existingLayer;
  } else {
    newLayer.setVisible(visible);
    newLayer.setOpacity(opacity);
    newLayer.setProperties({ name: layerId, tocDisplayName:layerName, displayName: layerName });
    newLayer.setZIndex(layerIndex);
    window.map.addLayer(newLayer);
  }

  const returnLayer = {
    name: layerId,
    displayName: layerName,
    tocDisplayName:layerName,
    styleUrl: styleUrl,
    height: 30, // HEIGHT OF DOM ROW FOR AUTOSIZER
    drawIndex: layerIndex, // INDEX USED BY VIRTUAL LIST
    index: layerIndex, // INDEX USED BY VIRTUAL LIST
    showLegend: false, // SHOW LEGEND USING PLUS-MINUS IN TOC
    legendHeight: -1, // HEIGHT OF IMAGE USED BY AUTOSIZER
    legendImage: null, // IMAGE DATA, STORED ONCE USER VIEWS LEGEND
    visible: visible, // LAYER VISIBLE IN MAP, UPDATED BY CHECKBOX
    layer: newLayer, // OL LAYER OBJECT
    metadataUrl: null, // ROOT LAYER INFO FROM GROUP END POINT
    opacity: opacity, // OPACITY OF LAYER
    minScale: minScale, //MinScaleDenominator from geoserver
    maxScale: maxScale, //MaxScaleDenominator from geoserver
    liveLayer: liveLayer, // LIVE LAYER FLAG
    groupName: group.label,
    group: group.value,
  };
  callback(returnLayer);
}

export async function getMap (mapId=null,urlType, isReset, tocType, callback){
  const apiUrl = helpers.getConfigValue('apiUrl');
  let mapSettingURL = mapId===null || mapId==="" ? `${apiUrl}settings/getDefaultMap` : `${apiUrl}settings/getMap/${mapId}`;
  let defaultGroup = undefined;
  let layerGroups = undefined;
  
  helpers.getJSON(mapSettingURL, (result) => 
    {
      var sourcesProcessed = 0;
      const mapSettings = JSON.parse(result.json);
      //console.log(mapSettings);
      mapSettings.sources.forEach(source => {
        getGroupsGC(source.layerUrl, urlType, isReset, tocType, source.secure,source.primary, (layerGroupConfig) => {
          if (source.primary) defaultGroup=layerGroupConfig[1];
          if (layerGroups === undefined){
            layerGroups = layerGroupConfig[0];
          }else{
            layerGroups = mergeGroups(layerGroups,layerGroupConfig[0]);
          }
          sourcesProcessed ++;
          if (sourcesProcessed === mapSettings.sources.length){
            if (defaultGroup === undefined || defaultGroup === null) defaultGroup = layerGroups[0];
            if ( mapSettings.default_group !== undefined && mapSettings.default_group !== defaultGroup.value ) {
              defaultGroup = layerGroups.filter((group)=> {return group.value===mapSettings.default_group})[0];
            }
            callback([layerGroups,defaultGroup]);
          }
        });
      });
      
    });
}

export function mergeGroups(originalGroups, newGroups){
  newGroups.forEach((newGroup) => {
    var isDuplicateGroup = false;
    originalGroups = originalGroups.map((group) => {
      if (newGroup.value === group.value){
        isDuplicateGroup = true;
        newGroup.layers.forEach((newLayer) => {
          var isDuplicateLayer = false;
          group.layers = group.layers.map((layer) => {
            if (newLayer.name === layer.name){
              isDuplicateLayer = true;
              if ((newLayer.secured || newLayer.primary) && !group.primary){
                return newLayer;
              }else{
                return layer;
              }
            }else{
              return layer;
            }
          });
          if (!isDuplicateLayer) group.layers.push(newLayer);
        });
        return group;
      }else{
        return group;
      }
    });
    if (!isDuplicateGroup) originalGroups.push(newGroup);
  });
  return originalGroups.sort((a,b)=>{
      if (a.value < b.value) {
        return -1;
      } else if (a.value > b.value) {
        return 1;
      }else{
        return;
      }
    });
}
// GET GROUPS FROM GET CAPABILITIES
export function getGroupsFromData(data, callback) {
  let defaultGroup = null;
  let isDefault = false;
  let groups = [];
  var items = [];
  for (var item in data) {
    if (data.hasOwnProperty(item)) {
      items.push(data[item]);
    }
  }
  items.forEach((group) => {
    let layerList = [];
    const groupLayerList = group.layers;
    var layers = [];
    for (var item in groupLayerList) {
      if (groupLayerList.hasOwnProperty(item)) {
        layers.push(groupLayerList[item]);
      }
    }
    const groupLength = layers.filter((item) => item.name !== myMapLayerName).length;
    let layerIndex = groupLength + layerIndexStart;

    const buildLayers = (layers, layerIndex) => {
      layers.forEach((currentLayer) => {
        if (!isDuplicate(layerList, currentLayer.name) && currentLayer.name !== myMapLayerName) {
          jsonToLayer(currentLayer, (result) => {
            layerList.push(result);
          });
          layerIndex--;
        }
      });
    };
    buildLayers(layers, layerIndex);

    const groupObj = {
      value: group.value,
      label: group.label,
      url: group.url,
      prefix: group.prefix,
      defaultGroup: group.defaultGroup,
      visibleLayers: group.visibleLayers,
      wmsGroupUrl: group.wmsGroupUrl,
      customRestUrl: group.customRestUrl,
      layers: layerList,
    };
    if (groupObj.layers.length >= 1) {
      groups.push(groupObj);
      if (isDefault) {
        defaultGroup = groupObj;
        isDefault = false;
      }
    }
  });
  if (defaultGroup === undefined || defaultGroup === null) defaultGroup = groups[0];
  callback([groups, defaultGroup]);
}

// GET GROUPS FROM GET CAPABILITIES
export async function getGroupsGC(url, urlType, isReset, tocType, secured=false,primary=true, callback) {
  let defaultGroup = null;
  let isDefault = false;
  let groups = [];
  let savedData = helpers.getItemsFromStorage(tocType === "LIST" ? storageKey : storageKeyFolder);
  if (savedData === undefined) savedData = [];
  

  const remove_underscore = (name) => {
    return helpers.replaceAllInString(name, "_", " ");
  };

  helpers.httpGetText(url, (result) => {
    var parser = new WMSCapabilities();
    const resultObj = parser.read(result);
    let groupLayerList =
      urlType === "root"
        ? resultObj.Capability.Layer.Layer[0]
        : urlType === "group"
        ? resultObj.Capability.Layer.Layer[0].Layer
        : resultObj.Capability.Layer.Layer[0];
    let parentGroup =
        urlType === "root"
          ? resultObj.Capability.Layer.Layer[0]
          : urlType === "group"
          ? resultObj.Capability.Layer.Layer[0]
          : resultObj.Capability.Layer.Layer[0];
    let parentKeywords = parentGroup.KeywordList;
    let mapCenter = [];
    if (parentKeywords !== undefined && parentKeywords.length > 0) mapCenter = _getCenterCoordinates(parentKeywords);
    let mapZoom = 0;
    if (parentKeywords !== undefined && parentKeywords.length > 0) mapZoom = _getZoom(parentKeywords);
    let defaultGroupName = "";
    if (parentKeywords !== undefined && parentKeywords.length > 0) defaultGroupName = _getDefaultGroup(parentKeywords);
    if (mapCenter.length > 0 && mapZoom > 0) {
      sessionStorage.removeItem(storageMapDefaultsKey);
      sessionStorage.setItem(storageMapDefaultsKey, JSON.stringify({ center: mapCenter, zoom: mapZoom }));
      const storage = helpers.getItemsFromStorage(storageExtentKey);
      if (storage === undefined) {
        window.map.getView().animate({ center: mapCenter, zoom: mapZoom });
      }
    }
    const geoserverPath = helpers.getConfigValue("geoserverPath");
    //console.log(groupLayerList);

    groupLayerList.forEach((layerInfo) => {
      if (layerInfo.Layer !== undefined) {
        const groupName = layerInfo.Name;
        if (groupName.toUpperCase() === defaultGroupName.toUpperCase()) isDefault = true;
        const groupDisplayName = layerInfo.Title;
        const groupUrl = url.split(`/${geoserverPath}/`)[0] + `/${geoserverPath}/` + helpers.replaceAllInString(groupName, ":", "/") + "/ows?service=wms&version=1.3.0&request=GetCapabilities";
        const fullGroupUrl = url.split(`/${geoserverPath}/`)[0] + `/${geoserverPath}/` + helpers.replaceAllInString(groupName, ":", "/") + "/ows?service=wms&version=1.3.0&request=GetCapabilities";
        let keywords = [];
        if (layerInfo.KeywordList !== undefined) keywords = layerInfo.KeywordList;
        let visibleLayers = [];
        let groupPrefix = "";
        if (keywords !== undefined) visibleLayers = _getVisibleLayers(keywords);
        if (keywords !== undefined) groupPrefix = _getGroupPrefix(keywords);
        let layerList = [];
        if (layerInfo.Layer !== undefined) {
          const groupLayerList = layerInfo.Layer;

          let layerIndex = groupLayerList.length + layerIndexStart;
          const tmpGroupObj = {
            value: groupName,
            label: remove_underscore(groupDisplayName),
            url: groupUrl,
            secured: secured,
            primary:primary,
            prefix: groupPrefix,
            defaultGroup: isDefault,
            visibleLayers: visibleLayers,
            wmsGroupUrl: fullGroupUrl,
          };

          const buildLayers = (layers) => {
            layers.forEach((currentLayer) => {
              if (!isDuplicate(layerList, currentLayer.Name)) {
                buildLayerByGroup(tmpGroupObj, currentLayer, layerIndex, tocType,secured, (result) => {
                  layerList.push(result);
                });
                layerIndex--;
                if (currentLayer.Layer === undefined) {
                  visibleLayers.push(currentLayer.Name[0]);
                } else {
                  buildLayers(currentLayer.Layer);
                }
              }
            });
          };
          buildLayers(layerInfo.Layer);
        }
        let panelOpen = false;
        const savedGroup = savedData[groupName];
        if (savedGroup !== undefined) {
          panelOpen = savedGroup.panelOpen;
        }else if (isDefault) panelOpen = true;
        const groupObj = {
          value: groupName,
          label: remove_underscore(groupDisplayName),
          url: groupUrl,
          prefix: groupPrefix,
          defaultGroup: isDefault,
          visibleLayers: visibleLayers,
          secured: secured,
          primary:primary,
          wmsGroupUrl: fullGroupUrl,
          layers: layerList,
          panelOpen: panelOpen
        };
        if (groupObj.layers.length >= 1) {
          groups.push(groupObj);
          if (isDefault) {
            defaultGroup = groupObj;
            isDefault = false;
          }
        }
      }
    });
   
    if (defaultGroup === undefined || defaultGroup === null) defaultGroup = groups[0];

    if (!isReset) window.emitter.emit("tocLoaded", null);
    //console.log([groups, defaultGroup]);
    callback([groups, defaultGroup]);
  });
}

// GET GROUPS FROM CONFIG
export function getGroups() {
  let defaultGroup = null;
  let groups = [];
  for (var i = 0, len = TOCConfig.layerGroups.length; i < len; i++) {
    const group = TOCConfig.layerGroups[i];
    const wmsGroupUrl = group.wmsUrl;
    const customGroupUrl = group.customRestUrl;
    const isDefault = group.defaultGroup;
    const groupName = group.name;
    const groupDisplayName = group.displayName;
    const groupObj = {
      value: groupName,
      label: groupDisplayName,
      defaultGroup: isDefault,
      visibleLayers: group.visibleLayers,
      wmsGroupUrl: wmsGroupUrl,
      customRestUrl: customGroupUrl,
    };
    groups.push(groupObj);

    if (isDefault) defaultGroup = groupObj;
  }

  return [groups, defaultGroup];
}

// GET BASIC INFO - THIS IS FOR PERFORMANCE TO LOAD LAYERS IN THE TOC
export function getBasicLayers(group, tocType, callback) {
    this.getLayerListByGroupWMS(group, tocType, (layerList) => {
      callback(layerList);
    });
}

export function getFullInfoLayers(layers, callback) {
  var newLayers = [];
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    let newLayer = Object.assign({}, layer);
    getBase64FromImageUrl(layer.styleUrl, (height, img) => {
      newLayer.legendHeight = height;
      newLayer.legendImage = img;
      newLayers.push(newLayer);

      if (index === layers.length - 1) callback(newLayers);
    });
  }
}

export function getBase64FromImageUrl(url, callback) {
  var img = new Image();

  img.setAttribute("crossOrigin", "anonymous");

  img.onload = function() {
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

export function isDuplicate(layerList, newLayerName) {
  let returnValue = false;
  layerList.forEach((layer) => {
    if (layer.name === newLayerName) {
      returnValue = true;
    }
  });
  return returnValue;
}
export function jsonToLayer(json, callback) {
  const returnObject = {};
  for (const property in json) {
    if (!excludedProps.includes(property)) returnObject[property] = json[property];
  }
  const layerProperties = json._layerProperties;
  const rebuildParams = layerProperties.rebuildParams;
  const visible = json._layerVisible;
  const opacity = json._layerOpacity;
  const drawIndex = json.index;
  const layerFeatures = json.layerFeatures;
  const layerProps = {};
  for (const property in layerProperties) {
    if (includedLayerProps.includes(property)) layerProps[property] = layerProperties[property];
  }
  // LAYER PROPS

  LayerHelpers.getLayer(
    rebuildParams.sourceType,
    rebuildParams.source,
    rebuildParams.projection,
    rebuildParams.layerName,
    rebuildParams.url,
    rebuildParams.tiled,
    rebuildParams.file,
    rebuildParams.extent,
    rebuildParams.name,
    (newLayer) => {
      newLayer.setVisible(visible);
      newLayer.setOpacity(opacity);
      newLayer.setProperties(layerProps);
      window.map.addLayer(newLayer);
      newLayer.setZIndex(drawIndex);
      if (rebuildParams.file === "STORED FEATURES") {
        const features = FeatureHelpers.getFeatures(layerFeatures, OL_DATA_TYPES.KML);
        newLayer.getSource().addFeatures(features);
      }
      returnObject["layer"] = newLayer;
      callback(returnObject);
    }
  );
}

export function layerToJson(layer, callback) {
  const returnObject = {};
  for (const property in layer) {
    if (property !== "layer") {
      returnObject[property] = layer[property];
    }
  }
  if (layer.layer === undefined) return returnObject;

  const olLayer = layer.layer;
  let layerSource = layer.layer.getSource();
  returnObject["_layerType"] = LayerHelpers.getLayerType(olLayer);
  returnObject["_layerSourceType"] = LayerHelpers.getLayerSourceType(layerSource);
  returnObject["_layerVisible"] = olLayer.getVisible();
  returnObject["_layerOpacity"] = olLayer.getOpacity();
  //returnObject["_layerProperties"] = olLayer.getProperties();
  const olLayerProperties = olLayer.getProperties();
  const returnLayerProperties = {};
  for (const property in olLayerProperties) {
    if (property !== "source") {
      returnLayerProperties[property] = olLayerProperties[property];
    }
  }
  returnObject["_layerProperties"] = returnLayerProperties;
  const rebuildParams = returnLayerProperties.rebuildParams;
  if (rebuildParams !== undefined && rebuildParams.file === "STORED FEATURES") {
    returnObject["layerFeatures"] = FeatureHelpers.setFeatures(olLayer.getSource().getFeatures(), OL_DATA_TYPES.KML);
  }
  //savedLayers[layer.name] = saveLayer;
  if (callback !== undefined) callback(returnObject);
}


/**
 * Performs a selective shallow/deep copy to preserve group and layer state, but not cloning open layers layer that has been added to the map.
 * @param {*} layerGroups 
 */
export function copyTOCLayerGroups (layerGroups){
  return layerGroups.map((group) => 
                                {
                                  let newGroup = Object.assign({},group);
                                  //newGroup.panelOpen = false;
                                  newGroup.layers = group.layers.map((layer) => 
                                      {
                                        let newLayer = Object.assign({},layer);
                                        newLayer.layer = layer.layer; 
                                        return newLayer;
                                      }
                                      );
                                  return newGroup;
                                });
}
/**
 * Performs a selective shallow/deep copy to preserve group and layer state, but not cloning open layers layer that has been added to the map.
 * @param {*} layerGroup
 */
export function copyTOCLayerGroup (layerGroup){
    let newGroup = Object.assign({},layerGroup);
    newGroup.layers = layerGroup.layers.map((layer) => 
        {
          let newLayer = Object.assign({},layer);
          newLayer.layer = layer.layer; 
          return newLayer;
        }
        );
    return newGroup;                     
}
/**
 * Performs a selective shallow/deep copy to preserve layer state, but not cloning open layers layer that has been added to the map.
 * @param {*} layer
 */
export function copyTOCLayer(layer){
    let newLayer = Object.assign({},layer);
    newLayer.layer = layer.layer; 
    return newLayer; 
}
export async function buildLayerByGroup(group, layer, layerIndex, tocType,secured, callback) {
  // SAVED DATA
  let savedData = helpers.getItemsFromStorage(tocType === "LIST" ? storageKey : storageKeyFolder);
  if (savedData === undefined) savedData = [];
  const savedGroup = savedData[group.value];
  let savedLayers = []
  try{
    if (savedGroup !== undefined && savedGroup.layers !== undefined) {
      savedLayers = savedGroup.layers;
    }else if (savedGroup !== undefined){
      savedLayers = savedGroup; //Added to support legacy saves 
    }
  } catch (e){
    console.warn(e);
  }

  if (layer.Layer === undefined) {
    const visibleLayers = group.visibleLayers === undefined ? [] : group.visibleLayers;
    const geoserverPath = helpers.getConfigValue("geoserverPath");

    const layerNameOnly = layer.Name;
    let layerTitle = layer.Title;
    let queryable = layer.queryable !== undefined ? layer.queryable : false;
    let opaque = layer.opaque !== undefined ? layer.opaque : false;
    if (layerTitle === undefined) layerTitle = layerNameOnly;
    const keywords = layer.KeywordList;
    const styleUrl = layer.Style !== undefined ? layer.Style[0].LegendURL[0].OnlineResource.replace("http:", "https:") : "";
    const serverUrl = group.wmsGroupUrl.split(`/${geoserverPath}/`)[0] + `/${geoserverPath}`;
    // const wfsUrlTemplate = (serverUrl, layerName) => `${serverUrl}/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerName.split(" ").join("%20")}&outputFormat=application/json&cql_filter=`;
    // const wfsUrl = wfsUrlTemplate(serverUrl, layer.Name[0]);

    const metadataUrlTemplate = (serverUrl, layerName) => `${serverUrl}/rest/layers/${layerName.split(" ").join("%20")}.json`;
    const metadataUrl = metadataUrlTemplate(serverUrl, layer.Name);

    // LIVE LAYER
    let liveLayer = _isLiveLayer(keywords);

    // DOWNLOAD
    let canDownload = _getCanDownload(keywords);

    // IDENTIFY DISPLAY NAME
    let identifyDisplayName = _getDisplayName(keywords);

    //DISPLAY NAME
    let displayName = _getDisplayName(keywords);
    if (displayName === "") displayName = layerTitle;

    if (group.prefix !== undefined) {
      displayName = group.prefix !== "" ? group.prefix + " - " + displayName : displayName;
    }
    // ATTRIBUTE TABLE
    let noAttributeTable = _getNoAttributeTable(keywords);

    // TOC DISPLAY NAME
    const tocDisplayName = layerTitle;

    // OPACITY
    let opacity = _getOpacity(keywords);

    //IDENTIFY
    let identifyTitleColumn = _getIdentifyTitle(keywords);
    let identifyIdColumn = _getIdentifyId(keywords);
    //DISCLAIMER
    let disclaimerTitle = _getDisclaimerTitle(keywords);
    let disclaimerUrl = _getDisclaimerURL(keywords);
    let disclaimer = undefined;
    if (disclaimerUrl !== "" || disclaimerTitle !== "") {
      disclaimer = { title: disclaimerTitle, url: disclaimerUrl };
    }
    const minScale = layer.MinScaleDenominator;
    const maxScale = layer.MaxScaleDenominator;
    // SET VISIBILITY
    let layerVisible = false;
    if (savedLayers !== undefined) {
      const savedLayer = savedLayers[layerNameOnly];
      if (savedLayer !== undefined && savedLayer.visible) layerVisible = true;
      if (savedLayer !== undefined && savedLayer.opacity && savedLayer.opacity !== opacity) opacity = savedLayer.opacity;
    } else if (visibleLayers.includes(layerNameOnly)) layerVisible = true;

    // LAYER PROPS
    LayerHelpers.getLayer(OL_DATA_TYPES.ImageWMS, "WMS", undefined, layer.Name, serverUrl + "/wms?layers=" + layer.Name, false, undefined, undefined, displayName, (newLayer) => {
      const wfsUrlTemplate = (rootUrl, layer) => `${rootUrl}/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layer}&outputFormat=application/json&cql_filter=`;
      const wfsUrl = wfsUrlTemplate(serverUrl.replace("/wms", ""), layer.Name);

      const workspace = layer.Name.split(":")[0];
      const rootInfoTemplate = (rootUrl, ws, lnOnly) => `${rootUrl}/rest/workspaces/${ws}/layers/${lnOnly}.json`;
      const rootInfoUrl = rootInfoTemplate(serverUrl.replace("/wms", ""), workspace, layerNameOnly);

      newLayer.setVisible(layerVisible);
      newLayer.setOpacity(opacity);
      newLayer.setProperties({ 
          name: layerNameOnly, 
          displayName: displayName, 
          tocDisplayName: tocDisplayName,
          wfsUrl: wfsUrl, 
          rootInfoUrl: rootInfoUrl, 
          disableParcelClick: liveLayer, 
          queryable: queryable, 
          opaque: opaque });

      newLayer.setZIndex(layerIndex);
      window.map.addLayer(newLayer);

      const returnLayer = {
        name: layerNameOnly, // FRIENDLY NAME
        height: 30, // HEIGHT OF DOM ROW FOR AUTOSIZER
        drawIndex: layerIndex, // INDEX USED BY VIRTUAL LIST
        index: layerIndex, // INDEX USED BY VIRTUAL LIST
        styleUrl: styleUrl, // WMS URL TO LEGEND SWATCH IMAGE
        showLegend: false, // SHOW LEGEND USING PLUS-MINUS IN TOC
        legendHeight: -1, // HEIGHT OF IMAGE USED BY AUTOSIZER
        legendImage: null, // IMAGE DATA, STORED ONCE USER VIEWS LEGEND
        visible: layerVisible, // LAYER VISIBLE IN MAP, UPDATED BY CHECKBOX
        layer: newLayer, // OL LAYER OBJECT
        metadataUrl: metadataUrl, // ROOT LAYER INFO FROM GROUP END POINT
        opacity: opacity, // OPACITY OF LAYER
        minScale: minScale, //MinScaleDenominator from geoserver
        maxScale: maxScale, //MaxScaleDenominator from geoserver
        liveLayer: liveLayer, // LIVE LAYER FLAG
        identifyDisplayName: identifyDisplayName, // DISPLAY NAME USED BY IDENTIFY
        group: group.value,
        groupName: group.label,
        canDownload: canDownload, // INDICATES WETHER LAYER CAN BE DOWNLOADED
        displayName: displayName, // DISPLAY NAME USED BY IDENTIFY
        identifyTitleColumn: identifyTitleColumn,
        identifyIdColumn: identifyIdColumn,
        disclaimer: disclaimer,
        wfsUrl: wfsUrl,
        tocDisplayName: tocDisplayName, // DISPLAY NAME USED FOR TOC LAYER NAME
        serverUrl: serverUrl + "/", // BASE URL FOR GEOSERVER
        noAttributeTable: noAttributeTable, // IF TRUE, DISABLE ATTRIBUTE TABLE
        secured: secured,
        // elementId: layerNameOnly + "_" + group.value,
      };
      callback(returnLayer);
    });
  }
}

export function getLayerListByGroupWMS(group, tocType, callback) {
  // SAVED DATA
  //const savedData = helpers.getItemsFromStorage(storageKey);
  //const savedLayers = savedData[group.value];

  // GET XML
  helpers.httpGetText(group.wmsGroupUrl, (result) => {
    var parser = new WMSCapabilities();
    const resultObj = parser.read(result);
    const groupLayerList = resultObj.Capability.Layer.Layer[0].Layer;
    //const visibleLayers = group.visibleLayers === undefined ? [] : group.visibleLayers;
    let layerIndex = groupLayerList.length + layerIndexStart;
    let layerList = [];
    groupLayerList.forEach((layerInfo) => {
      if (!isDuplicate(layerList, layerInfo.Name)) {
        if (layerInfo.Layer === undefined) {
          buildLayerByGroup(group, layerInfo, layerIndex, tocType,false, (result) => {
            layerList.push(result);
          });
          layerIndex--;
        }
      }
    });

    callback(layerList);
  });
}

export function getLayerListByGroup(group, callback) {
  // GET XML
  helpers.httpGetText(group.wmsGroupUrl, (result) => {
    var parser = new WMSCapabilities();
    const resultObj = parser.read(result);
    const groupLayerList = resultObj.Capability.Layer.Layer[0].Layer;
    //const isLayer = (layer) => {
    //  return layer.Layer === undefined;
    //};
    //const allLayers = groupLayerList.find(isLayer);
    //console.log(allLayers);
    let layerIndex = groupLayerList.length + layerIndexStart;
    let layerList = [];

    groupLayerList.forEach((layerInfo) => {
      if (!isDuplicate(layerList, layerInfo.Name[0])) {
        if (layerInfo.Layer === undefined) {
          buildLayerByGroup(group, layerInfo, layerIndex,false, (result) => {
            layerList.push(result);
          });
          layerIndex--;
        }
      }
    });

    callback(layerList);
   
  });
}

function _getDefaultGroup(keywords) {
  if (keywords === undefined) return false;
  const defaultKeyword = keywords.find(function(item) {
    return item.indexOf("DEFAULT_GROUP") !== -1;
  });
  if (defaultKeyword !== undefined) {
    const val = defaultKeyword.split("=")[1];
    return val;
  } else return "";
}

function _isLiveLayer(keywords) {
  if (keywords === undefined) return false;
  const liveLayerKeyword = keywords.find(function(item) {
    return item.indexOf("LIVE_LAYER") !== -1;
  });
  if (liveLayerKeyword !== undefined) return true;
  else return false;
}

function _getGroupPrefix(keywords) {
  if (keywords === undefined) return "";
  const groupPrefixKeyword = keywords.find(function(item) {
    return item.indexOf("GROUP_PREFIX") !== -1;
  });
  if (groupPrefixKeyword !== undefined) {
    const val = groupPrefixKeyword.split("=")[1];
    return val;
  } else return "";
}

function _getDisplayName(keywords) {
  if (keywords === undefined) return "";
  const displayNameKeyword = keywords.find(function(item) {
    return item.indexOf("DISPLAY_NAME") !== -1;
    //return item.indexOf("IDENTIFY_DISPLAY_NAME") !== -1;
  });
  if (displayNameKeyword !== undefined) {
    const val = displayNameKeyword.split("=")[1];
    return val;
  } else return "";
}

function _getIdentifyTitle(keywords) {
  if (keywords === undefined) return "";
  const identifyTitleColumn = keywords.find(function(item) {
    return item.indexOf("IDENTIFY_TITLE_COLUMN") !== -1;
  });
  if (identifyTitleColumn !== undefined) {
    const val = identifyTitleColumn.split("=")[1];
    return val;
  } else return "";
}

function _getDisclaimerURL(keywords) {
  if (keywords === undefined) return "";
  const returnText = keywords.find(function(item) {
    return item.indexOf("DISCLAIMER_URL") !== -1;
  });
  if (returnText !== undefined) {
    const val = returnText.split("=")[1];
    return val.split("”").join("");
  } else return "";
}

function _getDisclaimerTitle(keywords) {
  if (keywords === undefined) return "";
  const returnText = keywords.find(function(item) {
    return item.indexOf("DISCLAIMER_TITLE") !== -1;
  });
  if (returnText !== undefined) {
    const val = returnText.split("=")[1];
    return val.split("”").join("");
  } else return "";
}

function _getIdentifyId(keywords) {
  if (keywords === undefined) return "";
  const identifyIdColumn = keywords.find(function(item) {
    return item.indexOf("IDENTIFY_ID_COLUMN") !== -1;
  });
  if (identifyIdColumn !== undefined) {
    const val = identifyIdColumn.split("=")[1];
    return val;
  } else return "";
}

function _getVisibleLayers(keywords) {
  if (keywords === undefined) return "";
  const visibleLayersKeyword = keywords.find(function(item) {
    return item.indexOf("VISIBLE_LAYERS") !== -1;
  });
  if (visibleLayersKeyword !== undefined) {
    const val = visibleLayersKeyword.split("=")[1];
    return val.split(",");
  } else return [];
}

function _getCenterCoordinates(keywords) {
  if (keywords === undefined) return "";
  const centerCoordinatesKeyword = keywords.find(function(item) {
    return item.indexOf("MAP_CENTER") !== -1;
  });
  if (centerCoordinatesKeyword !== undefined) {
    const val = centerCoordinatesKeyword.split("=")[1];
    return val.split(",");
  } else return [];
}

function _getZoom(keywords) {
  if (keywords === undefined) return 1;
  const zoomKeyword = keywords.find(function(item) {
    return item.indexOf("MAP_ZOOM") !== -1;
  });
  if (zoomKeyword !== undefined) {
    const val = zoomKeyword.split("=")[1];
    return parseInt(val);
  } else return 0;
}

function _getOpacity(keywords) {
  if (keywords === undefined) return 1;
  const opacityKeyword = keywords.find(function(item) {
    return item.indexOf("OPACITY") !== -1;
  });
  if (opacityKeyword !== undefined) {
    const val = opacityKeyword.split("=")[1];
    return parseFloat(val);
  } else return 1;
}

function _getCanDownload(keywords) {
  if (keywords === undefined) return false;
  const downloadLayerKeyword = keywords.find(function(item) {
    return item.indexOf("DOWNLOAD") !== -1;
  });
  if (downloadLayerKeyword !== undefined) return true;
  else return false;
}

function _getNoAttributeTable(keywords) {
  if (keywords === undefined) return false;
  const keyword = keywords.find(function(item) {
    return item.indexOf("NO_ATTRIBUTE_TABLE") !== -1;
  });
  if (keyword !== undefined) return true;
  else return false;
}

export function disableLayersVisiblity(layers, callback) {
  var newLayers = [];
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    layer.layer.setVisible(false);
    let newLayer = Object.assign({}, layer);
    newLayers.push(newLayer);
    if (index === layers.length - 1) callback(newLayers);
  }
}

export function acceptDisclaimer(layer, returnToFunction) {
  if (layer.disclaimer !== undefined && (window.acceptedDisclaimers === undefined || window.acceptedDisclaimers.indexOf(layer.name) === -1)) {
    helpers.showTerms(
      layer.disclaimer.title,
      `The layer you are about to view contains data  which is subject to a licence agreement. 
           Before turning on this layer, you must review the agreement and click 'Accept' or 'Decline'.`,
      layer.disclaimer.url,
      helpers.messageColors.gray,
      () => {
        let currentDisclaimers = window.acceptedDisclaimers;
        if (currentDisclaimers === undefined) currentDisclaimers = [];
        currentDisclaimers.push(layer.name);
        window.acceptedDisclaimers = currentDisclaimers;
        returnToFunction();
      },
      () => {}
    );
    return false;
  } else {
    return true;
  }
}

export function turnOnLayers(layers, callback) {
  var newLayers = [];
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    if (
      acceptDisclaimer(layer, () => {
        window.emitter.emit("activeTocLayer", {
          fullName: layer.name,
          name: layer.displayName,
          isVisible: layer.layer.getVisible(),
          layerGroupName: layer.groupName,
          layerGroup: layer.group,
          index: layer.index,
        });
      })
    ) {
      layer.layer.setVisible(true);
      layer.visible = true;
    }
    let newLayer = Object.assign({}, layer);
    newLayers.push(newLayer);
    if (index === layers.length - 1) callback(newLayers);
  }
}

export function turnOffLayers(layers, callback) {
  var newLayers = [];
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    layer.layer.setVisible(false);
    layer.visible = false;
    let newLayer = Object.assign({}, layer);
    newLayers.push(newLayer);
    if (index === layers.length - 1) callback(newLayers);
  }
}

export function enableLayersVisiblity(layers, callback) {
  var newLayers = [];
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    layer.layer.setVisible(layer.visible);
    let newLayer = Object.assign({}, layer);
    newLayers.push(newLayer);
    if (index === layers.length - 1) callback(newLayers);
  }
}

export function resetLayerDefaults(layers, callback) {
  var newLayers = [];
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    layer.layer.setVisible(false);
    let newLayer = Object.assign({}, layer);
    newLayer.height = 30; // HEIGHT OF DOM ROW FOR AUTOSIZER
    newLayer.showLegend = false; // SHOW LEGEND USING PLUS-MINUS IN TOC
    newLayer.visible = false; // LAYER VISIBLE IN MAP, UPDATED BY CHECKBOX
    newLayers.push(newLayer);
    if (index === layers.length - 1) callback(newLayers);
  }
}

export function updateLayerIndex(layers, callback) {
  var newLayers = [];
  let layerIndex = layers.length + layerIndexStart;
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];

    let newLayer = Object.assign({}, layer);
    newLayer.layer.setZIndex(layerIndex);
    newLayer.drawIndex = layerIndex;
    newLayers.push(newLayer);
    if (index === layers.length - 1) callback(newLayers.concat([]));

    layerIndex--;
  }
}

export function getLayerInfo(layerInfo, callback) {
  helpers.getJSON(layerInfo.metadataUrl.replace("http:", "https:"), (result) => {
    const fullInfoUrl = result.layer.resource.href
      .replace("http:", "https:")
      .split("+")
      .join("%20");
    helpers.getJSON(fullInfoUrl, (result) => {
      result.featureType.fullUrl = fullInfoUrl.replace("http:", "https:");
      callback(result);
    });
  });
}
export function sortByAlphaCompare(a, b) {
  if (a.tocDisplayName < b.tocDisplayName) {
    return -1;
  }
  if (a.tocDisplayName > b.tocDisplayName) {
    return 1;
  }
  return 0;
}
export function sortByIndexCompare(a, b) {
  if (a.drawIndex > b.drawIndex) {
    return -1;
  }
  if (a.drawIndex < b.drawIndex) {
    return 1;
  }
  return 0;
}
export function getStyles(groups) {
  // URL FOR PULLING LEGEND FROM GEOSERVER
  const styleURLTemplate = (serverURL, layerName, styleName) => `${serverURL}/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerName}&STYLE=${styleName}`;

  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    //console.log(group)
    let layerList = group.layerList;
    //let layerIndex = 0;
    layerList.forEach((layer) => {
      //console.log(layer);
      helpers.getJSON(layer.subLayerInfoURL.replace("http", "https"), (subLayerInfo) => {
        //console.log(subLayerInfo);
        //layerIndex++;
        let styleURL = "";
        if (subLayerInfo.layer.styles === undefined) {
          //console.log(subLayerInfo)
          // GET FIRST CUSTOM DEFAULT STYLE
          if (subLayerInfo.layer.defaultStyle !== undefined) styleURL = styleURLTemplate(layer.serverURL, subLayerInfo.layer.name, subLayerInfo.layer.defaultStyle.name);
        } else {
          // GET DEFAULT STYLE
          styleURL = styleURLTemplate(layer.serverURL, subLayerInfo.layer.name, subLayerInfo.layer.styles.style[0].name);
        }

        layer.styleURL = styleURL;
      });
    });
  }
}
