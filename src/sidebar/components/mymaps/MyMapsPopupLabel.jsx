import React, { Component } from "react";
import * as helpers from "../../../helpers/helpers";
import * as myMapsHelpers from "./myMapsHelpers";
import "./MyMapsPopupLabel.css";
import OLOverlayCheckbox from "../../../helpers/OLOverlayCheckbox.jsx";
import Slider from "rc-slider";
import { MouseWheelZoom } from "ol/interaction";

class MyMapsPopupLabel extends Component {
  constructor(props) {
    super(props);

    this.sliderMin = 0;
    this.sliderMax = 360;

    this.state = {
      label: props.item.label,
      sliderValue: this.props.item.labelRotation
      //checked: this.props.item.labelVisible
    };
  }

  // USING REFS TO LISTEN TO CHANGES FROM MAIN MYMAPS COMPONENT
  componentDidMount() {
    this.props.onRef(this);
  }
  componentWillUnmount() {
    this.props.onRef(undefined);
  }

  // HANDLE PARENT MAKING LABEL CHANGE
  parentLabelChange = (itemInfo, newLabel) => {
    if (itemInfo.id === this.props.item.id) {
      this.setState({ label: newLabel });
    }
  };

  // HANDLE LABEL CHANGE IN POPUP
  onLabelChange = evt => {
    this.setState({ label: evt.target.value });
    this.props.onLabelChange(this.props.item, evt.target.value);
  };

  onLabelVisibilityChange = checked => {
    console.log(!checked);
    //this.setState({ checked: !checked });
    this.props.onLabelVisibilityChange(this.props.item.id, !checked);
    // console.log(checked);
    // this.setState({ checked: checked });
    // this.props.onLabelVisibilityChange(this.props.item.id, checked);
  };

  // THIS IS REQUIRED WHEN CHANGING LABEL FROM POPUP
  componentWillReceiveProps(nextProps) {
    console.log(nextProps);
    if (nextProps.item.label !== this.state.label) this.setState({ label: nextProps.item.label });
    //if (nextProps.item.labelVisible !== this.state.checked) this.setState({ checked: nextProps.item.labelVisible });
  }

  // SLIDER CHANGE EVENT
  onSliderChange = evt => {
    this.setState({ sliderValue: evt.target.value });
    this.props.onLabelRotationChange(this.props.item, evt.target.value);
  };

  render() {
    console.log(this.props.item.labelVisible);
    //console.log(this.state.checked);
    return (
      <div>
        <div className="sc-mymaps-popup-label-toggler">
          <div className={this.props.item.drawType === "Text" ? "sc-mymaps-popup-checkbox disabled" : "sc-mymaps-popup-checkbox"}>
            {/* <OLOverlayCheckbox
              label={"Show Label"}
              defaultChecked={this.props.item.labelVisible}
              id={this.props.item.id}
              parentClickHandler={checked => {
                this.onLabelVisibilityChange(checked);
              }}
            /> */}
            <label
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", KhtmlUserSelect: "none", MozUserSelect: "none", MsUserSelect: "none", UserSelect: "none" }}
              onMouseUp={helpers.convertMouseUpToClick}
              onClick={evt => {
                //console.log("label");
                var chk = document.getElementById("sc-mymaps-popup-label-checkbox");
                console.log(chk.checked);
                this.onLabelVisibilityChange(chk.checked);
              }}
            >
              <input
                style={{ position: "relative", top: "1.5px" }}
                id="sc-mymaps-popup-label-checkbox"
                type="checkbox"
                // onChange={() => {
                //   console.log("change");
                // }}
                // onClick={evt => {
                //   this.onLabelVisibilityChange(evt.target.checked);
                //   //this.props.onLabelVisibilityChange(this.props.item.id, evt.checked);
                // }}
                //onMouseUp={helpers.convertMouseUpToClick}
                //checked={this.state.checked}
                //defaultChecked={this.state.checked}
                //defaultChecked={this.props.item.labelVisible}
                checked={this.props.item.labelVisible}
                readOnly
              />
              Show Label
            </label>
          </div>

          <div className="sc-mymaps-popup-slider">
            <input type="range" min={this.sliderMin} max={this.sliderMax} value={this.state.sliderValue} step="1" onChange={this.onSliderChange} />
            <label className="sc-mymaps-popup-slider-label">Rotate</label>
          </div>
        </div>
        <div>
          <input className="sc-mymaps-popup-label-input" type="text" value={this.state.label} onChange={this.onLabelChange} />
        </div>
      </div>
    );
  }
}

export default MyMapsPopupLabel;
