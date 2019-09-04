import React, { Component } from "react";
import "./MyMapsItem.css";
import * as helpers from "../../../helpers/helpers";
import * as myMapsHelpers from "./myMapsHelpers";
import Feature from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import { Vector as VectorSource } from "ol/source.js";
import { Stroke, Style, Fill, Circle as CircleStyle } from "ol/style";

class MyMapsItem extends Component {
  constructor(props) {
    super(props);

    this.vectorLayer = null;

    this.state = {
      label: props.info.label,
      checked: props.info.visible
    };
  }

  // LABEL INPUT
  onLabelTextChange = evt => {
    this.setState({ label: evt.target.value });
    this.props.onLabelChange(this.props.info, evt.target.value);
  };

  // DELETE BUTTON
  onItemDelete = evt => {
    this.props.onItemDelete(this.props.info.id);

    if (this.vectorLayer !== null) {
      window.map.removeLayer(this.vectorLayer);
      this.vectorLayer = null;
    }
  };

  // VISIBILITY CHECKBOX
  onItemCheckbox = evt => {
    this.setState({ checked: evt.target.checked });
    this.props.onItemCheckboxChange(this.props.info, evt.target.checked);
  };

  // THIS IS REQUIRED WHEN CHANGING LABEL FROM POPUP OR SHOW/HIDE ALL FROM PARENT
  componentWillReceiveProps(nextProps) {
    if (nextProps.info.label !== this.state.label) this.setState({ label: nextProps.info.label });
    if (nextProps.info.visible !== this.state.checked) this.setState({ checked: nextProps.info.visible });
  }

  onMenuItemClick = action => {
    if (action === "sc-floating-menu-buffer") {
      const feature = myMapsHelpers.getFeatureById(this.props.info.id);
      this.props.showDrawingOptionsPopup(feature, null, "buffer");
    }
  };

  onSymbolizerClick = evt => {
    const feature = myMapsHelpers.getFeatureById(this.props.info.id);
    this.props.showDrawingOptionsPopup(feature, null, "symbolizer");
  };

  onMouseOver = evt => {
    if (myMapsHelpers.getFeatureById(this.props.info.id) === null) return;

    // LAYER FOR HIGHLIGHTING
    if (this.vectorLayer === null) {
      var shadowStyle = new Style({
        stroke: new Stroke({
          color: [0, 0, 127, 0.3],
          width: 6
        }),
        image: new CircleStyle({
          radius: 10,
          stroke: new Stroke({
            color: [0, 0, 127, 0.3],
            width: 6
          }),
          fill: new Fill({
            color: [0, 0, 127, 0.3]
          })
        }),
        zIndex: 100000
      });

      var feature = new Feature({
        geometry: myMapsHelpers.getFeatureById(this.props.info.id).getGeometry()
      });

      this.vectorLayer = new VectorLayer({
        source: new VectorSource({
          features: [feature]
        }),
        zIndex: 100000,
        style: shadowStyle
      });
      window.map.addLayer(this.vectorLayer);
    }
  };

  onMouseOut = evt => {
    window.map.removeLayer(this.vectorLayer);
    this.vectorLayer = null;
  };

  render() {
    return (
      <div className="sc-mymaps-item-container" onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
        <div className="sc-mymaps-item-container-item">
          <div>
            <input type="checkbox" style={{ verticalAlign: "middle" }} checked={this.state.checked} onChange={this.onItemCheckbox} />
            <button className="sc-button" onClick={this.onItemDelete}>
              <img src={images["eraser.png"]} alt="eraser" />
            </button>
          </div>
          <div className={this.state.checked ? "" : "sc-disabled"}>
            <input className="sc-mymaps-item-container-item-text-input" value={this.state.label} onChange={this.onLabelTextChange} title={this.state.label} />
          </div>
          <div className={this.state.checked ? "right" : "right sc-disabled"}>
            <button className="sc-button" style={{ marginLeft: "15px" }} onClick={this.onSymbolizerClick}>
              <img src={images["color-picker.png"]} alt="colorpicker" />
            </button>
            <button className="sc-button" style={{ marginLeft: "5px" }} onClick={evt => this.props.onMyMapItemToolsButtonClick(evt, this.props.info)}>
              <img src={images["toolbox.png"]} alt="toolbox" />
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default MyMapsItem;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
