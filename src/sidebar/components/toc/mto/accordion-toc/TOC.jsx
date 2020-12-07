// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import ReactTooltip from "react-tooltip";
import "rc-slider/assets/index.css";
import Switch from "react-switch";
import { isMobile } from "react-device-detect";

// CUSTOM
import "./TOC.css";
import * as helpers from "../../../../../helpers/helpers";
import * as drawingHelpers from "../../../../../helpers/drawingHelpers";
import mainConfig from "../../../../../config.json";
import * as TOCHelpers from "../common/TOCHelpers.jsx";
import TOCConfig from "../common/TOCConfig.json";
import GroupItem from "./GroupItem.jsx";
import FloatingMenu, { FloatingMenuItem } from "../../../../../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../../../../../helpers/Portal.jsx";
import Identify from "../../../../../map/Identify.jsx";
import Point from "ol/geom/Point";
import { Image as ImageLayer, Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source.js";
import Feature from "ol/Feature";
import { Icon, Style } from "ol/style.js";

class TOC extends Component {
  constructor(props) {
    super(props);
    this.storageMapDefaultsKey = "Map Defaults";
    this.storageKey = "Layers";
    this.storageKeyAllLayers = "Saved Layers";
    this.identifyIconLayer = undefined;
    this.state = {
      layerGroups: [],
      selectedGroup: {},
      saveLayerOptions: [],
      onMenuItemClick: [],
      isLoading: false,
      searchText: "",
      sortAlpha: this.getInitialSort(),
      defaultGroup: undefined,
      layerCount: 0,
    };

    // LISTEN FOR SEARCH RESULT
    window.emitter.addListener("activeTocLayerGroup", (groupName, callback) => this.onActivateLayer(callback));

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());

    // CLEAR IDENTIFY MARKER AND RESULTS
    window.emitter.addListener("clearIdentify", () => this.clearIdentify());

    //LISTEN FOR NEW LAYER
    window.emitter.addListener("addCustomLayer", (layer, group, selected) => this.addCustomLayer(layer, group, selected));
    this.myMapLayerName = "local:myMaps";
    this.myLayersGroupName = "My Layers";
  }

  addCustomLayer = (layer, groupName, selected = false) => {
    const AddedMessage = (group, layer) => `New layer "${layer}" has been added to the "${group}" group.`;
    let layerIndex = 100;
    let layerGroups = this.state.layerGroups;
    let layersGroup = layerGroups.filter((group) => group.value === groupName)[0];
    if (layersGroup === undefined) layersGroup = layerGroups.filter((group) => group.label === this.myLayersGroupName)[0];
    if (layersGroup === undefined) layersGroup = layerGroups[0];
    layerIndex += layersGroup.layers.length + 1;
    TOCHelpers.makeLayer(layer.displayName, helpers.getUID(), layersGroup, layerIndex, true, 1, layer.layer, undefined, undefined, false, layer.styleUrl, (retLayer) => {
      let layers = layersGroup.layers;
      layers.push(retLayer);
      layersGroup.layers = layers;
      this.setState({ layerGroups: layerGroups.map((group) => (layersGroup.value === group.value ? layersGroup : group)) }, () => {
        let allLayers = [];
        this.state.layerGroups.forEach((group) => {
          allLayers.push(group.layers);
        });
        window.allLayers = allLayers;
        this.forceUpdate();
        helpers.showMessage("Layer Added", AddedMessage(layersGroup.label, retLayer.displayName));
        if (selected) {
          window.emitter.emit("activeTocLayerGroup", layersGroup.value, () => {
            window.emitter.emit("activeTocLayer", {
              fullName: retLayer.name,
              name: retLayer.displayName,
              isVisible: retLayer.layer.getVisible(),
              layerGroupName: retLayer.groupName,
              layerGroup: retLayer.group,
              index: retLayer.index,
            });
          });
        }
      });
    });
  };
  clearIdentify = () => {
    // CLEAR PREVIOUS IDENTIFY RESULTS
    this.identifyIconLayer.getSource().clear();
    window.map.removeLayer(this.identifyIconLayer);
    window.emitter.emit("loadReport", <div />);
  };

  addIdentifyLayer = () => {
    this.identifyIconLayer = new VectorLayer({
      name: "sc-identify",
      source: new VectorSource({
        features: [],
      }),
      zIndex: 100000,
    });
    this.identifyIconLayer.setStyle(
      new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: images["identify-marker.png"],
        }),
      })
    );
    this.identifyIconLayer.set("name", "sc-identify-icon");
  };

  onMapLoad = () => {
    this.addIdentifyLayer();
    this.refreshTOC();
    if (mainConfig.leftClickIdentify) {
      window.map.on("singleclick", (evt) => {
        // DISABLE IDENTIFY CLICK
        let disable = window.disableIdentifyClick;
        if (disable) return;
        // DISABLE POPUPS
        disable = window.isDrawingOrEditing;
        if (disable) return;

        // CLEAR PREVIOUS SOURCE
        this.identifyIconLayer.getSource().clear();
        window.map.removeLayer(this.identifyIconLayer);

        const point = new Point(evt.coordinate);
        const feature = new Feature(point);
        this.identifyIconLayer.getSource().addFeature(feature);
        window.map.addLayer(this.identifyIconLayer);
        window.emitter.emit("loadReport", <Identify geometry={point} />);
      });
    }
  };

  getInitialSort = () => {
    if (isMobile) return true;
    else return false;
  };
  onActivateLayer = (callback) => {
    window.emitter.emit("setSidebarVisiblity", "OPEN");
    window.emitter.emit("activateTab", "layers");
    callback();
  };

  onLayersLoad = () => {
    if (window.allLayers !== undefined) {
      let layerCount = 0;
      window.allLayers.map((group) => (layerCount += group.length));
      if (this.state.layerCount !== layerCount) this.setState({ layerCount: layerCount });
    }
  };

  componentDidMount() {}

  buildDefaultGroup = (callback) => {
    let myMapLayerSource = new VectorSource();
    let myMapLayer = new VectorLayer({
      source: myMapLayerSource,
      zIndex: 1000,
      style: drawingHelpers.getDefaultDrawStyle("#e809e5"),
    });
    let group = this.state.layerGroups.filter((item) => item.label === this.myLayersGroupName)[0];
    if (group === undefined) group = TOCHelpers.makeGroup(this.myLayersGroupName, true, "", "", undefined, "", "");
    TOCHelpers.makeLayer("My Drawing", this.myMapLayerName, group, 1, true, 1, myMapLayer, undefined, undefined, false, "", (retLayer) => {
      let layers = group.layers;
      layers.push(retLayer);
      group.layers = layers;
      callback(group);
    });
  };

  refreshTOC = (callback) => {
    sessionStorage.removeItem(this.storageMapDefaultsKey);
    let savedLayers = helpers.getItemsFromStorage(this.storageKeyAllLayers);
    if (savedLayers !== undefined && savedLayers !== null && savedLayers !== []) {
      TOCHelpers.getGroupsFromData(savedLayers, (result) => {
        const groupInfo = result;
        this.buildDefaultGroup((defaultGroup) => {
          let groups = [];
          let existingGroup = groupInfo[0].filter((item) => item.label === defaultGroup.label)[0];
          if (existingGroup !== undefined) {
            groups = groupInfo[0].map((item) => {
              if (item.label === defaultGroup.label) {
                let layers = defaultGroup.layers;
                layers = layers.map((layer) => (layer.group !== item.value ? Object.assign(layer, { group: item.value }) : layer));
                item.layers = layers.concat(item.layers, []);
                return item;
              } else {
                return item;
              }
            });
          } else {
            groups.push(defaultGroup);
            groups = groups.concat(groupInfo[0]);
          }

          this.setState(
            {
              layerGroups: groups.concat([]),
            },
            () => {
              let allLayers = [];
              this.state.layerGroups.forEach((group) => {
                allLayers.push(group.layers);
              });
              window.allLayers = allLayers;
              this.onLayersLoad();
              window.emitter.emit("tocLoaded");
              if (callback !== undefined) callback();
            }
          );
        });
      });
    } else {
      let geoserverUrl = helpers.getURLParameter("GEO_URL");
      let geoserverUrlType = helpers.getURLParameter("GEO_TYPE");
      if (geoserverUrl === null) {
        geoserverUrl = TOCConfig.geoserverLayerGroupsUrl;
      } else {
        geoserverUrl = geoserverUrl + "/ows?service=wms&version=1.3.0&request=GetCapabilities";
      }
      if (geoserverUrlType === null) geoserverUrlType = TOCConfig.geoserverLayerGroupsUrlType;
      if (geoserverUrl !== undefined && geoserverUrl !== null) {
        TOCHelpers.getGroupsGC(geoserverUrl, geoserverUrlType, (result) => {
          const groupInfo = result;
          this.buildDefaultGroup((defaultGroup) => {
            let groups = [];
            groups.push(defaultGroup);
            groups = groups.concat(groupInfo[0]);
            this.setState(
              {
                layerGroups: groups.concat([]),
              },
              () => {
                let allLayers = [];
                this.state.layerGroups.forEach((group) => {
                  allLayers.push(group.layers);
                });
                window.allLayers = allLayers;
                this.onLayersLoad();
                window.emitter.emit("tocLoaded");
                if (callback !== undefined) callback();
              }
            );
          });
        });
      } else {
        const groupInfo = TOCHelpers.getGroups();
        this.setState(
          {
            layerGroups: groupInfo[0],
          },
          () => {
            window.emitter.emit("tocLoaded");
            if (callback !== undefined) callback();
          }
        );
        window.allLayers = this.state.layerGroups;
        this.onLayersLoad();
      }
    }
  };
  loadLayerOptions = (data, callback) => {
    let groups = [];
    let i = Object.keys(data).length;
    for (var key in data) {
      if (!data.hasOwnProperty(key)) continue;

      var obj = data[key];
      const loadLayers = {};
      const loadGroup = {};
      let groupName = obj.name;
      let group = key;
      let layers = obj.layers;
      //let group = TOCHelpers.makeGroup(groupName,false,"","",undefined,"","");

      for (var layerId in layers) {
        var layer = layers[layerId];
        const loadLayer = {};
        for (const property in layer) {
          if (property !== "layerType" && property !== "layerSource" && property !== "layerFeatures") {
            loadLayer[property] = layer[property];
          }
        }
        let newLayer = undefined;
        switch (layer["layerType"]) {
          case "VectorLayer":
            newLayer = new VectorLayer();
            const layerSource = layer["layerSource"];
            newLayer.setSource(layerSource);
            if (layer["layerFeatures"] !== undefined) newLayer.getSource().addFeatures(layer["layerFeatures"]);
            break;
          case "ImageLayer":
            newLayer = new ImageLayer();
            newLayer.setSource(layer["layerSource"]);
            break;
          default:
            break;
        }
        if (newLayer !== undefined) window.map.addLayer(newLayer);
        loadLayer["layer"] = newLayer;
        loadLayer["group"] = group;
        loadLayer["groupName"] = groupName;
        loadLayers[layer.name] = loadLayer;
      }
      groups.push(loadGroup);
      if (i >= groups.length) {
        groups = groups.concat([]);
        if (callback !== undefined) callback(groups);
        helpers.showMessage("Load", "Layer Visibility has been Loaded.");
      }
    }
  };
  saveAllLayers = () => {
    // GATHER INFO TO SAVE
    const layers = {};
    const groups = {};
    for (var key in window.allLayers) {
      if (!window.allLayers.hasOwnProperty(key)) continue;

      var obj = window.allLayers[key];
      const savedLayers = {};
      const savedGroup = {};
      let groupName = "";
      let group = "";
      obj.forEach((layer) => {
        groupName = layer.group;

        const saveLayer = {
          name: layer.name,
          visible: layer.visible,
        };
        savedLayers[layer.name] = saveLayer;
        group = layer.group;
        groupName = layer.groupName;
        TOCHelpers.layerToJson(layer, (returnObj) => {
          savedLayers[layer.name] = returnObj;
        });
      });
      let currentGroup = this.state.layerGroups.filter((item) => item.value === group)[0];
      layers[groupName] = savedLayers;
      savedGroup["name"] = groupName;
      savedGroup["value"] = currentGroup.value;
      savedGroup["label"] = currentGroup.label;
      savedGroup["defaultGroup"] = currentGroup.defaultGroup;
      savedGroup["visibleLayers"] = currentGroup.visibleLayers;
      savedGroup["wmsGroupUrl"] = currentGroup.wmsGroupUrl;
      savedGroup["customRestUrl"] = currentGroup.customRestUrl;
      savedGroup["prefix"] = currentGroup.prefix;
      savedGroup["layers"] = savedLayers;

      groups[group] = savedGroup;
    }
    helpers.saveToStorage(this.storageKeyAllLayers, groups);
    helpers.showMessage("Save", "Layer have been saved.");
  };
  onGroupDropDownChange = (selectedGroup) => {
    this.setState({ selectedGroup: selectedGroup });
  };

  onSearchLayersChange = (evt) => {
    const searchText = evt.target.value;
    this.setState({ searchText: searchText });
  };

  reset = () => {
    const defaultGroup = this.state.defaultGroup;
    this.setState({ sortAlpha: false, selectedGroup: defaultGroup }, () => {
      window.emitter.emit("resetLayers", null);
      this.refreshTOC(() => {});
    });

    helpers.addAppStat("TOC Reset", "Button");
  };

  onSettingsClick = (evt) => {
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu
          key={helpers.getUID()}
          buttonEvent={evtClone}
          title="TOC Settings"
          item={this.props.info}
          onMenuItemClick={(action) => this.onMenuItemClick(action)}
          styleMode="right"
          width={"200px"}
          yOffset={0}
        >
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-save">
            <FloatingMenuItem imageName={"save-disk.png"} label="Save TOC Layer Visibility" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-save-all">
            <FloatingMenuItem imageName={"save-disk.png"} label="Save All Layers" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-reset">
            <FloatingMenuItem imageName={"reset.png"} label="Reset TOC to Default" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-sort">
            Sort Layers A-Z <Switch className="sc-toc-sort-switch" onChange={this.onSortSwitchChange} checked={this.state.sortAlpha} height={20} width={48} />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-visility">
            <FloatingMenuItem imageName={"layers-off.png"} label="Turn off All Layers" />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  onMenuItemClick = (action) => {
    switch (action) {
      case "sc-floating-menu-visility":
        window.emitter.emit("turnOffLayers", null);
        break;
      case "sc-floating-menu-save":
        this.onSaveClick();
        break;
      case "sc-floating-menu-save-all":
        this.saveAllLayers();
        break;
      case "sc-floating-menu-reset":
        this.reset();
        break;
      default:
        break;
    }
    helpers.addAppStat("TOC Settings - ", action);
  };
  onSortSwitchChange = (sortAlpha) => {
    this.setState({ sortAlpha: sortAlpha });

    if (sortAlpha) {
      helpers.showMessage("Sorting", "Layer re-ordering disabled.");
    }

    helpers.addAppStat("TOC Sort", sortAlpha);
  };
  onSaveClick = () => {
    this.saveLayerOptions();
  };
  saveLayerOptions = () => {
    // GATHER INFO TO SAVE
    let layers = {};
    for (var key in window.allLayers) {
      if (!window.allLayers.hasOwnProperty(key)) continue;

      var obj = window.allLayers[key];
      let savedLayers = {};
      let groupName = "";
      obj.forEach((layer) => {
        groupName = layer.group;
        const saveLayer = {
          name: layer.name,
          visible: layer.visible,
        };
        savedLayers[layer.name] = saveLayer;
      });

      layers[groupName] = savedLayers;
    }
    helpers.saveToStorage(this.storageKey, layers);

    helpers.showMessage("Save", "Layer Visibility has been saved.");
  };
  onGroupChange = (group) => {
    if (group !== undefined && this.state.layerGroups !== undefined) {
      this.setState({ layerGroups: this.state.layerGroups.map((item) => (item.value === group.value ? group : item)) }, () => {});
    }
  };
  render() {
    return (
      <div>
        <div className={this.state.isLoading ? "sc-toc-main-container-loading" : "sc-toc-main-container-loading sc-hidden"}>
          <img className="sc-toc-loading" src={images["loading.gif"]} alt="loading" />
        </div>
        <div className={this.state.isLoading ? "sc-toc-main-container sc-hidden" : "sc-toc-main-container"}>
          <div className="sc-toc-search-container">
            <input
              id="sc-toc-search-textbox"
              className="sc-toc-search-textbox"
              placeholder={"Filter (" + this.state.layerCount + " layers)..."}
              type="text"
              onChange={this.onSearchLayersChange}
              onFocus={(evt) => {
                helpers.disableKeyboardEvents(true);
              }}
              onBlur={(evt) => {
                helpers.disableKeyboardEvents(false);
              }}
            />
            &nbsp;
            <div data-tip="TOC Settings" data-for="sc-toc-settings-tooltip" className="sc-toc-settings-image" onClick={this.onSettingsClick}>
              <ReactTooltip id="sc-toc-settings-tooltip" className="sc-toc-settings-tooltip" multiline={false} place="right" type="dark" effect="solid" />
            </div>
          </div>
          <div className="toc-group-list">
            {this.state.layerGroups.map((group) => (
              <GroupItem
                key={"group-item" + group.value}
                group={group}
                searchText={this.state.searchText}
                sortAlpha={this.state.sortAlpha}
                allGroups={this.state.layerGroups}
                panelOpen={false}
                saveLayerOptions={this.state.saveLayerOptions[group.value]}
                onGroupChange={this.onGroupChange}
              />
            ))}
          </div>
          <div className="sc-hidden sc-toc-footer-container" />
        </div>
      </div>
    );
  }
}

export default TOC;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("../images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
