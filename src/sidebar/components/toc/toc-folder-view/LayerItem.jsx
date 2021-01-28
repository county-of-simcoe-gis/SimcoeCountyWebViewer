import React, { Component } from "react";
import * as helpers from "../../../../helpers/helpers";
import Highlighter from "react-highlight-words";

import "./LayerItem.css";
class LayerItem extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // layer: undefined,
    };
    this.isVisibleAtScale = true;
    this._isMounted = false;
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

  componentWillUnmount() {
    this._isMounted = false;
  }

  setVisibleScale = () => {
    const { layer } = this.props;
    const scale = helpers.getMapScale();
    let isVisibleAtScale = true;
    let minScale = 0;
    let maxScale = 100000000000;
    if (layer.minScale !== undefined) minScale = layer.minScale;
    if (layer.maxScale !== undefined) maxScale = layer.maxScale;
    if (scale <= minScale || scale >= maxScale) isVisibleAtScale = false;
    this.isVisibleAtScale = isVisibleAtScale;
  };

  onCheckboxChange = () => {
    let layer = this.props.layer;
    layer.layer.setVisible(!layer.visible);
    layer.visible = !layer.visible;
    this.props.onLayerChange(layer, this.props.group);
  };

  render() {
    let containerClassName = "sc-toc-item-container-folder-view";
    if (!this.isVisibleAtScale) containerClassName += " not-in-scale";
    if (this.props.layer.visible) containerClassName += " on";

    return (
      <div id={this.props.id + "_folderview"}>
        <div className={containerClassName}>
          <div className="sc-toc-item-plus-minus-container-folder-view" onClick={() => this.props.onLegendToggle(this.props.layer, this.props.group)}>
            <img
              src={this.props.layer.styleUrl === "" ? images["no-legend.png"] : this.props.layer.showLegend ? images["minus.png"] : images["plus.png"]}
              alt="legend toggle"
              title={this.props.layer.styleUrl === "" ? "No Legend Available" : this.props.layer.showLegend ? "Hide Legend" : "Show Legend"}
            />
            <div className="sc-toc-item-plus-minus-sign-folder-view" />
            <div className="sc-toc-item-lines-expanded-folder-view" />
          </div>
          <div className="sc-toc-item-checkbox-folder-view">
            <input id={this.props.id + "-checkbox-folder-view"} key={this.props.id + "-checkbox-folder-view"} type="checkbox" onChange={() => this.onCheckboxChange()} checked={this.props.layer.visible} />
          </div>
          <div className="sc-toc-item-layer-label-folder-view">
            <Highlighter
              // className="sc-toc-item-layer-label-folder-view"
              highlightClassName="sc-search-toc-highlight-words-folder-view"
              searchWords={[this.props.searchText]}
              textToHighlight={this.props.layer.tocDisplayName}
              onClick={() => this.onCheckboxChange(this.state.layer)}
            />
          </div>

          <div className={this.props.layer.liveLayer === null || !this.props.layer.liveLayer ? "sc-hidden" : "sc-toc-item-layer-info-live-layer"} title="This layer is Interactable in the map.">
            <img src={images["callout.png"]} alt="callout" />
          </div>
          <div className={this.props.layer.canDownload === null || !this.props.layer.canDownload ? "sc-hidden" : "sc-toc-item-layer-info-download"} title="This layer can be downloaded.">
            <img src={images["download.png"]} alt="can download" />
          </div>
          <div className={this.props.layer.secured === null || !this.props.layer.secured ? "sc-hidden" : "sc-toc-item-layer-info-secured"} title="This layer is secured.">
            <img src={images["lock.png"]} alt="secure" />
          </div>
          <div className="sc-toc-item-toolbox-folder-view" title="Layer Options" onClick={(evt) => this.props.onLayerOptionsClick(evt, this.props.layer)}>
            <img src={images["more-options.png"]} alt="More Options" />
          </div>
        </div>

        <div className={this.props.layer.showLegend ? "sc-toc-layer-info-container-folder-view" : "sc-hidden"}>
          <div className="sc-toc-item-layer-info-container-open-vertical-lines-folder-view" />
          <div className="sc-toc-item-layer-info-container-open-horizontal-lines-folder-view" />
          <div className="sc-toc-item-layer-info-legend-folder-view">
            <div className="sc-toc-item-layer-info-border-folder-view" />
            <img src={this.props.layer.legendImage} alt="style" />
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

