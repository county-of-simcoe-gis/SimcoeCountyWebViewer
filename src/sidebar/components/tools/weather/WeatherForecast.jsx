import React, { Component } from "react";
import "./WeatherForecast.css";
import * as helpers from "../../../../helpers/helpers";
import config from "./config.json";

class WeatherForecast extends Component {
  constructor(props) {
    super(props);

    this.state = {
      cityInfo: [],
    };
  }

  componentDidMount() {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      this.refreshWeather();
    });
  }

  refreshWeather = () => {
    const urlTemplate = (cityCode) => `${window.config.apiUrl}public/map/tool/weather/CityWeather/${cityCode}`;

    this.setState({ cityInfo: [] }, () => {
      const cities = config.cities;
      cities.forEach((cityInfo) => {
        helpers.getJSON(urlTemplate(cityInfo.code), (result) => {
          result.forecastUrl = cityInfo.forecastUrl;
          this.setState((prevState) => {
            let prevCities = prevState.cityInfo;
            prevCities.push(result);
            return { cityInfo: prevCities };
          });
        });
      });
    });
  };

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  render() {
    return (
      <div className="sc-tool-weather-forecast-container">
        {this.state.cityInfo.map((city) => (
          <Forecast key={helpers.getUID()} info={city} />
        ))}
      </div>
    );
  }
}

export default WeatherForecast;

const Forecast = (props) => {
  const { siteData, forecastUrl } = props.info;
  const forecast1 = siteData?.forecastGroup?.forecast[0];
  const forecast2 = siteData?.forecastGroup?.forecast[1];
  const forecast3 = siteData?.forecastGroup?.forecast[2];
  const iconUrl = (code) => `https://weather.gc.ca/weathericons/small/${code}.png`;

  const warnings = siteData?.warnings;
  let warningEvents = [];
  let warningUrl = "";
  if (warnings !== "") {
    try {
      warningUrl = warnings.event.$.url;
      if (warnings.event.length === undefined) warningEvents.push(warnings.event);
      else
        warnings.event.forEach((event) => {
          warningEvents.push(event);
        });
    } catch (e) {
      console.error("Weather Forecast Warning Error: ", e);
    }
  }

  return (
    <div className="sc-tool-weather-forecast-day">
      <label className="sc-tool-weather-forecast-dt">{siteData?.forecastGroup?.dateTime[1]?.textSummary}</label>
      <div>
        <fieldset className="sc-fieldset" style={{ marginTop: "0px" }}>
          <legend className="sc-tool-weather-forecast-legend">{siteData?.location.name["#text"]}</legend>
          <div className={warningEvents.length === 0 ? "sc-hidden" : "sc-tool-weather-forecast-warnings-container"}>
            {warningEvents.map((event) => (
              <Warning key={helpers.getUID()} info={event} url={warningUrl} />
            ))}
          </div>
          <div className={warningEvents.length === 2 ? "sc-tool-weather-forecast-days-container two-warnings" : "sc-tool-weather-forecast-days-container"}>
            <div className="sc-tool-weather-forecast-day-container" title={forecast1?.textSummary}>
              <div className="sc-tool-weather-forecast-day-details">
                <label>{forecast1?.period?.textForecastName}</label>
                <img className="sc-tool-weather-forecast-details-img" src={iconUrl(forecast1?.abbreviatedForecast?.iconCode["#text"])} alt="icon" />
                <label>{forecast1?.temperatures?.temperature["#text"]}</label>
                <label className="sc-tool-weather-tool-forecast-summary">{forecast1?.abbreviatedForecast?.textSummary}</label>
              </div>
            </div>
            <div className="sc-tool-weather-forecast-day-container" title={forecast2?.textSummary}>
              <div className="sc-tool-weather-forecast-day-details">
                <label>{forecast2?.period?.textForecastName}</label>
                <img className="sc-tool-weather-forecast-details-img" src={iconUrl(forecast2?.abbreviatedForecast?.iconCode["#text"])} alt="icon" />
                <label>{forecast2?.temperatures?.temperature["#text"]}</label>
                <label>{forecast2?.abbreviatedForecast?.textSummary}</label>
              </div>
            </div>
            <div className="sc-tool-weather-forecast-day-container" title={forecast3?.textSummary}>
              <div className="sc-tool-weather-forecast-day-details">
                <label>{forecast3?.period?.textForecastName}</label>
                <img className="sc-tool-weather-forecast-details-img" src={iconUrl(forecast3?.abbreviatedForecast?.iconCode["#text"])} alt="icon" />
                <label>{forecast3?.temperatures?.temperature["#text"]}</label>
                <label>{forecast3?.abbreviatedForecast?.textSummary}</label>
              </div>
            </div>
          </div>
          <div className="sc-tool-weather-forecast-view-forecast">
            <a href={forecastUrl} target="_blank" rel="noopener noreferrer">
              View Full Forecast
            </a>
          </div>
        </fieldset>
      </div>
    </div>
  );
};

const Warning = (props) => {
  const { info } = props;
  const url = props.url;
  const type = info.$.type.toUpperCase();
  const priority = info.$.priority;
  const description = info.$.description;
  return (
    <div className={type === "ENDED" ? "sc-tool-weather-forecast-warning ended" : "sc-tool-weather-forecast-warning " + priority}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        {type + ": " + description}
      </a>
    </div>
  );
};
