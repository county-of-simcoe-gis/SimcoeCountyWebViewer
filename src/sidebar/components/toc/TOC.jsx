// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import { isMobile } from "react-device-detect";

//CUSTOM
import * as TOCHelpers from "./common/TOCHelpers.jsx";
import TOCHeader from "./common/TOCHeader.jsx";
import LayerOptionsMenu from "./common/LayerOptionsMenu.jsx";
import TOCListView from "./toc-list-view/TOCListView.jsx";
import TOCFolderView from "./toc-folder-view/TOCFolderView.jsx";
import * as helpers from "../../../helpers/helpers";
import { LayerHelpers } from "../../../helpers/OLHelpers";
import LegendApp from "../../../legend/App";

class TOC extends Component {
  constructor(props) {
    super(props);
    this.storageMapDefaultsKey = "Map Defaults";
    this.storageKeyAllLayers = "Saved Layers";
    this.storageKeyCustomLayersList = "My Saved Layers - List View";
    this.storageKeyCustomLayersFolder = "My Save Layers - Folder View";
    this.storageKey = "Layers";
    this.storageKeyFolder = "Layers_Folder_View";
    this.storageKeyTOCType = "TOC_Type";
    this.tocTypes = ["LIST", "FOLDER"];
    this.state = {
      layerListGroups: [],
      layerFolderGroups: [],
      unusedPlaceholder: [],
      allLayers: [],
      saveLayerOptions: [],
      onMenuItemClick: [],
      type: this.props.type,
      defaultGroup: undefined,
      selectedGroup: {},
      layerCount: 0,
      sortFolderAlpha: this.getInitialSort(),
      sortListAlpha: this.getInitialSort(),
      globalOpacity: 1,
      searchText: "",
      isLoading: false,
      helpLink: "",
    };
    //#region ADD LISTENERS
    // LISTEN FOR MAP LEGEND
    window.emitter.addListener("openLegend", () => this.onOpenLegend());

    //LISTEN FOR NEW LAYER
    window.emitter.addListener("addCustomLayer", (layer, group, selected, save) => this.addCustomLayer(layer, group, selected, save));

    // LISTEN FOR LAYERS TO LOAD
    window.emitter.addListener("layersLoaded", (numLayers) => this.updateLayerCount(numLayers));

    // LISTEN FOR SEARCH RESULT
    window.emitter.addListener("activeTocLayerGroup", (groupName, callback) => this.onActivateLayerGroup(groupName, callback));
    window.emitter.addListener("activeTocLayer", (layerItem) => this.onActivateLayer(layerItem));
    window.emitter.addListener("deactiveTocLayer", (layerItem) => this.onActivateLayer(layerItem, false));

    // RETURN FULL LAYER LIST (replaces window.allLayers)
    window.emitter.addListener("getLayerList", (callback) => this.getLayerList(callback));
    //this.myMapLayerName = "local:myMaps";
    this.allLayersGroup = { label: "All Layers", value: "opengis:all_layers" };
    //#endregion
  }
  //#region REACT FUNCTIONS
  componentDidMount() {
    helpers.waitForLoad(["settings", "map"], Date.now(), 30, () => {
      let tocType = helpers.getURLParameter("TOCTYPE");
      if (tocType !== null && tocType !== undefined) {
        if (this.tocTypes.includes(tocType.toUpperCase())) tocType = tocType.toUpperCase();
        else tocType = undefined;
      }
      if (!tocType) tocType = helpers.getItemsFromStorage(this.storageKeyTOCType);

      if (tocType !== null && tocType !== undefined) {
        this.setState({ type: tocType });
      } else {
        if (window.config.toc.tocType) {
          tocType = window.config.toc.tocType;
          this.setState({ type: tocType });
        }
      }
      this.onMapLoad();
    });
  }

  //#endregion
  //#region LOAD LAYERS
  //HANDLE LAYER LOADING
  onMapLoad = () => {
    this.refreshTOC(false, () => {
      window.map.on("singleclick", (evt) => {
        if (window.isDrawingOrEditing || window.isCoordinateToolOpen || window.isMeasuring) return;
        this.getLayerList((groups) => {
          groups.forEach((layers) => {
            layers.forEach((layer) => {
              if (layer.visible && layer.liveLayer) {
                LayerHelpers.identifyFeatures(layer.layer, evt.coordinate, (feature) => {
                  if (feature !== undefined) helpers.showFeaturePopup(evt.coordinate, feature);
                });
              }
            });
          });
        });
      });
      helpers.waitForLoad(["settings", "map"], Date.now(), 30, () => {
        if (!window.config.leftClickIdentify) this.addPropertyReportClick();
      });
    });
  };

  getDefaultGroup = (defaultGroupName, layerGroups, callback = undefined) => {
    if (window.config.toc.default_group !== undefined) defaultGroupName = window.config.toc.default_group;
    let urlDefaultGroupName = helpers.getURLParameter("GROUP", true, true);
    let urlGroupVisibleLayers = helpers.getURLParameter("LAYERS", true, true);

    if (urlDefaultGroupName !== null) defaultGroupName = urlDefaultGroupName;

    let defaultGroup = layerGroups.filter((item) => item.label === defaultGroupName)[0];
    if (defaultGroup === undefined) defaultGroup = layerGroups[0];
    //apply url layer visibility
    if (urlGroupVisibleLayers) {
      defaultGroup["visibleLayers"] = urlGroupVisibleLayers.split(",");
      defaultGroup.layers = defaultGroup.layers.map((layer) => {
        if (defaultGroup.visibleLayers.includes(layer.displayName) || defaultGroup.visibleLayers.includes(layer.name)) {
          layer.visible = true;
        }
        return layer;
      });
    }
    if (callback === undefined) return defaultGroup;
    else callback(defaultGroup);
  };

  populateAllLayersGroup = (type, layerGroups, callback) => {
    let group = layerGroups.filter((item) => item.label === this.allLayersGroup.label)[0];
    if (group === undefined) {
      group = this.addAllLayersGroup(layerGroups).filter((item) => item.label === this.allLayersGroup.label)[0];
    } else {
      layerGroups = layerGroups.filter((item) => item.label !== this.allLayersGroup.label);
    }
    group = this.applySavedLayerOptionsToGroup(type, TOCHelpers.mergeGroupsTogether(group, layerGroups, false));
    layerGroups.unshift(group);
    if (callback === undefined) return layerGroups;
    else callback(layerGroups);
  };
  addAllLayersGroup = (layerGroups, callback) => {
    let group = layerGroups.filter((item) => item.label === this.allLayersGroup.label)[0];
    if (group === undefined) {
      group = TOCHelpers.makeGroup({
        label: this.allLayersGroup.label,
        value: this.allLayersGroup.value,
        defaultGroup: false,
        url: "",
        prefix: "",
        wmsGroupUrl: "",
        customRestUrl: "",
        layers: [],
      });
      layerGroups.unshift(group);
    }

    if (callback === undefined) return layerGroups;
    else callback(layerGroups);
  };

  loadGroups = (result, isReset, callback) => {
    const groupInfo = result;
    let listLayerGroups = groupInfo.groups;
    let folderLayerGroups = TOCHelpers.copyTOCLayerGroups(groupInfo.groups);
    let urlExpandLegend = helpers.getURLParameter("EXPAND_LEGEND", true, true);

    listLayerGroups = this.addAllLayersGroup(listLayerGroups);
    //folderLayerGroups = this.addAllLayersGroup(folderLayerGroups);

    this.getSavedCustomLayers("LIST", (savedGroups) => {
      if (savedGroups !== undefined) {
        listLayerGroups = TOCHelpers.mergeGroups(listLayerGroups, savedGroups.groups);
      }
    });
    this.getSavedCustomLayers("FOLDER", (savedGroups) => {
      if (savedGroups !== undefined) {
        folderLayerGroups = TOCHelpers.mergeGroups(folderLayerGroups, savedGroups.groups);
      }
    });

    if (isReset) this.updateLayerVisibility("CLEAR");

    listLayerGroups = this.populateAllLayersGroup("LIST", listLayerGroups);
    //folderLayerGroups = this.populateAllLayersGroup("FOLDER", folderLayerGroups);
    const defaultGroup = this.getDefaultGroup(groupInfo.defaultGroupName, listLayerGroups);

    listLayerGroups = listLayerGroups.map((group) => {
      if (group.layers.length > 0) group.layers = this.sortLayers(group.layers);
      return group;
    });
    folderLayerGroups = folderLayerGroups.map((group) => {
      if (group.layers.length > 0) group.layers = this.sortLayers(group.layers);
      if (defaultGroup.value === group.value) {
        group.panelOpen = true;
        //update folder view default visibility
        group.layers = group.layers.map((layer) => {
          const defaultLayer = defaultGroup.layers.filter((item) => item.name === layer.name)[0];
          if (defaultLayer) {
            layer.visible = defaultLayer.visible;
          }
          return layer;
        });
      }
      return group;
    });

    this.setState(
      {
        layerListGroups: listLayerGroups,
        layerFolderGroups: folderLayerGroups,
        selectedGroup: defaultGroup,
        defaultGroup: defaultGroup,
      },
      () => {
        this.applySavedLayerOptions(this.state.type); //apply saved data for the active toc
        this.applySavedLayerOptions(this.state.type === "LIST" ? "FOLDER" : "LIST"); //apply saved data for the opposite toc
        this.updateLayerCount(defaultGroup.layers.length);
        this.updateLayerVisibility();
        if (urlExpandLegend && urlExpandLegend.toUpperCase() === "TRUE") this.onLegendToggleGroup(defaultGroup, true);
        window.emitter.emit("tocLoaded");
        helpers.addIsLoaded("toc");
        if (callback !== undefined) callback();
      }
    );
  };

  refreshTOC = (isReset, callback = undefined) => {
    helpers.waitForLoad(["settings", "map"], Date.now(), 30, () => {
      this.setState({ helpLink: window.config.toc.helpLink });
      sessionStorage.removeItem(this.storageMapDefaultsKey);

      const loaderType = window.config.toc.loaderType; //MAPID, ARCGIS, GEOSERVER
      const geoserverUrl = window.config.toc.geoserverLayerGroupsUrl;
      const geoserverUrlType = window.config.toc.geoserverLayerGroupsUrlType;
      const esriServiceUrl = window.config.toc.esriServiceUrl;
      const sources = window.config.toc.sources;

      switch (loaderType) {
        case "ARCGIS":
          TOCHelpers.getGroupsESRI({ url: esriServiceUrl, tocType: this.state.type, isReset: isReset }, (result) => {
            this.loadGroups(result, isReset, callback);
          });
          break;
        case "GEOSERVER":
          TOCHelpers.getGroupsGC(geoserverUrl, geoserverUrlType, isReset, this.state.type, false, true, undefined, (result) => {
            this.loadGroups(result, isReset, callback);
          });
          break;
        default:
          TOCHelpers.getMap(sources, isReset, this.state.type, (result) => {
            this.loadGroups(result, isReset, callback);
          });
          break;
      }
    });
  };
  applySavedLayerOptionsToGroup = (type, group) => {
    let savedData = helpers.getItemsFromStorage(type === "LIST" ? this.storageKey : this.storageKeyFolder);
    if (savedData === undefined) return group;
    const savedDataArray = Object.entries(savedData);

    let savedGroup = savedData[group.value];
    if (!savedGroup) {
      const savedDataArrayItem = savedDataArray.filter((groupItem) => {
        if (groupItem[1]) {
          return group.label === groupItem[1].label;
        } else return false;
      })[0];
      if (savedDataArrayItem) savedGroup = savedData[savedDataArrayItem[0]];
    }
    let savedLayers = [];
    try {
      if (savedGroup !== undefined && savedGroup.layers !== undefined) {
        savedLayers = savedGroup.layers;
      } else if (savedGroup !== undefined) {
        savedLayers = savedGroup; //Added to support legacy saves
      }
    } catch (e) {
      console.warn(e);
    }
    if (savedGroup !== undefined && savedGroup.panelOpen !== undefined) group.panelOpen = savedGroup.panelOpen;
    group.layers = this.sortLayers(
      group.layers.map((layer) => {
        const savedLayer = savedLayers[layer.name];
        if (savedLayer !== undefined) {
          layer.visible = savedLayer.visible;
          layer.opacity = savedLayer.opacity;
          layer.index = savedLayer.index;
          layer.drawIndex = savedLayer.index;
        }
        return layer;
      })
    );
    return group;
  };

  applySavedLayerOptions = (type) => {
    let savedData = helpers.getItemsFromStorage(type === "LIST" ? this.storageKey : this.storageKeyFolder);
    if (savedData === undefined) return;
    const savedDataArray = Object.entries(savedData);

    let layerGroups = Object.assign([], type === "LIST" ? this.state.layerListGroups : this.state.layerFolderGroups);
    layerGroups = layerGroups.map((group) => {
      let savedGroup = savedData[group.value];
      if (!savedGroup) {
        const savedDataArrayItem = savedDataArray.filter((groupItem) => {
          if (groupItem[1]) {
            return group.label === groupItem[1].label;
          } else return false;
        })[0];
        if (savedDataArrayItem) savedGroup = savedData[savedDataArrayItem[0]];
      }
      let savedLayers = [];
      try {
        if (savedGroup !== undefined && savedGroup.layers !== undefined) {
          savedLayers = savedGroup.layers;
        } else if (savedGroup !== undefined) {
          savedLayers = savedGroup; //Added to support legacy saves
        }
      } catch (e) {
        console.warn(e);
      }
      if (savedGroup !== undefined && savedGroup.panelOpen !== undefined) group.panelOpen = savedGroup.panelOpen;
      group.layers = group.layers.map((layer) => {
        const savedLayer = savedLayers[layer.name];

        if (savedLayer !== undefined) {
          layer.visible = savedLayer.visible;
          layer.opacity = savedLayer.opacity;
          layer.index = savedLayer.index;
          layer.drawIndex = savedLayer.index;
        }

        return layer;
      });
      return group;
    });
    layerGroups.map((group) => {
      group.layers = this.sortLayers(group.layers);
      return group;
    });

    if (type === "LIST") {
      this.setState({ layerListGroups: layerGroups }, () => {
        this.forceUpdate();
      });
    } else {
      this.setState({ layerFolderGroups: layerGroups }, () => {
        this.forceUpdate();
      });
    }
  };
  getSavedCustomLayers = (tocType, callback = undefined) => {
    let savedLayers = helpers.getItemsFromStorage(tocType === "LIST" ? this.storageKeyCustomLayersList : this.storageKeyCustomLayersFolder);
    if (savedLayers !== undefined && Object.keys(savedLayers).length > 0) {
      TOCHelpers.getGroupsFromData(savedLayers, (result) => {
        if (callback !== undefined) callback(result);
        else return result;
      });
    } else {
      if (callback !== undefined) callback(undefined);
      else return undefined;
    }
  };
  saveCustomLayer = (layer, callback = undefined) => {
    let savedGroups = helpers.getItemsFromStorage(this.state.type === "LIST" ? this.storageKeyCustomLayersList : this.storageKeyCustomLayersFolder);
    if (savedGroups === undefined || savedGroups[layer.group] === undefined) {
      const group = this.getActiveLayerGroups().filter((group) => group.value === layer.group)[0];
      const groupObj = {
        value: group.value,
        label: group.label,
        url: group.url,
        prefix: group.prefix,
        defaultGroup: group.defaultGroup,
        visibleLayers: group.visibleLayers,
        wmsGroupUrl: group.wmsGroupUrl,
        customRestUrl: group.customRestUrl,
        tocType: this.state.type,
        layers: {},
      };
      if (savedGroups === undefined) savedGroups = {};
      savedGroups[groupObj.value] = groupObj;
    }
    let savedLayers = savedGroups[layer.group].layers;
    if (savedLayers === undefined) savedLayers = {};
    const rebuildParams = layer.layer.get("rebuildParams");
    if (rebuildParams !== undefined && rebuildParams.source !== "file") {
      TOCHelpers.layerToJson(layer, (returnObj) => {
        savedLayers[layer.name] = returnObj;

        savedGroups[layer.group].layers = savedLayers;
        helpers.saveToStorage(this.state.type === "LIST" ? this.storageKeyCustomLayersList : this.storageKeyCustomLayersFolder, savedGroups);

        if (callback !== undefined) callback();
      });
    } else {
      if (callback !== undefined) callback();
    }
  };
  removeCustomLayer = (layerName, groupName, callback = undefined) => {
    let savedGroups = helpers.getItemsFromStorage(this.state.type === "LIST" ? this.storageKeyCustomLayersList : this.storageKeyCustomLayersFolder);

    let layerGroups = this.getActiveLayerGroups();
    let layersGroup = layerGroups.filter((group) => group.value === groupName)[0];
    if (layersGroup === undefined) layersGroup = { value: "", layers: [] };
    //removed saved layer
    if (savedGroups !== undefined && savedGroups[layersGroup.value] !== undefined) {
      let savedLayers = savedGroups[layersGroup.value].layers;
      delete savedLayers[layerName];
      if (Object.keys(savedLayers).length === 0) delete savedGroups[layersGroup.value];
      else savedGroups[layersGroup.value].layers = savedLayers;
      helpers.saveToStorage(this.state.type === "LIST" ? this.storageKeyCustomLayersList : this.storageKeyCustomLayersFolder, savedGroups);
    }

    layersGroup.layers = layersGroup.layers.filter((item) => {
      if (item.name !== layerName) {
        return true;
      } else {
        item.layer.setVisible(false);
        return false;
      }
    });
    this.setLayerGroups(
      this.state.type,
      layerGroups.map((group) => (group.value === groupName ? layersGroup : group)),
      () => {
        if (callback !== undefined) callback();
      }
    );
  };
  addCustomLayer = (layer, groupName, selected = false, save = false) => {
    const AddedMessage = (group, layer) => `New layer "${layer}" has been added to the "${group}" group.`;
    let layerIndex = 100;
    let layerGroups = this.getActiveLayerGroups();
    let layersGroup = layerGroups.filter((group) => group.value === groupName)[0];

    //if (layersGroup === undefined) layersGroup = layerGroups.filter((group) => group.label === this.myLayersGroupName)[0];
    if (layersGroup === undefined) layersGroup = layerGroups[0];

    layerIndex += layersGroup.layers.length + 1;
    TOCHelpers.makeLayer(layer.displayName, helpers.getUID(), layersGroup, layerIndex, true, 1, layer.layer, undefined, undefined, false, layer.styleUrl, (retLayer) => {
      let layers = layersGroup.layers;
      layers.unshift(retLayer);

      layersGroup.layers = layers;
      this.setLayerGroups(
        this.state.type,
        layerGroups.map((group) => (layersGroup.value === group.value ? layersGroup : group)),
        () => {
          //this.forceUpdate();
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
              this.forceUpdate();
            });
          }
          if (save) {
            const isVisible = retLayer.layer.getVisible();
            retLayer.layer.setVisible(true);
            setTimeout(() => {
              this.saveCustomLayer(retLayer, () => {
                retLayer.layer.setVisible(isVisible);
              });
            }, 250);
          }
        }
      );
    });
  };

  //#endregion
  //#region HANDLE PROPERTY REPORT CLICK
  addPropertyReportClick = () => {
    window.map.on("singleclick", (evt) => {
      if (window.isDrawingOrEditing || window.isCoordinateToolOpen || window.isMeasuring) return;
      const allLayers = Object.assign([], this.state.allLayers);
      allLayers.forEach((layer) => {
        if (layer.visible && layer.liveLayer) {
          LayerHelpers.identifyFeatures(layer.layer, evt.coordinate, (feature) => {
            if (feature !== undefined) helpers.showFeaturePopup(evt.coordinate, feature);
          });
        }
      });
    });
  };
  //#endregion

  //#region HANDLE LAYER STATES
  acceptDisclaimer = (layer) => {
    if (window.acceptedDisclaimers === undefined || window.acceptedDisclaimers.indexOf(layer.name) === -1) {
      return false;
    } else {
      return true;
    }
  };

  getLayerList = (callback) => {
    let allLayers = [];
    const layerList = Object.assign([], this.getActiveLayerGroups());
    layerList.forEach((group) => {
      allLayers.push(this.sortLayers(group.layers));
    });
    callback(allLayers);
  };
  //HANDLE LIST VIEW ONLY FUNCTIONS
  //HANDLE SHARED FUNCTIONS
  getActiveLayerGroups = () => {
    switch (this.state.type) {
      case "LIST":
        return this.state.layerListGroups;
      case "FOLDER":
        return this.state.layerFolderGroups;
      default:
        return [];
    }
  };
  setSelectedGroup = (selectedGroup, callback) => {
    this.setState({ selectedGroup: selectedGroup }, () => {
      this.updateLayerCount();
      this.updateLayerVisibility();
      this.updateOpenPopup();
      if (callback !== undefined) callback();
    });
  };
  setLayerGroups = (updateType, layerGroups, callback) => {
    switch (updateType) {
      case "LIST":
        this.setState({ layerListGroups: layerGroups }, () => {
          this.updateLayerCount();
          this.updateLayerVisibility();
          this.updateOpenPopup();
          if (callback !== undefined) callback();
        });
        break;
      case "FOLDER":
        this.setState({ layerFolderGroups: layerGroups }, () => {
          this.updateLayerCount();
          this.updateLayerVisibility();
          this.updateOpenPopup();
          if (callback !== undefined) callback();
        });
        break;
      default:
        break;
    }
  };
  updateLayerVisibility = (type = undefined) => {
    if (type === undefined) type = this.state.type;
    const layerFolderGroups = Object.assign([], this.state.layerFolderGroups);
    const layerListGroups = Object.assign([], this.state.layerListGroups);
    const selectedGroup = Object.assign({}, this.state.selectedGroup);
    if (layerFolderGroups.length === 0 || layerListGroups.length === 0) return;

    switch (type) {
      case "LIST":
        if (layerFolderGroups.length === 0) return;
        layerFolderGroups.forEach((group) => {
          group.layers.forEach((layer) => {
            layer.layer.setVisible(false);
          });
        });

        layerListGroups.forEach((group) => {
          group.layers.forEach((layer) => {
            layer.layer.setVisible(false);
          });
        });
        selectedGroup.layers.forEach((layer) => {
          if (layer.visible) layer.layer.setVisible(true);
        });
        break;
      case "FOLDER":
        selectedGroup.layers.forEach((layer) => {
          layer.layer.setVisible(false);
        });
        layerListGroups.forEach((group) => {
          group.layers.forEach((layer) => {
            layer.layer.setVisible(false);
          });
        });
        layerFolderGroups.forEach((group) => {
          group.layers.forEach((layer) => {
            if (layer.visible) layer.layer.setVisible(true);
          });
        });
        break;
      case "CLEAR":
        selectedGroup.layers.forEach((layer) => {
          layer.layer.setVisible(false);
        });
        layerFolderGroups.forEach((group) => {
          group.layers.forEach((layer) => {
            layer.layer.setVisible(false);
          });
        });
        layerListGroups.forEach((group) => {
          group.layers.forEach((layer) => {
            layer.layer.setVisible(false);
          });
        });
        break;
      default:
        break;
    }
  };
  updateLayerCount = (numLayers) => {
    if (this.state.layerFolderGroups.length === 0 || this.state.selectedGroup === {}) return;
    switch (this.state.type) {
      case "LIST":
        if (numLayers === undefined) numLayers = this.state.selectedGroup.layers.length;
        if (this.state.layerCount !== numLayers) this.setState({ layerCount: numLayers });
        break;
      case "FOLDER":
        let layerCount = 0;
        this.state.layerFolderGroups.map((group) => (layerCount += group.layers.length));
        if (this.state.layerCount !== layerCount) this.setState({ layerCount: layerCount });
        break;
      default:
        if (this.state.layerCount !== 0) this.setState({ layerCount: 0 });
        break;
    }
  };
  //#endregion
  //#region HANDLE SORTING

  // FIRES AFTER SORTING
  onSortEnd = ({ oldIndex, newIndex, collection }, e) => {
    if (oldIndex === newIndex) {
      return;
    }
    let group = Object.assign({}, this.state.selectedGroup);
    TOCHelpers.updateLayerIndex(helpers.arrayMoveImmutable(group.layers, oldIndex, newIndex), (result) => {
      group.layers = result.map((layer) => {
        layer.index = layer.drawIndex;
        return layer;
      });

      this.setLayerGroups(
        this.state.type,
        this.state.layerListGroups.map((item) => (group.value === item.value ? group : item)),
        () => {
          this.setState({ selectedGroup: group });
        }
      );
    });
  };

  // TRACK CURSOR SO I CAN RETURN IT TO SAME LOCATION AFTER ACTIONS
  onSortMove = (e) => {};
  getInitialSort = () => {
    if (isMobile) return true;
    else return false;
  };
  sortGroups = (groups) => {
    let primaryGroups = Object.assign(
      [],
      groups.filter((item) => item.primary)
    );
    let nonPrimaryGroups = Object.assign(
      [],
      groups.filter((item) => !item.primary)
    );
    primaryGroups.sort(TOCHelpers.sortGroupAlphaCompare);
    nonPrimaryGroups.sort(TOCHelpers.sortGroupAlphaCompare);

    return [...primaryGroups, ...nonPrimaryGroups];
  };
  sortLayers = (layers) => {
    let newLayers = Object.assign([{}], layers);
    if (this.state.sortListAlpha) newLayers.sort(TOCHelpers.sortByAlphaCompare);
    else newLayers.sort(TOCHelpers.sortByIndexCompare);

    return TOCHelpers.updateLayerIndex(newLayers);
  };
  //#endregion
  //#region HANDLE FOLDER LIST SPECIFIC FUNCTIONS
  //HANDLE FOLDER VIEW ONLY FUNCTIONS
  // TOGGLE VISIBILITY FOR GROUP

  onLayerVisibilityGroup = (group, visible) => {
    this.state.layerFolderGroups.forEach((groupItem) => {
      if (groupItem.value === group.value) {
        let newGroup = Object.assign({}, groupItem);
        let newLayers = Object.assign([], group.layers);
        newLayers.forEach((layer) => {
          if (layer.disclaimer !== undefined && visible) {
            if (
              TOCHelpers.acceptDisclaimer(layer, () => {
                this.onActivateLayer({ fullName: layer.name, layerGroup: layer.group });
              })
            ) {
              layer.layer.setVisible(visible);
              layer.visible = visible;
            }
          } else {
            layer.layer.setVisible(visible);
            layer.visible = visible;
          }
        });
        newGroup.layers = newLayers;
        this.setLayerGroups(
          "FOLDER",
          this.state.layerFolderGroups.map((item) => (item.value === group.value ? newGroup : item))
        );
      }
    });
  };
  // TOGGLE LEGEND FOR GROUP
  onLegendToggleGroup = (group, showLegend) => {
    group.layers.forEach((layer) => {
      layer.showLegend = showLegend;
      this.onLegendToggle(layer, group);
    });
  };
  // TOGGLE LEGEND
  onLegendToggle = (layerInfo, group, callback = undefined) => {
    let showLegend = !layerInfo.showLegend;

    if (layerInfo.legendImage === null && (layerInfo.legendObj === undefined || layerInfo.legendObj === null)) {
      const params = {};
      const secureKey = layerInfo.layer.get("secureKey");
      if (secureKey !== undefined) {
        params[secureKey] = "GIS";
      }
      helpers.getBase64FromImageUrlWithParams(layerInfo.styleUrl, params, (height, imgData) => {
        const rowHeight = showLegend ? (height += 36) : 30;
        let newGroup = Object.assign({}, group);
        let newLayers = Object.assign([], group.layers);
        layerInfo.showLegend = showLegend;
        layerInfo.height = rowHeight;
        layerInfo.legendImage = imgData;
        layerInfo.legendHeight = rowHeight;

        newLayers = newLayers.map((layer2) => (layer2.name === layerInfo.name ? layerInfo : layer2));
        newGroup.layers = newLayers;
        this.setLayerGroups(
          this.state.type,
          this.getActiveLayerGroups().map((item) => (item.value === newGroup.value ? newGroup : item)),
          () => {
            if (callback !== undefined) callback();
          }
        );
      });
    } else {
      const rowHeight = showLegend ? layerInfo.legendHeight : 30;
      let newGroup = Object.assign({}, group);
      let newLayers = Object.assign([], group.layers);

      layerInfo.height = rowHeight;
      layerInfo.showLegend = showLegend;

      newLayers = newLayers.map((layer2) => (layer2.name === layerInfo.name ? layerInfo : layer2));
      newGroup.layers = newLayers;
      this.setLayerGroups(
        this.state.type,
        this.getActiveLayerGroups().map((item) => (item.value === newGroup.value ? newGroup : item)),
        () => {
          this.forceUpdate();
          if (callback !== undefined) callback();
        }
      );
    }
  };
  onLayerChange = (layer, group, callback) => {
    this.setLayerGroups(
      this.state.type,
      this.getActiveLayerGroups().map((groupItem) => {
        //if not matched return existing group
        if (groupItem.value !== group.value && groupItem.value !== group) return groupItem;
        //replace matched layer
        groupItem.layers = groupItem.layers.map((layer2) => (layer2.name !== layer.name ? layer2 : layer));
        return groupItem;
      }),
      () => {
        if (callback !== undefined) callback();
      }
    );
  };

  onGroupFolderToggle = (groupName, panelOpen) => {
    this.setState(
      {
        layerFolderGroups: this.state.layerFolderGroups.map((groupItem) => {
          //if not matched return existing group
          if (groupItem.value !== groupName) return groupItem;
          groupItem.panelOpen = panelOpen;
          return groupItem;
        }),
      },
      () => {
        this.updateOpenPopup();
      }
    );
  };
  //#endregion
  //#region HANDLE ACTIVATE LAYER/GROUP
  updateOpenPopup = () => {
    const windowContent = document.getElementById("sc-show-window-content");
    const windowContainer = document.getElementById("sc-show-window-container");
    if (windowContent !== null && windowContainer !== null) {
      const classes = windowContainer.className;
      if (classes.indexOf("sc-hidden") === -1) {
        let legend = false;
        try {
          legend = windowContent.childNodes[0].id === "sc-legend-app-main-container";
        } catch (e) {
          console.log(e.message);
        }
        if (legend) this.onOpenLegend();
      }
    }
  };

  onActivateLayerGroup = (groupName, callback) => {
    window.emitter.emit("setSidebarVisiblity", "OPEN");
    window.emitter.emit("activateTab", "layers");
    switch (this.state.type) {
      case "LIST":
        this.state.layerListGroups.forEach((layerGroup) => {
          if (layerGroup.value === groupName) {
            this.setSelectedGroup(layerGroup, () => callback());
          }
        });
        break;
      case "FOLDER":
        this.setLayerGroups(
          this.state.type,
          this.getActiveLayerGroups().map((groupItem) => {
            //if not matched return existing group
            if (groupItem.value !== groupName) return groupItem;
            groupItem.panelOpen = true;
            return groupItem;
          }),
          () => {
            if (callback !== undefined) callback();
          }
        );

        break;
      default:
        callback();
        break;
    }
  };
  onActivateLayer = (layerItem, visible = true) => {
    let allowSave = true;
    let layerGroups = this.getActiveLayerGroups();
    const searchResultTOC_Actions = window.config.searchResultTOC_Actions !== undefined ? window.config.searchResultTOC_Actions.toLowerCase() : "Default";
    if (!layerItem.layerGroup) {
      const guessLayerGroupName = (layerName) => {
        let likelyLayerGroup = layerGroups.filter((item) => {
          return item.layers.filter((itemLayer) => itemLayer.name === layerName)[0] !== undefined && (layerItem.ignoreFolderState || item.panelOpen || this.state.selectedGroup.value === item.value);
        })[0];
        return likelyLayerGroup ? likelyLayerGroup.value : this.state.selectedGroup.value;
      };
      layerItem.layerGroup = guessLayerGroupName(layerItem.fullName);
      if (!layerItem.layerGroup) return;
    }
    let currentGroup = layerGroups.filter((item) => item.value === layerItem.layerGroup)[0];
    if (!currentGroup) return;
    currentGroup.panelOpen = true;
    currentGroup = currentGroup.layers.map((layer) => {
      if (layer.name === layerItem.fullName && layer.group === layerItem.layerGroup) {
        if (layer.disclaimer !== undefined) {
          if (
            !TOCHelpers.acceptDisclaimer(layer, () => {
              this.onActivateLayer(layerItem, visible);
            })
          ) {
            allowSave = false;
            return layer;
          }
        }
        if (searchResultTOC_Actions != "advanced") {
          layer.layer.setVisible(visible);
          layer.visible = visible;
          layerItem.imageName = "layers.png";
        } else if (!layer.visible && searchResultTOC_Actions == "advanced") {
          layer.layer.setVisible(visible);
          layer.visible = visible;
          layerItem.imageName = "layers-visible.png";
        } else if (layer.visible && searchResultTOC_Actions == "advanced" && layerItem.itemAction != "Activate") {
          layer.layer.setVisible(false);
          layer.visible = false;
          layerItem.imageName = "layers.png";
        }
        return layer;
      } else {
        return layer;
      }
    });
    if (allowSave)
      this.setLayerGroups(
        this.state.type,
        layerGroups.map((item) => (item.value === currentGroup.value ? currentGroup : item))
      );
  };
  //#endregion
  //#region HANDLE LAYER OPTIONS MENU CALLBACKS
  onLayerOptionsClick = (evt, layerInfo) => {
    var evtClone = Object.assign({}, evt);
    const menu = <LayerOptionsMenu key={helpers.getUID} evt={evtClone} layerInfo={layerInfo} onLayerChange={this.onLayerChange} onRemoveLayer={this.removeCustomLayer} />;
    ReactDOM.render(menu, document.getElementById("portal-root"));
  };
  //#endregion
  //#region HANDLE HEADER CALLBACKS
  onSearchChange = (value) => {
    this.setState({ searchText: value });
  };
  onTypeChange = () => {
    this.setState({ type: this.state.type === "LIST" ? "FOLDER" : "LIST" }, () => {
      this.updateLayerCount();
      this.updateLayerVisibility();
    });
  };
  onSortSwitchChange = (sortAlpha) => {
    switch (this.state.type) {
      case "LIST":
        let currentGroup = Object.assign({}, this.state.selectedGroup);
        let newLayers = Object.assign([], currentGroup.layers);
        if (sortAlpha) newLayers.sort(TOCHelpers.sortByAlphaCompare);
        else newLayers.sort(TOCHelpers.sortByIndexCompare);
        TOCHelpers.updateLayerIndex(newLayers, (result) => {
          currentGroup.layers = result;

          let newLayerListGroups = this.state.layerListGroups.map((groupItem) => {
            if (groupItem.value === currentGroup.value) {
              return currentGroup;
            } else {
              return groupItem;
            }
          });
          this.setState(
            {
              layerListGroups: newLayerListGroups,
              selectedGroup: currentGroup,
              sortListAlpha: sortAlpha,
            },
            () => {
              if (sortAlpha) {
                helpers.showMessage("Sorting", "Layer re-ordering disabled.", helpers.messageColors.yellow);
              }
            }
          );
        });
        break;
      case "FOLDER":
        let newLayerGroups = [];
        this.state.layerFolderGroups.forEach((groupItem) => {
          let newGroup = Object.assign({}, groupItem);
          let newLayers = Object.assign([], newGroup.layers);
          if (sortAlpha) newLayers.sort(TOCHelpers.sortByAlphaCompare);
          else newLayers.sort(TOCHelpers.sortByIndexCompare);

          newGroup.layers = newLayers;
          newLayerGroups.push(newGroup);
        });
        this.setState({ layerFolderGroups: newLayerGroups, sortFolderAlpha: sortAlpha }, () => {
          this.forceUpdate();
        });
        break;
      default:
        break;
    }
    helpers.addAppStat("TOC Sort", sortAlpha);
  };
  onResetToDefault = () => {
    this.setState({ sortListAlpha: false, sortFolderAlpha: false, searchText: "" }, () => {
      this.refreshTOC(true);
    });
    helpers.addAppStat("TOC Reset", "Button");
  };
  onTurnOffLayers = () => {
    let newLayerGroups = [];
    this.getActiveLayerGroups().forEach((groupItem) => {
      let newGroup = Object.assign({}, groupItem);
      let newLayers = Object.assign([], newGroup.layers);
      newLayers.forEach((layer) => {
        layer.layer.setVisible(false);
        layer.visible = false;
      });

      newGroup.layers = newLayers;
      newLayerGroups.push(newGroup);
    });
    this.setLayerGroups(this.state.type, newLayerGroups, () => {});
    helpers.addAppStat("TOC Turn off Layers", "off");
  };
  onOpenLegend = () => {
    let params = "";
    let activeGroups = [];
    if (this.state.type === "LIST") {
      activeGroups.push(this.state.selectedGroup);
    } else {
      activeGroups = this.state.layerFolderGroups.filter((group) => {
        return group.panelOpen;
      });
    }
    activeGroups.forEach((group) => {
      let name = "";
      if (group.value.indexOf(":") !== -1) {
        name = group.value.split(":")[1];
      } else name = group.value;

      if (params === "") {
        params += "?" + name + "=1";
      } else {
        params += "&" + name + "=1";
      }
    });

    helpers.showWindow(<LegendApp groups={this.getActiveLayerGroups()} selectedGroups={activeGroups} />);
  };
  onSaveAllLayers = () => {
    // GATHER INFO TO SAVE
    this.getLayerList((allLayers) => {
      helpers.saveToStorage(this.storageKeyTOCType, this.state.type);
      const currentGroupList = this.getActiveLayerGroups();
      const groups = {};
      for (var key in allLayers) {
        if (!allLayers.hasOwnProperty(key)) continue;

        var obj = allLayers[key];
        const savedLayers = {};
        const savedGroup = {};
        let groupName = "";
        let group = "";
        obj.forEach((layer) => {
          if (layer.layer.get("userLayer") === true) this.saveCustomLayer(layer, () => {});
          group = layer.group;
          groupName = layer.groupName;
          const saveLayer = {
            name: layer.name,
            visible: layer.visible,
            opacity: layer.opacity,
            index: layer.drawIndex,
          };
          savedLayers[layer.name] = saveLayer;
        });
        let currentGroup = currentGroupList.filter((item) => item.value === group)[0];

        savedGroup["name"] = groupName;
        savedGroup["value"] = currentGroup.value;
        savedGroup["label"] = currentGroup.label;
        savedGroup["defaultGroup"] = currentGroup.defaultGroup;
        savedGroup["visibleLayers"] = currentGroup.visibleLayers;
        savedGroup["panelOpen"] = currentGroup.panelOpen;
        savedGroup["wmsGroupUrl"] = currentGroup.wmsGroupUrl;
        savedGroup["customRestUrl"] = currentGroup.customRestUrl;
        savedGroup["prefix"] = currentGroup.prefix;
        savedGroup["layers"] = savedLayers;

        groups[group] = savedGroup;
      }
      helpers.saveToStorage(this.state.type === "LIST" ? this.storageKey : this.storageKeyFolder, groups);
      helpers.showMessage("Save", "Layer have been saved.");
    });
  };
  onGlobalOpacityChange = (opacity) => {
    this.setState({ globalOpacity: opacity }, () => {
      const layerList = Object.assign([], this.getActiveLayerGroups());
      let newLayerGroups = layerList.map((group) => {
        group.layers = group.layers.map((layer) => {
          layer.layer.setOpacity(opacity);
          layer.opacity = opacity;
          return layer;
        });
        return group;
      });
      this.setLayerGroups(this.state.type, newLayerGroups, () => {});
      helpers.addAppStat("TOC set global opacity", "");
    });
  };

  //#endregion
  render() {
    return (
      <div>
        <TOCHeader
          key="sc-toc-header"
          id="sc-toc-header"
          layerCount={this.state.layerCount}
          sortAlpha={this.state.type === "FOLDER" ? this.state.sortFolderAlpha : this.state.sortListAlpha}
          searchText={this.state.searchText}
          tocType={this.state.type}
          isLoading={this.state.isLoading}
          onSortChange={this.onSortSwitchChange}
          onSearchChange={this.onSearchChange}
          onTOCTypeChange={this.onTypeChange}
          onResetToDefault={this.onResetToDefault}
          onTurnOffLayers={this.onTurnOffLayers}
          onOpenLegend={this.onOpenLegend}
          onSaveAllLayers={this.onSaveAllLayers}
          onGlobalOpacityChange={this.onGlobalOpacityChange}
          globalOpacity={this.state.globalOpacity}
          helpLink={this.state.helpLink}
        />
        <TOCFolderView
          key="sc-toc-folder"
          id="sc-toc-folder"
          visible={this.state.type === "FOLDER"}
          layerGroups={this.sortGroups(this.state.layerFolderGroups)}
          sortAlpha={this.state.sortFolderAlpha}
          searchText={this.state.searchText}
          saveLayerOptions={this.state.saveLayerOptions}
          onGroupFolderToggle={this.onGroupFolderToggle}
          onLayerOptionsClick={this.onLayerOptionsClick}
          onLayerChange={this.onLayerChange}
          onRemoveLayer={this.removeCustomLayer}
          onLegendToggle={this.onLegendToggle}
          onLayerVisibilityGroup={this.onLayerVisibilityGroup}
        />
        <TOCListView
          key="sc-toc-list"
          id="sc-toc-list"
          visible={this.state.type === "LIST"}
          layerCount={this.state.layerCount}
          layerGroups={this.state.layerListGroups}
          selectedGroup={this.state.selectedGroup}
          searchText={this.state.searchText}
          sortAlpha={this.state.sortListAlpha}
          onGroupDropDownChange={this.setSelectedGroup}
          onLegendToggle={this.onLegendToggle}
          onLayerOptionsClick={this.onLayerOptionsClick}
          onLayerChange={this.onLayerChange}
          onSortMove={this.onSortMove}
          onSortEnd={this.onSortEnd}
        />
        <div className="sc-hidden sc-toc-footer-container" />
      </div>
    );
  }
}

export default TOC;
