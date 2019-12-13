import React, { Component } from "react";
import "./WeatherForecast.css";
import * as helpers from "../../../../helpers/helpers";
import mainConfig from "../../../../config.json";
import config from "./config.json";
const urlTemplate = cityCode => `${mainConfig.apiUrl}getCityWeather/${cityCode}`;

class WeatherForecast extends Component {
  constructor(props) {
    super(props);

    this.state = {
      cityInfo: []
    };
  }

  componentDidMount() {
    this.refreshWeather();
  }

  refreshWeather = () => {
    this.setState({ cityInfo: [] }, () => {
      const cities = config.cities;
      cities.forEach(cityInfo => {
        helpers.getJSON(urlTemplate(cityInfo.code), result => {
          result.forecastUrl = cityInfo.forecastUrl;
          this.setState(prevState => {
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
        {this.state.cityInfo.map(city => (
          <Forecast key={helpers.getUID()} info={city}></Forecast>
        ))}
      </div>
    );
  }
}

export default WeatherForecast;

const Forecast = props => {
  const { siteData, forecastUrl } = props.info;
  const forecast1 = siteData.forecastGroup[0].forecast[0];
  const forecast2 = siteData.forecastGroup[0].forecast[1];
  const forecast3 = siteData.forecastGroup[0].forecast[2];
  const iconUrl = code => `https://weather.gc.ca/weathericons/small/${code}.png`;

  const warnings = siteData.warnings[0];
  let warningEvents = [];
  let warningUrl = "";
  if (warnings !== "") {
    warningUrl = warnings.$.url;
    warnings.event.forEach(event => {
      warningEvents.push(event);
    });
  }

  return (
    <div className="sc-tool-weather-forecast-day">
      <label className="sc-tool-weather-forecast-dt">{siteData.forecastGroup[0].dateTime[1].textSummary[0]}</label>
      <div>
        <fieldset className="sc-fieldset" style={{ marginTop: "0px" }}>
          <legend className="sc-tool-weather-forecast-legend">{siteData.location[0].name[0]._}</legend>
          <div className={warningEvents.length === 0 ? "sc-hidden" : "sc-tool-weather-forecast-warnings-container"}>
            {warningEvents.map(event => (
              <Warning key={helpers.getUID()} info={event} url={warningUrl}></Warning>
            ))}
          </div>
          <div className="sc-tool-weather-forecast-days-container">
            <div className="sc-tool-weather-forecast-day-container" title={forecast1.textSummary[0]}>
              <div className="sc-tool-weather-forecast-day-details">
                <label>{forecast1.period[0].$.textForecastName}</label>
                <img className="sc-tool-weather-forecast-details-img" src={iconUrl(forecast1.abbreviatedForecast[0].iconCode[0]._)} alt="icon"></img>
                <label>{forecast1.temperatures[0].temperature[0]._}</label>
                <label className="sc-tool-weather-tool-forecast-summary">{forecast1.abbreviatedForecast[0].textSummary[0]}</label>
              </div>
            </div>
            <div className="sc-tool-weather-forecast-day-container" title={forecast2.textSummary[0]}>
              <div className="sc-tool-weather-forecast-day-details">
                <label>{forecast2.period[0].$.textForecastName}</label>
                <img className="sc-tool-weather-forecast-details-img" src={iconUrl(forecast2.abbreviatedForecast[0].iconCode[0]._)} alt="icon"></img>
                <label>{forecast2.temperatures[0].temperature[0]._}</label>
                <label>{forecast2.abbreviatedForecast[0].textSummary[0]}</label>
              </div>
            </div>
            <div className="sc-tool-weather-forecast-day-container" title={forecast3.textSummary[0]}>
              <div className="sc-tool-weather-forecast-day-details">
                <label>{forecast3.period[0].$.textForecastName}</label>
                <img className="sc-tool-weather-forecast-details-img" src={iconUrl(forecast3.abbreviatedForecast[0].iconCode[0]._)} alt="icon"></img>
                <label>{forecast3.temperatures[0].temperature[0]._}</label>
                <label>{forecast3.abbreviatedForecast[0].textSummary[0]}</label>
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

const Warning = props => {
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
