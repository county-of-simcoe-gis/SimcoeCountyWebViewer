import React, { Component } from "react";
import MyMapsSymbolizer from "./MyMapsSymbolizer.jsx";
import MyMapsBuffer from "./MyMapsBuffer";
import MyMapsPopupLabel from "./MyMapsPopupLabel";
import "./MyMapsPopup.css";
import * as helpers from "../../../helpers/helpers";

class MyMapsPopup extends Component {
  state = {};

  componentDidMount() {
    this.props.onRef(this);
  }
  componentWillUnmount() {
    this.props.onRef(undefined);
  }

  componentWillReceiveProps(nextProps) {
    // this.popupLabelRef.forceUpdate();
  }

  parentLabelChanged = (itemInfo, newLabel) => {
    this.popupLabelRef.parentLabelChange(itemInfo, newLabel);
  };

  parentLabelVisibleChanged = (itemInfo, visible) => {
    this.popupLabelRef.parentLabelVisibilityChange(itemInfo, visible);
  };

  render() {
    return (
      <div className="sc-mymaps-popup-container">
        <MyMapsPopupLabel
          onRef={ref => (this.popupLabelRef = ref)}
          item={this.props.item}
          onLabelChange={this.props.onLabelChange}
          onLabelVisibilityChange={this.props.onLabelVisibilityChange}
          onLabelRotationChange={this.props.onLabelRotationChange}
        />
        <MyMapsSymbolizer
          key={helpers.getUID()}
          visible={this.props.activeTool === "symbolizer"}
          item={this.props.item}
          onPointStyleDropDown={this.props.onPointStyleDropDown}
          onRadiusSliderChange={this.props.onRadiusSliderChange}
          onFillColorPickerChange={this.props.onFillColorPickerChange}
          onFillOpacitySliderChange={this.props.onFillOpacitySliderChange}
          onRotationSliderChange={this.props.onRotationSliderChange}
          onStrokeOpacitySliderChange={this.props.onStrokeOpacitySliderChange}
          onStrokeColorPickerChange={this.props.onStrokeColorPickerChange}
          onStrokeWidthSliderChange={this.props.onStrokeWidthSliderChange}
          onStrokeTypeDropDown={this.props.onStrokeTypeDropDown}
        />
        <MyMapsBuffer visible={this.props.activeTool === "buffer"} item={this.props.item} />
        <FooterButtons
          onMyMapItemToolsButtonClick={evt => this.props.onMyMapItemToolsButtonClick(evt, this.props.item)}
          onDeleteButtonClick={() => {
            this.props.onDeleteButtonClick(this.props.item.id);
            window.popup.hide();
          }}
        />
      </div>
    );
  }
}

export default MyMapsPopup;

function FooterButtons(props) {
  return (
    <div className="sc-mymaps-footer-buttons-container">
      <button className="sc-button sc-mymaps-popup-footer-button" key={helpers.getUID()} id={helpers.getUID()} onClick={evt => props.onMyMapItemToolsButtonClick(evt)}>
        <img src={images["toolbox.png"]} className={"sc-mymaps-footer-buttons-img"} alt="Tools" />
        Tools
      </button>
      <button className="sc-button sc-mymaps-popup-footer-button" key={helpers.getUID()} id={helpers.getUID()} onClick={props.onDeleteButtonClick}>
        <img src={images["eraser.png"]} className={"sc-mymaps-footer-buttons-img"} alt="Delete" />
        Delete
      </button>
      <button
        className="sc-button sc-mymaps-popup-footer-button"
        key={helpers.getUID()}
        id={helpers.getUID()}
        onClick={() => {
          window.popup.hide();
        }}
      >
        <img src={images["closeX.gif"]} className={"sc-mymaps-footer-buttons-img"} alt="Close" />
        Close
      </button>
    </div>
  );
}

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
