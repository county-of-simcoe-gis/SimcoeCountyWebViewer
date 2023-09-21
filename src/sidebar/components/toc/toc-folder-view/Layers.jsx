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

    this.state = {};
  }

  getVirtualId() {
    return "sc-toc-simcoe-folder-view-container-main";
  }

  componentDidMount() {
    this._isMounted = true;
    window.emitter.addListener("activeTocLayer", (layerItem) => this.onActivateLayer(layerItem));
  }
  componentWillUnmount() {
    this._isMounted = false;
  }

  onActivateLayer = (layerItem) => {
    if (!this.props.tocVisible) return;
    const foundLayer = this.props.group.layers.filter((layer) => {
      return layer.name === layerItem.fullName && layer.group === layerItem.layerGroup;
    });
    if (foundLayer.length > 0) {
      const elementId = `${this.props.id}-${helpers.getHash(layerItem.fullName)}_folderview`;

      setTimeout(() => {
        const elem = document.getElementById(elementId);
        if (elem) elem.scrollIntoView();
      }, 300);
    }
  };

  render() {
    if (this.props.group.layers === undefined) return <div />;

    // FILTER LAYERS FROM SEARCH INPUT
    const layers = this.props.group.layers.filter((layer) => {
      if (this.props.searchText === "") return true;
      return [layer.tocDisplayName.toUpperCase(), layer.groupName.toUpperCase()].join(" ").indexOf(this.props.searchText.toUpperCase()) !== -1;
    });

    return (
      <div className="sc-toc-layer-container" key={this.props.id + "-sc-toc-layer-container"}>
        <div id={this.props.id + "-container"}>
          {layers.map((layer) => (
            <LayerItem
              key={this.props.id + "-" + helpers.getHash(layer.name)}
              id={this.props.id + "-" + helpers.getHash(layer.name)}
              //virtualId={this.getVirtualId()}
              //key={helpers.getUID()}
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
