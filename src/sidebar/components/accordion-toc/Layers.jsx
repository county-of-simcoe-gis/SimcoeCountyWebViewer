// REACT
import React, { Component } from "react";
import { sortableContainer } from "react-sortable-hoc";
import VirtualLayers from "./VirtualLayers.jsx";
import arrayMove from "array-move";

// CUSTOM
import "./Layers.css";
import * as helpers from "../../../helpers/helpers";
import * as TOCHelpers from "../common/TOCHelpers.jsx";

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
  deactiveTocLayerListener(layerItem) {if (layerItem.layerGroup === this.props.group.value) this.onDeactivateLayer(layerItem); }
  toggleAllLegendsListener(group, type) {if (group === this.props.group.value || group === null) this.toggleAllLegends(type); }

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
    window.emitter.addListener("toggleLegend",(type, group) => this.toggleAllLegendsListener(group,type));
    // LISTEN FOR SEARCH RESULT
    window.emitter.addListener("activeTocLayer", layerItem => this.activeTocLayerListener(layerItem));
     // LISTEN FOR SEARCH RESULT
     window.emitter.addListener("deactiveTocLayer", layerItem => this.deactiveTocLayerListener(layerItem));
    
    
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
        for (i = 1; i <= 100; i++) {
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

  onDeactivateLayer = layerItem => {
    let layersCopy = Object.assign([], this.state.layers);

    layersCopy.forEach(layer => {
      if (layer.name === layerItem.fullName || layer.name === layerItem.name) {
        layer.visible = false;
        layer.layer.setVisible(false);
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
      this.legendVisiblity(layerInfo, undefined,(returnedLayer) =>{
        this.setState(
          {
            // UPDATE LEGEND
            layers: this.state.layers.map(layer =>
              layer.name === layerInfo.name ? returnedLayer : layer
            )
          },
          () => {
            document.getElementById(this.getVirtualId()).scrollTop += this.lastPosition;
          
          });
      });
      
    };
  // TOGGLE LEGEND
  legendVisiblity = (layerInfo, forceAll, callback) => {
    this.lastPosition = document.getElementById(this.getVirtualId()).scrollTop;
    if (layerInfo.styleUrl === "") return;
    let showLegend = !layerInfo.showLegend;
    if (forceAll !== undefined) {
      if (forceAll === "OPEN") showLegend = true;
      else if (forceAll === "CLOSE") showLegend = false;
    }

    if (layerInfo.legendImage === null) {
      TOCHelpers.getBase64FromImageUrl(layerInfo.styleUrl, (height, imgData) => {
        const rowHeight = showLegend ? (height += 36) : 30;
        callback(Object.assign({}, layerInfo, { showLegend: showLegend, height: rowHeight, legendHeight: height, legendImage: imgData }));
        
      });
    } else {
      const rowHeight = showLegend ? layerInfo.legendHeight : 30;
      callback(Object.assign({}, layerInfo, { showLegend: showLegend, height: rowHeight }));
    }
  };


  toggleAllLegends (type) {
    let newLayers = [];
    this.state.layers.forEach(layer => 
        this.legendVisiblity(layer, type, (returnedLayer)=>{newLayers.push(returnedLayer)}
      ));
    setTimeout(()=>{
    newLayers = newLayers.concat([]);
    this.setState(
      {
        // UPDATE LEGEND
        layers: this.state.layers.map(layer => newLayers.filter(newLayer => layer.name === newLayer.name)[0] )
      },
      () => {
        document.getElementById(this.getVirtualId()).scrollTop += this.lastPosition;
      }
    );},1000);
  };

  turnOnLayers = () => {
    if(!this._isMounted) return;
    TOCHelpers.turnOnLayers(this.state.layers, newLayers => {
      this.setState({ layers: newLayers}, () => {
        let group = this.props.group;
        group.layers = this.state.layers
        this.props.onGroupChange(group);
      });
    });
  };

  turnOffLayers = () => {
    if(!this._isMounted) return;
    TOCHelpers.turnOffLayers(this.state.layers, newLayers => {
       this.setState({ layers: newLayers}, () => {
        let group = this.props.group;
        group.layers = this.state.layers
        this.props.onGroupChange(group);
      });
    });
  };
  onLayerChange = (layer) =>{
    //update layers
    this.setState({layers: this.state.layers.map(item => item.name === layer.name ? layer : item)}, ()=>{
      //send layers up to group item
      let group = this.props.group;
      group.layers = this.state.layers
      this.props.onGroupChange(group);
    });
  }
  render() {
    if (this.state.layers === undefined) return <div />;
    
    // FILTER LAYERS FROM SEARCH INPUT
    const layers = this.state.layers.filter(layer => {
      if (this.props.searchText === "") return true;
      return ([layer.displayName.toUpperCase(),layer.groupName.toUpperCase()].join(" ").indexOf(this.props.searchText.toUpperCase()) !== -1 ); 
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
                onLayerChange={this.onLayerChange}
                searchText={this.props.searchText}
                sortAlpha={this.props.sortAlpha}
                //scrollToIndex={50}
              />
        </div>
      </div>
    );
  }
}

export default Layers;

