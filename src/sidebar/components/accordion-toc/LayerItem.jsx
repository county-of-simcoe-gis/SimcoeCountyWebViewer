import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as helpers from "../../../helpers/helpers";
import * as TOCHelpers from "../common/TOCHelpers.jsx";
import TOCConfig from "../common/TOCConfig.json";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import Highlighter from "react-highlight-words";
import Portal from "../../../helpers/Portal.jsx";
import { Item as MenuItem } from "rc-menu";
import Slider, { createSliderWithTooltip } from "rc-slider";

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

  onActivateLayer = () => {
    let layer = this.state.layer;
    layer.visible = true;
    layer.layer.setVisible(true);
    this.setState(
      {
        layer: layer
      }, ()=> {this.props.onLayerChange(this.state.layer);}
    );
  }

  onSliderChange = (opacity) => {
    let layer = this.state.layer;
    layer.layer.setOpacity(opacity);
    layer.opacity = opacity;
    this.setState(
      {
        layer: layer
      }, ()=> {this.props.onLayerChange(this.state.layer);}
    );
  };
  onCheckboxChange = () => {
    let layer = this.state.layer
    const visible = !layer.visible;
    layer.layer.setVisible(visible);
    layer.visible = visible;
    this.setState(
      {
        layer: layer
      }, ()=> {this.props.onLayerChange(this.state.layer);}
    );
    
  };

  onMenuItemClick = (action) => {
    let layerInfo = this.state.layer;
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
    } 

    helpers.addAppStat("Layer Options", action);
  };
  // ELLIPSIS/OPTIONS BUTTON
  onLayerOptionsClick = (evt) => {
    let layerInfo = this.state.layer;
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu
          key={helpers.getUID()}
          buttonEvent={evtClone}
          autoY={true}
          item={this.props.info}
          onMenuItemClick={action => this.onMenuItemClick(action)}
          styleMode={helpers.isMobile() ? "left" : "right"}
        >
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-metadata">
            <FloatingMenuItem imageName={"metadata.png"} label="Metadata" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-zoom-to-layer">
            <FloatingMenuItem imageName={"zoom-in.png"} label="Zoom to Layer" />
          </MenuItem>
          <MenuItem className="sc-layers-slider" key="sc-floating-menu-opacity">
            Adjust Transparency
            <SliderWithTooltip tipFormatter={this.sliderTipFormatter} max={1} min={0} step={0.05} defaultValue={layerInfo.opacity} onChange={evt => this.onSliderChange(evt)} />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };
  
  
  onLegendToggle = (forceAll) => {
    let layerInfo = this.state.layer;
    this.lastPosition = document.getElementById(this.props.virtualId).scrollTop;
    if (layerInfo.styleUrl === "") return;
    let showLegend = !layerInfo.showLegend;
    if (forceAll !== undefined) {
      if (forceAll === "OPEN") showLegend = true;
      else if (forceAll === "CLOSE") showLegend = false;
    }

    if (layerInfo.legendImage === null) {
      TOCHelpers.getBase64FromImageUrl(layerInfo.styleUrl, (height, imgData) => {
        const rowHeight = showLegend ? (height += 36) : 30;
        this.setState({layer: Object.assign({},layerInfo, { showLegend: showLegend, height: rowHeight, legendHeight: height, legendImage: imgData })}, ()=> {this.props.onLayerChange(this.state.layer);});
        
      });
    } else {
      const rowHeight = showLegend ? layerInfo.legendHeight : 30;
      this.setState({layer:Object.assign({}, layerInfo, { showLegend: showLegend, height: rowHeight })}, ()=> {this.props.onLayerChange(this.state.layer);});
    }
  };
  render() {
    let containerClassName = "sc-toc-item-container";
    if (!this.isVisibleAtScale) containerClassName += " not-in-scale";
    if (this.state.layer.visible) containerClassName += " on";

    return (
    <div>
      <div className={containerClassName}>
        <div className="sc-toc-item-plus-minus-container" onClick={() => this.onLegendToggle(this.state.layer)}>
          <img src={this.state.layer.showLegend ? images["minus.png"] : images["plus.png"]} alt="minus" />
          <div className="sc-toc-item-plus-minus-sign" />
          <div className="sc-toc-item-lines-expanded" />
        </div>
        <div className="sc-toc-item-checkbox">
          <input id="sc-toc-item-checkbox" key={helpers.getUID()} type="checkbox" onChange={() => this.onCheckboxChange()} checked={this.state.layer.visible} />
        </div>
        <Highlighter
          className="sc-toc-item-layer-label"
          highlightClassName="sc-search-toc-highlight-words"
          searchWords={[this.props.searchText]}
          textToHighlight={this.state.layer.displayName}
          onClick={() => this.onCheckboxChange(this.state.layer)}
        />
        
      </div>
      <div className="sc-toc-item-toolbox" title="Layer Options" onClick={evt => this.onLayerOptionsClick(evt,this.state.layer)}>
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
// SLIDER
const SliderWithTooltip = createSliderWithTooltip(Slider);