// import 'react-app-polyfill/ie11';
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import * as serviceWorker from "./serviceWorker";
import App from "./App";
import "alertifyjs/build/css/alertify.css";
import "alertifyjs/build/css/themes/default.min.css";

const { EventEmitter } = require("fbemitter");

// GLOBAL VARIABLES
window.map = null; // MAIN MAP OBJECT
window.sidebarOpen = null; // SIDEBAR OPEN BOOLEAN
window.emitter = new EventEmitter(); // USE THIS TO LISTEN/BROADCAST EVENTS (e.g. sidebarChange)
window.popup = null; // ONE POPUP FOR ALL
window.disableParcelClick = false; // PROPERTY PARCEL CLICK.  USE THIS TO DISABLE
window.isDrawingOrEditing = false;
window.isCoordinateToolOpen = false;
window.isMeasuring = false;
window.loaded = [];
window.config = {};

window.addEventListener("error", function (e) {
  const { error } = e;
  if (!error.captured) {
    error.captured = true;
    //IGNORE ZOOM ERROR PRODUCED BY STREETS ESRI COMMUNITY BASEMAP
    if (error.message === "Cannot read properties of null (reading 'zoom')") {
      error.shouldIgnore = true;
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    // Revisit this error after the error boundary element processed it
    setTimeout(() => {
      // can be set by the error boundary error handler
      if (!error.shouldIgnore) {
        // but if it wasn't caught by a boundary, release it back to the wild
        throw error;
      }
    });
  }
});

ReactDOM.render(<App />, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
