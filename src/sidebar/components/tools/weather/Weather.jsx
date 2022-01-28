import React, { Component } from "react";
import "./Weather.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import WeatherForecast from "./WeatherForecast.jsx";
import WeatherRadar from "./WeatherRadar.jsx";

class Weather extends Component {
  constructor(props) {
    super(props);

    this.state = {
      tabIndex: 0,
    };
  }

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  onTabSelect = (tabIndex) => {
    this.setState({ tabIndex });
    if (tabIndex === 0) helpers.addAppStat("Tab", "Weather - Radar");
    else if (tabIndex === 1) helpers.addAppStat("Tab", "Weather - Forecast");
  };
  render() {
    return (
      <PanelComponent onClose={this.onClose} name={this.props.name} helpLink={this.props.helpLink} hideHeader={this.props.hideHeader} type="tools">
        <div className="sc-tool-weather-container">
          <Tabs forceRenderTabPanel={true} selectedIndex={this.state.tabIndex} onSelect={this.onTabSelect}>
            <TabList>
              <Tab id="tab-weather-radar">Radar</Tab>
              <Tab id="tab-weather-forecast">Forecast</Tab>
            </TabList>

            <TabPanel id="tab-panel-weather-radar">
              <WeatherRadar></WeatherRadar>
            </TabPanel>
            <TabPanel id="tab-panel-weather-forecast">
              <WeatherForecast></WeatherForecast>
            </TabPanel>
          </Tabs>
        </div>
      </PanelComponent>
    );
  }
}

export default Weather;
