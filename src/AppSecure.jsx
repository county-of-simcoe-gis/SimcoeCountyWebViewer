import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MsalProvider, MsalAuthenticationTemplate, UnauthenticatedTemplate, useMsal, useIsAuthenticated } from "@azure/msal-react";
import { PublicClientApplication, InteractionStatus } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";
import { ErrorBoundary } from "./ErrorBoundary.jsx";

import "./App.css";
import Header from "./header/Header";
import Sidebar from "./sidebar/Sidebar";
import SCMap from "./map/SCMap";
import "./helpers/SC.css";
import mainConfig from "./config.json";
import configSecured from "./config-secured.json";
import LoadingScreen from "./helpers/LoadingScreen.jsx";

import ReactGA from "react-ga4";
import * as helpers from "./helpers/helpers";
import { getUserStorage } from "./helpers/storage";

import * as helpersEsri from "./helpers/esriHelpers";
import { get } from "./helpers/api";
import packageJson from "../package.json";
import LegendApp from "./legend/App";
import LayerInfoApp from "./layerInfo/App";

const msalInstance = new PublicClientApplication(msalConfig);
await msalInstance.initialize();
const apiUrl = configSecured.apiUrlSecured;
var securityCalled = false;
window.security = [];
window.isAppSecured = true;

// SECURED VERSION
document.title = mainConfig.title;

// GOOGLE ANALYTICS
const enableAnalytics = helpers.getURLParameter("ANALYTICS") !== "off";
if (mainConfig.googleAnalyticsID !== undefined && mainConfig.googleAnalyticsID !== "" && enableAnalytics) {
  ReactGA.initialize(mainConfig.googleAnalyticsID);
  ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
}

const InProgressComponent = ({ inProgress }) => {
  return <h3>{inProgress} In Progress. Please wait.</h3>;
};
const LoginComponent = (props) => {
  return (
    <div className={"sc-button sc-button-light-blue sc-login"} onClick={() => props.handleLogin(props.instance)} title="Login">
      Login
    </div>
  );
};
function handleLogin(instance) {
  instance.loginRedirect(msalConfig).catch((e) => {
    console.error(e);
  });
}
const ErrorComponent = ({ error }) => {
  return (
    <h3>
      This Web Map is a secured page and the following error occurred during authentication: <strong>{error.errorCode}</strong>
    </h3>
  );
};

const MainContent = () => {
  const { instance, accounts, inProgress } = useMsal();
  const [mapLoading, setMapLoading] = useState(true);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [headerLoading, setHeaderLoading] = useState(true);
  const isAuthenticated = useIsAuthenticated();

  // LISTEN FOR ESRI LOGIN CALLBACK
  window.emitter.addListener("esriLoginComplete", (esriLogin) => {
    helpersEsri.processToken(esriLogin);
  });

  // LISTEN FOR MAP TO MOUNT
  window.emitter.addListener("mapLoaded", () => setMapLoading(false));
  // LISTEN FOR SIDEBAR TO MOUNT
  window.emitter.addListener("sidebarLoaded", () => setSidebarLoading(false));
  // LISTEN FOR HEADER TO MOUNT
  window.emitter.addListener("headerLoaded", () => setHeaderLoading(false));
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
    if (!isAuthenticated && inProgress === InteractionStatus.None) {
      handleLogin(instance);
    } else {
      let account = undefined;
      const tenantId = msalConfig.tenant;
      if (accounts.length === 0) return;
      //console.log(accounts);
      account = accounts.filter((item) => {
        return item.tenantId === tenantId;
      })[0];
      if (!account) {
        //something went wrong, clear the user login cache and try again
        clearUserToken();
        handleLogin(instance);
      }
      window.instance = instance;
      window.account = account;
      setSecurity(account);
    }
  }, [instance, accounts, inProgress, isAuthenticated]);

  useEffect(() => {
    window.app = packageJson.name;
    window.homepage = packageJson.homepage;
    window.version = packageJson.version;
    helpers.waitForLoad("security", Date.now(), 30, () => {
      getUserStorage(() => {
        setControlPreferences();
        versionCleanup();
        helpers.loadConfig(configSecured, () => {
          document.title = window.config.title;
          if (window.config.favicon) changeIcon(window.config.favicon);
          helpers.addIsLoaded("settings");
          helpers.waitForLoad("sidebar", Date.now(), 30, () => {
            if (window.config.default_theme !== undefined) window.emitter.emit("activateSidebarItem", window.config.default_theme, "themes");
            if (window.config.default_tool !== undefined) window.emitter.emit("activateSidebarItem", window.config.default_tool, "tools");
          });
        });
      });
    });
  }, []);
  return (
    <div className="App">
      <ErrorBoundary>
        <MsalAuthenticationTemplate interactionType="redirect" loadingComponent={InProgressComponent} errorComponent={ErrorComponent}>
          <div>
            <div id="portal-root" />
            <LoadingScreen visible={mapLoading || sidebarLoading || headerLoading} backgroundColor={"#3498db"} />
            <Header mapLoading={mapLoading} sidebarLoading={sidebarLoading} />
            <Sidebar mapLoading={mapLoading} headerLoading={headerLoading} />
            <SCMap sidebarLoading={sidebarLoading} headerLoading={headerLoading} />
            {/* <AttributeTable></AttributeTable> */}
          </div>
        </MsalAuthenticationTemplate>
      </ErrorBoundary>

      <UnauthenticatedTemplate>
        <h3 className="card-title">Unauthenticated.</h3>
        <LoginComponent handleLogin={handleLogin} instance={instance} />
      </UnauthenticatedTemplate>
    </div>
  );
};

export default function AppSecure() {
  return (
    <Router>
      <Routes>
        <Route path="/legend" element={<LegendApp />} />
        <Route path="/layerInfo" element={<LayerInfoApp secure={true} />} />
        <Route path="/public" element={<MapApp />} />
        <Route path="/oauth-callback.html" element={<OAuthCallback />} />
        <Route exact path="/" element={<MapApp />} />
        <Route path="*" element={<MapApp />} />
      </Routes>
    </Router>
  );
}

const clearUserToken = () => {
  //remove previous cached login information
  Object.keys(localStorage).forEach((key) => {
    if (key.indexOf("login.microsoftonline.com") !== -1 || key.indexOf("login.windows.net") !== -1 || key.indexOf("msal.") !== -1) {
      localStorage.removeItem(key);
    }
  });
};
const versionCleanup = () => {
  if (packageJson.version !== helpers.getItemsFromStorage("cacheVersion")) {
    let previousVersion = helpers.getItemsFromStorage("cacheVersion");
    previousVersion = !previousVersion ? packageJson.version : previousVersion;
    let majorVersion = parseInt(previousVersion.split(".")[0]);
    let minorVersion = parseInt(previousVersion.split(".")[1]);
    let patchVersion = parseInt(previousVersion.split(".")[2]);
    console.log("Version has changed from " + previousVersion + " to " + packageJson.version);
    console.log("Major Version: " + majorVersion);
    console.log("Minor Version: " + minorVersion);
    console.log("Patch Version: " + patchVersion);
    helpers.removeFromStorage("cacheVersion");
    helpers.saveToStorage("cacheVersion", packageJson.version);
    //ADD ANY CLEANUP CODE HERE
    if (majorVersion <= 1 && minorVersion <= 1 && patchVersion <= 8) helpers.removeFromStorage("avlLive"); //remove old avlLive as prior to version 1.1.9 geotab options didn't exist
    if (majorVersion <= 1 && minorVersion <= 1 && patchVersion <= 1) helpers.removeFromStorage("ArcGIS_Token"); //remove old ArcGIS Tokens as prior to version 1.1.2 they had an incorrect expiry date
    if (majorVersion <= 1 && minorVersion <= 1 && patchVersion <= 14) clearUserToken(); //remove old authentication tokens
  }
};
const MapApp = () => {
  return (
    <MsalProvider instance={msalInstance}>
      <MainContent />
    </MsalProvider>
  );
};
const setSecurity = (account) => {
  if (securityCalled) return;
  console.log("setting security");
  securityCalled = true;
  helpers.addAppStat("SECURITY_LOG_ON", account.name);

  //===========USE SECURITY ROLES=================
  // window.security = account.idTokenClaims && account.idTokenClaims.roles ? account.idTokenClaims.roles : [];
  // console.log(account);
  // console.log("Emitting security complete without errors");
  // window.emitter.emit("securityComplete", window.security);
  // helpers.addIsLoaded("security");

  //===========USE API FOR SECURITY ROLES=================
  get(apiUrl + "secure/security/" + account.localAccountId, { useBearerToken: true }, (result) => {
    if (!result || !result.toString().includes("error")) {
      window.security = result;
      console.log("Emitting security complete without errors");
      window.emitter.emit("securityComplete", result);
      helpers.addIsLoaded("security");
    }
  });
};

const setControlPreferences = () => {
  const localMapControls = helpers.getItemsFromStorage("Map Control Settings");
  window.mapControls = mainConfig.controls;
  if (localMapControls) {
    if (localMapControls.rotate) window.mapControls.rotate = localMapControls.rotate;
    if (localMapControls.fullScreen) window.mapControls.fullScreen = localMapControls.fullScreen;
    if (localMapControls.zoomInOut) window.mapControls.zoomInOut = localMapControls.zoomInOut;
    if (localMapControls.currentLocation) window.mapControls.currentLocation = localMapControls.currentLocation;
    if (localMapControls.zoomExtent) window.mapControls.zoomExtent = localMapControls.zoomExtent;
    if (localMapControls.scale) window.mapControls.scale = localMapControls.scale;
    if (localMapControls.scaleLine) window.mapControls.scaleLine = localMapControls.scaleLine;
    if (localMapControls.basemap) window.mapControls.basemap = localMapControls.basemap;
    if (localMapControls.gitHubButton) window.mapControls.gitHubButton = localMapControls.gitHubButton;
    if (localMapControls.scaleSelector) window.mapControls.scaleSelector = localMapControls.scaleSelector;
  }
};
const OAuthCallback = () => {
  useEffect(() => {
    window.location.href = process.env.PUBLIC_URL + "oauth-callback.html";
  }, []);
  return <div></div>;
};
