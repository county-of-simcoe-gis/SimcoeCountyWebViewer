import React, { Component, useState } from "react";
import MyMapsSymbolizer from "./MyMapsSymbolizer.jsx";
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

  parentLabelChanged = (itemInfo, newLabel) => {
    this.popupLabelRef.parentLabelChange(itemInfo, newLabel);
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
        {/* <MyMapsSymbolizer item={this.props.item}></MyMapsSymbolizer> */}
        <FooterButtons
          onToolsButtonClick={evt => this.props.onToolsButtonClick(evt, this.props.item)}
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
      <button
        className="sc-button sc-mymaps-popup-footer-button"
        key={helpers.getUID()}
        id={helpers.getUID()}
        onClick={evt => props.onToolsButtonClick(evt)}
        onMouseUp={helpers.convertMouseUpToClick}
      >
        <img src={images["toolbox.png"]} className={"sc-mymaps-footer-buttons-img"} />
        Tools
      </button>
      <button
        className="sc-button sc-mymaps-popup-footer-button"
        key={helpers.getUID()}
        id={helpers.getUID()}
        onClick={props.onDeleteButtonClick}
        onMouseUp={helpers.convertMouseUpToClick}
      >
        <img src={images["eraser.png"]} className={"sc-mymaps-footer-buttons-img"} />
        Delete
      </button>
      <button
        className="sc-button sc-mymaps-popup-footer-button"
        key={helpers.getUID()}
        id={helpers.getUID()}
        onClick={() => {
          window.popup.hide();
        }}
        onMouseUp={helpers.convertMouseUpToClick}
      >
        <img src={images["closeX.gif"]} className={"sc-mymaps-footer-buttons-img"} />
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
