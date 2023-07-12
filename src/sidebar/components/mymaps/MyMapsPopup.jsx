import React, { useRef, useEffect, useState } from "react";
import MyMapsSymbolizer from "./MyMapsSymbolizer.jsx";
import MyMapsBuffer from "./MyMapsBuffer";
import MyMapsMeasure from "./MyMapsMeasure";
import MyMapsPopupLabel from "./MyMapsPopupLabel";
import "./MyMapsPopup.css";
import * as helpers from "../../../helpers/helpers";

const MyMapsPopup = (props) => {
  const popupLabelRef = useRef(null);
  const [activeTool, setActiveTool] = useState(props.activeTool);
  useEffect(() => {
    props.onRef(this);
    return () => {
      props.onRef(undefined);
    };
  }, []);

  useEffect(() => {
    setActiveTool(props.activeTool);
  }, [props.activeTool]);
  return (
    <div className="sc-mymaps-popup-container">
      <MyMapsPopupLabel
        onRef={(ref) => (popupLabelRef.current = ref)}
        item={props.item}
        onLabelChange={props.onLabelChange}
        onLabelVisibilityChange={props.onLabelVisibilityChange}
        onLabelRotationChange={props.onLabelRotationChange}
      />
      <MyMapsSymbolizer
        key={helpers.getUID()}
        visible={activeTool === "symbolizer"}
        item={props.item}
        onPointStyleDropDown={props.onPointStyleDropDown}
        onRadiusSliderChange={props.onRadiusSliderChange}
        onFillColorPickerChange={props.onFillColorPickerChange}
        onFillOpacitySliderChange={props.onFillOpacitySliderChange}
        onRotationSliderChange={props.onRotationSliderChange}
        onStrokeOpacitySliderChange={props.onStrokeOpacitySliderChange}
        onStrokeColorPickerChange={props.onStrokeColorPickerChange}
        onStrokeWidthSliderChange={props.onStrokeWidthSliderChange}
        onStrokeTypeDropDown={props.onStrokeTypeDropDown}
      />
      <MyMapsBuffer visible={activeTool === "buffer"} item={props.item} />
      <MyMapsMeasure visible={activeTool === "measure"} item={props.item} />
      <FooterButtons
        onMyMapItemToolsButtonClick={(evt) => props.onMyMapItemToolsButtonClick(evt, props.item)}
        onDeleteButtonClick={() => {
          props.onDeleteButtonClick(props.item.id);
          window.popup.hide();
        }}
      />
    </div>
  );
};

export default MyMapsPopup;

function FooterButtons(props) {
  return (
    <div className="sc-mymaps-footer-buttons-container">
      <button className="sc-button sc-mymaps-popup-footer-button" key={helpers.getUID()} id={helpers.getUID()} onClick={(evt) => props.onMyMapItemToolsButtonClick(evt)}>
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
