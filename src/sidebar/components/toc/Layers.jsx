// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import Slider, { createSliderWithTooltip } from "rc-slider";
import { sortableContainer, sortableElement } from "react-sortable-hoc";
import { List, AutoSizer } from "react-virtualized";
import VirtualLayers from "./VirtualLayers.jsx";
import arrayMove from "array-move";
import GeoJSON from "ol/format/GeoJSON.js";

// CUSTOM
import "./Layers.css";
import * as helpers from "../../../helpers/helpers";
import * as TOCHelpers from "./TOCHelpers.jsx";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../../../helpers/Portal.jsx";
import TOCConfig from "./TOCConfig.json";

const SortableVirtualList = sortableContainer(VirtualLayers, { withRef: true });

class Layers extends Component {
  constructor(props) {
    super(props);

    this.storageKey = "layers";
    this.lastPosition = null;
    this.virtualId = "sc-toc-virtual-layers";
    this.state = {
      allLayers: {},
      layers: []
    };

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());

    // LISTEN FOR SEARCH RESULT
    window.emitter.addListener("activeTocLayer", layerItem => this.onActivateLayer(layerItem));
  }

  onActivateLayer = layerItem => {
    const groupName = layer => {return helpers.replaceAllInString(layer.layerGroup, " ", "_");}

    let layersCopy = Object.assign([], this.state.allLayers[groupName(layerItem)]);

    layersCopy.forEach(layer => {
      if (layer.name === layerItem.fullName) {
        layer.visible = true;
        layer.layer.setVisible(true);
        
        document.getElementById(this.virtualId).scrollTop = 0;

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
                const topPos = elem.offsetTop;
                document.getElementById(this.virtualId).scrollTop = topPos + 1;
                setTimeout(() => {
                  document.getElementById(this.virtualId).scrollTop = topPos;
                }, 50);
              } else {
                document.getElementById(this.virtualId).scrollTop += i * 10;
              }
            }, i * 100);
          })(i);
        }
      }
    });
  };

  componentWillUpdate() {
    if (this.state.layers !== undefined) window.emitter.emit("layersLoaded", this.state.layers.length);
  }

  onMapLoad = () => {
    window.map.on("singleclick", evt => {
      const viewResolution = window.map.getView().getResolution();
      this.state.layers.forEach(layer => {
        if (layer.visible && layer.liveLayer) {
          var url = layer.layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", { INFO_FORMAT: "application/json" });
          if (url) {
            helpers.getJSON(url, result => {
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

  resetLayers = () => {
    // SHUT OFF VISIBILITY
    for (var key in this.state.allLayers) {
      if (!this.state.allLayers.hasOwnProperty(key)) continue;

      var obj = this.state.allLayers[key];
      obj.forEach(layer => {
        layer.layer.setVisible(false);
      });
    }

    this.setState({ layers: undefined, allLayers: [] }, () => {
      this.refreshLayers(this.props.group, this.props.sortAlpha,this.props.allGroups);
    });
  };

  refreshLayers = (group, sortAlpha, allGroups) => {
    let layers = [];
    layers = this.state.allLayers[group.value];

    if (layers === undefined) {
      layers = group.layers;
    if (layers !== undefined) {
        let allLayers = this.state.allLayers;
        allLayers[group.value] = layers;
        
        // FETCH THE REST OF THE GROUPS
        const fetchGroups = (allGroups) => {
            allGroups.forEach(groupItem => {
            if (group.value !== groupItem.value) {
              let layersItems = this.state.allLayers[groupItem.value];
              if (layersItems === undefined) {
                layersItems = groupItem.layers;
                if (layersItems !== undefined) {
                  let allLayers = this.state.allLayers;
                  allLayers[groupItem.value] = layersItems;
                }
              }
            }
          });
        }
        fetchGroups(allGroups);
        this.setState({ layers: layers, allLayers: allLayers }, () => {
          this.sortLayers(this.state.layers, sortAlpha);
        });
        return;
      }
    }else{
      this.setState({ layers: layers }, () => {
        this.sortLayers(this.state.layers, sortAlpha);
      });
      return;
    }

    TOCHelpers.getBasicLayers(group, layers => {
      let allLayers = this.state.allLayers;
      allLayers[group.value] = layers;

      this.setState({ layers: layers, allLayers: allLayers }, () => {
        this.sortLayers(this.state.layers, sortAlpha);

        const fetchGroups = (allGroups) =>{ // FETCH THE REST OF THE GROUPS
          allGroups.forEach(groupItem => {
          const layersItem = this.state.allLayers[groupItem.value];

          if (layersItem === undefined) {
            TOCHelpers.getBasicLayers(groupItem, layers => {
              let allLayers = this.state.allLayers;
              allLayers[groupItem.value] = layers;
              this.setState({ allLayers: allLayers });
            });
          }
        });
        };
        fetchGroups(allGroups);
      });
    });
    
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

    let allLayers = this.state.allLayers;
    allLayers[this.props.group.value] = newLayers;

    this.setState({ layers: newLayers, allLayers: allLayers }, () => {
      window.allLayers = this.state.allLayers;
      if (callback !== undefined) callback();
    });
  };

  // REFRESH IF PROPS FROM PARENT HAVE CHANGED - GROUPS DROP DOWN CHANGE.
  componentWillReceiveProps(nextProps) {
    let allGroups = [];
    let allLayers = this.state.allLayers;
    const nextLayers = allLayers[nextProps.group.value];
    if (nextProps.sortAlpha !== this.props.sortAlpha) {
      this.sortLayers(this.state.layers, nextProps.sortAlpha);
    }

    if (nextProps.group.value !== this.props.group.value) {
      const layers = this.state.allLayers[this.props.group.value];
      if (layers !== undefined) {
        // DISABLE LAYER VISIBILITY FROM PREVIOUS GROUP
        TOCHelpers.disableLayersVisiblity(layers, newLayers => {
          
          allLayers[this.props.group.value] = newLayers;
          this.setState({ allLayers: allLayers }, () => {
            // ENABLE LAYER VISIBILITY FROM PREVIOUS GROUP
           
            if (nextLayers !== undefined) {
              TOCHelpers.enableLayersVisiblity(nextLayers, newLayers => {
                let allLayers = this.state.allLayers;
                allLayers[nextProps.group.value] = newLayers;
                this.setState({ layers: newLayers, allLayers: allLayers, allGroups:allGroups }, () => {
                  this.refreshLayers(nextProps.group, nextProps.sortAlpha,nextProps.allGroups);
                });
              });
            } else {
              this.refreshLayers(nextProps.group, nextProps.sortAlpha,nextProps.allGroups);
            }
          });
        });
      } else this.refreshLayers(nextProps.group, nextProps.sortAlpha,nextProps.allGroups);
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
          let allLayers = this.state.allLayers;
          allLayers[this.props.group.value] = newLayers;
          this.setState({ layers: newLayers, allLayers: allLayers });
        });
      }
    );

    document.getElementById(this.virtualId).scrollTop += this.lastPosition;
  };

  // TRACK CURSOR SO I CAN RETURN IT TO SAME LOCATION AFTER ACTIONS
  onSortMove = e => {
    this.lastPosition = document.getElementById(this.virtualId).scrollTop;
  };

  // LEGEND FOR EACH LAYER
  onLegendToggle = layerInfo => {
    this.legendVisiblity(layerInfo);
  };

  // TOGGLE LEGEND
  legendVisiblity = (layerInfo, forceAll) => {
    this.lastPosition = document.getElementById(this.virtualId).scrollTop;

    let showLegend = !layerInfo.showLegend;
    if (forceAll !== undefined) {
      if (forceAll === "OPEN") showLegend = true;
      else if (forceAll === "CLOSE") showLegend = false;
    }

    if (layerInfo.legendImage === null) {
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
            document.getElementById(this.virtualId).scrollTop += this.lastPosition;
            let allLayers = this.state.allLayers;
            allLayers[this.props.group.value] = this.state.layers;
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
          document.getElementById(this.virtualId).scrollTop += this.lastPosition;
          let allLayers = this.state.allLayers;
          allLayers[this.props.group.value] = this.state.layers;
        }
      );
    }
  };

  // CHECKBOX FOR EACH LAYER
  onCheckboxChange = layerInfo => {
    this.lastPosition = document.getElementById(this.virtualId).scrollTop;
    const visible = !layerInfo.visible;
    layerInfo.layer.setVisible(visible);
    layerInfo.visible = visible;
    this.setState(
      {
        // UPDATE LEGEND
        layers: this.state.layers.map(layer => (layer.name === layerInfo.name ? Object.assign({}, layer, { visible: visible }) : layer))
      },
      () => {
        document.getElementById(this.virtualId).scrollTop += this.lastPosition;
        let allLayers = this.state.allLayers;
        allLayers[this.props.group.value] = this.state.layers;
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
        let allLayers = this.state.allLayers;
        allLayers[this.props.group.value] = this.state.layers;
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
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-download">
            <FloatingMenuItem imageName={"download.png"} label="Download" />
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
    } else if (action === "sc-floating-menu-download") {
      helpers.showMessage("Download", "Coming Soon!");
      // TOCHelpers.getLayerInfo(layerInfo, result => {
      //   if (result.featureType.name === "Assessment Parcel") helpers.showMessage("Download", "Parcels are not available for download");
      //   else {
      //     if (helpers.isMobile()) {
      //       window.emitter.emit("setSidebarVisiblity", "CLOSE");
      //       helpers.showURLWindow(TOCConfig.layerDownloadURL + result.featureType.fullUrl, false, "full");
      //     } else helpers.showURLWindow(TOCConfig.layerDownloadURL + result.featureType.fullUrl);
      //   }
      // });
    }

    helpers.addAppStat("Layer Options", action);
  };

  toggleAllLegends = type => {
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

  saveLayerOptions = () => {
    // GATHER INFO TO SAVE
    let layers = {};
    for (var key in this.state.allLayers) {
      if (!this.state.allLayers.hasOwnProperty(key)) continue;

      var obj = this.state.allLayers[key];
      let savedLayers = {};
      obj.forEach(layer => {
        const saveLayer = {
          name: layer.name,
          visible: layer.visible
        };
        savedLayers[layer.name] = saveLayer;
      });

      layers[key] = savedLayers;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(layers));

    helpers.showMessage("Save", "Layer Visibility has been saved.");
  };

  turnOffLayers = () => {
    TOCHelpers.turnOffLayers(this.state.layers, newLayers => {
      let allLayers = this.state.allLayers;
      allLayers[this.props.group.value] = newLayers;
      this.setState({ layers: newLayers, allLayers: allLayers }, () => {});
    });
  };

  render() {
    if (this.state.layers === undefined) return <div />;

    // FILTER LAYERS FROM SEARCH INPUT
    const layers = this.state.layers.filter(layer => {
      if (this.props.searchText === "") return layer;

      if (layer.displayName.toUpperCase().indexOf(this.props.searchText.toUpperCase()) !== -1) return layer;
    });

    return (
      <div className="sc-toc-layer-container">
        <AutoSizer disableWidth>
          {({ height }) => {
            return (
              <SortableVirtualList
                key={helpers.getUID()}
                getRef={this.registerListRef}
                ref={instance => {
                  this.SortableVirtualList = instance;
                }}
                items={layers}
                onSortEnd={this.onSortEnd}
                helperClass={"sc-layer-list-sortable-helper"}
                rowHeight={height}
                height={height}
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
            );
          }}
        </AutoSizer>
      </div>
    );
  }
}

export default Layers;

// SLIDER
const SliderWithTooltip = createSliderWithTooltip(Slider);
