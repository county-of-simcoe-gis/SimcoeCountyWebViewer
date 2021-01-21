// REACT
import React, { Component } from "react";

// CUSTOM
import "./Layers.css";
import * as helpers from "../../../../helpers/helpers";
import LayerItem from "../toc-folder-view/LayerItem.jsx";

class Layers extends Component {
  constructor(props) {
    super(props);
    this.storageKey = "Layers_Folder_View";
    this.lastPosition = null;
    this._isMounted = false;

    this.state = {
      list: undefined,
      isLoading: false,
    };
  }

  getVirtualId() {
    return "sc-toc-virtual-layers" + helpers.getHash(this.props.group.value);
  }

  componentDidMount() {
    this._isMounted = true;
    window.emitter.addListener("activeTocLayer", (layerItem) => this.onActivateLayer(layerItem));
  }
  componentWillUnmount() {
    this._isMounted = false;
  }

  onActivateLayer = (layerItem) => {
    if (!this.props.visible) return;
    const elementId = layerItem.fullName + "_" + layerItem.layerGroup + "_folderview";
    this.props.group.layers.forEach((layer) => {
      if (layer.name === layerItem.fullName && layer.group === layerItem.layerGroup) {
        //layer.layer.setVisible(true);
        //layer.visible = true;
        //this.props.onLayerChange(layer, this.props.group);

        document.getElementById(this.getVirtualId()).scrollTop = 0;

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
              }
            }, i * 100);
          })(i);
        }
      }
    });

  };

  // REFRESH IF PROPS FROM PARENT HAVE CHANGED - GROUPS DROP DOWN CHANGE.
  componentWillReceiveProps(nextProps) {

  }

  
  render() {
    if (this.props.group.layers === undefined) return <div />;

    // FILTER LAYERS FROM SEARCH INPUT
    const layers = this.props.group.layers.filter((layer) => {
      if (this.props.searchText === "") return true;
      return [layer.displayName.toUpperCase(), layer.groupName.toUpperCase()].join(" ").indexOf(this.props.searchText.toUpperCase()) !== -1;
    });

    return (
      <div className="sc-toc-layer-container" key={helpers.getUID()}>
        <div id={this.getVirtualId()}>
          {layers.map((layer) => (
            <LayerItem
              virtualId={this.getVirtualId()}
              key={helpers.getUID()}
              layer={layer}
              onLayerChange={this.props.onLayerChange}
              searchText={this.props.searchText}
              group={this.props.group}
              onLegendToggle={this.props.onLegendToggle}
              onSliderChange={this.props.onSliderChange}
              tocVisible={this.props.tocVisible}
              onLayerOptionsClick={this.props.onLayerOptionsClick}
            />
          ))}
        </div>
        
      </div>
    );
  }
}

export default Layers;
