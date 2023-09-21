import React from "react";
import "./ThemeComponent.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";

const ThemeComponent = (props) => {
  const onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    props.onClose();
  };

  return (
    <PanelComponent onClose={onClose} name={props.name} helpLink={props.helpLink} hideHeader={props.hideHeader} type="themes">
      <div>Put your components in here.</div>
    </PanelComponent>
  );
};

export default ThemeComponent;
