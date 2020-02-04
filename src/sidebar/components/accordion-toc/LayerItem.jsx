import React, { Component } from "react";
import * as helpers from "../../../helpers/helpers";
import * as TOCHelpers from "../common/TOCHelpers.jsx";
import Highlighter from "react-highlight-words";
import { AutoSizer } from "react-virtualized";
import "./LayerItem.css";
class LayerItem extends Component {
  constructor(props) {
    super(props);

    this.state = {
      layer:undefined
    };
  }

  componentWillMount(){
    let layer = this.state.layer;
    if (layer === undefined){
      layer = this.props.layerInfo
      this.setState(
        {
          layer: layer
        });
    }else{
      if (layer !== this.props.layerInfo) this.setState({layer: this.props.layerInfo });
    }
  }

  componentWillReceiveProps(nextProps) {
    let layer = this.state.layer;
    if (layer === undefined){
      layer = nextProps.layerInfo
      this.setState(
        {
          layer: layer
        });
    }else{
      if (layer !== nextProps.layerInfo) this.setState({layer: nextProps.layerInfo });
    }
  }
  
  render() {
    return (
    <div>
      <div className={this.state.layer.visible ? "sc-toc-item-container on" : "sc-toc-item-container"}>
        <div className="sc-toc-item-plus-minus-container" onClick={() => this.props.onLegendToggle(this.state.layer)}>
          <img src={this.state.layer.showLegend ? images["minus.png"] : images["plus.png"]} alt="minus" />
          <div className="sc-toc-item-plus-minus-sign" />
          <div className="sc-toc-item-lines-expanded" />
        </div>
        <div className="sc-toc-item-checkbox">
          <input id="sc-toc-item-checkbox" key={helpers.getUID()} type="checkbox" onChange={() => this.props.onCheckboxChange(this.state.layer)} checked={this.state.layer.visible} />
        </div>
        <Highlighter
          className="sc-toc-item-layer-label"
          highlightClassName="sc-search-toc-highlight-words"
          searchWords={[this.props.searchText]}
          textToHighlight={this.state.layer.displayName}
        />
        <div
          className={this.state.layer.liveLayer === null || !this.state.layer.liveLayer ? "sc-hidden" : "sc-toc-item-layer-info-live-layer"}
          title="This layer is Interactable in the map."
        >
          <img src={images["callout.png"]}></img>
        </div>
      </div>
      <div className="sc-toc-item-toolbox" title="Layer Options" onClick={evt => this.props.onLayerOptionsClick(evt,this.state.layer)}>
        <img src={images["more-options.png"]} />
      </div>
      <div className={this.state.layer.showLegend ? "sc-toc-layer-info-container" : "sc-hidden"}>
      <div className="sc-toc-item-layer-info-container-open-vertical-lines" />
      <div className="sc-toc-item-layer-info-container-open-horizontal-lines" />
      <div className="sc-toc-item-layer-info-legend">
        <div className="sc-toc-item-layer-info-border" />
        <img src={this.state.layer.legendImage} alt="style" />
      </div>
    </div>
    </div>
    );
  }
}

export default LayerItem;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
