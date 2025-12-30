import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import MyMapsSymbolizer from "./MyMapsSymbolizer.jsx";
import MyMapsBuffer from "./MyMapsBuffer";
import MyMapsMeasure from "./MyMapsMeasure";
import MyMapsPopupLabel from "./MyMapsPopupLabel";
import "./MyMapsPopup.css";
import * as helpers from "../../../helpers/helpers";

const MyMapsPopup = forwardRef((props, ref) => {
  const popupLabelRef = useRef(null);
  const [item, setItem] = useState(props.item);

  // Expose methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      updateItem: (newItem) => {
        setItem(newItem);
      },
      parentLabelVisibleChanged: (itemInfo, visible) => {
        if (itemInfo.id === item.id) {
          setItem({ ...item, labelVisible: visible });
        }
        if (popupLabelRef.current) {
          popupLabelRef.current.parentLabelVisibilityChange(itemInfo, visible);
        }
      },
      parentLabelChange: (itemInfo, newLabel) => {
        if (popupLabelRef.current) {
          popupLabelRef.current.parentLabelChange(itemInfo, newLabel);
        }
      },
    }),
    [item]
  );

  useEffect(() => {
    // Update item when props.item changes
    setItem(props.item);
  }, [props.item]);

  return (
    <div className="sc-mymaps-popup-container">
      <MyMapsPopupLabel
        onRef={(ref) => (popupLabelRef.current = ref)}
        item={item}
        onLabelChange={props.onLabelChange}
        onLabelVisibilityChange={props.onLabelVisibilityChange}
        onLabelStyleChange={props.onLabelStyleChange}
        onLabelRotationChange={props.onLabelRotationChange}
      />
      <MyMapsSymbolizer
        visible={props.activeTool === "symbolizer"}
        item={item}
        onPointStyleDropDown={props.onPointStyleDropDown}
        onRadiusSliderChange={props.onRadiusSliderChange}
        onFillColorPickerChange={props.onFillColorPickerChange}
        onFillOpacitySliderChange={props.onFillOpacitySliderChange}
        onRotationSliderChange={props.onRotationSliderChange}
        onStrokeOpacitySliderChange={props.onStrokeOpacitySliderChange}
        onStrokeColorPickerChange={props.onStrokeColorPickerChange}
        onStrokeWidthSliderChange={props.onStrokeWidthSliderChange}
        onStrokeTypeDropDown={props.onStrokeTypeDropDown}
        onLabelStyleChange={props.onLabelStyleChange}
      />
      <MyMapsBuffer visible={props.activeTool === "buffer"} item={item} />
      <MyMapsMeasure visible={props.activeTool === "measure"} item={item} />
      {props.extensions.map((ext) => {
        return ext.component({ ...props, item });
      })}
      <FooterButtons
        onMyMapItemToolsButtonClick={(evt) => props.onMyMapItemToolsButtonClick(evt, item)}
        onDeleteButtonClick={() => {
          props.onDeleteButtonClick(item.id);
          window.popup.hide();
        }}
      />
    </div>
  );
});

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
import { createImagesObject } from "../../../helpers/imageHelper";
const images = createImagesObject(import.meta.glob("./images/*.{png,jpg,jpeg,svg,gif}", { eager: true, query: "?url", import: "default" }));
