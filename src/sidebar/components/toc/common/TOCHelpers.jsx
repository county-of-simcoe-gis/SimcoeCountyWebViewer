import * as helpers from "../../../../helpers/helpers";
import * as drawingHelpers from "../../../../helpers/drawingHelpers";
import { LayerHelpers, FeatureHelpers, OL_DATA_TYPES} from "../../../../helpers/OLHelpers";
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
const includedLayerProps = ["name", "rebuildParams", "displayName", "disableParcelClick", "wfsUrl", "rootInfoUrl", "liveLayer", "queryable", "opaque", "userLayer"];

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

export function makeGroup(options, callback=undefined) {
  const groupObj = {
    value: options.value !== undefined ? options.value : helpers.getUID(),
    label: options.label,
    defaultGroup: options.defaultGroup,
    url: options.url,
    prefix: options.prefix,
    visibleLayers: options.visibleLayers,
    wmsGroupUrl: options.wmsGroupUrl,
    customRestUrl: options.customGroupUrl,
    layers: options.layers !== undefined ? options.layers : [],
  };
  if (callback === undefined) return groupObj;
  else callback(groupObj);
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
    newLayer.setProperties({ name: layerId, tocDisplayName:layerName, displayName: layerName, minScale:minScale, maxScale: maxScale, });
    newLayer.setZIndex(layerIndex);
    window.map.addLayer(newLayer);
  }

  let userLayer = newLayer.get("userLayer");
  if (userLayer === undefined) userLayer=false;
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
    userLayer: userLayer,
  };
  callback(returnLayer);
}

export async function getMap (mapId=null,urlType, isReset, tocType, callback){
  const apiUrl = helpers.getConfigValue('apiUrl');
  let mapSettingURL = (mapId === null || mapId === undefined || mapId.trim() === '') ? `${apiUrl}settings/getDefaultMap` : `${apiUrl}settings/getMap/${mapId}`;
  let layerGroups = undefined;
  let default_group = undefined;
  helpers.getJSON(mapSettingURL, (result) => 
    {
      var sourcesProcessed = 0;
      const mapSettings = JSON.parse(result.json);

      const defaultTheme = mapSettings.default_theme;
      const defaultTool = mapSettings.default_tool;
      if (defaultTheme !== undefined) {
        window.emitter.emit("activateSidebarItem", defaultTheme, "themes");
      } else if (defaultTool !== undefined) {
        window.emitter.emit("activateSidebarItem", defaultTool, "tools");
      }
      //console.log(mapSettings);
      default_group = mapSettings.default_group;
      mapSettings.sources.forEach(source => {

        if (source.type === undefined || source.type === null || source.type === "") source["type"] = "geoserver"; //default to geoserver
        switch(source.type.toLowerCase()){
          case "geoserver":
            getGroupsGC(source.layerUrl, urlType, isReset, tocType, source.secure,source.primary, source.secureKey, (layerGroupConfig) => {
                if (source.primary && mapSettings.default_group === undefined) default_group = layerGroupConfig.defaultLayerName;
                if (layerGroups === undefined){
                  layerGroups = layerGroupConfig.groups;
                }else{
                  layerGroups = mergeGroups(layerGroups,layerGroupConfig.groups);
                }
                sourcesProcessed ++;
                if (sourcesProcessed === mapSettings.sources.length){
                  callback({groups: layerGroups,defaultGroupName:default_group});
                }
            });
            break;
          case "arcgis":
            getGroupsESRI(
              {
                url: source.layerUrl,
                tocType:tocType,
                isReset:isReset
              }, (layerGroupConfig) => {
                if (source.primary && mapSettings.default_group === undefined) default_group = layerGroupConfig.defaultLayerName;
                if (layerGroups === undefined){
                  layerGroups = layerGroupConfig.groups;
                }else{
                  layerGroups = mergeGroups(layerGroups,layerGroupConfig.groups);
                }
                sourcesProcessed ++;
                if (sourcesProcessed === mapSettings.sources.length){
                  callback({groups: layerGroups,defaultGroupName:default_group});
                }
            });
            break;
          default:
            break;
        }
        
      });
      
    });
}

export function mergeGroupsTogether(group, groups){  
  groups.forEach(currentGroup =>{
    currentGroup.layers.forEach(currentLayer => {
      let newLayer = Object.assign({},currentLayer);
      newLayer.group = group.value;
      newLayer.groupName = group.label;
      var isDuplicateLayer = false;
      group.layers = group.layers.map((layer) => {
        if (newLayer.tocDisplayName === layer.tocDisplayName){
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
  })

  group.layers = group.layers.sort((a,b)=>{
                                    if (a.displayName < b.displayName) {
                                      return -1;
                                    } else if (a.displayName > b.displayName) {
                                      return 1;
                                    }else{
                                      return 0;
                                    }
                                  });
  //update index based on newly sorted layers
  let index = group.layers.length;
  group.layers = group.layers.map(layer => {
    index--;
    layer.index = index;
    layer.drawIndex = index;
    layer.layer.setZIndex(index);
    return layer;
  });                        
  
  return group;
}

export function mergeGroups(originalGroups, newGroups){
  newGroups.forEach((newGroup) => {
    var isDuplicateGroup = false;
    originalGroups = originalGroups.map((group) => {
      if (newGroup.label === group.label){
        isDuplicateGroup = true;
        newGroup.layers.forEach((newLayer) => {
          var isDuplicateLayer = false;
          group.layers = group.layers.map((layer) => {
            if (newLayer.tocDisplayName === layer.tocDisplayName){
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
        return 0;
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
  callback({groups:groups, defaultGroupName:defaultGroup.value});

}

// GET GROUPS FROM MAP SERVER
export function getGroupsESRI(options, callback) {
  let defaultGroup = null;
  let groups = [];
  let groupsObj = {};
  let savedData = helpers.getItemsFromStorage(options.tocType === "LIST" ? storageKey : storageKeyFolder);
  if (savedData === undefined) savedData = [];
  
  LayerHelpers.getCapabilities(options.url, "rest", (layers) => {
    layers.forEach(layer => {
      const layerOptions = parseESRIDescription(layer.description);
      layerOptions["id"] = layer.id;
      layerOptions["name"] = layer.name;
      layerOptions["minScale"] = layer.minScale;
      layerOptions["maxScale"] = layer.maxScale;
      layerOptions["defaultVisibility"] = layer.defaultVisibility;
      layerOptions["identifyTitleColumn"] = layer.displayField
      layerOptions["opacity"] = 1 - (layer.drawingInfo.transparency === undefined ? 0 : layer.drawingInfo.transparency/100);
      layerOptions["liveLayer"] = layerOptions.isLiveLayer;
      layer["options"] = layerOptions;
      layerOptions.categories.forEach(category=>{
        const groupValue = category === "All Layers" ? "opengis:all_layers" : category;
        const tmpGroupObj = {
          value: groupValue,
          label: category,
          url: options.url,
          secured: false,
          primary:false,
          prefix: "",
          defaultGroup: false,
          visibleLayers: "",
          wmsGroupUrl: options.url,
          layers: [],
        };
        if (groupsObj[tmpGroupObj.value] === undefined){
          tmpGroupObj.layers.push(layer);
          groupsObj[tmpGroupObj.value] = tmpGroupObj;
        } else{
          groupsObj[tmpGroupObj.value].layers.push(layer);
        }
      });
    });
    const keys = Object.keys(groupsObj);
    keys.forEach(key => {
      let currentGroup = groupsObj[key];
      let layerList = [];
      let layerIndex = currentGroup.layers.length;
      let visibleLayers = [];
      let isDefault = false;


      const buildLayers = (items) => {
        items.forEach((currentLayer) => {
          if (!isDuplicate(layerList, currentLayer.name)) {
            buildESRILayer({
              group: currentGroup,
              layer: currentLayer,
              layerIndex: layerIndex,
              tocType: options.tocType
            }, (result)=>{
              layerList.push(result);
            });
            layerIndex--;
            visibleLayers.push(currentLayer.name);
          }
        });
      };
      buildLayers(currentGroup.layers);
      let panelOpen = false;
      const savedGroup = savedData[key];
      if (savedGroup !== undefined) {
        panelOpen = savedGroup.panelOpen;
      }else if (isDefault) panelOpen = true;
      const groupObj = {
        value: currentGroup.value,
        label: currentGroup.label,
        url: currentGroup.url,
        prefix: currentGroup.prefix,
        defaultGroup: currentGroup.defaultGroup,
        visibleLayers: visibleLayers,
        secured: currentGroup.secured,
        primary:currentGroup.primary,
        wmsGroupUrl: currentGroup.fullGroupUrl,
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
    });
    if (defaultGroup === undefined || defaultGroup === null) defaultGroup = groups[0];
    if (!options.isReset) {
      window.emitter.emit("tocLoaded", null);
      helpers.addIsLoaded("toc");
    }
    callback({groups:groups, defaultGroupName:defaultGroup.value});
  });

}

// GET GROUPS FROM GET CAPABILITIES
export async function getGroupsGC(url, urlType, isReset, tocType, secured=false,primary=true,secureKey=undefined, callback) {
  let defaultGroup = null;
  let isDefault = false;
  let groups = [];
  let savedData = helpers.getItemsFromStorage(tocType === "LIST" ? storageKey : storageKeyFolder);
  if (savedData === undefined) savedData = [];
  

  const remove_underscore = (name) => {
    return helpers.replaceAllInString(name, "_", " ");
  };
  const params = {};
  if (secured){
    const headers = {};
    if (secureKey !== undefined){
      headers[secureKey]="GIS";
      headers["Content-Type"]="application/text";
    }
    params["mode"]= "cors";
    params["headers"]=headers;
  }

  helpers.httpGetTextWithParams(url,params, (result) => {
    var parser = new WMSCapabilities();
    const resultObj = parser.read(result);
    let groupLayerList =
      urlType === "root"
        ? [resultObj.Capability.Layer.Layer[0]]
        : urlType === "group"
        ? resultObj.Capability.Layer.Layer[0].Layer
        : [resultObj.Capability.Layer.Layer[0]];
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
        let allLayersVisible = false;
        if (keywords !== undefined) allLayersVisible = _getAllLayersVisible(keywords);
        if (keywords !== undefined) groupPrefix = _getGroupPrefix(keywords);
        if (allLayersVisible){
          visibleLayers = layerInfo.Layer.map((item)=>item.Name);
        }else{
          if (keywords !== undefined) visibleLayers = _getVisibleLayers(keywords);
        }
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
                buildLayerByGroup(tmpGroupObj, currentLayer, layerIndex, tocType,secured, secureKey, (result) => {
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

    if (!isReset) {
      window.emitter.emit("tocLoaded", null);
      helpers.addIsLoaded("toc");
    }

    callback({groups:groups, defaultGroupName: defaultGroupName});
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

  return  {groups:groups,defaultGroupName: defaultGroup.value};
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
    helpers.getBase64FromImageUrl(layer.styleUrl, (height, img) => {
      newLayer.legendHeight = height;
      newLayer.legendImage = img;
      newLayers.push(newLayer);

      if (index === layers.length - 1) callback(newLayers);
    });
  }
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
  LayerHelpers.getLayer(rebuildParams,
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




export async function buildLayerByGroup(group, layer, layerIndex, tocType,secured, secureKey=undefined, callback) {
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

    let styleUrl = layer.Style !== undefined ? layer.Style[0].LegendURL[0].OnlineResource.replace("http:", "https:") : "";
    // STATIC IMAGE LEGEND
    let legendSizeOverride = _getStaticImageLegend(keywords);

    if (legendSizeOverride && styleUrl !== "" ) {
      const legendSize = layer.Style !== undefined ? layer.Style[0].LegendURL[0].size : [20,20];
      styleUrl = styleUrl.replace("width=20", `width=${legendSize[0]}`).replace("height=20", `height=${legendSize[1]}`);
    }
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
    if (savedLayers !== undefined && savedLayers !== null && savedLayers.length !== 0) {
      const savedLayer = savedLayers[layerNameOnly];
      if (savedLayer !== undefined){
        if (savedLayer.visible) layerVisible = true;
        if (savedLayer.opacity) opacity = savedLayer.opacity;
        if (savedLayer.index) layerIndex = savedLayer.index;
  
      } 
    } 
    else if (visibleLayers.includes(layerNameOnly)) 
    { 
      layerVisible = true;
    }
    // LAYER PROPS
    LayerHelpers.getLayer(
      {
        sourceType:OL_DATA_TYPES.ImageWMS, 
        source:"WMS", 
        layerName:layer.Name, 
        url:serverUrl + "/wms?layers=" + layer.Name, 
        tiled:false, 
        name:displayName,
        secureKey:secureKey, 
      },
      (newLayer) => {
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
          opaque: opaque, 
          minScale: minScale,
          maxScale: maxScale,});
      if (secureKey !== undefined) newLayer.setProperties({secureKey: secureKey});
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

function _getAllLayersVisible(keywords) {
  if (keywords === undefined) return "";
  const allLayersVisible = keywords.find(function(item) {
    return item.indexOf("VISIBLE_LAYERS") !== -1;
  });
  if (allLayersVisible !== undefined) {
    const val = allLayersVisible.split("=")[1];
    if (val === "ALL") return true;
  }
  return false;
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

function _getStaticImageLegend(keywords) {
  if (keywords === undefined) return false;
  const keyword = keywords.find(function(item) {
    return item.indexOf("STATIC_IMAGE_LEGEND") !== -1;
  });
  if (keyword !== undefined) return true;
  else return false;
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

export function updateLayerIndex(layers, callback=undefined) {
  var newLayers = [];
  let layerIndex = layers.length + layerIndexStart;
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];

    let newLayer = Object.assign({}, layer);
    newLayer.layer.setZIndex(layerIndex);
    newLayer.drawIndex = layerIndex;
    
    newLayers.push(newLayer);
    if (index === layers.length - 1) {
      if (callback!==undefined) callback(newLayers.concat([]));
      else return newLayers.concat([]);
    }
    layerIndex--;
  }
}

export function getLayerInfo(layerInfo, callback) {
  const params = {};
  const secureKey = layerInfo.layer !== undefined ? layerInfo.layer.get("secureKey") : undefined;
  if (secureKey !== undefined) {
    const headers = {};
    headers[secureKey]="GIS";
    params["headers"]=headers;
  }
  helpers.getJSONWithParams(layerInfo.metadataUrl.replace("http:", "https:"),params, (result) => {
    const fullInfoUrl = result.layer.resource.href
      .replace("http:", "https:")
      .split("+")
      .join("%20");
    helpers.getJSONWithParams(fullInfoUrl, params,(fullInfoResult) => {
      if (fullInfoResult.featureType === undefined) fullInfoResult["featureType"] = {};
      fullInfoResult.featureType.fullUrl = fullInfoUrl.replace("http:", "https:");
      fullInfoResult["requestParams"]=params;
      callback(fullInfoResult);
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

/***
 * =======================================
 * ESRI SPECIFIC FUNCTIONS
 * =======================================
 */
function parseESRIDescription (description){
  const descriptionParts = description.split("#");
  let returnObj = {
    isGroupOn:"",
    isLiveLayer: false,
    isVisible:false,
    isOpen: false,
    sar: false,
    description: "",
    refreshInterval:"",
    modalURL:"",
    categories :["All Layers"],
  };
 
  descriptionParts.forEach(descriptionPart=>{
    let parts = descriptionPart.split("=");
    let key = parts[0].trim();
    if (key != null && key.length !== 0)
    {
      //VALUE STRING
      let value = parts[1];
      switch (key.toUpperCase()){
        case "CATEGORY":
            value.split(",").forEach(item=>{
              returnObj.categories.push(item.trim());
            });
            break;
        case "LIVELAYER":
            returnObj.isLiveLayer = value.trim().toUpperCase() === "TRUE";
            break;
        case "GROUPON":
          returnObj.isGroupOn =value.trim().toUpperCase() === "TRUE";
            break;
        case "VISIBLE":
          returnObj.isVisible = value.trim().toUpperCase() === "TRUE";
            break;
        case "OPEN":
          returnObj.isOpen = value.trim().toUpperCase() === "TRUE";
            break;
        case "SAR":
          returnObj.sar = value.trim().toUpperCase() === "TRUE";
            break;
        case "DESCRIPTION":
          returnObj.description = value;
            break;
        case "REFRESH":
          returnObj.refreshInterval = value;
            break;
        case "MODALURL":
          returnObj.modalURL = value;
            break;
        default:
          break;
       }
    }
  });
  return returnObj;
}



export async function buildESRILayer(options, callback){
    //parse required options and set defaults
    const tocType = options.tocType !== undefined ? options.tocType : "LIST";
    let group = options.group;
    let layer = options.layer;
    let layerIndex = options.layerIndex;
    let secured = options.secured !== undefined ? options.secured : false;
    let secureKey = options.secureKey;

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
  
    if (layer !== undefined) {
      const visibleLayers = group.visibleLayers === undefined ? [] : group.visibleLayers;
  
      const layerNameOnly = layer.name;
      let layerTitle = layer.options.title;
      let queryable = layer.queryable !== undefined ? layer.queryable : false;
      let opaque = layer.opaque !== undefined ? layer.opaque : false;
      if (layerTitle === undefined) layerTitle = layerNameOnly;

      let styleUrl = "";
      // STATIC IMAGE LEGEND
      let legendSizeOverride = false;
  
      if (legendSizeOverride && styleUrl !== "" ) {
        const legendSize = layer.Style !== undefined ? layer.Style.Legend.size : [20,20];
        styleUrl = styleUrl.replace("width=20", `width=${legendSize[0]}`).replace("height=20", `height=${legendSize[1]}`);
      }
      const serverUrl = group.url;
      const metadataUrl = `${layer.url}?f=json`;
  
      // LIVE LAYER
      let liveLayer = layer.options.isLiveLayer;
      // DOWNLOAD
      let canDownload = layer.options.canDownload !== undefined ? layer.options.canDownload : false;
      // IDENTIFY DISPLAY NAME
      let identifyDisplayName = layer.options.idenfityName;
      //DISPLAY NAME
      let displayName = layer.options.displayName;
      if (displayName === "" || displayName === undefined) displayName = layerTitle;
  
      if (group.prefix !== undefined) {
        displayName = group.prefix !== "" ? group.prefix + " - " + displayName : displayName;
      }
      // ATTRIBUTE TABLE
      let noAttributeTable = layer.options.noAttributeTable !== undefined ? layer.options.noAttributeTable :false;  
      
      // TOC DISPLAY NAME
      const tocDisplayName = layerTitle;
  
      // OPACITY
      let opacity = layer.options.opacity;
  
      //IDENTIFY
      let identifyTitleColumn = layer.options.identifyTitleColumn;
      let identifyIdColumn = layer.options.identifyIdColumn;
      //DISCLAIMER
      let disclaimerTitle = layer.options.disclaimerTitle;
      let disclaimerUrl = layer.options.disclaimerUrl;
      let disclaimer = undefined;
      if (disclaimerUrl !== "" || disclaimerTitle !== "") {
        disclaimer = { title: disclaimerTitle, url: disclaimerUrl };
      }
      const minScale = layer.options.minScale;
      const maxScale = layer.options.maxScale;
      // SET VISIBILITY
      let layerVisible = false;
      if (savedLayers !== undefined && savedLayers !== null && savedLayers.length !== 0) {
        const savedLayer = savedLayers[layerNameOnly];
        if (savedLayer !== undefined){
          if (savedLayer.visible) layerVisible = true;
          if (savedLayer.opacity) opacity = savedLayer.opacity;
          if (savedLayer.index) layerIndex = savedLayer.index;
    
        } 
      } 
      else if (visibleLayers.includes(layerNameOnly)) 
      { 
        layerVisible = true;
      }
      //console.log(group.value, layerNameOnly, visibleLayers.includes(layerNameOnly));
      // LAYER PROPS
      LayerHelpers.getLayer(
        {
          sourceType:OL_DATA_TYPES.ImageArcGISRest,
          source:"rest", 
          projection: `EPSG:${layer.sourceSpatialReference.latestWkid}`,
          layerName:layer.name, 
          url:layer.url, 
          tiled:false, 
          extent:layer.extent, 
          name: layer.name, 
          
        },
        (newLayer) => {
        //const identifyUrl = (url) => `${url}/query?geometry=#GEOMETRY#&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&returnTrueCurves=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnDistinctValues=false&returnExtentOnly=false&quantizationParameters=&f=geojson`;
        const identifyUrl = (options) => `${options.url}/identify?geometry=${options.point}&geometryType=esriGeometryPoint&layers=visible%3A${options.layerId}&sr=3857&datumTransformations=3857&tolerance=${options.tolerance}&mapExtent=${options.extent}&imageDisplay=${options.resolution}&maxAllowableOffset=10&returnGeometry=true&returnFieldName=true&f=json`;

        const wfsUrl = identifyUrl({url:layer.rootUrl, point: '#GEOMETRY#', layerId: layer.id,tolerance: '#TOLERANCE#', extent: '#EXTENT#', resolution: '#RESOLUTION#' });
        const rootInfoUrl = layer.url;
          //http://gis.simcoe.ca/arcgis/rest/services/Severn/Severn_OperationalLayers_Dynamic/MapServer/0/
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
            opaque: opaque, 
            minScale: minScale,
            maxScale: maxScale,});
        if (secureKey !== undefined) newLayer.setProperties({secureKey: secureKey});
        newLayer.setZIndex(layerIndex);
        window.map.addLayer(newLayer);
        let legendHeight = -1;
        if (layer.legend !== undefined && layer.legend !== null){
          legendHeight=36;
          layer.legend.legend.forEach(legendItem => {
            legendHeight += parseInt(legendItem.height);
          });
        }
        const returnLayer = {
          name: layerNameOnly, // FRIENDLY NAME
          height: 30, // HEIGHT OF DOM ROW FOR AUTOSIZER
          drawIndex: layerIndex, // INDEX USED BY VIRTUAL LIST
          index: layerIndex, // INDEX USED BY VIRTUAL LIST
          styleUrl: styleUrl, // WMS URL TO LEGEND SWATCH IMAGE
          showLegend: false, // SHOW LEGEND USING PLUS-MINUS IN TOC
          legendHeight: legendHeight, // HEIGHT OF IMAGE USED BY AUTOSIZER
          legendImage: null, // IMAGE DATA, STORED ONCE USER VIEWS LEGEND
          legendObj: layer.legend, // ESRI JSON LEGEND OBJECT
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

