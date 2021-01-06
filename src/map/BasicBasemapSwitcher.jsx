import React, { Component } from "react";
import "./BasicBasemapSwitcher.css";
import * as helpers from "../helpers/helpers";
import BasemapConfig from "./basemapSwitcherConfig.json";
import { Group as LayerGroup } from "ol/layer.js";
import xml2js from "xml2js";

class BasemapSwitcher extends Component {
  constructor(props) {
    super(props);

    this.state = {
      topoPanelOpen: false,
      topoLayers: [],
      topoActiveIndex: 0,
      topoCheckbox: true,
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
    this.setState({showBaseMapSwitcher:window.mapControls.basemap,toggleService:BasemapConfig.topoServices[1]});
   
  }
  onMapLoad() {
    let index = 0;
    // LOAD WORLD LAYER
    if (BasemapConfig.worldImageryService !== undefined || BasemapConfig.worldImageryService !== "") {
      var worldImageryLayer = helpers.getESRITileXYZLayer(BasemapConfig.worldImageryService);
      worldImageryLayer.setZIndex(0);
      //worldImageryLayer.setMinResolution(300);
      window.map.addLayer(worldImageryLayer);
      this.setState({ worldImageryLayer: worldImageryLayer });
    }
    // LOAD BASEMAP LAYERS
    let basemapList = [];
    //let basemapIndex = 0;
    BasemapConfig.topoServices.forEach(serviceGroup => {
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
        }

        // LAYER PROPS
        layer.setProperties({ index: index, name: service.name, isOverlay: false });
        serviceLayers.push(layer);
        index++;
      });
      const geoserverPath = helpers.getConfigValue("geoserverPath");
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
              const serverUrl = groupUrl.split(`/${geoserverPath}/`)[0] + `/${geoserverPath}`;

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

    this.setState({ topoLayers: basemapList, topoActiveIndex: 0, previousIndex:0});
    
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

        layer.setVisible(true);
      } else {
        layer.setVisible(false);
      }
    }
  }

  onToggleBasemap = (index) =>{
    if (index === this.state.topoActiveIndex){
      this.setState({ topoPanelOpen: false});
      return;
    } 
    let toggleIndex = this.state.topoActiveIndex;
    if (toggleIndex === undefined) toggleIndex = 0;
    BasemapConfig.topoServices.forEach(service => {
      if (service.index === toggleIndex){
        this.setState({toggleService:service,toggleIndex:toggleIndex},()=>{
          this.onTopoItemClick(index);
        })
      }
      
    });
  }
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
    return (
      <div className={(!this.state.showBaseMapSwitcher? " sc-hidden":"")}>
        <div id="sc-basemap-main-container">
          
          <div className={"sc-basemap-topo"}>
            <BasemapItem key={helpers.getUID()} className="sc-basemap-topo-toggle-item-container" index={this.state.toggleIndex} showLabel={true} topoActiveIndex={this.state.topoActiveIndex} service={this.state.toggleService} onTopoItemClick={this.onToggleBasemap} />
            <button className={"sc-button sc-basemap-arrow" + (this.state.topoPanelOpen ? " open" : "")} onClick={this.onTopoArrowClick}></button>
          </div>
        </div>
        <div className={this.state.topoPanelOpen ? "sc-basemap-topo-container" : "sc-hidden"}>
          {BasemapConfig.topoServices.map((service, index) => (
             <BasemapItem key={helpers.getUID()} index={index} showLabel={true} topoActiveIndex={this.state.topoActiveIndex} service={service} onTopoItemClick={this.onToggleBasemap} className={index === this.state.topoActiveIndex ? "active":""} /> 
              
            ))}
        </div>
      </div>
    );
  }
}

export default BasemapSwitcher;

class BasemapItem extends Component {
  state = {};
  render() {
    if (this.props.service === undefined) return (<div></div>);
    return (

      <div
        className={(this.props.className !== undefined ? this.props.className + " " : "") + "sc-basemap-topo-item-container" }
        onClick={() => {
          this.props.onTopoItemClick(this.props.index);
        }}
        title={"Switch basemap to " + this.props.service.name}
      >
        <div className="sc-basemap-topo-item-title">{this.props.showLabel===true?this.props.service.name:""}</div>
        <img className={"sc-basemap-topo-image" } src={images[this.props.service.image]} alt={this.props.service.image}></img>
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