import React, { Component } from "react";
import "./App.css";
import Header from "./header/Header";
import Sidebar from "./sidebar/Sidebar";
import SCMap from "./map/SCMap";
import "./helpers/SC.css";
import mainConfig from "./config.json";
import * as helpers from "./helpers/helpers";
import LoadingScreen from "./helpers/LoadingScreen.jsx";
import ReactGA from "react-ga";

if (mainConfig.googleAnalyticsID !== undefined && mainConfig.googleAnalyticsID !== "") {
  ReactGA.initialize(mainConfig.googleAnalyticsID);
  ReactGA.pageview(window.location.pathname + window.location.search);
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state={
      mapLoading:true,
      sidebarLoading:true,
      headerLoading:true,

    };
    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.setState({mapLoading:false}));
    // LISTEN FOR SIDEBAR TO MOUNT
    window.emitter.addListener("sidebarLoaded", () => this.setState({sidebarLoading:false}));
    // LISTEN FOR HEADER TO MOUNT
    window.emitter.addListener("headerLoaded", () => this.setState({headerLoading:false}));

  };
  componentWillMount() {
    document.title = mainConfig.title;
    window.app = packageJson.name 
    window.version = packageJson.version
    this.setControlPreferences();
  };
  setControlPreferences(){
    const localMapControls = helpers.getItemsFromStorage("Map Control Settings");
    
    if (localMapControls !== undefined ) window.mapControls = localMapControls;
    else window.mapControls = mainConfig.controls;
  }
  render() {
    return (
      <div>
        <div id="portal-root" />
        <LoadingScreen visible={this.state.mapLoading || this.state.sidebarLoading || this.state.headerLoading} backgroundColor={"#3498db"} />
        <Header />
        <Sidebar />
        <SCMap />
        {/* <AttributeTable></AttributeTable> */}
      </div>
    );
  }
}

export default App;
