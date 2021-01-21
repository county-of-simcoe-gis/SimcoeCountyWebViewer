// REACT
import React, { Component } from "react";
import { sortableContainer } from "react-sortable-hoc";
import { AutoSizer } from "react-virtualized";
import VirtualLayers from "./VirtualLayers.jsx";

// CUSTOM
import "./Layers.css";
import * as helpers from "../../../../helpers/helpers";


const SortableVirtualList = sortableContainer(VirtualLayers, { withRef: true});

class Layers extends Component {
  constructor(props) {
    super(props);
    this.storageKey = "Layers";
    this.lastPosition = null;
    this.virtualId = "sc-toc-virtual-layers";
    this.state = {
      //allLayers: {},
      //layers: [],
    };

    // LISTEN FOR MAP TO MOUNT
    //window.emitter.addListener("mapLoaded", () => {if (this.props.visible) this.onMapLoad();});

    // LISTEN FOR SEARCH RESULT
    window.emitter.addListener("activeTocLayer", (layerItem) => {if (this.props.visible) this.onActivateLayer(layerItem);});
  }

  onActivateLayer = (layerItem) => {
    if (!this.props.visible) return;
    const elementId = layerItem.fullName + "_" + layerItem.layerGroup + "_listview";
    
    this.props.group.layers.forEach((layer) => {
      if (layer.name === layerItem.fullName) {
        //layer.visible = true;
        //layer.layer.setVisible(true);

        document.getElementById(this.virtualId).scrollTop = 0;

        var i = 0;
        var elemFound = false;
        for (i = 1; i <= 100; i++) {
          if (elemFound) return;
          // eslint-disable-next-line
          ((index) => {
            setTimeout(() => {
              if (elemFound) return;

              const elem = document.getElementById(elementId);
              if (elem !== null) {
                elemFound = true;
                elem.scrollIntoView();
                return;
              } else {
                document.getElementById(this.virtualId).scrollTop += i * 5;
              }
            }, i * 100);
          })(i);
        }
      }
    });
  };

  registerListRef = (listInstance) => {
    this.List = listInstance;
  };

  render() {
    if (this.props.group.layers === undefined) return <div />;

    // FILTER LAYERS FROM SEARCH INPUT
    // eslint-disable-next-line
    const layers = this.props.group.layers.filter((layer) => {
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
                ref={(instance) => {
                  this.SortableVirtualList = instance;
                }}
                items={layers}
                sortAlpha={this.props.sortAlpha}
                onSortMove={this.props.onSortMove}
                onSortEnd={this.props.onSortEnd}
                helperClass={"sc-layer-list-sortable-helper"}
                rowHeight={height}
                height={height}
                lockAxis={"y"}
                distance={5}
                group={this.props.group}
                onLegendToggle={this.props.onLegendToggle}
                onCheckboxChange={this.props.onCheckboxChange}
                searchText={this.props.searchText}
                onLayerOptionsClick={this.props.onLayerOptionsClick}
                onLayerChange={this.props.onLayerChange}
                
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

