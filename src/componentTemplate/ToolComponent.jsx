import React from "react";
import "./ToolComponent.css";
import PanelComponent from "../../../PanelComponent";

const ToolComponent = (props) => {
  const onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    props.onClose();
  };

  return (
    <PanelComponent onClose={onClose} name={props.name} helpLink={props.helpLink} hideHeader={props.hideHeader} type="tools">
      <div>Put your components in here.</div>
    </PanelComponent>
  );
};

export default ToolComponent;
