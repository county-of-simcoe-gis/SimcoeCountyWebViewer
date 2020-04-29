// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import Slider, { createSliderWithTooltip } from "rc-slider";
import { sortableContainer, sortableElement } from "react-sortable-hoc";
import { AutoSizer } from "react-virtualized";
import VirtualLayers from "./VirtualLayers.jsx";
import arrayMove from "array-move";
import GeoJSON from "ol/format/GeoJSON.js";

// CUSTOM
import "./Layers.css";
import * as helpers from "../../../helpers/helpers";
import * as TOCHelpers from "../common/TOCHelpers.jsx";
import TOCConfig from "../common/TOCConfig.json";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../../../helpers/Portal.jsx";


const SortableVirtualList = sortableContainer(VirtualLayers, { withRef: true });

class Layers extends Component {
  
  constructor(props) {
    super(props);

    this.storageKey = "layers";
    this.lastPosition = null;
    this._isMounted = false;
    this.state = {
      layers: [],
      forceAllLegend: undefined
    };

  }

  resetLayersListener(group) {if (group === this.props.group.value || group === null) this.resetLayers();}
  turnOffLayersListener(group) {if (group === this.props.group.value || group === null) this.turnOffLayers(); }
  turnOnLayersListener(group) {if (group === this.props.group.value || group === null) this.turnOnLayers(); }
  activeTocLayerListener(layerItem) {if (layerItem.layerGroup === this.props.group.value) this.onActivateLayer(layerItem); }
  
  getVirtualId()  {
    return "sc-toc-virtual-layers" + this.props.group.value;
  }

  componentDidMount() {
    this._isMounted = true;

    window.emitter.addListener("resetLayers",group => this.resetLayersListener(group));
    // LISTEN FOR TURN OFF LAYERS
    window.emitter.addListener("turnOffLayers", group =>this.turnOffLayersListener(group));
    // LISTEN FOR TURN ON LAYERS
    window.emitter.addListener("turnOnLayers",group =>this.turnOnLayersListener(group) );
    // LISTEN FOR TOGGLE ALL LEGEND
    window.emitter.addListener("toggleAllLegend",type => this.toggleAllLegends(type));
    // LISTEN FOR SEARCH RESULT
    window.emitter.addListener("activeTocLayer", layerItem => this.activeTocLayerListener(layerItem));
    
    
    if (this._isMounted) {
      if ( this.state.layers.length === 0){
        this.setState({ layers: this.props.group.layers }, () => {});
      }
      this.forceUpdate();
    }
  }
  componentWillUnmount() {

    this._isMounted = false;
  }
  onActivateLayer = layerItem => {
    let layersCopy = Object.assign([], this.state.layers);

    layersCopy.forEach(layer => {
      if (layer.name === layerItem.fullName || layer.name === layerItem.name) {
        layer.visible = true;
        layer.layer.setVisible(true);
        
        document.getElementById(this.getVirtualId()).scrollTop = 0;

        var i = 0;
        var elemFound = false;
        for (var i = 1; i <= 100; i++) {
          if (elemFound) return;
          // eslint-disable-next-line
          (index => {
            setTimeout(() => {
              if (elemFound) return;

              const elem = document.getElementById(layer.elementId);
              
              if (elem !== null) {
                elemFound = true;
                elem.scrollIntoView();
              } 
            }, i * 100);
          })(i);
        }
      }
    });
  };

  resetLayers = () => {
    // SHUT OFF VISIBILITY
    for (var key in this.state.layers) {
      if (this.state.layers.hasOwnProperty(key)){
        var obj = this.state.layers[key];
        obj.layer.setVisible(false);
      }
    }

    if(this._isMounted) this.setState({ layers: this.props.group.layers }, () => {
      this.sortLayers(this.state.layers,  this.props.sortAlpha);
    });
   
  };

  refreshLayers = (group, sortAlpha) => {
    if(!this._isMounted) return;
    let layers = [];
    layers = this.state.layers;

    if (layers === undefined) {
      layers = group.layers;
      this.setState({ layers: layers }, () => {
          this.sortLayers(this.state.layers, sortAlpha);
        });
        return;
    }else{
      this.setState({ layers: layers }, () => {
        this.sortLayers(this.state.layers, sortAlpha);
      });
      return;
    }
  };

  // isVisibleFromConfig()
  sortByAlphaCompare(a, b) {
    if (a.displayName < b.displayName) {
      return -1;
    }
    if (a.displayName > b.displayName) {
      return 1;
    }
    return 0;
  }

  sortByIndexCompare(a, b) {
    if (a.drawIndex > b.drawIndex) {
      return -1;
    }
    if (a.drawIndex < b.drawIndex) {
      return 1;
    }
    return 0;
  }

  getItemsFromStorage() {
    const storage = localStorage.getItem(this.storageKey);
    if (storage === null) return [];

    const data = JSON.parse(storage);
    return data;
  }

  sortLayers = (layers, sortAlpha, callback = undefined) => {
    let newLayers = Object.assign([{}], layers);
    if (sortAlpha) newLayers.sort(this.sortByAlphaCompare);
    else newLayers.sort(this.sortByIndexCompare);
    this.setState({ layers: newLayers  }, () => {
      
      if (callback !== undefined) callback();
    });
  };

  // REFRESH IF PROPS FROM PARENT HAVE CHANGED - GROUPS DROP DOWN CHANGE.
  componentWillReceiveProps(nextProps) {
    if(!this._isMounted) return;
    const nextLayers = nextProps.group.layers;
    if (nextProps.sortAlpha !== this.props.sortAlpha) {
      this.sortLayers(this.state.layers, nextProps.sortAlpha);
    }
    
    if (nextProps.group.value !== this.props.group.value) {
      const layers = nextProps.group.layers;
      if (layers !== undefined) {
        // DISABLE LAYER VISIBILITY FROM PREVIOUS GROUP
        TOCHelpers.disableLayersVisiblity(layers, newLayers => {
            if (nextLayers !== undefined) {
              TOCHelpers.enableLayersVisiblity(nextLayers, newLayers => {
                 this.setState({ layers: newLayers }, () => {
                  this.refreshLayers(nextProps.group, nextProps.sortAlpha);
                });
              });
            } else {
              this.refreshLayers(nextProps.group, nextProps.sortAlpha);
            }
          });
      
      } else this.refreshLayers(nextProps.group, nextProps.sortAlpha);
    }
  }

  registerListRef = listInstance => {
    this.List = listInstance;
  };

  // FIRES AFTER SORTING
  onSortEnd = ({ oldIndex, newIndex, collection }, e) => {
    if (oldIndex === newIndex) {
      return;
    }

    let { layers } = this.state;
    this.setState(
      {
        layers: arrayMove(layers, oldIndex, newIndex)
      },
      () => {
        TOCHelpers.updateLayerIndex(this.state.layers, newLayers => {
          
          this.setState({ layers: newLayers });
        });
      }
    );

    document.getElementById(this.getVirtualId()).scrollTop += this.lastPosition;
  };

  // TRACK CURSOR SO I CAN RETURN IT TO SAME LOCATION AFTER ACTIONS
  onSortMove = e => {
    this.lastPosition = document.getElementById(this.getVirtualId()).scrollTop;
  };

    // LEGEND FOR EACH LAYER
    onLegendToggle = layerInfo => {
      this.legendVisiblity(layerInfo);
      
    };
  // TOGGLE LEGEND
  legendVisiblity = (layerInfo, forceAll) => {
    this.lastPosition = document.getElementById(this.getVirtualId()).scrollTop;

    let showLegend = !layerInfo.showLegend;
    if (forceAll !== undefined) {
      if (forceAll === "OPEN") showLegend = true;
      else if (forceAll === "CLOSE") showLegend = false;
    }

    if (layerInfo.legendImage === null) {
      //const legendOptionsTemplate = (scale) => {"&SCALE=$(scale)&LEGEND_OPTIONS=forceLabels:on;hideEmptyRules:true;"};
      TOCHelpers.getBase64FromImageUrl(layerInfo.styleUrl, (height, imgData) => {
        const rowHeight = showLegend ? (height += 36) : 30;
        this.setState(
          {
            // UPDATE LEGEND
            layers: this.state.layers.map(layer =>
              layer.name === layerInfo.name ? Object.assign({}, layer, { showLegend: showLegend, height: rowHeight, legendHeight: height, legendImage: imgData }) : layer
            )
          },
          () => {
            document.getElementById(this.getVirtualId()).scrollTop += this.lastPosition;
          
          }
        );
      });
    } else {
      const rowHeight = showLegend ? layerInfo.legendHeight : 30;
      this.setState(
        {
          // UPDATE LEGEND
          layers: this.state.layers.map(layer => (layer.name === layerInfo.name ? Object.assign({}, layer, { showLegend: showLegend, height: rowHeight }) : layer))
        },
        () => {
          document.getElementById(this.getVirtualId()).scrollTop += this.lastPosition;
          
         
        }
      );
    }
  };

  // CHECKBOX FOR EACH LAYER
  onCheckboxChange = layerInfo => {
    const visible = !layerInfo.visible;
    layerInfo.layer.setVisible(visible);
    this.props.onLayerChange();
    //window.emitter.emit("updateActiveTocLayers",  this.props.group.value);
    layerInfo.visible = visible;
    this.setState(
      {
        // UPDATE LEGEND
        layers: this.state.layers.map(layer => (layer.name === layerInfo.name ? Object.assign({}, layer, { visible: visible }) : layer))
      },
      () => { 
        
      }
    );
    
  };

  // OPACITY SLIDER FOR EACH LAYER
  onSliderChange = (opacity, layerInfo) => {
    layerInfo.layer.setOpacity(opacity);

    this.setState(
      {
        // UPDATE LEGEND
        layers: this.state.layers.map(layer => (layer.name === layerInfo.name ? Object.assign({}, layer, { opacity: opacity }) : layer))
      },
      () => {
        
      }
    );
  };

  // ELLIPSIS/OPTIONS BUTTON
  onLayerOptionsClick = (evt, layerInfo) => {
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu
          key={helpers.getUID()}
          buttonEvent={evtClone}
          autoY={true}
          item={this.props.info}
          onMenuItemClick={action => this.onMenuItemClick(action, layerInfo)}
          styleMode={helpers.isMobile() ? "left" : "right"}
        >
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-metadata">
            <FloatingMenuItem imageName={"metadata.png"} label="Metadata" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-zoom-to-layer">
            <FloatingMenuItem imageName={"zoom-in.png"} label="Zoom to Layer" />
          </MenuItem>
          <MenuItem className="sc-layers-slider" key="sc-floating-menu-opacity">
            Adjust Transparency
            <SliderWithTooltip tipFormatter={this.sliderTipFormatter} max={1} min={0} step={0.05} defaultValue={layerInfo.opacity} onChange={evt => this.onSliderChange(evt, layerInfo)} />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  onMenuItemClick = (action, layerInfo) => {
    if (action === "sc-floating-menu-metadata") {
      TOCHelpers.getLayerInfo(layerInfo, result => {
        if (helpers.isMobile()) {
          window.emitter.emit("setSidebarVisiblity", "CLOSE");
          helpers.showURLWindow(TOCConfig.layerInfoURL + result.featureType.fullUrl, false, "full");
        } else helpers.showURLWindow(TOCConfig.layerInfoURL + result.featureType.fullUrl);
      });
    } else if (action === "sc-floating-menu-zoom-to-layer") {
      TOCHelpers.getLayerInfo(layerInfo, result => {
        const boundingBox = result.featureType.nativeBoundingBox;
        const extent = [boundingBox.minx, boundingBox.miny, boundingBox.maxx, boundingBox.maxy];
        window.map.getView().fit(extent, window.map.getSize(), { duration: 1000 });
      });
    } 

    helpers.addAppStat("Layer Options", action);
  };

  toggleAllLegends (type ) {
    let showLegend = true;
    if (type === "CLOSE") showLegend = false;

    for (let index = 0; index < this.state.layers.length; index++) {
      const layer = this.state.layers[index];
      let newLayer = Object.assign({}, layer);
      newLayer.showLegend = showLegend;
      setTimeout(() => {
        this.legendVisiblity(newLayer, type);
      }, 30);
    }
  };

  turnOnLayers = () => {
    if(!this._isMounted) return;
    TOCHelpers.turnOnLayers(this.state.layers, newLayers => {
      this.setState({ layers: newLayers}, () => {
        this.props.onLayerChange();
      });
    });
  };

  turnOffLayers = () => {
    if(!this._isMounted) return;
    TOCHelpers.turnOffLayers(this.state.layers, newLayers => {
       this.setState({ layers: newLayers}, () => {
        this.props.onLayerChange();
      });
    });
  };

  render() {
    if (this.state.layers === undefined) return <div />;
    
    // FILTER LAYERS FROM SEARCH INPUT
    const layers = this.state.layers.filter(layer => {
      if (this.props.searchText === "") return layer;

      if (layer.displayName.toUpperCase().indexOf(this.props.searchText.toUpperCase()) !== -1){
        
        return layer;
      } 
    });

    return (
     
      <div className="sc-toc-layer-container" key={helpers.getUID()}>
        <div>  
              <SortableVirtualList
                key={helpers.getUID()}
                virtual_key={this.getVirtualId()}
                getRef={this.registerListRef}
                ref={instance => {
                  this.SortableVirtualList = instance;
                }}
                items={layers}
                onSortEnd={this.onSortEnd}
                helperClass={"sc-layer-list-sortable-helper"}
                rowHeight={30}
                
                lockAxis={"y"}
                onSortMove={this.onSortMove}
                distance={5}
                onLegendToggle={this.onLegendToggle}
                onCheckboxChange={this.onCheckboxChange}
                searchText={this.props.searchText}
                onLayerOptionsClick={this.onLayerOptionsClick}
                sortAlpha={this.props.sortAlpha}
                //scrollToIndex={50}
              />
        </div>
      </div>
    );
  }
}

export default Layers;

// SLIDER
const SliderWithTooltip = createSliderWithTooltip(Slider);
