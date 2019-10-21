import React, { Component } from "react";
import "./App.css";
import Header from "./header/Header";
import Sidebar from "./sidebar/Sidebar";
import SCMap from "./map/SCMap";
import "./helpers/SC.css";
import ReactGA from "react-ga";
ReactGA.initialize("UA-3104541-53");
ReactGA.pageview(window.location.pathname + window.location.search);

class App extends Component {

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
