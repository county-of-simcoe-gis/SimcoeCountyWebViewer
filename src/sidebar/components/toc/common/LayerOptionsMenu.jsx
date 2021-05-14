import React, { Component } from "react";
import { Item as MenuItem } from "rc-menu";
import Slider, { createSliderWithTooltip } from "rc-slider";
import { Vector as VectorLayer } from "ol/layer.js";
import "rc-slider/assets/index.css";


import * as helpers from "../../../../helpers/helpers";
import Portal from "../../../../helpers/Portal.jsx";
import FloatingMenu, { FloatingMenuItem } from "../../../../helpers/FloatingMenu.jsx";
import * as TOCHelpers from "./TOCHelpers.jsx";
import TOCConfig from "./TOCConfig.json";


class LayerOptionsMenu extends Component {
  constructor(props) {
    super(props);
    this.currentScroll = 0;
    this.state = {
    }
  }

 
  // OPACITY SLIDER FOR EACH LAYER
onSliderChange = (opacity, layerInfo) => {
    layerInfo.layer.setOpacity(opacity);
    //this.currentScroll = document.getElementById(this.virtualId).scrollTop;
  };
  // OPACITY SLIDER AFTER COMPLETE
onSliderAfterChange = (opacity, layerInfo) => {
    //document.getElementById(this.virtualId).scrollTop = this.currentScroll;
    layerInfo.opacity = opacity;
    this.props.onLayerChange(layerInfo, layerInfo.group);
  };

  zoomToVisibleScale = (layerInfo) => {
    const scales = [1155581, 577791, 288895, 144448, 72224, 36112, 18056, 9028, 4514, 2257, 1128, 564];

    const scale = helpers.getMapScale();
    let minScale = 0;
    let maxScale = 100000000000;
    if (layerInfo.minScale !== undefined) minScale = layerInfo.minScale;
    if (layerInfo.maxScale !== undefined) maxScale = layerInfo.maxScale;

    if (scale >= minScale && scale <= maxScale) {
      helpers.showMessage("Zoom to Visible Scale", "Layer is already visible at this scale.");
      return;
    }

    if (scale < minScale) {
      const flipped = scales.reverse();
      let index = 20;
      flipped.forEach((scaleItem) => {
        if (scaleItem >= minScale) {
          window.map.getView().setZoom(index);
          return;
        }
        index--;
      });
    } else if (scale > maxScale) {
      let index = 9;
      scales.forEach((scaleItem) => {
        if (scaleItem <= maxScale) {
          window.map.getView().setZoom(index);
          return;
        }
        index++;
      });
    }
  };

onMenuItemClick = (action, layerInfo) => {
  switch (action) {
    case "sc-floating-menu-metadata":
      if (layerInfo.metadataUrl === undefined || layerInfo.metadataUrl === null) return;
      if (layerInfo.metadataUrl.endsWith('f=json')) helpers.showURLWindow(TOCConfig.layerInfoURL + layerInfo.metadataUrl); 
      else TOCHelpers.getLayerInfo(layerInfo, (result) => {
        if (helpers.isMobile()) {
          window.emitter.emit("setSidebarVisiblity", "CLOSE");
          helpers.showURLWindow(TOCConfig.layerInfoURL + result.featureType.fullUrl, false, "full");
        } else helpers.showURLWindow(TOCConfig.layerInfoURL + result.featureType.fullUrl);
      });
      helpers.addAppStat("Metadata", layerInfo.name);
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
    case "sc-floating-menu-zoom-to-layer-visible":
      this.zoomToVisibleScale(layerInfo);
      break;
    case "sc-floating-menu-remove-layer":
      this.props.onRemoveLayer(layerInfo.name, layerInfo.group, ()=>{});
      break;
    case "sc-floating-menu-attribute-table":
      if (layerInfo.noAttributeTable) helpers.showMessage("Table", "Attribute table disabled for this layer.");
      else window.emitter.emit("openAttributeTable", layerInfo.serverUrl, layerInfo.name);
      break;
    case "sc-floating-menu-download":
      TOCHelpers.getLayerInfo(layerInfo, (result) => {
        if (result.featureType.name === "Assessment Parcel") helpers.showMessage("Download", "Parcels are not available for download");
        else {
          helpers.addAppStat("Download", layerInfo.name);
          if (helpers.isMobile()) {
            window.emitter.emit("setSidebarVisiblity", "CLOSE");
            helpers.showURLWindow(TOCConfig.layerDownloadURL + result.featureType.fullUrl, false, "full");
          } else helpers.showURLWindow(TOCConfig.layerDownloadURL + result.featureType.fullUrl);
        }
      });
      break;
    default:
      break;
  }
  helpers.addAppStat("Layer Options", action);
};
render(){
  var evtClone = Object.assign({}, this.props.evt);

  return (
    <Portal>
      <FloatingMenu
        key={helpers.getUID()}
        buttonEvent={evtClone}
        autoY={true}
        //item={this.props.info}
        onMenuItemClick={(action) => this.onMenuItemClick(action, this.props.layerInfo)}
        styleMode={helpers.isMobile() ? "left" : "right"}
      >
        <MenuItem 
          className={(this.props.layerInfo.metadataUrl !== undefined && this.props.layerInfo.metadataUrl !== null) ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"}
          key="sc-floating-menu-metadata">
          <FloatingMenuItem imageName={"metadata.png"} label="Metadata" />
        </MenuItem>
        {/* <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-attribute-table">
          <FloatingMenuItem imageName={"metadata.png"} label="Open Attribute Table" />
        </MenuItem> */}
         {
         //Imported from MTO TOC
         /*<MenuItem className={layerInfo.layer instanceof VectorLayer ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"} key="sc-floating-menu-export-layer">
            <FloatingMenuItem imageName={"download.png"} label="Download visible features" />
          </MenuItem>
          */}
          <MenuItem
            className={(this.props.layerInfo.metadataUrl !== undefined && this.props.layerInfo.metadataUrl !== null) || this.props.layerInfo.layer instanceof VectorLayer ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"}
            key="sc-floating-menu-zoom-to-layer"
          >
            <FloatingMenuItem imageName={"zoom-in.png"} label="Zoom to Layer" />
          </MenuItem>
        

        <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-zoom-to-layer-visible">
          <FloatingMenuItem imageName={"zoom-in.png"} label="Zoom to Visible Scale" />
        </MenuItem>
        <MenuItem className={this.props.layerInfo.canDownload ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"} key="sc-floating-menu-download">
          <FloatingMenuItem imageName={"download.png"} label="Download" />
        </MenuItem>
        <MenuItem className={this.props.layerInfo.layer.get("userLayer") ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"} key="sc-floating-menu-remove-layer">
          <FloatingMenuItem imageName={"eraser.png"} label="Remove Layer" />
        </MenuItem>
        <MenuItem className="sc-layers-slider" key="sc-floating-menu-opacity">
          Adjust Transparency
          <SliderWithTooltip
            tipFormatter={this.sliderTipFormatter}
            max={1}
            min={0}
            step={0.05}
            defaultValue={this.props.layerInfo.opacity}
            onChange={(evt) => this.onSliderChange(evt, this.props.layerInfo)}
            onAfterChange={(evt) => this.onSliderAfterChange(evt, this.props.layerInfo)}
          />
        </MenuItem>
      </FloatingMenu>
    </Portal>
  );
}

}
export default LayerOptionsMenu;

// SLIDER
const SliderWithTooltip = createSliderWithTooltip(Slider);