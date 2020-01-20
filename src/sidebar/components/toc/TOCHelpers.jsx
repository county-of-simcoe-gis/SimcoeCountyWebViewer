import * as helpers from "../../../helpers/helpers";
import TOCConfig from "./TOCConfig.json";
import xml2js from "xml2js";

// INDEX WHERE THE TOC LAYERS SHOULD START DRAWING AT
const layerIndexStart = 100;

// LOCAL STORAGE KEY
const storageKey = "layers";


// GET GROUPS FROM GET CAPABILITIES
export async function getGroupsGC(url,layerDepth, callback) {
  let defaultGroup = null;
  let isDefault = false;
  let groups = [];
  const remove_underscore = name => {return helpers.replaceAllInString(name, "_", " ");}
  
  helpers.httpGetText(url, result => {
    var parser = new xml2js.Parser();

    // PARSE TO JSON
    parser.parseString(result, function(err, result) {
      let groupLayerList = layerDepth === 1 ? 
                            result.WMS_Capabilities.Capability[0].Layer[0].Layer : 
                              layerDepth === 2 ? result.WMS_Capabilities.Capability[0].Layer[0].Layer[0].Layer :
                                result.WMS_Capabilities.Capability[0].Layer[0].Layer ;
      let parentGroup = layerDepth === 1 ? 
                              result.WMS_Capabilities.Capability[0].Layer[0] : 
                                layerDepth === 2 ? result.WMS_Capabilities.Capability[0].Layer[0].Layer[0] :
                                  result.WMS_Capabilities.Capability[0].Layer[0];
      let parentKeywords = [];
      if (parentGroup.KeywordList[0] !== undefined) parentKeywords = parentGroup.KeywordList[0].Keyword;
      let mapCenter = [];
      if (parentKeywords.length > 0) mapCenter = _getCenterCoordinates(parentKeywords);
      let mapZoom = 0;
      if (parentKeywords.length > 0) mapZoom = _getZoom(parentKeywords);
      let defaultGroupName = "";
      if (parentKeywords.length > 0) defaultGroupName = _getDefaultGroup(parentKeywords);
      if (mapCenter.length > 0 && mapZoom > 0) window.map.getView().animate({ center: mapCenter, zoom: mapZoom });                         
       groupLayerList.forEach(layerInfo => {
        if (layerInfo.Layer !== undefined){
          const groupName = layerInfo.Name[0].indexOf(":") !== -1 ? layerInfo.Name[0].split(":")[1] : layerInfo.Name[0];
          if (groupName === defaultGroupName) isDefault = true;
          const groupDisplayName = layerInfo.Title[0];
          const groupUrl =   url.split("/geoserver/")[0] + "/geoserver/" + groupName + "/ows?service=wms&version=1.3.0&request=GetCapabilities";
          const fullGroupUrl = url.split("/geoserver/")[0] + "/geoserver/" + groupName + "/ows?service=wms&version=1.3.0&request=GetCapabilities";
          let keywords = [];
          if (layerInfo.KeywordList[0] !== undefined) keywords = layerInfo.KeywordList[0].Keyword;
          let visibleLayers = [];
          if (keywords !== undefined) visibleLayers = _getVisibleLayers(keywords);
          let layerList = [];
          if(layerInfo.Layer !== undefined){
            const groupLayerList = layerInfo.Layer;
            
            let layerIndex = groupLayerList.length + layerIndexStart;
            const tmpGroupObj = {
              value: groupName,
              label: remove_underscore(groupDisplayName),
              url: groupUrl,
              defaultGroup: isDefault,
              visibleLayers:visibleLayers,
              wmsGroupUrl: fullGroupUrl
            };
          
            const buildLayers = (layers) => {
                layers.forEach(currentLayer => {
                buildLayerByGroup(tmpGroupObj,currentLayer,layerIndex,result => {
                  layerList.push(result);
                });
                layerIndex--;
              if (currentLayer.Layer === undefined ){
                  visibleLayers.push(currentLayer.Name[0]);
                }else{
                  buildLayers(currentLayer.Layer);
                }
              });
            }
            buildLayers(layerInfo.Layer);
          }

        const groupObj = {
              value: groupName,
              label: remove_underscore(groupDisplayName),
              url: groupUrl,
              defaultGroup: isDefault,
              visibleLayers:visibleLayers,
              wmsGroupUrl: fullGroupUrl,
              layers: layerList
            };
        if (groupObj.layers.length >=1){
          groups.push(groupObj);
          if (isDefault) {
            defaultGroup = groupObj;
            isDefault = false;
          }
        }
        

        }
      });
    });
    if (defaultGroup===undefined || defaultGroup===null) defaultGroup = groups[0];
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
      customRestUrl: customGroupUrl
    };
    groups.push(groupObj);

    if (isDefault) defaultGroup = groupObj;
  }

  return [groups, defaultGroup];
}

// GET BASIC INFO - THIS IS FOR PERFORMANCE TO LOAD LAYERS IN THE TOC
export function getBasicLayers(group, callback) {
  if (!TOCConfig.useCustomRestUrl) {
    this.getLayerListByGroupWMS(group, layerList => {
      callback(layerList);
    });
  } else {
    this.getLayerListByGroupCustomRest(group, layerList => {
      callback(layerList);
    });
  }
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



export async function buildLayerByGroup(group, layer, layerIndex, callback){
  // SAVED DATA
  const savedData = helpers.getItemsFromStorage(storageKey);
  const savedLayers = savedData[group.value];
  
  if (layer.Layer === undefined){
    const visibleLayers = group.visibleLayers === undefined ? [] : group.visibleLayers;

    const layerNameOnly = layer.Name[0].split(":")[1];
    let layerTitle = layer.Title[0];
    if (layerTitle === undefined) layerTitle = layerNameOnly;
    const keywords = layer.KeywordList[0].Keyword;
    const styleUrl = layer.Style[0].LegendURL[0].OnlineResource[0].$["xlink:href"];
    const serverUrl = group.wmsGroupUrl.split("/geoserver/")[0] + "/geoserver";
    const wfsUrlTemplate = (serverUrl, layerName) => `${serverUrl}/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerName}&outputFormat=application/json&cql_filter=`;
    const wfsUrl = wfsUrlTemplate(serverUrl, layer.Name[0]);

    const metadataUrlTemplate = (serverUrl, layerName) => `${serverUrl}/rest/layers/${layerName}.json`;
    const metadataUrl = metadataUrlTemplate(serverUrl, layer.Name[0]);

    // LIVE LAYER
    let liveLayer = _isLiveLayer(keywords);

    //DISPLAY NAME
    let displayName = _getDisplayName(keywords);
    if (displayName==="") displayName =layerTitle;
    // OPACITY
    let opacity = _getOpacity(keywords);

    // SET VISIBILITY
    let layerVisible = false;
    if (savedLayers !== undefined) {
      const savedLayer = savedLayers[layerNameOnly];
      if (savedLayer !== undefined && savedLayer.visible) layerVisible = true;
    } else if (visibleLayers.includes(layerNameOnly)) layerVisible = true;

    // LAYER PROPS
    let newLayer = helpers.getImageWMSLayer(serverUrl + "/wms", layer.Name[0]);
    newLayer.setVisible(!group.defaultGroup ? false : layerVisible);
    newLayer.setOpacity(opacity);
    newLayer.setProperties({ name: layerTitle, displayName: displayName });
    newLayer.setZIndex(layerIndex);
    window.map.addLayer(newLayer);

    const returnLayer = {
        name: displayName, // FRIENDLY NAME
        title: layerTitle,
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
        liveLayer: liveLayer, // LIVE LAYER FLAG
        wfsUrl: wfsUrl,
        displayName: displayName, // DISPLAY NAME USED BY IDENTIFY
        group: group.name

      };
      callback(returnLayer);
  }
 
}


export function getLayerListByGroupWMS(group, callback) {
  // SAVED DATA
  const savedData = helpers.getItemsFromStorage(storageKey);
  const savedLayers = savedData[group.value];

  // GET XML
  helpers.httpGetText(group.wmsGroupUrl, result => {
    var parser = new xml2js.Parser();

    // PARSE TO JSON
    parser.parseString(result, function(err, result) {
      const groupLayerList = result.WMS_Capabilities.Capability[0].Layer[0].Layer[0].Layer;
      const visibleLayers = group.visibleLayers === undefined ? [] : group.visibleLayers;
      let layerIndex = groupLayerList.length + layerIndexStart;
      let layerList = [];
      groupLayerList.forEach(layerInfo => {
        if (layerInfo.Layer === undefined){
          buildLayerByGroup(group,layerInfo,layerIndex,result => {
            layerList.push(result);
          });
          layerIndex--;
        }
      });

      callback(layerList);
    });
  });
}

export function getLayerListByGroup(group, callback) {
  

  // GET XML
  helpers.httpGetText(group.wmsGroupUrl, result => {
    var parser = new xml2js.Parser();

    // PARSE TO JSON
    parser.parseString(result, function(err, result) {
      const groupLayerList = result.WMS_Capabilities.Capability[0].Layer[0].Layer[0].Layer;
      const isLayer = (layer) => {return layer.Layer === undefined;};
      const allLayers = groupLayerList.find(isLayer);
      console.log(allLayers);
      let layerIndex = groupLayerList.length + layerIndexStart;
      let layerList = [];
     
      groupLayerList.forEach(layerInfo => {
        
        if (layerInfo.Layer === undefined){
          buildLayerByGroup(group,layerInfo,layerIndex,result => {
            layerList.push(result);
          });
          layerIndex--;
        }
        
      });
      callback(layerList);
    });
    
  });
}

function _getDefaultGroup(keywords) {
  if (keywords === undefined)  return false;
  const defaultKeyword = keywords.find(function(item) {
    return item.indexOf("DEFAULT_GROUP") !== -1;
  });
  if (defaultKeyword !== undefined) {
    const val = defaultKeyword.split("=")[1];
    return val;
  } else return "";
}

export function getLayerListByGroupCustomRest(group, callback) {
  // SAVED DATA
  const savedData = helpers.getItemsFromStorage(storageKey);
  const savedLayers = savedData[group.value];

  console.log(group);
  console.log(group.customRestUrl);
  helpers.getJSON(group.customRestUrl, layerGroupInfo => {
    console.log(layerGroupInfo);
    let groupLayerList = null;
    if (Array.isArray(layerGroupInfo.layerGroup.publishables.published)) {
      if (layerGroupInfo.layerGroup.publishables.published.length > 0) groupLayerList = layerGroupInfo.layerGroup.publishables.published;
    } else {
      groupLayerList = [layerGroupInfo.layerGroup.publishables.published];
    }

    // RETURN IF WE DON"T HAVE ANYTHING TO PROCESS
    if (groupLayerList === null) return;

    const visibleLayers = group.visibleLayers === undefined ? [] : group.visibleLayers;
    let layerIndex = groupLayerList.length + layerIndexStart;
    let layerList = [];
    groupLayerList.forEach(layerInfo => {
      //console.log(layerInfo);
      const layerNameOnly = layerInfo.name.split(":")[1];
      const keywords = layerInfo.layerDetails.featureType.keywords[0].string;
      const serverUrl = layerInfo.href.split("/rest/")[0];
      const styleUrlTemplate = (serverUrl, layerName) => `${serverUrl}/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerName}`;
      const styleUrl = styleUrlTemplate(serverUrl, layerInfo.name);
      const wfsUrlTemplate = (serverUrl, layerName) => `${serverUrl}/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerName}&outputFormat=application/json&cql_filter=`;
      const wfsUrl = wfsUrlTemplate(serverUrl, layerInfo.name);
      const metadataUrlTemplate = (serverUrl, layerName) => `${serverUrl}/rest/layers/${layerName}.json`;
      const metadataUrl = metadataUrlTemplate(serverUrl, layerInfo.name);

      // LIVE LAYER
      let liveLayer = _isLiveLayer(keywords);

      //DISPLAY NAME
      let displayName = _getDisplayName(keywords);

      // // OPACITY
      let opacity = _getOpacity(keywords);

      // SET VISIBILITY
      let layerVisible = false;
      if (savedLayers !== undefined) {
        const savedLayer = savedLayers[layerNameOnly];
        if (savedLayer !== undefined && savedLayer.visible) layerVisible = true;
      } else if (visibleLayers.includes(layerNameOnly)) layerVisible = true;

      // LAYER PROPS
      let layer = helpers.getImageWMSLayer(serverUrl + "/wms", layerInfo.name);
      layer.setVisible(layerVisible);
      layer.setOpacity(opacity);
      layer.setProperties({ name: layerNameOnly, displayName: displayName });
      layer.setZIndex(layerIndex);
      window.map.addLayer(layer);

      // LAYER OBJECT USED BY TOC
      layerList.push({
        name: layerNameOnly, // FRIENDLY NAME
        height: 30, // HEIGHT OF DOM ROW FOR AUTOSIZER
        drawIndex: layerIndex, // INDEX USED BY VIRTUAL LIST
        index: layerIndex, // INDEX USED BY VIRTUAL LIST
        styleUrl: styleUrl, // WMS URL TO LEGEND SWATCH IMAGE
        showLegend: false, // SHOW LEGEND USING PLUS-MINUS IN TOC
        legendHeight: -1, // HEIGHT OF IMAGE USED BY AUTOSIZER
        legendImage: null, // IMAGE DATA, STORED ONCE USER VIEWS LEGEND
        visible: layerVisible, // LAYER VISIBLE IN MAP, UPDATED BY CHECKBOX
        layer: layer, // OL LAYER OBJECT
        metadataUrl: metadataUrl, // ROOT LAYER INFO FROM GROUP END POINT
        opacity: opacity, // OPACITY OF LAYER
        liveLayer: liveLayer, // LIVE LAYER FLAG
        wfsUrl: wfsUrl,
        displayName: displayName, // DISPLAY NAME USED BY IDENTIFY
        group: group.name
      });

      layerIndex--;
    });

    callback(layerList);
  });
}

function _isLiveLayer(keywords) {
  if (keywords === undefined)  return false;
  const liveLayerKeyword = keywords.find(function(item) {
    return item.indexOf("LIVE_LAYER") !== -1;
  });
  if (liveLayerKeyword !== undefined) return true;
  else return false;
}

function _getDisplayName(keywords) {
  if (keywords === undefined)  return "";
  const displayNameKeyword = keywords.find(function(item) {
    return item.indexOf("DISPLAY_NAME") !== -1;
  });
  if (displayNameKeyword !== undefined) {
    const val = displayNameKeyword.split("=")[1];
    return val;
  } else return "";
}

function _getVisibleLayers(keywords) {
  if (keywords === undefined)  return "";
  const visibleLayersKeyword = keywords.find(function(item) {
    return item.indexOf("VISIBLE_LAYERS") !== -1;
  });
  if (visibleLayersKeyword !== undefined) {
    const val = visibleLayersKeyword.split("=")[1];
    return val.split(",");
  } else return [];
}

function _getCenterCoordinates(keywords) {
  if (keywords === undefined)  return "";
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

export function turnOffLayers(layers, callback) {
  var newLayers = [];
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    layer.layer.setVisible(false);
    let newLayer = Object.assign({}, layer);
    newLayer.visible = false;
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

    if (index === layers.length - 1) callback(newLayers);

    layerIndex--;
  }
}

export function getLayerInfo(layerInfo, callback) {
  helpers.getJSON(layerInfo.metadataUrl.replace("http:", "https:"), result => {
    const fullInfoUrl = result.layer.resource.href.replace("http:", "https:");
    helpers.getJSON(fullInfoUrl, result => {
      result.featureType.fullUrl = fullInfoUrl.replace("http:", "https:");
      callback(result);
    });
  });
}

export function getStyles(groups) {
  // URL FOR PULLING LEGEND FROM GEOSERVER
  const styleURLTemplate = (serverURL, layerName, styleName) => `${serverURL}/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerName}&STYLE=${styleName}`;

  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    //console.log(group)
    let layerList = group.layerList;
    //let layerIndex = 0;
    layerList.forEach(layer => {
      //console.log(layer);
      helpers.getJSON(layer.subLayerInfoURL.replace("http", "https"), subLayerInfo => {
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
