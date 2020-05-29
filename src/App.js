import React, { Component } from "react";
import "./App.css";
import Header from "./header/Header";
import Sidebar from "./sidebar/Sidebar";
import SCMap from "./map/SCMap";
import "./helpers/SC.css";
import mainConfig from "./config.json";
import * as helpers from "./helpers/helpers";
import ReactGA from "react-ga";
import packageJson from '../package.json';

ReactGA.initialize("UA-165888448-1");
ReactGA.pageview(window.location.pathname + window.location.search);

class App extends Component {
  componentWillMount() {
    document.title = mainConfig.title;
    window.app = packageJson.name 
    window.version = packageJson.version
    this.setControlPreferences();
  };
  setControlPreferences(){
    const localMapControls = helpers.getItemsFromStorage("mapControlSettings");
    
    if (localMapControls !== undefined ) window.mapControls = localMapControls;
    else window.mapControls = mainConfig.controls;
  }
  render() {
    return (
      <div>
        <div id="portal-root" />
        <Header />
        <Sidebar />
        <SCMap />
      </div>
    );
  }
}

export default App;
