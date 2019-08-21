import React, { Component } from "react";
import "./ChildCareFacilities.css";
import PanelComponent from "../../../PanelComponent.jsx";
import * as config from "./config.json";
import ThemeContainer from "../themeComponents/ThemeContainer.jsx";

class RoadConstruction extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  onClose() {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  }

  render() {
    return (
      <PanelComponent onClose={this.props.onClose} name={this.props.name} type="themes">
        <ThemeContainer config={config.default} />
      </PanelComponent>
    );
  }
}

export default RoadConstruction;
