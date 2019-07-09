import * as helpers from "../../../helpers/helpers";
import TOCConfig from "./TOCConfig.json";

// INDEX WHERE THE TOC LAYERS SHOULD START DRAWING AT
const layerIndexStart = 100;

// LOCAL STORAGE KEY
const storageKey = "layers";

// GET GROUPS FROM CONFIG
export function getGroups() {
  let defaultGroup = null;
  let groups = [];
  for (var i = 0, len = TOCConfig.layerGroups.length; i < len; i++) {
    const group = TOCConfig.layerGroups[i];
    const groupUrl = group.url;
    const isDefault = group.defaultGroup;
    const groupName = groupUrl.substring(groupUrl.lastIndexOf("/") + 1).split(".")[0];
    const groupObj = {
      value: groupName,
      label: groupName,
      groupUrl: groupUrl,
      defaultGroup: isDefault,
      visibleLayers: group.visibleLayers
    };
    groups.push(groupObj);

    if (isDefault) defaultGroup = groupObj;
  }

  return [groups, defaultGroup];
}

// GET BASIC INFO - THIS IS FOR PERFORMANCE TO LOAD LAYERS IN THE TOC
export async function getBasicLayers(group, callback) {
  await this.getBasicLayerListByGroup(group, group.dataStore, layerList => {
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

//================================================================
// SYNCHRONOUS CALLS TO ENSURE CORRECT LAYER ORDER
// BASIC INFO RETURNED FOR PERFORMANCE TO LOAD LAYERS IN THE TOC
// SECOND CALL IS MADE TO GET THE REST OF THE LAYER INFO AND STYLES
export async function getBasicLayerListByGroup(group, dataStore, callback) {
  const layerGroupURL = group.groupUrl;
  const visibleLayers = group.visibleLayers === undefined ? [] : group.visibleLayers;

  let layerList = [];
  // MAIN GROUP INFO CALL
  let layerGroupInfo = await helpers.getJSONWait(layerGroupURL);
  if (layerGroupInfo === undefined) return;

  let groupLayerList = null;
  if (Array.isArray(layerGroupInfo.layerGroup.publishables.published)) {
    if (layerGroupInfo.layerGroup.publishables.published.length > 0) groupLayerList = layerGroupInfo.layerGroup.publishables.published;
  } else {
    groupLayerList = [layerGroupInfo.layerGroup.publishables.published];
  }

  // RETURN IF WE DON"T HAVE ANYTHING TO PROCESS
  if (groupLayerList === null) return;

  // SAVED DATA
  const savedData = helpers.getItemsFromStorage(storageKey);
  const savedLayers = savedData[group.value];

  let layerIndex = groupLayerList.length + layerIndexStart;
  for (var i = 0, len = groupLayerList.length; i < len; i++) {
    const groupLayerInfo = groupLayerList[i];
    const workspace = groupLayerInfo.name.split(":")[0];
    const layerNameOnly = groupLayerInfo.name.split(":")[1];
    const rootLayerUrl = groupLayerInfo.href.replace("http:", "https:");

    const serverUrl = rootLayerUrl.split("/rest/")[0];
    const styleUrlTemplate = (serverUrl, layerName) => `${serverUrl}/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerName}`;
    const styleUrl = styleUrlTemplate(serverUrl, groupLayerInfo.name);

    // SKIP NESTED GROUP LAYERS
    if (groupLayerInfo["@type"] !== "layer") {
      if (i === len - 1) {
        callback(layerList);
      }
      continue;
    }

    let layerVisible = false;
    if (savedLayers !== undefined) {
      const savedLayer = savedLayers[layerNameOnly];
      if (savedLayer !== undefined && savedLayer.visible) layerVisible = true;
    } else if (visibleLayers.includes(layerNameOnly)) layerVisible = true;

    let layer = null;
    layer = helpers.getImageWMSLayer(serverUrl + "/wms", groupLayerInfo.name);
    layer.setVisible(layerVisible);
    layer.setProperties({ name: groupLayerInfo.name });
    layer.setZIndex(layerIndex);
    window.map.addLayer(layer);

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
      rootLayerUrl: rootLayerUrl, // ROOT LAYER INFO FROM GROUP END POINT
      opacity: 1 // OPACITY OF LAYER
    });

    layerIndex--;
  }

  callback(layerList);
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
  helpers.getJSON(layerInfo.rootLayerUrl.replace("http:", "https:"), result => {
    const fullInfoUrl = result.layer.resource.href.replace("http:", "https:");
    helpers.getJSON(fullInfoUrl, result => {
      result.featureType.fullUrl = fullInfoUrl.replace("http:", "https:");
      callback(result);
    });
  });
}

export async function getBasicGroupsAndLayers(callback) {
  let groups = [];
  let defaultLayers = [];
  let defaultGroupName = "";
  for (var i = 0, len = TOCConfig.layerGroups.length; i < len; i++) {
    const group = TOCConfig.layerGroups[i];
    const groupURL = group.url;
    const defaultGroup = group.defaultGroup;

    // eslint-disable-next-line
    await this.getLayerListByGroup(groupURL, group.dataStore, (groupName, layerList) => {
      groups.push({ name: groupName, layerList: layerList, default: defaultGroup, label: groupName, value: groupName });
      if (defaultGroup) {
        defaultLayers = layerList;
        defaultGroupName = groupName;
      }
    });
  }

  callback(groups, defaultLayers, defaultGroupName);
}

export function getStyles(groups) {
  // URL FOR PULLING LEGEND FROM GEOSERVER
  const styleURLTemplate = (serverURL, layerName, styleName) =>
    `${serverURL}/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerName}&STYLE=${styleName}`;

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
