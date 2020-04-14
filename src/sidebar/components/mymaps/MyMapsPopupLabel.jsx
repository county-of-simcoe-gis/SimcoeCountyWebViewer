import React, { Component } from "react";
import "./MyMapsPopupLabel.css";
import * as helpers from "../../../helpers/helpers";

class MyMapsPopupLabel extends Component {
  constructor(props) {
    super(props);

    this.sliderMin = 0;
    this.sliderMax = 360;

    this.state = {
      label: props.item !== undefined ? props.item.label : "",
      labelRotation: props.item !== undefined ? this.props.item.labelRotation : 0,
      showLabel: props.item !== undefined ? this.props.item.labelVisible : false
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

  // HANDLE PARENT LABEL VISIBLITY CHANGE
  parentLabelVisibilityChange = (itemInfo, visible) => {
    if (itemInfo.id === this.props.item.id) {
      this.setState({ showLabel: visible });
    }
  };

  // HANDLE LABEL CHANGE IN POPUP
  onLabelChange = evt => {
    this.setState({ label: evt.target.value });
    this.props.onLabelChange(this.props.item.id, evt.target.value);
  };

  onLabelVisibilityChange = event => {
    this.props.onLabelVisibilityChange(this.props.item.id, event.target.checked);
    this.setState({ showLabel: event.target.checked });
  };

  // THIS IS REQUIRED WHEN CHANGING LABEL FROM POPUP
  componentWillReceiveProps(nextProps) {
    console.log(nextProps);
    if (nextProps.item.label !== this.state.label) this.setState({ label: nextProps.item.label });

    if (nextProps.item.labelVisible !== this.state.labelVisible) {
      console.log("updating visible");
      this.setState({ labelVisible: nextProps.item.labelVisible });
    }
  }

  // SLIDER CHANGE EVENT
  onSliderChange = evt => {
    this.setState({ labelRotation: evt.target.value });
    this.props.onLabelRotationChange(this.props.item, evt.target.value);
  };

  // onChangeTest = evt => {
  //   this.setState({ checkedTest: evt.target.checked });
  // };

  render() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    return (
      <div>
        <div className="sc-mymaps-popup-label-toggler">
          <div className={this.props.item.drawType === "Text" ? "sc-mymaps-popup-checkbox disabled" : "sc-mymaps-popup-checkbox"}>
            <label
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", KhtmlUserSelect: "none", MozUserSelect: "none", MsUserSelect: "none", UserSelect: "none" }}
              onClick={this.onLabelVisibilityChange}
            >
              <input style={isSafari ? { position: "relative" } : { position: "relative", top: "1.5px" }} type="checkbox" defaultChecked={this.state.showLabel} />
              Show Label
            </label>
          </div>

          <div className="sc-mymaps-popup-slider">
            <input type="range" min={this.sliderMin} max={this.sliderMax} value={this.state.labelRotation} step="1" onChange={this.onSliderChange} />
            <label className="sc-mymaps-popup-slider-label">Rotate Label</label>
          </div>
        </div>
        <div>
          <input 
            className="sc-mymaps-popup-label-input" 
            type="text" 
            value={this.state.label} 
            onChange={this.onLabelChange}
            onFocus={evt => {helpers.disableKeyboardEvents(true);}}
            onBlur={evt => {helpers.disableKeyboardEvents(false);}} />
        </div>
      </div>
    );
  }
}

export default MyMapsPopupLabel;
