// OL HAS A NASTY BUG WHERE EVENTS DONT FIRE ON OVERLAYS
// React and its onChange event was not firing.  Tried many different methods.
// This component accepts props without using state and is forced to update from props.
// Spent too much time already and this works.  Any cleaner ideas?

import React from "react";
import * as helpers from "./helpers";

class OLOverlayCheckbox extends React.Component {
  onCheckboxClick = evt => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      // SAFARI IS SPECIAL
      const type = evt.target.tagName.toLowerCase();
      if (type === "label") {
        document.getElementById("sc-ol-checkbox").checked = !this.node.checked;
        this.props.parentClickHandler(this.node.checked);
      } else {
        this.props.parentClickHandler(!this.node.checked);
      }
    } else {
      this.props.parentClickHandler(!this.node.checked);
    }

    document.getElementById("map").focus();
  };

  render() {
    // FORCE CHECKBOX UPDATE
    if (this.node !== undefined) {
      if (this.node.checked !== this.props.defaultChecked) this.node.checked = this.props.defaultChecked;
    }

    return (
      <label htmlFor="sc-ol-checkbox" onMouseUp={helpers.convertMouseUpToClick} onClick={this.onCheckboxClick}>
        <input
          id="sc-ol-checkbox"
          contentEditable="false"
          style={{ verticalAlign: "middle" }}
          type="checkbox"
          defaultChecked={this.props.defaultChecked}
          ref={input => {
            this.node = input;
          }}
        />
        {this.props.label}
      </label>
      //   <input
      //   id="sc-ol-checkbox"
      //   style={{verticalAlign: "middle"}}
      //   type="checkbox"
      //   defaultChecked={this.props.defaultChecked}
      //   onClick={this.onCheckboxClick}
      //   onMouseUp={helpers.convertMouseUpToClick}
      //   ref={(input) => { this.node = input; }}
      // />
    );
  }
}

export default OLOverlayCheckbox;
