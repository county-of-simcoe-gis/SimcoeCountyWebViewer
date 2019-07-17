// OL HAS A NASTY BUG WHERE EVENTS DONT FIRE ON OVERLAYS
// React and its onChange event was not firing.  Tried many different methods.
// Parent needs to force update because it's uncontrolled and using defaultValue
// Spent too much time already and this works.  Any cleaner ideas?

import React from "react";
import * as helpers from "./helpers";

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

const OLOverlayCheckbox = props => {
  return (
    <label
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", KhtmlUserSelect: "none", MozUserSelect: "none", MsUserSelect: "none", UserSelect: "none" }}
      onMouseUp={helpers.convertMouseUpToClick}
      onClick={evt => {
        var chk = document.getElementById(props.id);
        props.onCheckboxClick(chk.checked);

        // SAFARI IS SPECIAL
        if (evt.target.id !== props.id && isSafari) chk.checked = !chk.checked;
      }}
    >
      <input style={isSafari ? { position: "relative" } : { position: "relative", top: "1.5px" }} id={props.id} type="checkbox" defaultChecked={props.checked} readOnly />
      {props.label}
    </label>
  );
};

export default OLOverlayCheckbox;
