import React, { Component } from "react";
import "./App.css";
import Header from "./header/Header";
import Sidebar from "./sidebar/Sidebar";
import SCMap from "./map/SCMap";
import "./helpers/SC.css";
import mainConfig from "./config.json";
import ReactGA from "react-ga";
// import AttributeTable from "./helpers/AttributeTable.jsx";

if (mainConfig.googleAnalyticsID !== undefined && mainConfig.googleAnalyticsID !== "") {
  ReactGA.initialize(mainConfig.googleAnalyticsID);
  ReactGA.pageview(window.location.pathname + window.location.search);
}

class App extends Component {
  componentWillMount() {
    document.title = mainConfig.title;
  }
  render() {
    return (
      <div>
        <div id="portal-root" />
        <Header />
        <Sidebar />
        <SCMap />
        {/* <AttributeTable></AttributeTable> */}
      </div>
    );
  }
}

export default App;
