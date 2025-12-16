import React, { useEffect, useState } from "react";
import "./MyMapsPopupLabel.css";
import * as helpers from "../../../helpers/helpers";

function MyMapsPopupLabel(props) {
  const [label, setLabel] = useState(props.item?.label || "");
  const [labelRotation, setLabelRotation] = useState(props.item?.labelRotation || 0);
  const [showLabel, setShowLabel] = useState(props.item?.labelVisible || false);

  useEffect(() => {
    props.onRef && props.onRef({ parentLabelChange, parentLabelVisibilityChange });
    return () => {
      props.onRef && props.onRef(undefined);
    };
  }, []);

  const parentLabelChange = (itemInfo, newLabel) => {
    if (itemInfo.id === props.item.id) {
      setLabel(newLabel);
    }
  };

  const parentLabelVisibilityChange = (itemInfo, visible) => {
    if (itemInfo.id === props.item.id) {
      setShowLabel(visible);
    }
  };

  const onLabelChange = (evt) => {
    const newLabel = evt.target.value;
    setLabel(newLabel);
    props.onLabelChange && props.onLabelChange(props.item.id, newLabel);
  };

  const onLabelVisibilityChange = (event) => {
    const visible = event.target.checked;
    setShowLabel(visible);
    props.onLabelVisibilityChange && props.onLabelVisibilityChange(props.item.id, visible);
  };

  const onSliderChange = (evt) => {
    const rotation = evt.target.value;
    setLabelRotation(rotation);
    props.onLabelRotationChange && props.onLabelRotationChange(props.item, rotation);
  };

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return (
    <div>
      <div className="sc-mymaps-popup-label-toggler">
        <div className={props.item.drawType === "Text" || props.item.drawType === "Callout" ? "sc-mymaps-popup-checkbox disabled" : "sc-mymaps-popup-checkbox"}>
          <label
            style={{
              WebkitTouchCallout: "none",
              WebkitUserSelect: "none",
              KhtmlUserSelect: "none",
              MozUserSelect: "none",
              MsUserSelect: "none",
              UserSelect: "none",
            }}
            onClick={onLabelVisibilityChange}
          >
            <input style={isSafari ? { position: "relative" } : { position: "relative", top: "1.5px" }} type="checkbox" defaultChecked={showLabel} />
            Show Label
          </label>
        </div>

        <div className="sc-mymaps-popup-slider">
          <input type="range" min={0} max={360} value={labelRotation} step="1" onChange={onSliderChange} />
          <label className="sc-mymaps-popup-slider-label">Rotate Label</label>
        </div>
      </div>
      <div>
        <input
          className="sc-mymaps-popup-label-input sc-editable"
          type="text"
          value={label}
          onChange={onLabelChange}
          onFocus={() => {
            helpers.disableKeyboardEvents(true);
          }}
          onBlur={() => {
            helpers.disableKeyboardEvents(false);
          }}
        />
      </div>
    </div>
  );
}

export default MyMapsPopupLabel;
