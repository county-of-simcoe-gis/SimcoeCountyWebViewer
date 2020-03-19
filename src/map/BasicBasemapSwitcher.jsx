import React, { Component } from "react";
import "./BasemapSwitcher.css";
import * as helpers from "../helpers/helpers";
import BasemapConfig from "./basemapSwitcherConfig.json";
import { Group as LayerGroup } from "ol/layer.js";
import xml2js from "xml2js";

class BasemapSwitcher extends Component {
  constructor(props) {
    super(props);

    this.state = {
      streetsLayer: null,
      streetsCheckbox: true,
      containerCollapsed: false,
      topoPanelOpen: false,
      topoLayers: [],
      topoActiveIndex: 0,
      topoCheckbox: true,
      topoOverlayLayers: [],
      activeButton: "topo"
    };

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());
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

    this.setState({ topoLayers: basemapList });
    this.setState({ topoActiveIndex: 0 });
    
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
          this.setState({ topoActiveIndex: index });
          this.setTopoLayerVisiblity(index);
        }
      }
    }
  };

  onStreetsCheckbox = evt => {
    this.state.streetsLayer.setVisible(evt.target.checked);
    this.setState({ streetsCheckbox: evt.target.checked });
  };

  onTopoCheckbox = evt => {
    //this.state.streetsLayer.setVisible(evt.target.checked);
    this.setState({ topoCheckbox: evt.target.checked }, () => {
      this.enableTopo();
    });
  };

  onCollapsedClick = evt => {
    // HIDE OPEN PANELS
    if (this.state.containerCollapsed === false) {
      this.setState({ imageryPanelOpen: false });
      this.setState({ topoPanelOpen: false });
    }

    this.setState({ containerCollapsed: !this.state.containerCollapsed });
  };

  enableTopo = value => {
    this.setState({ activeButton: "topo" });
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
    this.setState({ topoActiveIndex: activeIndex });
    this.setTopoLayerVisiblity(activeIndex);
    this.setState({ topoPanelOpen: false });
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

  render() {
    // STYLE USED BY SLIDER
    const sliderWrapperStyle = {
      width: 60,
      marginLeft: 13,
      height: 225,
      marginTop: 8,
      marginBottom: 15
    };

    return (
      <div>
        <div id="sc-basemap-main-container">
          <div id="sc-basemap-collapse-button" className={this.state.containerCollapsed ? "sc-basemap-collapse-button closed" : "sc-basemap-collapse-button"} onClick={this.onCollapsedClick} />
          <div className={this.state.containerCollapsed ? "sc-hidden" : "sc-basemap-topo"}>
            <button className={this.state.activeButton === "topo" ? "sc-button sc-basemap-topo-button active" : "sc-button sc-basemap-topo-button"} onClick={this.onTopoButtonClick}>
              Basemap
            </button>
            <button className="sc-button sc-basemap-arrow" onClick={this.onTopoArrowClick}></button>
          </div>
        </div>
        <div id="sc-basemap-imagery-slider-container" className={this.state.imageryPanelOpen ? "sc-basemap-imagery-slider-container" : "sc-hidden"}>
          <label className="sc-basemap-streets-label">
            <input className="sc-basemap-streets-checkbox" id="sc-basemap-streets-checkbox" type="checkbox" onChange={this.onStreetsCheckbox} checked={this.state.streetsCheckbox}></input>&nbsp;Streets
          </label>          
        </div>
        <div className={this.state.topoPanelOpen ? "sc-basemap-topo-container" : "sc-hidden"}>
          <label className="sc-basemap-topo-label">
            <input className="sc-basemap-topo-checkbox" id="sc-basemap-topo-checkbox" type="checkbox" onChange={this.onTopoCheckbox} checked={this.state.topoCheckbox}></input>&nbsp;Overlay
          </label>
          {BasemapConfig.topoServices.map((service, index) => (
            <BasemapItem key={helpers.getUID()} index={index} topoActiveIndex={this.state.topoActiveIndex} service={service} onTopoItemClick={this.onTopoItemClick} />
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
    return (
      <div
        className={this.props.topoActiveIndex === this.props.index ? "sc-basemap-topo-item-container active" : "sc-basemap-topo-item-container"}
        onClick={() => {
          this.props.onTopoItemClick(this.props.index);
        }}
      >
        {this.props.service.name}
        <img className="sc-basemap-topo-image" src={images[this.props.service.image]} alt={this.props.service.image}></img>
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