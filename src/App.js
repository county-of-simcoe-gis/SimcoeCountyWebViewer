import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Header from "./header/Header";
import Sidebar from "./sidebar/Sidebar";
import SCMap from "./map/SCMap";
import LegendApp from "./legend/App";
import LayerInfoApp from "./layerInfo/App";

import "./helpers/SC.css";
import mainConfig from "./config.json";
import * as helpers from "./helpers/helpers";
import LoadingScreen from "./helpers/LoadingScreen.jsx";
import ReactGA from "react-ga4";
import packageJson from "../package.json";

const App = () => {
  const setControlPreferences = () => {
    const localMapControls = helpers.getItemsFromStorage("Map Control Settings");

    if (localMapControls !== undefined) window.mapControls = localMapControls;
    else window.mapControls = mainConfig.controls;
  };
  useEffect(() => {
    const enableAnalytics = helpers.getURLParameter("ANALYTICS") !== "off";
    if (mainConfig.googleAnalyticsID !== undefined && mainConfig.googleAnalyticsID !== "" && enableAnalytics) {
      ReactGA.initialize(mainConfig.googleAnalyticsID);
      ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
    }
    window.app = packageJson.name;
    window.homepage = packageJson.homepage;
    window.version = packageJson.version;
    setControlPreferences();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/legend" element={<LegendApp />} />
        <Route path="/layerInfo" element={<LayerInfoApp />} />
        <Route path="/public" element={<MapApp />} />
        <Route exact path="/" element={<MapApp />} />
        <Route path="*" element={<MapApp />} />
      </Routes>
    </Router>
  );
};

const MapApp = (props) => {
  const [mapLoading, setMapLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [headerLoading, setHeaderLoading] = useState(true);

  const changeIcon = (icon) => {
    var link = document.getElementById("favicon");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.id = "favicon";
      document.getElementsByTagName("head")[0].appendChild(link);
    }
    let urlArray = link.href.split("/");
    urlArray.pop();
    icon = `${urlArray.join("/")}/${icon}`;
    link.href = icon;
  };
  useEffect(() => {
    window.security = [];
    helpers.addIsLoaded("security");

    // LISTEN FOR MAP TO MOUNT
    const mapLoadedListener = () => setMapLoading(false);
    window.emitter.addListener("mapLoaded", mapLoadedListener);
    // LISTEN FOR SIDEBAR TO MOUNT
    const sidebarLoadedListener = () => setSidebarLoading(false);
    window.emitter.addListener("sidebarLoaded", sidebarLoadedListener);
    // LISTEN FOR HEADER TO MOUNT
    const headerLoadedListener = () => setHeaderLoading(false);
    window.emitter.addListener("headerLoaded", headerLoadedListener);

    window.app = packageJson.name;
    window.homepage = packageJson.homepage;
    window.version = packageJson.version;
    helpers.loadConfig(undefined, () => {
      document.title = window.config.title;
      if (window.config.favicon) changeIcon(window.config.favicon);
      helpers.addIsLoaded("settings");
      if (window.config.default_theme !== undefined) window.emitter.emit("activateSidebarItem", window.config.default_theme, "themes");
      if (window.config.default_tool !== undefined) window.emitter.emit("activateSidebarItem", window.config.default_tool, "tools");
    });
    return () => {
      window.emitter.removeListener("mapLoaded", mapLoadedListener);
      window.emitter.removeListener("sidebarLoaded", sidebarLoadedListener);
      window.emitter.removeListener("headerLoaded", headerLoadedListener);

      // headerLoadedListener.remove();
      // sidebarLoadedListener.remove();
      // mapLoadedListener.remove();
    };
  }, []);

  return (
    <div>
      <div id="portal-root" />
      <LoadingScreen visible={mapLoading || sidebarLoading || headerLoading} backgroundColor={"#3498db"} />
      <Header mapLoading={mapLoading} sidebarLoading={sidebarLoading} />
      <Sidebar mapLoading={mapLoading} headerLoading={headerLoading} />
      <SCMap sidebarLoading={sidebarLoading} headerLoading={headerLoading} />
    </div>
  );
};
export default App;
