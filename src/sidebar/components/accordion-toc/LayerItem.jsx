import React, { Component } from "react";
import * as helpers from "../../../helpers/helpers";
//import * as TOCHelpers from "../common/TOCHelpers.jsx";
import Highlighter from "react-highlight-words";

import "./LayerItem.css";
class LayerItem extends Component {
  
  constructor(props) {
    super(props);

    this.state = {
      layer:undefined
    };
    this.isVisibleAtScale = true;
    this._isMounted = false;
  }


  setVisibleScale = () => {
    const { layerInfo } = this.props;
    const scale = helpers.getMapScale();
    let isVisibleAtScale = true;
    let minScale = 0;
    let maxScale = 100000000000;
    if (layerInfo.minScale !== undefined) minScale = layerInfo.minScale[0];
    if (layerInfo.maxScale !== undefined) maxScale = layerInfo.maxScale[0];
    if (scale <= minScale || scale >= maxScale) isVisibleAtScale = false;
    this.isVisibleAtScale = isVisibleAtScale;
  };

  componentWillMount(){
    this.setVisibleScale();
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
  componentDidMount() {
    this._isMounted = true;
    window.map.on("moveend", () => {
      this.setVisibleScale();
      if (this._isMounted) this.forceUpdate();
    });
  }

  componentWillUnmount() {
    this._isMounted = false;
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
    let containerClassName = "sc-toc-item-container";
    if (!this.isVisibleAtScale) containerClassName += " not-in-scale";
    if (this.state.layer.visible) containerClassName += " on";

    return (
    <div>
      <div className={containerClassName}>
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
          onClick={() => this.props.onCheckboxChange(this.state.layer)}
        />
        
      </div>
      <div className="sc-toc-item-toolbox" title="Layer Options" onClick={evt => this.props.onLayerOptionsClick(evt,this.state.layer)}>
        <img src={images["more-options.png"]} alt="More Options" />
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
