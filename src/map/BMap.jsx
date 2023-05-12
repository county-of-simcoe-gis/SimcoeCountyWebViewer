import React, { Component } from "react";
import BasemapSwitcher from "./BasemapSwitcher";
import BasicBasemapSwitcher from "./BasicBasemapSwitcher";
import * as helpers from "../helpers/helpers";

class BMap extends Component {
  constructor(props) {
    //IMPLEMENT OTHER JUNK HERE
    super(props);
    this.state = {
      baseMapType: null, //This is what basemap type will eventually be loaded into
    };
  }

  componentDidMount() {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      const basemap = window.config.baseMapType !== undefined ? window.config.baseMapType : "Default";
      this.setState({ baseMapType: basemap });
    });
  }

  render() {
    return <div>{this.state.baseMapType == null ? null : <BMapItem baseMapType={this.state.baseMapType} />}</div>;
  }
}

export default BMap;

class BMapItem extends Component {
  state = {};

  render() {
    return <div>{this.props.baseMapType.toLowerCase() == "basic" ? <BasicBasemapSwitcher></BasicBasemapSwitcher> : <BasemapSwitcher></BasemapSwitcher>}</div>;
  }
}
