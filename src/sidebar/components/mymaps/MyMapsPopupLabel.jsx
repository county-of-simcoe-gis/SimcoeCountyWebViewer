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
    this.props.onLabelVisibilityChange(this.props.item, checked);
  };

  // THIS IS REQUIRED WHEN CHANGING LABEL FROM POPUP
  componentWillReceiveProps(nextProps) {
    if (nextProps.item.label !== this.state.label) this.setState({ label: nextProps.item.label });
  }

  // SLIDER CHANGE EVENT
  onSliderChange = evt => {
    this.setState({ sliderValue: evt.target.value });
    this.props.onLabelRotationChange(this.props.item, evt.target.value);
  };

  render() {
    return (
      <div>
        <div className="sc-mymaps-popup-label-toggler">
          <OLOverlayCheckbox
            label={"Show Label"}
            defaultChecked={this.props.item.labelVisible}
            parentClickHandler={checked => {
              this.onLabelVisibilityChange(checked);
            }}
          />
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
