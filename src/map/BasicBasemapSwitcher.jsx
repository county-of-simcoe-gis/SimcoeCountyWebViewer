import React, { Component} from "react";
import ReactDOM from "react-dom";
import Slider from "rc-slider";
import "./BasicBasemapSwitcher.css";
import * as helpers from "../helpers/helpers";
import BasemapConfig from "./basemapSwitcherConfig.json";
import { Group as LayerGroup } from "ol/layer.js";
import xml2js from "xml2js";
import { Vector as VectorSource } from "ol/source.js";
import { Vector as VectorLayer } from "ol/layer.js";
import FloatingMenu, { FloatingMenuItem }from "../helpers/FloatingMenu.jsx";
import Portal from "../helpers/Portal.jsx";
import { Item as MenuItem } from "rc-menu";

class BasicBasemapSwitcher extends Component {
  constructor(props) {
    super(props);
    this.storageKeyBasemap = "Saved Basemap Options";
    this.state = {
      topoPanelOpen: false,
      topoLayers: [],
      topoActiveIndex: 0,
      topoCheckbox: true,
      basemapOpacity:1,
      activeButton: "topo",
      toggleService:undefined,
      toggleIndex:1, 
      previousIndex: undefined,
      showBaseMapSwitcher:true,
    };

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());
    // LISTEN FOR CONTROL VISIBILITY CHANGES
    window.emitter.addListener("mapControlsChanged", (control, visible) => this.controlStateChange(control,visible));
  }

  componentDidMount(){

   this.setState({showBaseMapSwitcher:window.mapControls.basemap});
}
  onMapLoad() {
    let index = 0;
    // LOAD BASEMAP LAYERS
     let basemapList = [];
    //CHECK IF SETTINGS INCLUDES A BASEMAP LAYERS CONFIGURATION
     const baseMapServicesOptions = (window.config.baseMapServices !== undefined)
		? window.config.baseMapServices
		: BasemapConfig.topoServices;
   
	//SET toggleService STATE BASED ON BASED LAYER OPTINS
	this.setState({toggleService:baseMapServicesOptions[1]});
    //let basemapIndex = 0;
    
	baseMapServicesOptions.forEach(serviceGroup => {
      index = 0;
      let serviceLayers = [];
      serviceGroup.layers.forEach(service => {
        // CREATE THE LAYER
        let layer = null;
        if (service.type === "SIMCOE_TILED") {
          layer = helpers.getSimcoeTileXYZLayer(service.url);
        } else if (service.type === "OSM") {
          //layer = helpers.getOSMLayer();
          layer = helpers.getOSMTileXYZLayer("http://a.tile.openstreetmap.org");
        } else if (service.type === "ESRI_TILED") {
          layer = helpers.getArcGISTiledLayer(service.url);
        } else if (service.type === "ARC_REST"){
          layer = helpers.getESRITileXYZLayer(service.url);
        }else if (service.type === "XYZ") {
          layer = helpers.getXYZLayer(service.url);
        }else{
          layer = new VectorLayer({source: new VectorSource()});
        }

        // LAYER PROPS
        layer.setProperties({ index: index, name: service.name, isOverlay: false });
        serviceLayers.push(layer);
        index++;
      });

      const groupUrl = serviceGroup.groupUrl;
      if (groupUrl !== undefined) {
        // GET XML
        helpers.httpGetText(groupUrl, result => {
          var parser = new xml2js.Parser();

          // PARSE TO JSON
          parser.parseString(result, function(err, result) {
            const groupLayerList = result.WMS_Capabilities.Capability[0].Layer[0].Layer[0].Layer;
            index++;
            groupLayerList.forEach(layerInfo => {
              const layerNameOnly = layerInfo.Name[0].split(":")[1];
              const serverUrl = groupUrl.split("/geoserver/")[0] + "/geoserver";

              let groupLayer = helpers.getImageWMSLayer(serverUrl + "/wms", layerInfo.Name[0]);
              groupLayer.setVisible(true);
              groupLayer.setProperties({ index: index, name: layerNameOnly, isOverlay: true });
              
              serviceLayers.push(groupLayer);
              index++;
            });
			
            // USING LAYER GROUPS FOR TOPO
            let layerGroup = new LayerGroup({ layers: serviceLayers, visible: false });
            layerGroup.setProperties({ index: serviceGroup.index, name: serviceGroup.name });
            window.map.addLayer(layerGroup);
            
            basemapList.push(layerGroup);
          });
        });
      } else {
        // USING LAYER GROUPS FOR TOPO
        let layerGroup = new LayerGroup({ layers: serviceLayers, visible: false });
        layerGroup.setProperties({ index: serviceGroup.index, name: serviceGroup.name });
        window.map.addLayer(layerGroup);
        basemapList.push(layerGroup);
		//basemapIndex++;
      }
    });
	this.setState({ topoLayers: basemapList, topoActiveIndex: 0, previousIndex:0},()=>{
      let savedOptions = helpers.getItemsFromStorage(this.storageKeyBasemap);
      if (savedOptions !== undefined){
          this.setState({
            topoActiveIndex: savedOptions.toggleIndex,
            basemapOpacity:savedOptions.basemapOpacity,
            toggleIndex:savedOptions.topoActiveIndex, 
            previousIndex:savedOptions.previousIndex,
        },()=>{
          this.onToggleBasemap(this.state.toggleIndex);
        });
      }
    });
      
    
    // NEED TO WAIT A TAD FOR LAYERS TO INIT
    setTimeout(() => {
      this.handleURLParameters();
    }, 100);
  }

  // HANDLE URL PARAMETERS
  handleURLParameters = value => {
    const basemap = helpers.getURLParameter("BASEMAP") !== null ? helpers.getURLParameter("BASEMAP").toUpperCase() : null;
    const name = helpers.getURLParameter("NAME") !== null ? helpers.getURLParameter("NAME").toUpperCase() : null;

    if (basemap === "TOPO") {
      this.enableTopo();

      for (let index = 0; index < this.state.topoLayers.length; index++) {
        let layer = this.state.topoLayers[index];
        const layerName = layer.getProperties().name;
        if (layerName.toUpperCase() === name) {
          this.setState({ topoActiveIndex: index,previousIndex:this.state.topoActiveIndex, });
          this.setTopoLayerVisiblity(index);
        }
      }
    }
  };

  enableTopo = value => {
    this.setTopoLayerVisiblity(this.state.topoActiveIndex);

    // EMIT A BASEMAP CHANGE
    window.emitter.emit("basemapChanged", "TOPO");
  };

  disableTopo = value => {
    this.setTopoLayerVisiblity(-1);
  };

  // TOPO BUTTON
  onTopoButtonClick = evt => {
    // CLOSE PANEL ONLY IF ALREADY OPEN
    if (this.state.topoPanelOpen) this.setState({ topoPanelOpen: !this.state.topoPanelOpen });

    this.enableTopo();

    // APP STATS
    helpers.addAppStat("Topo", "Button");
  };

  // PANEL DROP DOWN BUTTON
  onTopoArrowClick = evt => {
    this.enableTopo();
    this.setState({ topoPanelOpen: !this.state.topoPanelOpen });
    // APP STATS
    helpers.addAppStat("Topo", "Arrow");
  };

  // CLICK ON TOPO THUMBNAILS
  onTopoItemClick = activeIndex => {
    this.setTopoLayerVisiblity(activeIndex);
    this.setState({ topoPanelOpen: false,topoActiveIndex: activeIndex });
  };

  // ADJUST VISIBILITY
  setTopoLayerVisiblity(activeIndex) {
    for (let index = 0; index < this.state.topoLayers.length; index++) {
      let layer = this.state.topoLayers[index];
      const layerIndex = layer.getProperties().index;
      if (layerIndex === activeIndex) {
        //let layers = layer.getLayers();

        layer.getLayers().forEach(layer => {
          if (layer.get("isOverlay") && this.state.topoCheckbox) layer.setVisible(true);
          else if (layer.get("isOverlay") && !this.state.topoCheckbox) layer.setVisible(false);
        });
        layer.setOpacity(this.state.basemapOpacity);
        layer.setVisible(true);
      } else {
        layer.setOpacity(this.state.basemapOpacity);
        layer.setVisible(false);
      }
    }
  }
  // OPACITY SLIDER FOR EACH LAYER
  onSliderChange = (opacity) => {
    this.setState({basemapOpacity: opacity}, () =>{
      this.setTopoLayerVisiblity(this.state.topoActiveIndex);
    });
  };

  onToggleBasemap = (index) =>{
	const baseMapServicesOptions = (window.config.baseMapServices !== undefined)
		? window.config.baseMapServices
		: BasemapConfig.topoServices;

    if (index === this.state.topoActiveIndex){
      this.setState({ topoPanelOpen: false});
      return;
    } 
    let toggleIndex = this.state.topoActiveIndex;
    if (toggleIndex === undefined) toggleIndex = 0;
	baseMapServicesOptions &&
    baseMapServicesOptions.forEach(service => {
      if (service.index === toggleIndex){
        this.setState({toggleService:service,toggleIndex:toggleIndex},()=>{
          this.onTopoItemClick(index);
        })
      }
      
    });
  }
  saveBasemap(){
    let basemapOptions = {
      topoActiveIndex: this.state.topoActiveIndex,
      basemapOpacity:this.state.basemapOpacity,
      toggleService:this.state.toggleService,
      toggleIndex:this.state.toggleIndex, 
      previousIndex: this.state.previousIndex,
    }
    helpers.saveToStorage(this.storageKeyBasemap, basemapOptions);
    helpers.showMessage("Save", "Basemap options saved.");
  }
  onMenuItemClick = action => {
    switch(action){
      case "sc-floating-menu-save-basemap":
        this.saveBasemap();
        break;
      default:
        break;
    }
    helpers.addAppStat("Basemap Settings - ", action);
  };
    // ELLIPSIS/OPTIONS BUTTON
    onBasemapOptionsClick = (evt) => {
      var evtClone = Object.assign({}, evt);
      const menu = (
        <Portal>
          <FloatingMenu
            key={helpers.getUID()}
            buttonEvent={evtClone}
            autoY={false}
            title="Basemap Options"
            item={this.props.info}
            onMenuItemClick={action => this.onMenuItemClick(action)}
            styleMode={"left"}
          >
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-save-basemap">
            <FloatingMenuItem imageName={"save-disk.png"} label="Save Default Basemap" />
          </MenuItem>
            <MenuItem className="sc-layers-slider" key="sc-floating-menu-opacity">
              Adjust Transparency
              <Slider max={1} min={0} step={0.05} defaultValue={this.state.basemapOpacity} onChange={evt => this.onSliderChange(evt)} />
            </MenuItem>
          </FloatingMenu>
        </Portal>
      );
  
      ReactDOM.render(menu, document.getElementById("portal-root"));
    };

  controlStateChange(control, state) {
    switch (control){
      case "basemap":
        this.setState({showBaseMapSwitcher:state});
        break;
      default:
        break;
    }
  }
  render() {
	const baseMapServicesOptions = (window.config.baseMapServices !== undefined)
		? window.config.baseMapServices
		: BasemapConfig.topoServices;
		  	  
    return (
      <div className={(!this.state.showBaseMapSwitcher? " sc-hidden":"")}>
        <div id="sc-basic-basemap-main-container">
          <div id="sc-basic-basemap-options" onClick={this.onBasemapOptionsClick} title="Basemap Options" alt="Basemap Options"></div>
          <div className={"sc-basic-basemap-topo"}>
            <BasicBasemapItem key={helpers.getUID()} className="sc-basic-basemap-topo-toggle-item-container" index={this.state.toggleIndex} showLabel={true} topoActiveIndex={this.state.topoActiveIndex} service={this.state.toggleService} onTopoItemClick={this.onToggleBasemap} />
            <button className={"sc-button sc-basic-basemap-arrow" + (this.state.topoPanelOpen ? " open" : "")} onClick={this.onTopoArrowClick}></button>
          </div>
        </div>
        <div className={this.state.topoPanelOpen ? "sc-basic-basemap-topo-container" : "sc-hidden"}>
          {baseMapServicesOptions && baseMapServicesOptions.map((service, index) => (
             <BasicBasemapItem key={helpers.getUID()} index={index} showLabel={true} topoActiveIndex={this.state.topoActiveIndex} service={service} onTopoItemClick={this.onToggleBasemap} className={index === this.state.topoActiveIndex ? "active":""} /> 
              
            ))}
        </div>
      </div>
    );
  }
  
}

export default BasicBasemapSwitcher;

class BasicBasemapItem extends Component {
  state = {};
  render() {
    if (this.props.service === undefined) return (<div></div>);
    return (

      <div
        className={(this.props.className !== undefined ? this.props.className + " " : "") + "sc-basic-basemap-topo-item-container" }
        onClick={() => {
          this.props.onTopoItemClick(this.props.index);
        }}
        title={"Switch basemap to " + this.props.service.name}
      >
        <div className="sc-basic-basemap-topo-item-title">{this.props.showLabel===true?this.props.service.name:""}</div>
        <img className={"sc-basic-basemap-topo-image" } src={images[this.props.service.image]} alt={this.props.service.image}></img>
      </div>
    );
  }
}

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}