import React, { Component } from "react";
import "./WeatherRadar.css";
import * as helpers from "../../../../helpers/helpers";
import mainConfig from "../../../../config.json";
import Slider from "rc-slider";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ImageLayer from "ol/layer/Image";
import Static from "ol/source/ImageStatic";

// API URL
const radarUrlTemplate = (fromDate, toDate) => `${mainConfig.weatherRadarApiUrl}?fromDate=${fromDate}&toDate=${toDate}`;
let date3HoursBehind = new Date(new Date().setHours(new Date().getHours() - 3));

class WeatherRadar extends Component {
  constructor(props) {
    super(props);

    this.radarImages = [];
    this.state = {
      radarDateSliderMin: 0,
      radarDateSliderMax: 1,
      radarDateSliderDefaultValue: 0,
      radarDateSliderValue: this.roundTime(new Date()),
      radarOpacitySliderValue: 0.7,
      startDate: this.roundTime(date3HoursBehind),
      endDate: this.roundTime(new Date()),
      autoRefresh: true,
      timeSettingValue: "last3hours",
      WKR: true,
      WBI: false,
      WSO: false,
      isPlaying: false,
      isLoading: false,
    };
  }

  componentDidMount() {
    this.fetchRadarImages();
    this.radarInterval = window.setInterval(() => {
      this.fetchRadarImages();
    }, 60000);
  }

  componentWillUnmount() {
    this.radarImages.forEach((layer) => {
      window.map.removeLayer(layer);
    });
    clearInterval(this.radarInterval);
  }

  fetchRadarImages = () => {
    if (!this.state.autoRefresh) return;

    this.setState({ isLoading: true });

    if (this.state.timeSettingValue === "last3hours") {
      date3HoursBehind = new Date(new Date().setHours(new Date().getHours() - 3));
      this.setState({ endDate: this.roundTime(new Date()), startDate: this.roundTime(date3HoursBehind) });
    }

    helpers.getJSON(radarUrlTemplate(this.getDateString(this.state.startDate), this.getDateString(this.state.endDate)), (result) => {
      this.radarImages.forEach((layer) => {
        window.map.removeLayer(layer);
      });
      this.radarImages = [];
      result.forEach((imageObj) => {
        const jsImage = JSON.parse(imageObj.JS_MAPIMAGE);
        const jsExtent = jsImage.extent;
        const extent = [jsExtent.xmin, jsExtent.ymin, jsExtent.xmax, jsExtent.ymax];
        const imageLayer = new ImageLayer({
          source: new Static({
            url: jsImage.href,
            projection: "EPSG:3857",
            imageExtent: extent,
          }),
          zIndex: 10000,
          visible: true,
          opacity: this.state.radarOpacitySliderValue,
        });

        imageLayer.setProperties({ radarCode: imageObj.RADAR_CODE, radarDate: new Date(imageObj.RADAR_DATE), timeId: imageObj.TIME_ID });

        this.radarImages.push(imageLayer);
        window.map.addLayer(imageLayer);
      });

      // SET START AND END DATE
      this.setStartAndEndDateDefault();
    });
  };

  setStartAndEndDateDefault = () => {
    const firstImage = this.radarImages[0];
    const startDate = firstImage.get("radarDate");
    const lastImage = this.radarImages[this.radarImages.length - 1];
    const endDate = lastImage.get("radarDate");
    this.setState({ startDate: startDate, endDate: endDate, radarDateSliderValue: endDate }, () => {
      window.map.once(
        "postrender",
        (event) => {
          this.updateRadarVisibility();
          this.setState({ isLoading: false });
        },
        () => {
          //const steps = Math.round((this.state.endDate - this.state.startDate) / (1000 * 60) / 10);
          //var stepValue = this.state.startDate;
          this.setState({ radarDateSliderValue: this.state.endDate }, () => {
            this.updateRadarVisibility();
          });
        }
      );
    });
  };

  updateRadarVisibility = () => {
    window.map.getLayers().forEach((layer) => {
      const radarDate = layer.get("radarDate");
      const radarCode = layer.get("radarCode");

      if (radarDate !== undefined) {
        if (radarDate.getTime() === this.state.radarDateSliderValue.getTime() && radarDate.toDateString() === this.state.radarDateSliderValue.toDateString()) {
          if ((this.state.WKR && radarCode === "WKR") || (this.state.WBI && radarCode === "WBI") || (this.state.WSO && radarCode === "WSO")) {
            layer.setVisible(true);
          } else layer.setVisible(false);
        } else {
          layer.setVisible(false);
        }
      }
    });
  };

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  // SLIDER CHANGE EVENT
  onRadarDateSliderChange = (value) => {
    console.log(value);
    this.setState((prevState) => ({ radarDateSliderValue: value }));
    this.updateRadarVisibility();
  };

  // SLIDER CHANGE EVENT
  onRadarOpacitySliderChange = (value) => {
    this.setState({ radarOpacitySliderValue: value });

    this.radarImages.forEach((layer) => {
      layer.setOpacity(value);
    });
  };

  onStartDateChange = (date) => {
    this.setState(
      {
        startDate: date,
      },
      () => {
        //this.fetchRadarImages();
      }
    );
  };

  onEndDateChange = (date) => {
    this.setState(
      {
        endDate: date,
      },
      () => {
        //this.fetchRadarImages();
      }
    );
  };

  onAutoRefreshChange = (evt) => {
    this.setState({ autoRefresh: evt.target.checked });
    if (evt.target.checked) {
      this.radarInterval = window.setInterval(() => {
        this.fetchRadarImages();
      }, 5000);
    } else {
      clearInterval(this.radarInterval);
    }
  };

  onTimeSettingsChange = (evt) => {
    this.setState({ timeSettingValue: evt.target.value }, () => {
      if (this.state.timeSettingValue === "last3hours") {
        date3HoursBehind = new Date(new Date().setHours(new Date().getHours() - 3));
        this.setState({ endDate: this.roundTime(new Date()), startDate: this.roundTime(date3HoursBehind) }, () => {
          this.fetchRadarImages();
        });
      }
    });
  };

  onWKRChange = (evt) => {
    this.setState({ WKR: evt.target.checked }, () => {
      this.updateRadarVisibility();
    });
  };

  onWBIChange = (evt) => {
    this.setState({ WBI: evt.target.checked }, () => {
      this.updateRadarVisibility();
    });
  };

  onWSOChange = (evt) => {
    this.setState({ WSO: evt.target.checked }, () => {
      this.updateRadarVisibility();
    });
  };

  onPlayButtonClick = () => {
    this.setState(
      (prevState) => ({ isPlaying: !prevState.isPlaying }),
      () => {
        if (this.state.isPlaying) {
          this.playRadar();
        }
      }
    );
  };

  onUpdateButtonClick = () => {
    if (this.state.endDate < this.state.startDate) {
      helpers.showMessage("Radar", "Start Date needs to be before End Date", helpers.messageColors.red);
      return;
    }

    // const date1 = new Date('7/13/2010');
    // const date2 = new Date('12/15/2010');
    const diffTime = Math.abs(this.state.endDate - this.state.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 5) {
      helpers.showMessage("Radar", "Cannot display more than 5 days of radar.", helpers.messageColors.red);
      return;
    }
    this.fetchRadarImages();

    // APP STATS
    helpers.addAppStat("Weather Radar", "Custom Date");
  };

  playRadar = async () => {
    do {
      if (!this.state.isPlaying) break;

      const steps = Math.round((this.state.endDate - this.state.startDate) / (1000 * 60) / 10);
      var stepValue = this.state.startDate;
      for (let index = 0; index < steps; index++) {
        if (!this.state.isPlaying) break;

        this.setState({ radarDateSliderValue: stepValue }, () => {
          this.updateRadarVisibility();
        });
        await this.sleep(200);
        var newStepValue = new Date(stepValue.getTime() + 10 * 60000);
        stepValue = newStepValue;
      }
    } while (this.state.isPlaying);
  };

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  roundTime = (date) => {
    var coeff = 1000 * 60 * 10;
    var rounded = new Date(Math.round(date.getTime() / coeff) * coeff);
    //console.log(rounded);
    return rounded;
  };

  getDateString = (dt) => {
    var dtstring =
      dt.getFullYear() + "-" + this.pad2(dt.getMonth() + 1) + "-" + this.pad2(dt.getDate()) + " " + this.pad2(dt.getHours()) + ":" + this.pad2(dt.getMinutes()) + ":" + this.pad2(dt.getSeconds());
    return dtstring;
  };

  pad2 = (number) => {
    var str = "" + number;
    while (str.length < 2) {
      str = "0" + str;
    }

    return str;
  };

  render() {
    // STYLE USED BY SLIDER
    const sliderWrapperStyle = {
      height: 25,
    };

    return (
      <div className="sc-tool-weather-radar-container">
        <div className="sc-tool-weather-radar-refresh-container">
          <img src={images["refresh.png"]} alt="refreshtimer" style={{ verticalAlign: "bottom" }} />
          <input type="checkbox" checked={this.state.autoRefresh} onChange={this.onAutoRefreshChange} />
          <span>Automatically refresh every minute.</span>
        </div>
        <div className="sc-border-bottom" />
        <div className="sc-tool-weather-slider-container">
          <img className="sc-tool-weather-radar-button" src={this.state.isPlaying ? images["pause.png"] : images["play.png"]} alt="play" onClick={this.onPlayButtonClick} />
          <div className="sc-tool-weather-slider">
            <DateSlider value={this.state.radarDateSliderValue} onChange={this.onRadarDateSliderChange} max={this.state.endDate} min={this.state.startDate} />
          </div>
          <label className="sc-tool-weather-radar-label">{"Radar Date: " + this.getDateString(this.state.radarDateSliderValue)}</label>
        </div>
        <img src={images["loading20.gif"]} alt="loading" className={this.state.isLoading ? "sc-tool-weather-radar-loading" : "sc-hidden"} />
        {/* <img src={images["loading20.gif"]} alt="loading" className={"sc-tool-weather-radar-loading"}></img> */}
        <div className="sc-container sc-tool-weather-time-container">
          <div style={{ display: "table" }}>
            <div style={{ display: "table-cell" }}>
              <label>Time Settings:</label>
            </div>
            <div style={{ display: "grid" }} onChange={this.onTimeSettingsChange}>
              <label>
                <input type="radio" name="timesetting" value="last3hours" defaultChecked />Last 3 Hours
              </label>
              <label>
                <input type="radio" name="timesetting" value="custom" />Custom
              </label>
            </div>
          </div>

          <div style={{ marginTop: "5px" }}>
            <div className={this.state.timeSettingValue === "last3hours" ? "sc-disabled" : ""} style={{ marginBottom: "5px" }}>
              <div className="sc-tool-weather-date-container">
                <label>Start:</label>
                <DatePicker
                  className="sc-input  sc-tool-weather-date-input"
                  popperPlacement="bottom"
                  preventOverflow
                  popperModifiers={{
                    flip: {
                      behavior: ["bottom"], // don't allow it to flip to be above
                    },
                    preventOverflow: {
                      enabled: false, // tell it not to try to stay within the view (this prevents the popper from covering the element you clicked)
                    },
                    hide: {
                      enabled: false, // turn off since needs preventOverflow to be enabled
                    },
                  }}
                  selected={this.state.startDate}
                  onChange={this.onStartDateChange}
                  showTimeSelect
                  dateFormat="MMMM d, yyyy h:mm aa"
                />
              </div>
              <div className="sc-tool-weather-date-container" style={{ marginTop: "5px" }}>
                <label style={{ marginRight: "5px" }}>End:</label>
                <DatePicker
                  className="sc-input sc-tool-weather-date-input"
                  selected={this.state.endDate}
                  onChange={this.onEndDateChange}
                  showTimeSelect
                  dateFormat="MMMM d, yyyy h:mm aa"
                  timeIntervals={10}
                  popperPlacement="bottom"
                  preventOverflow
                  popperModifiers={{
                    flip: {
                      behavior: ["bottom"], // don't allow it to flip to be above
                    },
                    preventOverflow: {
                      enabled: false, // tell it not to try to stay within the view (this prevents the popper from covering the element you clicked)
                    },
                    hide: {
                      enabled: false, // turn off since needs preventOverflow to be enabled
                    },
                  }}
                />
              </div>
              <button className="sc-button sc-tool-weather-radar-update-button" style={{ width: "70px" }} onClick={this.onUpdateButtonClick}>
                Update
              </button>
            </div>
            <div style={{ fontSize: "10pt", marginLeft: "18px" }}>
              <label>
                <input type="checkbox" checked={this.state.WKR} onChange={this.onWKRChange} />WKR (King City)
              </label>
              <label>
                <input type="checkbox" checked={this.state.WBI} onChange={this.onWBIChange} />WBI (Britt)
              </label>
              <label>
                <input type="checkbox" checked={this.state.WSO} onChange={this.onWSOChange} />WSO (Exeter)
              </label>
            </div>
          </div>
        </div>
        <div>
          <Slider included={false} style={sliderWrapperStyle} max={1} min={0} step={0.01} defaultValue={0.7} onChange={this.onRadarOpacitySliderChange} value={this.state.radarOpacitySliderValue} />
          {/* <label className="sc-tool-weather-opacity">Opacity</label> */}
        </div>
        <div className="sc-tool-weather-radar-footer">
          <div className="sc-tool-weather-radar-rain">
            <label>Rain (Summer)</label>
            <img src={images["radarlegendrain.png"]} alt="summer radar" />
          </div>
          <div className="sc-tool-weather-radar-snow">
            <label>Snow (Winter)</label>
            <img src={images["radarlegendsnow.png"]} alt="snow radar" />
          </div>
        </div>
        <div className="sc-border-bottom" />
        <div className="sc-tool-weather-radar-credits">
          Weather Data Provided by Environment Canada
          <a href="http://weather.gc.ca/">
            <img src="http://weather.gc.ca/images/ecfip_e.gif" alt="Environment Canada" style={{ marginTop: "5px" }} />
          </a>
        </div>
      </div>
    );
  }
}

export default WeatherRadar;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}

class DateSlider extends React.Component {
  constructor(props) {
    super(props);
    this.dateSteps = [];
    this.handleChange = this.handleChange.bind(this);
    this.state = { currentDate: props.value || props.min };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ currentDate: nextProps.value });
  }

  handleChange(value) {
    const { onChange } = this.props;
    var nextCurrentDate = this.dateSteps[value];
    onChange(nextCurrentDate);

    this.setState((prevState) => ({ currentDate: nextCurrentDate }));
  }

  render() {
    // STYLE USED BY SLIDER
    const sliderWrapperStyle = {
      height: 25,
    };

    const { currentDate } = this.state;
    const { min, max } = this.props;
    const steps = Math.round((max - min) / (1000 * 60) / 10);
    const value = Math.round((currentDate - min) / (1000 * 60) / 10);

    // MAP OUT STEPS AND DATES FOR CLARITY
    var stepValue = min;
    this.dateSteps = [stepValue];
    for (let index = 0; index < steps; index++) {
      var newStepValue = new Date(stepValue.getTime() + 10 * 60000);
      // console.log(newStepValue);
      this.dateSteps.push(newStepValue);
      stepValue = newStepValue;
    }
    return <Slider style={sliderWrapperStyle} max={steps} value={value} onChange={this.handleChange} />;
  }
}
