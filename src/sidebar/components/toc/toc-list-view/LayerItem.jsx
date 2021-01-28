import React, { Component } from "react";
import * as helpers from "../../../../helpers/helpers";
import Highlighter from "react-highlight-words";
import "./LayerItem.css";
class LayerItem extends Component {
  _isMounted = false;
  constructor(props) {
    super(props);

    this.state = {};

    this.isVisibleAtScale = true;
  }

  componentWillMount() {
    this.setVisibleScale();
  }

  componentDidMount() {
    this._isMounted = true;
    window.map.on("moveend", () => {
      this.setVisibleScale();
      if (this._isMounted) this.forceUpdate();
    });
  }

  setVisibleScale = () => {
    const { layerInfo } = this.props;

    //if (!layerInfo.visible) return;

    const scale = helpers.getMapScale();
    let isVisibleAtScale = true;
    let minScale = 0;
    let maxScale = 100000000000;
    if (layerInfo.minScale !== undefined) minScale = layerInfo.minScale;
    if (layerInfo.maxScale !== undefined) maxScale = layerInfo.maxScale;
    if (scale <= minScale || scale >= maxScale) isVisibleAtScale = false;
    this.isVisibleAtScale = isVisibleAtScale;
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  onCheckboxChange = (layer) => {
    layer.layer.setVisible(!layer.visible);
    layer.visible = !layer.visible;
    this.props.onLayerChange(layer, layer.group);
  };

  render() {
    //console.log("List View Layer Item Render");
    const { layerInfo } = this.props;
    let containerClassName = "sc-toc-item-container";
    if (!this.isVisibleAtScale) containerClassName = "sc-toc-item-container not-in-scale";
    else if (layerInfo.visible && this.isVisibleAtScale) containerClassName = "sc-toc-item-container on";

    return (
      <div id={layerInfo.name + "_" + layerInfo.group + "_listview"}>
        <div className={containerClassName}>
          <div className="sc-toc-item-plus-minus-container" onClick={() => this.props.onLegendToggle(layerInfo, this.props.group)}>
            <img src={layerInfo.showLegend ? images["minus.png"] : images["plus.png"]} alt={layerInfo.showLegend ? "minus" : "plus"} />
            <div className="sc-toc-item-plus-minus-sign" />
            <div className="sc-toc-item-lines-expanded" />
          </div>
          <label>
            <input id="sc-toc-item-checkbox" key={helpers.getUID()} type="checkbox" onChange={() => this.onCheckboxChange(this.props.layerInfo)} checked={layerInfo.visible} />
            <Highlighter className="sc-toc-item-layer-label" highlightClassName="sc-search-toc-highlight-words" searchWords={[this.props.searchText]} textToHighlight={layerInfo.tocDisplayName} />
          </label>

          <div
            className={layerInfo.liveLayer === null || !layerInfo.liveLayer ? "sc-hidden" : "sc-toc-item-layer-info-live-layer"}
            title="This layer is Interactable in the map."
          >
            <img src={images["callout.png"]} alt="callout" />
          </div>
          <div className={layerInfo.canDownload === null || !layerInfo.canDownload ? "sc-hidden" : "sc-toc-item-layer-info-download"} title="This layer can be downloaded.">
            <img src={images["download.png"]} alt="can download" />
          </div>
          <div className={layerInfo.secured === null || !layerInfo.secured ? "sc-hidden" : "sc-toc-item-layer-info-secured"} title="This layer is secured.">
            <img src={images["lock.png"]} alt="secure" />
          </div>
        </div>
        <div className="sc-toc-item-toolbox" title="Layer Options" onClick={(evt) => this.props.onLayerOptionsClick(evt, layerInfo)}>
          <img src={images["more-options.png"]} alt="more options" />
        </div>
        <div className={layerInfo.showLegend ? "sc-toc-layer-info-container" : "sc-hidden"}>
          <div className="sc-toc-item-layer-info-container-open-vertical-lines" />
          <div className="sc-toc-item-layer-info-container-open-horizontal-lines" />
          <div className="sc-toc-item-layer-info-legend">
            <div className="sc-toc-item-layer-info-border" />
            <img src={layerInfo.legendImage} alt="style" />
          </div>
        </div>
      </div>
    );
  }
}

export default LayerItem;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("../images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
