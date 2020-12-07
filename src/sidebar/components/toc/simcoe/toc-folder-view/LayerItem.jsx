import React, { Component } from "react";
import ReactDOM from "react-dom";
import { Vector as VectorLayer } from "ol/layer.js";
import * as helpers from "../../../../../helpers/helpers";
import * as TOCHelpers from "../common/TOCHelpers.jsx";
import { FeatureHelpers, OL_DATA_TYPES } from "../../../../../helpers/OLHelpers";
import TOCConfig from "../common/TOCConfig.json";
import FloatingMenu, { FloatingMenuItem } from "../../../../../helpers/FloatingMenu.jsx";
import Highlighter from "react-highlight-words";
import Portal from "../../../../../helpers/Portal.jsx";
import { Item as MenuItem } from "rc-menu";
import Slider, { createSliderWithTooltip } from "rc-slider";

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
    // let layer = this.state.layer;
    // if (layer === undefined) {
    //   layer = this.props.layerInfo;
    //   this.setState({
    //     layer: layer,
    //   });
    // } else {
    //   if (layer !== this.props.layerInfo) this.setState({ layer: this.props.layerInfo });
    // }
  }
  componentDidMount() {
    this._isMounted = true;

    // LISTEN FOR SEARCH RESULT
    // window.emitter.addListener("activeTocLayer", (layerItem, callback) => {
    //   if (this.props.layerInfo.name === layerItem.fullName && this._isMounted) {
    //     this.onActivateLayer(callback);
    //   }
    // });
    // window.emitter.addListener("deactiveTocLayer", (layerItem, callback) => {
    //   if (this.props.layerInfo.name === layerItem.fullName && this._isMounted) {
    //     this.onDeactivateLayer(callback);
    //   }
    // });
    // // LISTEN FOR TOGGLE ALL LEGEND
    // window.emitter.addListener("toggleLegend", (type, layerName, callback) => {
    //   if (this.props.layerInfo.name === layerName && this._isMounted) {
    //     this.onLegendToggle(type, callback);
    //   }
    // });
    window.map.on("moveend", () => {
      this.setVisibleScale();
      // if (this._isMounted) this.forceUpdate();
    });
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentWillReceiveProps(nextProps) {
    console.log(nextProps.layer.layer.visible);
    // this.forceUpdate();
    // let layer = this.state.layer;
    // if (layer === undefined) {
    //   layer = nextProps.layerInfo;
    //   this.setState({
    //     layer: layer,
    //   });
    // } else {
    //   if (layer !== nextProps.layerInfo) this.setState({ layer: nextProps.layerInfo });
    // }
  }

  setVisibleScale = () => {
    const { layer } = this.props;
    const scale = helpers.getMapScale();
    let isVisibleAtScale = true;
    let minScale = 0;
    let maxScale = 100000000000;
    if (layer.minScale !== undefined) minScale = layer.minScale[0];
    if (layer.maxScale !== undefined) maxScale = layer.maxScale[0];
    if (scale <= minScale || scale >= maxScale) isVisibleAtScale = false;
    this.isVisibleAtScale = isVisibleAtScale;
  };
  onActivateLayer = (callback) => {
    this.props.onLayerChange(this.props.layer, this.props.group);

    // let layer = this.state.layer;
    // if (layer.disclaimer !== undefined) {
    //   if (
    //     !TOCHelpers.acceptDisclaimer(layer, () => {
    //       this.onActivateLayer(callback);
    //     })
    //   ) {
    //     if (callback !== undefined) callback(false);
    //     return;
    //   }
    // }
    // layer.visible = true;
    // layer.layer.setVisible(true);
    // this.setState(
    //   {
    //     layer: layer,
    //   },
    //   () => {
    //     if (callback !== undefined) callback(true);
    //     this.props.onLayerChange(this.state.layer, this.props.group);
    //   }
    // );
  };

  onDeactivateLayer = (callback) => {
    // let layer = this.state.layer;
    // layer.visible = false;
    // layer.layer.setVisible(false);
    // this.setState(
    //   {
    //     layer: layer,
    //   },
    //   () => {
    //     if (callback !== undefined) callback(false);
    //     this.props.onLayerChange(this.state.layer, this.props.group);
    //   }
    // );
  };

  onSliderChange = (opacity) => {
    let layer = this.props.layer;
    layer.layer.setOpacity(opacity);
    layer.opacity = opacity;
    // this.props.onSliderChange(this.props.layer, this.props.group, opacity);

    // this.setState(
    //   {
    //     layer: layer,
    //   },
    //   () => {
    //     this.props.onLayerChange(this.state.layer, this.props.group);
    //   }
    // );
  };
  onCheckboxChange = () => {
    let layer = this.props.layer;
    layer.layer.setVisible(!layer.visible);
    layer.visible = !layer.visible;
    this.props.onLayerChange(layer, this.props.group);

    // let layer = this.state.layer;
    // const visible = !layer.visible;
    // if (layer.disclaimer !== undefined) {
    //   if (!TOCHelpers.acceptDisclaimer(layer, this.onCheckboxChange)) return;
    // }
    // layer.layer.setVisible(visible);
    // layer.visible = visible;
    // this.setState(
    //   {
    //     layer: layer,
    //   },
    //   () => {
    //     this.props.onLayerChange(this.state.layer, this.props.group);
    //   }
    // );
  };

  onMenuItemClick = (action) => {
    let layerInfo = this.props.layer;
    switch (action) {
      case "sc-floating-menu-metadata":
        TOCHelpers.getLayerInfo(layerInfo, (result) => {
          if (helpers.isMobile()) {
            window.emitter.emit("setSidebarVisiblity", "CLOSE");
            helpers.showURLWindow(TOCConfig.layerInfoURL + result.featureType.fullUrl, false, "full");
          } else helpers.showURLWindow(TOCConfig.layerInfoURL + result.featureType.fullUrl);
        });
        break;
      case "sc-floating-menu-zoom-to-layer":
        if (layerInfo.metadataUrl !== undefined && layerInfo.metadataUrl !== null) {
          TOCHelpers.getLayerInfo(layerInfo, (result) => {
            const boundingBox = result.featureType.nativeBoundingBox;
            const extent = [boundingBox.minx, boundingBox.miny, boundingBox.maxx, boundingBox.maxy];
            window.map.getView().fit(extent, window.map.getSize(), { duration: 1000 });
          });
        } else {
          const layerExtent = layerInfo.layer.getSource().getExtent();
          if (layerExtent !== undefined) {
            window.map.getView().fit(layerExtent, window.map.getSize(), { duration: 1000 });
          }
        }
        break;
      case "sc-floating-menu-export-layer":
        const extent = window.map.getView().calculateExtent(window.map.getSize());
        let visibleFeatures = [];
        layerInfo.layer.getSource().forEachFeatureInExtent(extent, function(feature) {
          visibleFeatures.push(feature);
        });
        if (visibleFeatures.length > 0) {
          let features = FeatureHelpers.setFeatures(visibleFeatures.concat([]), OL_DATA_TYPES.KML);
          if (features !== undefined) helpers.export_file("features.kml", features);
        } else {
          helpers.showMessage("No Features", "No features in view for this layer");
        }

        break;
      default:
        break;
    }

    helpers.addAppStat("Layer Options", action);
  };
  // ELLIPSIS/OPTIONS BUTTON
  onLayerOptionsClick = (evt) => {
    let layerInfo = this.props.layer;
    var evtClone = Object.assign({}, evt);

    const menu = (
      <Portal>
        <FloatingMenu
          key={helpers.getUID()}
          buttonEvent={evtClone}
          autoY={true}
          item={this.props.info}
          width={"200px"}
          onMenuItemClick={(action) => this.onMenuItemClick(action)}
          styleMode={helpers.isMobile() ? "left" : "right"}
        >
          <MenuItem className={layerInfo.metadataUrl !== undefined && layerInfo.metadataUrl !== null ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"} key="sc-floating-menu-metadata">
            <FloatingMenuItem imageName={"metadata.png"} label="Metadata" />
          </MenuItem>
          <MenuItem
            className={(layerInfo.metadataUrl !== undefined && layerInfo.metadataUrl !== null) || layerInfo.layer instanceof VectorLayer ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"}
            key="sc-floating-menu-zoom-to-layer"
          >
            <FloatingMenuItem imageName={"zoom-in.png"} label="Zoom to Layer" />
          </MenuItem>
          <MenuItem className={layerInfo.layer instanceof VectorLayer ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"} key="sc-floating-menu-export-layer">
            <FloatingMenuItem imageName={"download.png"} label="Download visible features" />
          </MenuItem>

          <MenuItem className="sc-layers-slider" key="sc-floating-menu-opacity">
            Adjust Transparency
            <SliderWithTooltip tipFormatter={this.sliderTipFormatter} max={1} min={0} step={0.05} defaultValue={layerInfo.opacity} onChange={(evt) => this.onSliderChange(evt)} />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  onLegendToggle = (forceAll, callback) => {
    console.log(this.props.layer);
    let layer = this.props.layer;
    layer.showLegend = !layer.showLegend;
    this.props.onLegendToggle(this.props.layer, this.props.group);

    // console.log(this.props.virtualId);
    // let layerInfo = this.state.layer;
    // this.lastPosition = document.getElementById(this.props.virtualId).scrollTop;
    // if (layerInfo.styleUrl === "") return;
    // let showLegend = !layerInfo.showLegend;
    // if (forceAll !== undefined) {
    //   if (forceAll === "OPEN") showLegend = true;
    //   else if (forceAll === "CLOSE") showLegend = false;
    // }

    // if (layerInfo.legendImage === null) {
    //   TOCHelpers.getBase64FromImageUrl(layerInfo.styleUrl, (height, imgData) => {
    //     const rowHeight = showLegend ? (height += 36) : 30;
    //     let updatedLayer = Object.assign({}, layerInfo, { showLegend: showLegend, height: rowHeight, legendHeight: height, legendImage: imgData });
    //     if (callback !== undefined) callback(updatedLayer);
    //     else
    //       this.setState({ layer: updatedLayer }, () => {
    //         if (callback === undefined) this.props.onLayerChange(this.state.layer, this.props.group);
    //       });
    //   });
    // } else {
    //   const rowHeight = showLegend ? layerInfo.legendHeight : 30;
    //   let updatedLayer = Object.assign({}, layerInfo, { showLegend: showLegend, height: rowHeight });
    //   if (callback !== undefined) callback(updatedLayer);
    //   else
    //     this.setState({ layer: updatedLayer }, () => {
    //       if (callback === undefined) this.props.onLayerChange(this.state.layer, this.props.group);
    //     });
    // }
  };

  render() {
    // console.log("render");
    // console.log(this.props.group.value);
    // console.log(this.props.layer);

    let containerClassName = "sc-toc-item-container-folder-view";
    if (!this.isVisibleAtScale) containerClassName += " not-in-scale";
    if (this.props.layer.visible) containerClassName += " on";

    return (
      <div id={this.props.layer.name + "_" + this.props.layer.group + "_folderview"}>
        <div className={containerClassName}>
          <div className="sc-toc-item-plus-minus-container-folder-view" onClick={() => this.onLegendToggle()}>
            <img
              src={this.props.layer.styleUrl === "" ? images["no-legend.png"] : this.props.layer.showLegend ? images["minus.png"] : images["plus.png"]}
              alt="legend toggle"
              title={this.props.layer.styleUrl === "" ? "No Legend Available" : this.props.layer.showLegend ? "Hide Legend" : "Show Legend"}
            />
            <div className="sc-toc-item-plus-minus-sign-folder-view" />
            <div className="sc-toc-item-lines-expanded-folder-view" />
          </div>
          <div className="sc-toc-item-checkbox-folder-view">
            <input id="sc-toc-item-checkbox-folder-view" key={helpers.getUID()} type="checkbox" onChange={() => this.onCheckboxChange()} checked={this.props.layer.visible} />
          </div>
          <div className="sc-toc-item-layer-label-folder-view">
            <Highlighter
              // className="sc-toc-item-layer-label-folder-view"
              highlightClassName="sc-search-toc-highlight-words-folder-view"
              searchWords={[this.props.searchText]}
              textToHighlight={this.props.layer.displayName}
              onClick={() => this.onCheckboxChange(this.state.layer)}
            />
          </div>

          <div className={this.props.layer.liveLayer === null || !this.props.layer.liveLayer ? "sc-hidden" : "sc-toc-item-layer-info-live-layer"} title="This layer is Interactable in the map.">
            <img src={images["callout.png"]} alt="callout" />
          </div>
          <div className={this.props.layer.canDownload === null || !this.props.layer.canDownload ? "sc-hidden" : "sc-toc-item-layer-info-download"} title="This layer can be downloaded.">
            <img src={images["download.png"]} alt="can download" />
          </div>
          <div className="sc-toc-item-toolbox-folder-view" title="Layer Options" onClick={(evt) => this.onLayerOptionsClick(evt, this.props.layer)}>
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
// SLIDER
const SliderWithTooltip = createSliderWithTooltip(Slider);
