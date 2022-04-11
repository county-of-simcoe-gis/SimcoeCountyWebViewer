import * as helpers from "../../../../helpers/helpers";
import * as drawingHelpers from "../../../../helpers/drawingHelpers";
import { LayerHelpers, FeatureHelpers, OL_DATA_TYPES } from "../../../../helpers/OLHelpers";
import { WMSCapabilities } from "ol/format.js";

// INDEX WHERE THE TOC LAYERS SHOULD START DRAWING AT
const layerIndexStart = 100;

// LOCAL STORAGE KEY
const storageMapDefaultsKey = "Map Defaults";
const storageExtentKey = "Map Extent";

const myMapLayerName = "local:myMaps";
const excludedProps = ["_layerProperties", "rebuildParams", "_layerVisible", "_layerOpacity", "_layerType", "layerFeatures"];
const includedLayerProps = ["name", "rebuildParams", "displayName", "disableParcelClick", "wfsUrl", "rootInfoUrl", "liveLayer", "queryable", "opaque", "userLayer"];

export function makeGroup(options, callback = undefined) {
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
    newLayer.setProperties({
      name: layerId,
      tocDisplayName: layerName,
      displayName: layerName,
      minScale: minScale,
      maxScale: maxScale,
    });
    newLayer.setZIndex(layerIndex);
    window.map.addLayer(newLayer);
  }

  let userLayer = newLayer.get("userLayer");
  if (userLayer === undefined) userLayer = false;
  const returnLayer = {
    name: layerId,
    displayName: layerName,
    tocDisplayName: layerName,
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

export async function getMap(sources, isReset, tocType, callback) {
  let layerGroups = undefined;
  let default_group = window.config.toc.default_group;
  const urlType = window.config.toc.geoserverLayerGroupsUrlType;
  var sourcesProcessed = 0;

  sources.forEach((source) => {
    if (source.type === undefined || source.type === null || source.type === "") source["type"] = "geoserver"; //default to geoserver
    switch (source.type.toLowerCase()) {
      case "geoserver":
        getGroupsGC(source.layerUrl, source.urlType !== undefined ? source.urlType : urlType, isReset, tocType, source.secure, source.primary, source.secureKey, (layerGroupConfig) => {
          if (source.group !== undefined) {
            if (layerGroupConfig.groups[0] !== undefined) {
              if (source.group.name !== undefined) layerGroupConfig.groups[0]["value"] = source.group.name;
              if (source.group.displayName !== undefined) layerGroupConfig.groups[0]["label"] = source.group.displayName;
              if (source.group.visibleLayers !== undefined) layerGroupConfig.groups[0]["visibleLayers"] = source.group.visibleLayers;
            }
          }
          if (!layerGroupConfig.groups) {
            sourcesProcessed++;
            return;
          }
          if (source.primary && default_group === undefined) default_group = layerGroupConfig.defaultLayerName;
          if (layerGroups === undefined) {
            layerGroups = layerGroupConfig.groups;
          } else {
            layerGroups = mergeGroups(layerGroups, layerGroupConfig.groups);
          }

          sourcesProcessed++;
          if (sourcesProcessed >= sources.length) {
            callback({
              groups: layerGroups,
              defaultGroupName: default_group,
            });
          }
        });
        break;
      case "arcgis":
        getGroupsESRI(
          {
            url: source.layerUrl,
            tocType: tocType,
            isReset: isReset,
            requiresToken: source.secure,
            grouped: source.grouped,
            grouped_name: source.name,
          },
          (layerGroupConfig) => {
            if (!layerGroupConfig.groups) {
              sourcesProcessed++;
              return;
            }
            if (source.primary && default_group === undefined) default_group = layerGroupConfig.defaultLayerName;
            if (layerGroups === undefined) {
              layerGroups = layerGroupConfig.groups;
            } else {
              layerGroups = mergeGroups(layerGroups, layerGroupConfig.groups);
            }
            sourcesProcessed++;
            if (sourcesProcessed >= sources.length) {
              callback({
                groups: layerGroups,
                defaultGroupName: default_group,
              });
            }
          }
        );
        break;
      case "layer":
        const layerOptions = {
          url: source.layerUrl,
          secure: source.secure,
          secureKey: source.secureKey,
          type: source.type,
          groups: source.groups,
          layerType: source.layerType,
          sourceType: source.sourceType,
          source: source.source,
          name: source.name,
          layerName: source.layerName,
          tiled: source.tiled,
          visible: source.visible,
          projection: source.projection,
          index: source.index,
        };
        getSingleLayer(layerOptions, (layerGroupConfig) => {
          if (!layerGroupConfig.groups) {
            sourcesProcessed++;
            return;
          }
          if (layerGroups === undefined) {
            layerGroups = layerGroupConfig.groups;
          } else {
            layerGroups = mergeGroups(layerGroups, layerGroupConfig.groups);
          }
          if (source.primary && default_group === undefined) default_group = layerGroupConfig.defaultLayerName;

          sourcesProcessed++;
          if (sourcesProcessed >= sources.length) {
            callback({
              groups: layerGroups,
              defaultGroupName: default_group,
            });
          }
        });
        break;
      default:
        break;
    }
  });
}

export function mergeGroupsTogether(group, groups, alphaSort = true) {
  groups.forEach((currentGroup) => {
    currentGroup.layers.forEach((currentLayer) => {
      let newLayer = Object.assign({}, currentLayer);
      newLayer.group = group.value;
      newLayer.groupName = group.label;
      var isDuplicateLayer = false;
      group.layers = group.layers.map((layer) => {
        if (newLayer.tocDisplayName === layer.tocDisplayName) {
          isDuplicateLayer = true;
          if ((newLayer.secured || newLayer.primary) && !group.primary) {
            return newLayer;
          } else {
            return layer;
          }
        } else {
          return layer;
        }
      });

      if (!isDuplicateLayer) group.layers.push(newLayer);
    });
  });

  if (alphaSort)
    group.layers = group.layers.sort((a, b) => {
      if (a.displayName < b.displayName) {
        return -1;
      } else if (a.displayName > b.displayName) {
        return 1;
      } else {
        return 0;
      }
    });

  //update index based on newly sorted layers
  let index = group.layers.length;
  group.layers = group.layers.map((layer) => {
    index--;
    layer.index = index;
    layer.drawIndex = index;
    layer.layer.setZIndex(index);
    return layer;
  });

  return group;
}

export function mergeGroups(originalGroups, newGroups, alphaSort = true) {
  newGroups.forEach((newGroup) => {
    var isDuplicateGroup = false;
    originalGroups = originalGroups.map((group) => {
      if (newGroup.label === group.label) {
        isDuplicateGroup = true;
        newGroup.layers.forEach((newLayer) => {
          var isDuplicateLayer = false;
          group.layers = group.layers.map((layer) => {
            if (newLayer.tocDisplayName === layer.tocDisplayName) {
              isDuplicateLayer = true;
              if ((newLayer.secured || newLayer.primary) && !group.primary) {
                newLayer.group = group.value;
                newLayer.groupName = group.label;
                return newLayer;
              } else {
                return layer;
              }
            } else {
              return layer;
            }
          });
          if (!isDuplicateLayer) {
            newLayer.group = group.value;
            newLayer.groupName = group.label;
            group.layers.push(newLayer);
          }
        });

        return group;
      } else {
        return group;
      }
    });
    if (!isDuplicateGroup) originalGroups.push(newGroup);
  });
  if (alphaSort)
    return originalGroups.sort((a, b) => {
      if (a.value < b.value) {
        return -1;
      } else if (a.value > b.value) {
        return 1;
      } else {
        return 0;
      }
    });
  else return originalGroups;
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
  callback({ groups: groups, defaultGroupName: defaultGroup.value });
}

// GET GROUPS FROM MAP SERVER
export function getGroupsESRI(options, callback) {
  let defaultGroup = null;
  let groups = [];
  let groupsObj = {};
  const isGrouped = options.grouped ? true : false;
  let groupedLayer = { name: options.grouped_name, layers: [] };
  LayerHelpers.getCapabilities({ root_url: options.url, type: "rest" }, (layers) => {
    if (layers.length === 0) {
      callback({ groups: groups, defaultGroupName: defaultGroup });
    }

    layers.forEach((layer) => {
      if (layer.subLayerIds === undefined && layer.subLayers.length === 0) {
        const layerOptions = parseESRIDescription(layer.description);
        layerOptions["id"] = layer.id;
        layerOptions["name"] = layer.name;
        layerOptions["minScale"] = layer.minScale;
        layerOptions["maxScale"] = layer.maxScale;
        layerOptions["defaultVisibility"] = layer.defaultVisibility;
        layerOptions["identifyTitleColumn"] = layer.displayField;
        layerOptions["opacity"] = 1 - (layer.drawingInfo === undefined || layer.drawingInfo.transparency === undefined ? 0 : layer.drawingInfo.transparency / 100);
        layerOptions["liveLayer"] = layerOptions.isLiveLayer;
        layer["options"] = layerOptions;
        layer["visible"] = layer.defaultVisibility;
        if (!isGrouped)
          layerOptions.categories.forEach((category) => {
            const groupValue = category === "All Layers" ? "opengis:all_layers" : category;
            const tmpGroupObj = {
              value: groupValue,
              label: category,
              url: options.url,
              secured: false,
              primary: false,
              prefix: "",
              defaultGroup: false,
              visibleLayers: "",
              wmsGroupUrl: options.url,
              layers: [],
            };
            if (groupsObj[tmpGroupObj.value] === undefined) {
              tmpGroupObj.layers.push(layer);
              groupsObj[tmpGroupObj.value] = tmpGroupObj;
            } else {
              groupsObj[tmpGroupObj.value].layers.push(layer);
            }
          });
        else {
          layer["sourceType"] = OL_DATA_TYPES.ImageArcGISRest;
          groupedLayer.layers.push(layer);
        }
      }
    });
    if (isGrouped) {
      groupedLayer["grouped"] = true;
      groupedLayer["defaultVisibility"] = groupedLayer.layers[0].defaultVisibility;
      groupedLayer["options"] = groupedLayer.layers[0].options;

      let category = "All Layers";
      if (options.category) category = options.category;
      const tmpGroupedGroupObj = {
        value: category === "All Layers" ? "opengis:all_layers" : category,
        label: category,
        url: options.url,
        secured: false,
        primary: false,
        prefix: "",
        defaultGroup: false,
        visibleLayers: "",
        wmsGroupUrl: options.url,
        layers: [groupedLayer],
      };
      if (groupsObj[tmpGroupedGroupObj.value] === undefined) {
        groupsObj[tmpGroupedGroupObj.value] = tmpGroupedGroupObj;
      } else {
        groupsObj[tmpGroupedGroupObj.value].layers.push(groupedLayer);
      }
    }

    const keys = Object.keys(groupsObj);
    keys.forEach((key) => {
      let currentGroup = groupsObj[key];
      let layerList = [];
      let layerIndex = currentGroup.layers.length;
      let visibleLayers = [];
      let isDefault = false;

      const buildLayers = (items) => {
        items.forEach((currentLayer) => {
          if (!isDuplicate(layerList, currentLayer.name)) {
            buildESRILayer(
              {
                group: currentGroup,
                layer: currentLayer,
                layerIndex: layerIndex,
                tocType: options.tocType,
              },
              (result) => {
                layerList.push(result);
              }
            );
            layerIndex--;
            visibleLayers.push(currentLayer.name);
          }
        });
      };
      buildLayers(currentGroup.layers);
      let panelOpen = false;
      if (isDefault) panelOpen = true;
      const groupObj = {
        value: currentGroup.value,
        label: currentGroup.label,
        url: currentGroup.url,
        prefix: currentGroup.prefix,
        defaultGroup: currentGroup.defaultGroup,
        visibleLayers: visibleLayers,
        secured: currentGroup.secured,
        primary: currentGroup.primary,
        wmsGroupUrl: currentGroup.fullGroupUrl,
        layers: layerList,
        panelOpen: panelOpen,
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
    callback({
      groups: groups,
      defaultGroupName: defaultGroup !== undefined ? defaultGroup.value : null,
    });
  });
}
//GET SINGLE LAYER
export async function getSingleLayer(options, callback) {
  let groupArray = [];
  const index = options.index ? options.index : 0;
  const style = { label: options.layerName, value: options.layerName, style: "Default", layer_name: options.layerName };
  const layerOptions = {
    sourceType: options.sourceType,
    source: options.source,
    layerName: options.layerName,
    url: options.url,
    tiled: options.tiled ? true : false,
    name: options.layerName,
    style: style,
    //extent: [-8938992.401246801, 5456230.285257593, -8801900.781241283, 5610242.681997935],
    projection: options.projection ? options.projection : "EPSG:4326",
  };
  LayerHelpers.getLayer(layerOptions, (newSingleLayer) => {
    newSingleLayer.setProperties({
      index: index,
      // name: helpers.getUID(),
    });

    let groups = options.groups;
    if (!groups) groups = ["All Layers"];

    groups.forEach((groupName) => {
      makeGroup(
        {
          label: groupName,
          defaultGroup: false,
          url: "",
          prefix: "",
          wmsGroupUrl: "",
          customRestUrl: "",
          layers: [],
          value: groupName,
        },
        (newGroup) => {
          makeLayer(
            options.name,
            options.layerName,
            newGroup,
            index,
            options.visible ? true : false,
            options.opacity ? options.opacity : 1,
            newSingleLayer,
            undefined,
            undefined,
            false,
            undefined,
            (retLayer) => {
              if (options.secureKey !== undefined) retLayer.setProperties({ secureKey: options.secureKey });
              newGroup.layers.push(retLayer);
              groupArray.push(newGroup);
              if (groupArray.length >= groups.length) callback({ groups: groupArray, defaultLayerName: groups[0] });
            }
          );
        }
      );
    });
  });
}
// GET GROUPS FROM GET CAPABILITIES
export async function getGroupsGC(url, urlType, isReset, tocType, secured = false, primary = true, secureKey = undefined, callback) {
  let defaultGroup = null;
  let isDefault = false;
  let groups = [];

  const remove_underscore = (name) => {
    return helpers.replaceAllInString(name, "_", " ");
  };
  const params = {};
  const headers = {};
  params["mode"] = "cors";
  headers["Content-Type"] = "application/text";

  if (secured) {
    const headers = {};
    if (secureKey !== undefined) {
      headers[secureKey] = "GIS";
    }
    params["headers"] = headers;
  }

  helpers.httpGetTextWithParams(url, params, (result) => {
    var parser = new WMSCapabilities();
    const resultObj = parser.read(result);
    let groupLayerList = urlType === "root" ? [resultObj.Capability.Layer.Layer[0]] : urlType === "group" ? resultObj.Capability.Layer.Layer[0].Layer : [resultObj.Capability.Layer.Layer[0]];
    let parentGroup = urlType === "root" ? resultObj.Capability.Layer.Layer[0] : urlType === "group" ? resultObj.Capability.Layer.Layer[0] : resultObj.Capability.Layer.Layer[0];
    let parentKeywords = [];
    if (parentGroup.KeywordList !== undefined) parentKeywords = parentGroup.KeywordList;

    const allParentKeywords = parseGeoServerKeywords(parentKeywords);
    let mapCenter = [];
    if (parentKeywords !== undefined && parentKeywords.length > 0) mapCenter = allParentKeywords["MAP_CENTER"];
    let mapZoom = 0;
    if (parentKeywords !== undefined && parentKeywords.length > 0) mapZoom = allParentKeywords["MAP_ZOOM"];
    let defaultGroupName = "";
    if (parentKeywords !== undefined && parentKeywords.length > 0) defaultGroupName = allParentKeywords["DEFAULT_GROUP"];
    if (mapCenter.length > 0 && mapZoom > 0) {
      let defaultStorage = sessionStorage.getItem(storageMapDefaultsKey);
      if (defaultStorage === null) {
        sessionStorage.setItem(storageMapDefaultsKey, JSON.stringify({ center: mapCenter, zoom: mapZoom }));
      } else {
        if (defaultStorage.center !== undefined) mapCenter = defaultStorage.center;
        if (defaultStorage.zoom !== undefined) mapZoom = defaultStorage.zoom;
      }
      const storage = helpers.getItemsFromStorage(storageExtentKey);
      if (storage === undefined && window.config.toc.loaderType === "GEOSERVER") {
        window.map.getView().animate({ center: mapCenter, zoom: mapZoom });
      }
    }
    const geoserverPath = window.config.geoserverPath;
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
        const allGroupKeywords = parseGeoServerKeywords(keywords);
        let visibleLayers = [];
        let groupPrefix = "";
        let allLayersVisible = false;
        if (keywords !== undefined && keywords.length > 0) allLayersVisible = allGroupKeywords["All_VISIBLE_LAYERS"];
        if (keywords !== undefined && keywords.length > 0) groupPrefix = allGroupKeywords["GROUP_PREFIX"];
        if (allLayersVisible) {
          visibleLayers = layerInfo.Layer.map((item) => item.Name);
        } else {
          if (keywords !== undefined && keywords.length > 0) visibleLayers = allGroupKeywords["VISIBLE_LAYERS"];
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
            primary: primary,
            prefix: groupPrefix,
            defaultGroup: isDefault,
            visibleLayers: visibleLayers,
            wmsGroupUrl: fullGroupUrl,
          };

          const buildLayers = (layers) => {
            layers.forEach((currentLayer) => {
              if (!isDuplicate(layerList, currentLayer.Name)) {
                buildLayerByGroup(tmpGroupObj, currentLayer, layerIndex, tocType, secured, secureKey, (result) => {
                  layerList.push(result);
                });
                layerIndex--;
                if (currentLayer.Layer === undefined) {
                  visibleLayers.push(currentLayer.Name);
                } else {
                  buildLayers(currentLayer.Layer);
                }
              }
            });
          };
          buildLayers(layerInfo.Layer);
        }
        let panelOpen = false;
        if (isDefault) panelOpen = true;
        const groupObj = {
          value: groupName,
          label: remove_underscore(groupDisplayName),
          url: groupUrl,
          prefix: groupPrefix,
          defaultGroup: isDefault,
          visibleLayers: visibleLayers,
          secured: secured,
          primary: primary,
          wmsGroupUrl: fullGroupUrl,
          layers: layerList,
          panelOpen: panelOpen,
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

    callback({ groups: groups, defaultGroupName: defaultGroupName });
  });
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
  LayerHelpers.getLayer(rebuildParams, (newLayer) => {
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
  });
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

export async function buildLayerByGroup(group, layer, layerIndex, tocType, secured, secureKey = undefined, callback) {
  if (layer.Layer === undefined) {
    const visibleLayers = group.visibleLayers === undefined ? [] : group.visibleLayers;
    const geoserverPath = window.config.geoserverPath;

    const layerNameOnly = layer.Name;
    let layerTitle = layer.Title;
    let queryable = layer.queryable !== undefined ? layer.queryable : false;
    let opaque = layer.opaque !== undefined ? layer.opaque : false;
    if (layerTitle === undefined) layerTitle = layerNameOnly;
    let keywords = [];
    if (layer.KeywordList !== undefined) keywords = layer.KeywordList;
    let allKeywords = parseGeoServerKeywords(keywords);
    let styleUrl = layer.Style !== undefined ? layer.Style[0].LegendURL[0].OnlineResource.replace("http:", "https:") : "";
    // STATIC IMAGE LEGEND
    let legendSizeOverride = allKeywords["STATIC_IMAGE_LEGEND"];

    if (legendSizeOverride && styleUrl !== "") {
      const legendSize = layer.Style !== undefined ? layer.Style[0].LegendURL[0].size : [20, 20];
      styleUrl = styleUrl.replace("width=20", `width=${legendSize[0]}`).replace("height=20", `height=${legendSize[1]}`);
    }
    const serverUrl = group.wmsGroupUrl.split(`/${geoserverPath}/`)[0] + `/${geoserverPath}`;
    // const wfsUrlTemplate = (serverUrl, layerName) => `${serverUrl}/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerName.split(" ").join("%20")}&outputFormat=application/json&cql_filter=`;
    // const wfsUrl = wfsUrlTemplate(serverUrl, layer.Name[0]);

    const metadataUrlTemplate = (serverUrl, layerName) => `${serverUrl}/rest/layers/${layerName.split(" ").join("%20")}.json`;
    const metadataUrl = metadataUrlTemplate(serverUrl, layer.Name);

    // LIVE LAYER
    let liveLayer = allKeywords["LIVE_LAYER"];

    // DOWNLOAD
    let canDownload = allKeywords["DOWNLOAD"];

    // IDENTIFY DISPLAY NAME
    let identifyDisplayName = allKeywords["IDENTIFY_DISPLAY_NAME"];

    //DISPLAY NAME
    let displayName = allKeywords["DISPLAY_NAME"];
    if (displayName === "") displayName = layerTitle;

    if (group.prefix !== undefined) {
      displayName = group.prefix !== "" ? group.prefix + " - " + displayName : displayName;
    }
    // ATTRIBUTE TABLE
    let noAttributeTable = allKeywords["NO_ATTRIBUTE_TABLE"];

    // TOC DISPLAY NAME
    const tocDisplayName = layerTitle;

    // OPACITY
    let opacity = allKeywords["OPACITY"];

    //IDENTIFY
    let identifyTitleColumn = allKeywords["IDENTIFY_TITLE_COLUMN"];
    let identifyIdColumn = allKeywords["IDENTIFY_ID_COLUMN"];
    //DISCLAIMER
    let disclaimerTitle = allKeywords["DISCLAIMER_TITLE"];
    let disclaimerUrl = allKeywords["DISCLAIMER_URL"];
    let warningMsg = allKeywords["WARNING"];

    let disclaimer = undefined;
    if (disclaimerUrl !== "" || disclaimerTitle !== "" || warningMsg !== "") {
      disclaimer = { title: disclaimerTitle, url: disclaimerUrl, warning: warningMsg };
    }

    const minScale = layer.MinScaleDenominator;
    const maxScale = layer.MaxScaleDenominator;
    // SET VISIBILITY
    let layerVisible = false;
    if (visibleLayers.includes(layerNameOnly)) {
      layerVisible = true;
    }
    // LAYER PROPS
    LayerHelpers.getLayer(
      {
        sourceType: OL_DATA_TYPES.ImageWMS,
        source: "WMS",
        layerName: layer.Name,
        url: serverUrl + "/wms?layers=" + layer.Name,
        tiled: false,
        name: displayName,
        secureKey: secureKey,
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
          maxScale: maxScale,
          extendedProperties: { keywords: Object.assign({}, allKeywords) },
        });
        if (secureKey !== undefined) newLayer.setProperties({ secureKey: secureKey });
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
          extendedProperties: { keywords: Object.assign({}, allKeywords) },
          // elementId: layerNameOnly + "_" + group.value,
        };
        callback(returnLayer);
      }
    );
  }
}

export function acceptDisclaimer(layer, returnToFunction) {
  if (!layer.disclaimer) return true;
  if (layer.disclaimer.warning) {
    let currentDisclaimers = window.acceptedDisclaimers;
    if (currentDisclaimers === undefined) currentDisclaimers = [];
    if (layer.visible) {
      currentDisclaimers.splice(currentDisclaimers.indexOf(layer.name), 1);
      window.acceptedDisclaimers = currentDisclaimers;
      return true;
    }
    if (!currentDisclaimers || currentDisclaimers.indexOf(layer.name) === -1) {
      helpers.showTerms(
        layer.disclaimer.title,
        layer.disclaimer.warning,
        layer.disclaimer.url,
        helpers.messageColors.orange,
        () => {
          currentDisclaimers.push(layer.name);
          window.acceptedDisclaimers = currentDisclaimers;
          returnToFunction();
        },
        () => {},
        { accept: { show: true, label: "OK" }, decline: { show: false } }
      );
      return false;
    } else return true;
  } else if (layer.disclaimer.url && (!window.acceptedDisclaimers || window.acceptedDisclaimers.indexOf(layer.name) === -1)) {
    helpers.showTerms(
      layer.disclaimer.title,
      `The layer (${layer.displayName}) you are about to view contains data  which is subject to a licence agreement. 
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

export function updateLayerIndex(layers, callback = undefined) {
  var newLayers = [];
  let layerIndex = layers.length + layerIndexStart;
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];

    let newLayer = Object.assign({}, layer);
    newLayer.layer.setZIndex(layerIndex);
    newLayer.drawIndex = layerIndex;

    newLayers.push(newLayer);
    if (index === layers.length - 1) {
      if (callback !== undefined) callback(newLayers.concat([]));
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
    headers[secureKey] = "GIS";
    params["headers"] = headers;
  }
  helpers.getJSONWithParams(layerInfo.metadataUrl.replace("http:", "https:"), params, (result) => {
    const fullInfoUrl = result.layer.resource.href.replace("http:", "https:").split("+").join("%20");
    helpers.getJSONWithParams(fullInfoUrl, params, (fullInfoResult) => {
      if (fullInfoResult.featureType === undefined) fullInfoResult["featureType"] = {};
      fullInfoResult.featureType.fullUrl = fullInfoUrl.replace("http:", "https:");
      fullInfoResult["requestParams"] = params;
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
  if (a.index > b.index) {
    return -1;
  }
  if (a.index < b.index) {
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
export function copyTOCLayerGroup(layerGroup) {
  let newGroup = Object.assign({}, layerGroup);
  newGroup.layers = layerGroup.layers.map((layer) => {
    let newLayer = Object.assign({}, layer);
    newLayer.layer = layer.layer;
    return newLayer;
  });
  return newGroup;
}
/**
 * Performs a selective shallow/deep copy to preserve layer state, but not cloning open layers layer that has been added to the map.
 * @param {*} layer
 */
export function copyTOCLayer(layer) {
  let newLayer = Object.assign({}, layer);
  newLayer.layer = layer.layer;
  return newLayer;
}
/**
 * Performs a selective shallow/deep copy to preserve group and layer state, but not cloning open layers layer that has been added to the map.
 * @param {*} layerGroups
 */
export function copyTOCLayerGroups(layerGroups) {
  return layerGroups.map((group) => {
    let newGroup = Object.assign({}, group);
    //newGroup.panelOpen = false;
    newGroup.layers = group.layers.map((layer) => {
      let newLayer = Object.assign({}, layer);
      newLayer.layer = layer.layer;
      return newLayer;
    });
    return newGroup;
  });
}

export function parseGeoServerKeywords(keywords) {
  let parseKeywords = Object.assign({}, window.config.toc.keywords);
  let returnKeywords = {};
  const keys = Object.keys(parseKeywords);
  keys.forEach((key) => (returnKeywords[key] = parseKeywords[key].value));
  const parseValue = (keywordObj, value) => {
    switch (keywordObj.type) {
      case "string":
        if (keywordObj.splitChar) return value.split(keywordObj.splitChar).join("");
        else return value;
      case "bool":
        //boolean keywords are true if present unless there is a string check value
        if (keywordObj.checkValue) return value === keywordObj.checkValue;
        else return value ? value === "true" : true;
      case "int":
        return parseInt(value);
      case "float":
        return parseFloat(value);
      case "array":
        if (keywordObj.splitChar) return value.split(keywordObj.splitChar);
        else return [value];
      default:
        return keywordObj.value;
    }
  };
  keywords.forEach((keyword) => {
    const splitKeyword = keyword.split("=");
    const key = splitKeyword[0];
    splitKeyword.shift();
    const value = splitKeyword.length >= 1 ? splitKeyword.join("=") : undefined;
    if (parseKeywords[key]) {
      returnKeywords[key] = parseValue(parseKeywords[key], value);
      if (parseKeywords[key].relatedKeys) {
        parseKeywords[key].relatedKeys.forEach((relation) => {
          returnKeywords[relation] = parseValue(parseKeywords[relation], value);
        });
      }
    }
  });

  return returnKeywords;
}

/***
 * =======================================
 * ESRI SPECIFIC FUNCTIONS
 * =======================================
 */
function parseESRIDescription(description) {
  const descriptionParts = description.split("#");
  let returnObj = {
    isGroupOn: "",
    isLiveLayer: false,
    isVisible: false,
    isOpen: false,
    sar: false,
    description: "",
    refreshInterval: "",
    modalURL: "",
    categories: ["All Layers"],
  };

  descriptionParts.forEach((descriptionPart) => {
    let parts = descriptionPart.split("=");
    let key = parts[0].trim();
    if (key != null && key.length !== 0) {
      //VALUE STRING
      let value = parts[1];
      switch (key.toUpperCase()) {
        case "CATEGORY":
          value.split(",").forEach((item) => {
            returnObj.categories.push(item.trim());
          });
          break;
        case "LIVELAYER":
          returnObj.isLiveLayer = value.trim().toUpperCase() === "TRUE";
          break;
        case "GROUPON":
          returnObj.isGroupOn = value.trim().toUpperCase() === "TRUE";
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

export async function buildESRILayer(options, callback) {
  //parse required options and set defaults
  const tocType = options.tocType !== undefined ? options.tocType : "LIST";
  let group = options.group;
  let layer = options.layer;
  let layerIndex = options.layerIndex;
  let secured = options.secured !== undefined ? options.secured : false;
  let secureKey = options.secureKey;

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

    if (legendSizeOverride && styleUrl !== "") {
      const legendSize = layer.Style !== undefined ? layer.Style.Legend.size : [20, 20];
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
    let noAttributeTable = layer.options.noAttributeTable !== undefined ? layer.options.noAttributeTable : false;

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
    let layerVisible = layer.visible || visibleLayers.includes(layerNameOnly);

    //console.log(group.value, layerNameOnly, visibleLayers.includes(layerNameOnly));
    // LAYER PROPS
    const layerOptions = {
      sourceType: OL_DATA_TYPES.ImageArcGISRest,
      source: "rest",

      layerName: layer.name,
      url: layer.url,
      tiled: false,
      extent: layer.extent,
      name: layer.name,
    };
    if (layer.grouped) {
      layerOptions["layers"] = layer.layers;
      layerOptions.sourceType = OL_DATA_TYPES.LayerGroup;
    }
    if (layer.sourceSpatialReference !== undefined && layer.sourceSpatialReference.latestWkid !== undefined) layerOptions["projection"] = `EPSG:${layer.sourceSpatialReference.latestWkid}`;
    LayerHelpers.getLayer(layerOptions, (newLayer) => {
      //const identifyUrl = (url) => `${url}/query?geometry=#GEOMETRY#&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&returnTrueCurves=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnDistinctValues=false&returnExtentOnly=false&quantizationParameters=&f=geojson`;
      const identifyUrl = (options) =>
        `${options.url}/identify?geometry=${options.point}&geometryType=esriGeometryPoint&layers=visible%3A${options.layerId}&sr=3857&datumTransformations=3857&tolerance=${options.tolerance}&mapExtent=${options.extent}&imageDisplay=${options.resolution}&maxAllowableOffset=10&returnGeometry=true&returnFieldName=true&f=json`;

      const wfsUrl = identifyUrl({
        url: layer.rootUrl,
        point: "#GEOMETRY#",
        layerId: layer.id,
        tolerance: "#TOLERANCE#",
        extent: "#EXTENT#",
        resolution: "#RESOLUTION#",
      });
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
        maxScale: maxScale,
      });
      if (secureKey !== undefined) newLayer.setProperties({ secureKey: secureKey });
      newLayer.setZIndex(layerIndex);
      window.map.addLayer(newLayer);
      let legendHeight = -1;
      if (layer.legend !== undefined && layer.legend !== null) {
        legendHeight = 36;
        layer.legend.legend.forEach((legendItem) => {
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
