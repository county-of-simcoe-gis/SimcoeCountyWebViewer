// import 'react-app-polyfill/ie11';
import React from "react";
import { createRoot } from "react-dom/client";
import { EventEmitter } from "events";

import "./index.css";
import * as serviceWorker from "./serviceWorker.js";
import "alertifyjs/build/css/alertify.css";
import "alertifyjs/build/css/themes/default.min.css";

const root = createRoot(document.getElementById("root"));
let element = document.createElement("div");
element.setAttribute("id", "portal-root");
document.getElementById("root").appendChild(element);
window.portalRoot = createRoot(document.getElementById("portal-root"));

if (process.env.REACT_APP_SECURED === "true") {
  import("./AppSecure.jsx")
    .then((module) => {
      const AppSecure = module.default;
      root.render(<AppSecure />);
    })
    .catch((error) => {
      console.log(error);
    });
} else {
  import("./App.jsx")
    .then((module) => {
      const App = module.default;
      root.render(<App />);
    })
    .catch((error) => {
      console.log(error);
    });
}

// GLOBAL VARIABLES
window.map = null; // MAIN MAP OBJECT
window.sidebarOpen = null; // SIDEBAR OPEN BOOLEAN
window.emitter = new EventEmitter(); // USE THIS TO LISTEN/BROADCAST EVENTS (e.g. sidebarChange)
window.emitter.setMaxListeners(100);
window.popup = null; // ONE POPUP FOR ALL
window.disableParcelClick = false; // PROPERTY PARCEL CLICK.  USE THIS TO DISABLE
window.isDrawingOrEditing = false;
window.isCoordinateToolOpen = false;
window.isMeasuring = false;
window.loaded = [];
window.config = {};

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
