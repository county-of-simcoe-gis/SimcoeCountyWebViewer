// OL HAS A NASTY BUG WHERE EVENTS DONT FIRE ON OVERLAYS
// React and its onChange event was not firing.  Tried many different methods.  
// This component accepts props without using state and is forced to update from props.
// Spent too much time already and this works.  Any cleaner ideas?

import React from 'react';
import * as helpers from "./helpers";

class OLOverlayCheckbox extends React.Component {

  onCheckboxClick = (evt) => { 

    // STUPID IE BUG NOT SETTING THE CHECKBOX!!!!
    const isIE = /*@cc_on!@*/false || !!document.documentMode;
    if (isIE)
      document.getElementById("sc-ol-checkbox").checked = !evt.target.checked;

    this.props.parentClickHandler(!evt.target.checked);
  }

  render () {

    // FORCE CHECKBOX UPDATE
    if (this.node !== undefined)
      this.node.checked = this.props.defaultChecked;

      
    return (        
            <label htmlFor="sc-ol-checkbox"><input
              id="sc-ol-checkbox"
              contentEditable="false"
              style={{verticalAlign: "middle"}}
              type="checkbox"
              defaultChecked={this.props.defaultChecked}
              onClick={this.onCheckboxClick}
              onMouseUp={helpers.convertMouseUpToClick}
              onChange={this.onChange}
              ref={(input) => { this.node = input; }}
            />{this.props.label}</label>
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