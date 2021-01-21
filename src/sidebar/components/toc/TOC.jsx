// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import { isMobile } from "react-device-detect";
import arrayMove from "array-move";

//OPEN LAYERS
import { Icon, Style } from "ol/style.js";
import { Vector as VectorSource } from "ol/source.js";
import Point from "ol/geom/Point";
import { Vector as VectorLayer } from "ol/layer";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON.js";

//CUSTOM
import TOCConfig from "./common/TOCConfig.json";
import * as TOCHelpers from "./common/TOCHelpers.jsx";
import TOCHeader from "./common/TOCHeader.jsx";
import LayerOptionsMenu from "./common/LayerOptionsMenu.jsx";
import TOCListView from "./toc-list-view/TOCListView.jsx";
import TOCFolderView from "./toc-folder-view/TOCFolderView.jsx";
import Identify from "../../../map/Identify.jsx";
import * as helpers from "../../../helpers/helpers";

class TOC extends Component {
  constructor(props) {
    super(props);
    this.storageMapDefaultsKey = "Map Defaults";
    this.storageKeyAllLayers = "Layers_Folder_View";
    this.virtualId = "sc-toc-virtual-layers";
    this.lastPosition = null;

    this.state = {
      layerListGroups: [],
      layerFolderGroups: [],
      allLayers:[],
      saveLayerOptions:[],
      onMenuItemClick: [],
      type: this.props.type,
      defaultGroup: undefined,
      selectedGroup: {},
      layerCount: 0,
      sortAlpha: this.getInitialSort(),
      searchText:"",
      isLoading:false,
    };
//#region ADD LISTENERS
    // LISTEN FOR MAP LEGEND
    window.emitter.addListener("openLegend", () => this.onOpenLegend());

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());
    //LISTEN FOR NEW LAYER
    window.emitter.addListener("addCustomLayer", (layer, group, selected) => this.addCustomLayer(layer, group, selected));

    // LISTEN FOR LAYERS TO LOAD
    window.emitter.addListener("layersLoaded", (numLayers) => this.updateLayerCount(numLayers));

    // LISTEN FOR SEARCH RESULT
    window.emitter.addListener("activeTocLayerGroup", (groupName, callback) => this.onActivateLayerGroup(groupName, callback));
    window.emitter.addListener("activeTocLayer", (layerItem) => this.onActivateLayer(layerItem));
    // CLEAR IDENTIFY MARKER AND RESULTS
    window.emitter.addListener("clearIdentify", () => this.clearIdentify());
    // RETURN FULL LAYER LIST (replaces window.allLayers)
    window.emitter.addListener("getLayerList", (callback) => this.getLayerList(callback));
//#endregion
  }
 //#region REACT FUNCTIONS
  componentWillMount() {
    const tocParam = helpers.getURLParameter("TOCTYPE");
    if (tocParam !== null) this.setState({ type: tocParam });
  }
//#endregion
//#region LOAD LAYERS
//HANDLE LAYER LOADING
onMapLoad = () => {
  this.refreshTOC(false, ()=> {
    if (helpers.getConfigValue("leftClickIdentify")) {
      this.addIdentifyLayer();
    }else{
      this.addPropertyReportClick();
    }
  });
};
refreshTOC = (isReset, callback) => {

  //Get saved layers
  //Get map config layers
  //Get toc config layers
  //Get toc config geoserver layers
  //combine and sort
  sessionStorage.removeItem(this.storageMapDefaultsKey);
  //let savedLayers = [];
  //this.getSavedLayers((results)=>{savedLayers=results;});
  let geoserverUrl = helpers.getURLParameter("GEO_URL");
  let geoserverUrlType = helpers.getURLParameter("GEO_TYPE");
  let mapId = helpers.getURLParameter("MAP_ID");
  if (mapId === null) mapId = TOCConfig.mapId;
  if (geoserverUrl === null) {
    geoserverUrl = TOCConfig.geoserverLayerGroupsUrl;
  } else {
    geoserverUrl = geoserverUrl + "/ows?service=wms&version=1.3.0&request=GetCapabilities";
  }
  if (geoserverUrlType === null) geoserverUrlType = TOCConfig.geoserverLayerGroupsUrlType;
  if (geoserverUrl !== undefined && geoserverUrl !== null) {
    if(TOCConfig.useMapConfigApi){
      TOCHelpers.getMap(mapId, geoserverUrlType, isReset, "LIST", (result)=>{
        const groupInfo = result;
        this.setState(
          {
            layerListGroups:  groupInfo[0],
            layerFolderGroups: TOCHelpers.copyTOCLayerGroups(groupInfo[0]),
            selectedGroup: groupInfo[1],
            defaultGroup: groupInfo[1],
          },
          () => {
            this.updateLayerCount(groupInfo[1].layers.length);
            this.updateLayerVisibility();
            window.emitter.emit("tocLoaded");
            if (callback !== undefined) callback();
          }
        );
      });
    }else{
      TOCHelpers.getGroupsGC(geoserverUrl, geoserverUrlType, isReset, "LIST", false, true, (result) => {
        const groupInfo = result;
        this.setState(
          {
            layerListGroups:  groupInfo[0],
            layerFolderGroups: TOCHelpers.copyTOCLayerGroups(groupInfo[0]),
            selectedGroup: groupInfo[1],
            defaultGroup: groupInfo[1],
          },
          () => {
            this.updateLayerCount(groupInfo[1].layers.length);
            this.updateLayerVisibility();
            window.emitter.emit("tocLoaded");
            if (callback !== undefined) callback();
          }
        );
      });
    }
  } else {
    const groupInfo = TOCHelpers.getGroups();
    this.setState(
      {
        layerListGroups: groupInfo[0],
        layerFolderGroups: Object.assign([], groupInfo[0]),//TOCHelpers.copyTOCLayerGroups(groupInfo[0]),
        selectedGroup: groupInfo[1],
        defaultGroup: groupInfo[1],
      },
      () => {
        this.updateLayerCount(groupInfo[1].layers.length);
        this.updateLayerVisibility();
        window.emitter.emit("tocLoaded");
        if (callback !== undefined) callback();
      }
    );
  }
};
getSavedLayers = (callback) => {
  let savedLayers = helpers.getItemsFromStorage(this.storageKeyAllLayers);
  if (savedLayers !== undefined && savedLayers !== null && savedLayers !== []) {
    TOCHelpers.getGroupsFromData(savedLayers, (result) => {
      const groupInfo = result;
      let groups = [];    
      groups = groups.concat(groupInfo[0]);
      callback(groups);
    });
  } else {
    callback([]);
  }
}
addCustomLayer = (layer, groupName, selected = false) => {
  const AddedMessage = (group, layer) => `New layer "${layer}" has been added to the "${group}" group.`;
  let layerIndex = 100;
  let layerGroups = this.getActiveLayerGroups();
  let layersGroup = layerGroups.filter((group) => group.value === groupName)[0];

  //if (layersGroup === undefined) layersGroup = layerGroups.filter((group) => group.label === this.myLayersGroupName)[0];
  if (layersGroup === undefined) layersGroup = layerGroups[0];

  layerIndex += layersGroup.layers.length + 1;
  TOCHelpers.makeLayer(layer.displayName, helpers.getUID(), layersGroup, layerIndex, true, 1, layer.layer, undefined, undefined, false, layer.styleUrl, (retLayer) => {
    let layers = layersGroup.layers;
    layers.push(retLayer);

    layersGroup.layers = layers;
    this.setLayerGroups(this.state.type,layerGroups.map((group) => (layersGroup.value === group.value ? layersGroup : group)), ()=>{
      this.saveGlobalLayers();
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
          this.forceUpdate();
        });
      }
    });
  });
};

//#endregion
//#region HANDLE PROPERTY REPORT CLICK
addPropertyReportClick = () => {
  window.map.on("singleclick", (evt) => {
    const viewResolution = window.map.getView().getResolution();
    const allLayers = Object.assign([], this.state.allLayers);
    allLayers.forEach((layer) => {
      if (layer.visible && layer.liveLayer) {
        var url = layer.layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", { INFO_FORMAT: "application/json" });
        if (url) {
          helpers.getJSON(url, (result) => {
            const features = result.features;
            if (features.length > 0) {
              const geoJSON = new GeoJSON().readFeatures(result);
              const feature = geoJSON[0];
              helpers.showFeaturePopup(evt.coordinate, feature);
            }
          });
        }
      }
    });
  });
};
//#endregion
//#region HANDLE LEFT CLICK IDENTIFY
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
}
saveGlobalLayers = () => {
  let allLayers = [];
  const layerList = Object.assign([], this.getActiveLayerGroups());
  layerList.forEach((group) => {
    allLayers.push(this.sortLayers(group.layers));
  });
  this.setState({allLayers:allLayers});
  window.allLayers = allLayers;
};
//HANDLE LIST VIEW ONLY FUNCTIONS
//HANDLE SHARED FUNCTIONS
getActiveLayerGroups = () => {
  switch(this.state.type){
    case "LIST":
      return this.state.layerListGroups;
    case "FOLDER":
      return this.state.layerFolderGroups;
    default:
      return [];
  }
};
setSelectedGroup = (selectedGroup, callback) => {
  this.setState({selectedGroup: selectedGroup }, 
     ()=>{
       this.updateLayerCount();
       this.updateLayerVisibility();
       if (callback !== undefined) callback();
    });
}
setLayerGroups = (updateType,layerGroups, callback) =>{
  switch(updateType){
    case "LIST":
      this.setState({layerListGroups: layerGroups}, ()=>{if (callback !== undefined) callback();});
      break;
    case "FOLDER":
      this.setState({layerFolderGroups: layerGroups }, ()=>{if (callback !== undefined) callback();});
      break;
    default:
      //this.setState({layerListGroups: layerGroups,layerFolderGroups: layerGroups }, ()=>{if (callback !== undefined) callback();});
      break;
  }
};
updateLayerVisibility = () => {
  const layerFolderGroups = Object.assign([], this.state.layerFolderGroups);
  const selectedGroup = Object.assign({}, this.state.selectedGroup);
  switch(this.state.type){
    case "LIST":
      layerFolderGroups.forEach((group) => {
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
      layerFolderGroups.forEach((group) => {
        group.layers.forEach((layer) => {
          if (layer.visible) layer.layer.setVisible(true);
        });
      });
      break;
    default:
      break;
  }
};
updateLayerCount = (numLayers) => {
  switch(this.state.type){
    case "LIST":
      if (numLayers === undefined) numLayers = this.state.selectedGroup.layers.length;
      if (this.state.layerCount !== numLayers) this.setState({ layerCount: numLayers })
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
    let group = Object.assign({},this.state.selectedGroup);
    group.layers = arrayMove(group.layers, oldIndex, newIndex);
    this.setLayerGroups(this.state.type, this.state.layerListGroups.map((item)=> group.value === item.value? group:item),()=>
    {
      this.setState({ selectedGroup: group});
    });
    document.getElementById(this.virtualId).scrollTop += this.lastPosition;
  };

  // TRACK CURSOR SO I CAN RETURN IT TO SAME LOCATION AFTER ACTIONS
  onSortMove = (e) => {
    this.lastPosition = document.getElementById(this.virtualId).scrollTop;
  };
getInitialSort = () => {
  if (isMobile) return true;
  else return false;
};
sortLayers = (layers) => {
  // console.log("sort");
  let newLayers = Object.assign([{}], layers);
  if (this.state.sortAlpha) newLayers.sort(TOCHelpers.sortByAlphaCompare);
  else newLayers.sort(TOCHelpers.sortByIndexCompare);

  // console.log(newLayers);
  return newLayers;
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
        layer.layer.setVisible(visible);
        layer.visible = visible;
      });
      newGroup.layers = newLayers;
      this.setLayerGroups("FOLDER",this.state.layerFolderGroups.map((item) => (item.value === group.value ? newGroup : item)));
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
onLegendToggle = (layerInfo, group) => {
  let showLegend = !layerInfo.showLegend;
  this.lastPosition = document.getElementById(this.virtualId).scrollTop;

  if (layerInfo.legendImage === null) {
    TOCHelpers.getBase64FromImageUrl(layerInfo.styleUrl, (height, imgData) => {
      const rowHeight = showLegend ? (height += 36) : 30;
      let newGroup = Object.assign({}, group);
      let newLayers = Object.assign([], group.layers);
      layerInfo.showLegend = showLegend;
      layerInfo.height = rowHeight;
      layerInfo.legendImage = imgData;
      layerInfo.legendHeight = rowHeight;

      newLayers = newLayers.map((layer2) => (layer2.name === layerInfo.name ? layerInfo : layer2 ));
      newGroup.layers = newLayers;
      this.setLayerGroups(this.state.type, this.getActiveLayerGroups().map((item) => (item.value === newGroup.value ? newGroup : item)), () => {
       // if (this.state.type==="LIST") this.setSelectedGroup(newGroup, ()=>{});
       document.getElementById(this.virtualId).scrollTop += this.lastPosition;

      });
    });
  } else {
    const rowHeight = showLegend ? layerInfo.legendHeight : 30;
    let newGroup = Object.assign({}, group);
    let newLayers = Object.assign([], group.layers);

    layerInfo.height = rowHeight;
    layerInfo.showLegend = showLegend;

    newLayers = newLayers.map((layer2) => (layer2.name === layerInfo.name ? layerInfo : layer2));
    newGroup.layers = newLayers;
    this.setLayerGroups(this.state.type, this.getActiveLayerGroups().map((item) => (item.value === newGroup.value ? newGroup : item)), () => {
     // if (this.state.type==="LIST") this.setSelectedGroup(newGroup, ()=>{});
     document.getElementById(this.virtualId).scrollTop += this.lastPosition;
    });
  }
};
onLayerChange = (layer, group) => {
  var t0 = performance.now()
  if (this.state.type ==="LIST") this.lastPosition = document.getElementById(this.virtualId).scrollTop;
  let layerGroups = Object.assign([], this.getActiveLayerGroups());

  this.setLayerGroups(this.state.type,
    layerGroups.map((groupItem) => {
        if (groupItem.value === group.value || groupItem.value === group) {
          let newGroup = Object.assign({}, groupItem);
          let newLayers = Object.assign([], groupItem.layers);
          newLayers = newLayers.map((layer2) => (layer2.value === layer.value ? layer2 : layer));
          newGroup.layers = newLayers;
          return newGroup;
        }else{
          return groupItem;
        }
      }),
    () => {
    if (this.state.type ==="LIST") document.getElementById(this.virtualId).scrollTop += this.lastPosition;
    console.log('update took ' + (performance.now()-t0) + 'ms');
  }
   );
};
//#endregion
//#region HANDLE ACTIVATE LAYER/GROUP
onActivateLayerGroup = (groupName, callback) => {
  window.emitter.emit("setSidebarVisiblity", "OPEN");
  window.emitter.emit("activateTab", "layers");
  switch (this.state.type){
    case "LIST":
      this.state.layerListGroups.forEach((layerGroup) => {
        if (layerGroup.value === groupName) {
          this.setSelectedGroup(layerGroup,()=> callback());
          //this.setState({selectedGroup:layerGroup}, ()=> callback());
        }
      });
      break;
    default:
      callback();
      break;
  }
};
onActivateLayer = (layerItem) => {
  let layerGroups = this.getActiveLayerGroups();

  let currentGroup = layerGroups.filter((item) => item.value === layerItem.layerGroup)[0];
  currentGroup = currentGroup.layers.map((layer)=>{
    if (layer.name === layerItem.fullName && layer.group === layerItem.layerGroup) {
      layer.layer.setVisible(true);
      layer.visible = true;
      return layer;
    }else{
      return layer;
    }
  });
  this.setLayerGroups(this.state.type, layerGroups.map((item) => (item.value === currentGroup.value ? currentGroup : item)));
};
//#endregion 
//#region HANDLE LAYER OPTIONS MENU CALLBACKS
onLayerOptionsClick = (evt, layerInfo) =>{
  var evtClone = Object.assign({}, evt);
  const menu = (
    <LayerOptionsMenu 
      key={helpers.getUID} 
      evt={evtClone} 
      layerInfo={layerInfo}
      onLayerChange={this.onLayerChange}  
    />
  );
  ReactDOM.render(menu, document.getElementById("portal-root"));
}
//#endregion
//#region HANDLE HEADER CALLBACKS
  onSearchChange = (value) => {
    this.setState({ searchText: value });
  };
  onTypeChange = () => {
    this.setState({ type: this.state.type ==="LIST"?"FOLDER":"LIST"  },()=>{
      this.updateLayerCount();
      this.updateLayerVisibility();
    });
  };
  onSortSwitchChange = (sortAlpha) => {
    switch (this.state.type){
      case "LIST":
        this.setState({ sortAlpha: sortAlpha });
        if (sortAlpha) {
          helpers.showMessage("Sorting", "Layer re-ordering disabled.", helpers.messageColors.yellow);
        }
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
        this.setState( {layerFolderGroups: newLayerGroups,sortAlpha: sortAlpha});
        break;
      default:
      
        break;
    }
    helpers.addAppStat("TOC Sort", sortAlpha);
  };
  onResetToDefault = () => {
    this.setState({ sortAlpha: false, searchText: "" }, () => {
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
    this.setLayerGroups(this.state.type, newLayerGroups, ()=>{});
    helpers.addAppStat("TOC Turn off Layers", "off");
  };
  onOpenLegend = () => {
    let params = "";
    this.getActiveLayerGroups().forEach((group) => {
      let name = "";
      if (group.value.indexOf(":") !== -1) {
        name = group.value.split(":")[1];
      } else name = group.value;
  
      if (params === "") {
        if (this.state.selectedGroup.value === group.value) params += "?" + name + "=1";
        else params += "?" + name + "=1";
      } else {
        if (this.state.selectedGroup.value === group.value) params += "&" + name + "=1";
        else params += "&" + name + "=1";
      }
    });
  
    helpers.showURLWindow("https://opengis.simcoe.ca/legend/" + params, false, "normal", true, true);
  };
  onSaveAllLayers = () => {
    // GATHER INFO TO SAVE
    const layers = {};
    const groups = {};
    for (var key in this.state.allLayers) {
      if (!this.state.allLayers.hasOwnProperty(key)) continue;
  
      var obj = this.state.allLayers[key];
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
      let currentGroup = this.state.layerFolderGroups.filter((item) => item.value === group)[0];
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
 //#endregion
  render() {
    return (
      <div>
        <TOCHeader 
          key="sc-toc-header"
          layerCount={this.state.layerCount}
          sortAlpha={this.state.sortAlpha}
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
        />
        <TOCFolderView 
          key="sc-toc-folder" 
          visible={this.state.type === "FOLDER"} 
          layerGroups={this.state.layerFolderGroups} 
          sortAlpha={this.state.sortAlpha}
          searchText={this.state.searchText}
          saveLayerOptions={this.state.saveLayerOptions}
          onLayerOptionsClick={this.onLayerOptionsClick}
          onLayerChange={this.onLayerChange}
          onLegendToggle={this.onLegendToggle}
          onLegendToggleGroup={this.onLegendToggleGroup}
          onLayerVisibilityGroup={this.onLayerVisibilityGroup}
        />
        <TOCListView 
          key="sc-toc-list" 
          visible={this.state.type === "LIST"} 
          layerCount={this.state.layerCount}
          layerGroups={this.state.layerListGroups} 
          selectedGroup={this.state.selectedGroup}
          searchText={this.state.searchText}
          allLayers={this.state.allLayers}
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

// IMPORT ALL IMAGES
 const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
 function importAllImages(r) {
     let images = {};
   r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
   return images;
 }
