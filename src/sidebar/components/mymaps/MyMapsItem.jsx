import React, { useState, useEffect } from "react";
import "./MyMapsItem.css";
import * as drawingHelpers from "../../../helpers/drawingHelpers";
import Feature from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import { Vector as VectorSource } from "ol/source.js";
import { Stroke, Style, Fill, Circle as CircleStyle } from "ol/style";
import * as helpers from "../../../helpers/helpers";

function MyMapsItem(props) {
  const [label, setLabel] = useState(props.info.label);
  const [checked, setChecked] = useState(props.info.visible);
  useEffect(() => {
    return () => {
      removeHighlightLayer();
    };
  }, []);
  const removeHighlightLayer = () => {
    window.map.getLayers().forEach((layer) => {
      if (layer?.get("name") === "sc-mymaps-item-highlight") {
        window.map.removeLayer(layer);
        return;
      }
    });
  };
  const onLabelTextChange = (evt) => {
    const newLabel = evt.target.value;
    setLabel(newLabel);
    props.onLabelChange && props.onLabelChange(props.info.id, newLabel);
  };

  const onItemDelete = (evt) => {
    props.onItemDelete && props.onItemDelete(props.info.id);
    removeHighlightLayer();
  };

  const onItemCheckbox = (evt) => {
    const visible = evt.target.checked;
    setChecked(visible);
    props.onItemCheckboxChange && props.onItemCheckboxChange(props.info, visible);
  };

  const onMenuItemClick = (action) => {
    switch (action) {
      case "sc-floating-menu-buffer":
        props.showDrawingOptionsPopup && props.showDrawingOptionsPopup(drawingHelpers.getFeatureById(props.info.id), null, "buffer");
        break;
      default:
        break;
    }
  };

  const onSymbolizerClick = (evt) => {
    const feature = drawingHelpers.getFeatureById(props.info.id);
    props.showDrawingOptionsPopup && props.showDrawingOptionsPopup(feature, null, "symbolizer");
  };

  const onMouseOver = (evt) => {
    const feature = drawingHelpers.getFeatureById(props.info.id);
    if (feature === null) return;

    const shadowStyle = new Style({
      stroke: new Stroke({
        color: [0, 0, 127, 0.3],
        width: 6,
      }),
      image: new CircleStyle({
        radius: 10,
        stroke: new Stroke({
          color: [0, 0, 127, 0.3],
          width: 6,
        }),
        fill: new Fill({
          color: [0, 0, 127, 0.3],
        }),
      }),
      zIndex: 100000,
    });

    const highlightFeature = new Feature({
      geometry: feature.getGeometry(),
    });

    const highlightLayer = new VectorLayer({
      name: "sc-mymaps-item-highlight",
      source: new VectorSource({
        features: [highlightFeature],
      }),
      zIndex: 100000,
      style: shadowStyle,
    });
    window.map.addLayer(highlightLayer);
  };

  const onMouseOut = (evt) => {
    removeHighlightLayer();
  };

  return (
    <div className="sc-mymaps-item-container" onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
      <div className="sc-mymaps-item-container-item">
        <div>
          <input type="checkbox" style={{ verticalAlign: "middle" }} checked={checked} onChange={onItemCheckbox} />
          <button className="sc-button" onClick={onItemDelete}>
            <img src={images["eraser.png"]} alt="eraser" />
          </button>
        </div>
        <div className={!checked ? "sc-disabled" : ""}>
          <input
            className="sc-mymaps-item-container-item-text-input sc-editable"
            value={label}
            onChange={onLabelTextChange}
            onFocus={() => {
              helpers.disableKeyboardEvents(true);
            }}
            onBlur={() => {
              helpers.disableKeyboardEvents(false);
            }}
            title={label}
          />
        </div>
        <div className={!checked ? "right sc-disabled" : "right"}>
          <button className="sc-button" style={{ marginLeft: "15px" }} onClick={onSymbolizerClick}>
            <img src={images["color-picker.png"]} alt="colorpicker" />
          </button>
          <button className="sc-button" style={{ marginLeft: "5px" }} onClick={(evt) => props.onMyMapItemToolsButtonClick(evt, props.info)}>
            <img src={images["toolbox.png"]} alt="toolbox" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MyMapsItem;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
