import React, { Component } from "react";
import "./ThemeComponent.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";

class ThemeComponent extends Component {
  state = {};

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  render() {
    return (
      <PanelComponent onClose={this.onClose} name={this.props.name} helpLink={this.props.helpLink} hideHeader={this.props.hideHeader} type="themes">
        <div>Put your components in here.</div>
      </PanelComponent>
    );
  }
}

export default ThemeComponent;
