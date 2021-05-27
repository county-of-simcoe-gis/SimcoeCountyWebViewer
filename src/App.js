import React, { Component, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";
import "./App.css";
import Header from "./header/Header";
import Sidebar from "./sidebar/Sidebar";
import SCMap from "./map/SCMap";
import LegendApp from "./legend/App";
import "./helpers/SC.css";
import mainConfig from "./config.json";
import * as helpers from "./helpers/helpers";
import LoadingScreen from "./helpers/LoadingScreen.jsx";
import ReactGA from "react-ga";
import packageJson from '../package.json';

const enableAnalytics = helpers.getURLParameter("ANALYTICS") !== "OFF";
if (mainConfig.googleAnalyticsID !== undefined && mainConfig.googleAnalyticsID !== "" && enableAnalytics)  {
  ReactGA.initialize(mainConfig.googleAnalyticsID);
  ReactGA.pageview(window.location.pathname + window.location.search);
}

class App extends Component {
  setControlPreferences() {
    const localMapControls = helpers.getItemsFromStorage("Map Control Settings");
    
    if (localMapControls !== undefined ) window.mapControls = localMapControls;
    else window.mapControls = mainConfig.controls;
  }
  componentWillMount() {
    document.title = mainConfig.title;
    window.app = packageJson.name 
    window.version = packageJson.version
    this.setControlPreferences();
  };
  
  render() {
    return (
      <Router>
        
        <Switch>
        <Route path="/legend">
          <LegendApp />
        </Route>
         <Route path="/public">
          <MapApp />
        </Route>
        <Route path="/">
          <MapApp />
        </Route>
        </Switch>
      </Router>
      
    );
  }
}


function MapApp(){
  window.zoning = helpers.getURLParameter("ZONING",true, true) !== null;
  const [mapLoading, setMapLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [sidebarOpt, setSidebarOpt] = useState({});
  const [headerOpt, setHeaderOpt] = useState({});
  const [mapOpt, setMapOpt] = useState({});
  const [loadingOpt, setLoadingOpt] = useState({});
  const [appPots, setAppOpt] = useState({});
  // LISTEN FOR MAP TO MOUNT
  window.emitter.addListener("mapLoaded", () => setMapLoading(false));
  // LISTEN FOR SIDEBAR TO MOUNT
  window.emitter.addListener("sidebarLoaded", () => setSidebarLoading(false));
  // LISTEN FOR HEADER TO MOUNT
  window.emitter.addListener("headerLoaded", () => setHeaderLoading(false));
  useEffect(()=>{
    setSidebarOpt({
                    "tocType": "LIST",
                    "sidebarToolComponents":[],
                    "sidebarThemeComponents": [],
                    "sidebarShortcutParams":[],
                  });
    setHeaderOpt({});
    setMapOpt({
                "centerCoords": [-8878504.68, 5543492.45],
                "defaultZoom": 10,
                "maxZoom": 20,
                "controls": {
                            "rotate": false,
                            "fullScreen": false,
                            "zoomInOut": false,
                            "currentLocation": false,
                            "zoomExtent": false,
                            "scale": false,
                            "scaleLine": false,
                            "basemap": false
                          },
              });
    setAppOpt({});
  },[]);
  return (
    <div>
      <div id="portal-root" />
      <LoadingScreen visible={mapLoading || sidebarLoading || headerLoading} backgroundColor={"#3498db"} options={loadingOpt} />
      <Header options={headerOpt} />
      <Sidebar mapLoading={mapLoading} headerLoading={headerLoading} options={sidebarOpt} />
      <SCMap options={mapOpt} />
    </div>
  );
}
export default App;
