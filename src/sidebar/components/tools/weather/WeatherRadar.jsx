import React, { useState, useRef, useEffect } from "react";
import "./WeatherRadar.css";
import * as helpers from "../../../../helpers/helpers";
import Slider from "rc-slider";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ImageLayer from "ol/layer/Image";
import Static from "ol/source/ImageStatic";

const WeatherRadar = (props) => {
  const radarImages = useRef([]);
  const radarInterval = useRef(null);
  const [radarDateSliderValue, setRadarDateSliderValue] = useState(helpers.roundTime(new Date()));
  const [radarOpacitySliderValue, setRadarOpacitySliderValue] = useState(0.7);
  const [startDate, setStartDate] = useState(helpers.roundTime(new Date(new Date().setHours(new Date().getHours() - 3))));
  const [endDate, setEndDate] = useState(helpers.roundTime(new Date()));
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeSettingValue, setTimeSettingValue] = useState("last3hours");
  const [CASKR, setCASKR] = useState(true);
  const [CASBI, setCASBI] = useState(false);
  const [WSO, setWSO] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const isPlayingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      fetchRadarImages();
      radarInterval.current = window.setInterval(() => {
        fetchRadarImages();
      }, 60000);
    });
  }, []);

  useEffect(
    () => () => {
      radarImages.current.forEach((layer) => {
        window.map.removeLayer(layer);
      });
      clearInterval(radarInterval.current);
    },
    []
  );

  const fetchRadarImages = () => {
    // API URL
    const radarUrlTemplate = (fromDate, toDate) => `${window.config.weatherRadarApiUrl}?fromDate=${fromDate}&toDate=${toDate}`;
    let date3HoursBehind = new Date(new Date().setHours(new Date().getHours() - 3));

    // if (!autoRefresh) return;
    setIsLoading(true);

    if (timeSettingValue === "last3hours") {
      date3HoursBehind = new Date(new Date().setHours(new Date().getHours() - 3));
      setEndDate(helpers.roundTime(new Date()));
      setStartDate(helpers.roundTime(date3HoursBehind));
    }

    helpers.getJSON(radarUrlTemplate(getDateString(startDate), getDateString(endDate)), (result) => {
      radarImages.current.forEach((layer) => {
        window.map.removeLayer(layer);
      });
      radarImages.current = [];
      result.forEach((imageObj) => {
        const jsImage = JSON.parse(imageObj.JS_MAPIMAGE);
        const jsExtent = jsImage.extent;
        const extent = [jsExtent.xmin, jsExtent.ymin, jsExtent.xmax, jsExtent.ymax];
        const imageLayer = new ImageLayer({
          source: new Static({
            url: helpers.replaceAllInString(jsImage.href, "http:", "https:"),
            projection: "EPSG:3857",
            imageExtent: extent,
          }),
          zIndex: 10000,
          visible: true,
          opacity: radarOpacitySliderValue,
        });

        imageLayer.setProperties({
          radarCode: imageObj.RADAR_CODE,
          radarDate: new Date(imageObj.RADAR_DATE),
          timeId: imageObj.TIME_ID,
        });

        radarImages.current.push(imageLayer);
        window.map.addLayer(imageLayer);
      });

      // SET START AND END DATE
      setStartAndEndDateDefault();
    });
  };

  const setStartAndEndDateDefault = () => {
    setRadarDateSliderValue(startDate);
    window.map.once(
      "postrender",
      (event) => {
        setIsLoading(false);
      },
      () => {
        setRadarDateSliderValue(startDate);
      }
    );
  };
  useEffect(() => {
    window.map.getLayers().forEach((layer) => {
      const radarDate = layer.get("radarDate");
      const radarCode = layer.get("radarCode");
      if (radarDate) {
        if (radarDate.getTime() === radarDateSliderValue.getTime() && radarDate.toDateString() === radarDateSliderValue.toDateString()) {
          if ((CASKR && radarCode === "CASKR") || (CASBI && radarCode === "CASBI") || (WSO && radarCode === "WSO")) {
            layer.setVisible(true);
          } else layer.setVisible(false);
        } else {
          layer.setVisible(false);
        }
      }
    });
  }, [radarDateSliderValue, CASKR, CASBI, WSO]);

  const onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    if (props.onClose) onClose();
  };

  // SLIDER CHANGE EVENT
  const onRadarDateSliderChange = (value) => {
    //console.log(value);
    setRadarDateSliderValue(value);
  };

  // SLIDER CHANGE EVENT
  const onRadarOpacitySliderChange = (value) => {
    setRadarOpacitySliderValue(value);

    radarImages.current.forEach((layer) => {
      layer.setOpacity(value);
    });
  };

  const onAutoRefreshChange = (evt) => {
    setAutoRefresh(evt.target.checked);
    if (evt.target.checked) {
      radarInterval.current = window.setInterval(() => {
        fetchRadarImages();
      }, 5000);
    } else {
      clearInterval(radarInterval.current);
    }
  };

  const onTimeSettingsChange = (evt) => {
    const currentTimeSettingValue = evt.target.value;
    setTimeSettingValue(currentTimeSettingValue);
    if (currentTimeSettingValue === "last3hours") {
      setEndDate(helpers.roundTime(new Date()));
      setStartDate(helpers.roundTime(new Date(new Date().setHours(new Date().getHours() - 3))));
      fetchRadarImages();
    }
  };

  const onCASKRChange = (evt) => {
    setCASKR(evt.target.checked);
  };

  const onCASBIChange = (evt) => {
    setCASBI(evt.target.checked);
  };

  const onWSOChange = (evt) => {
    setWSO(evt.target.checked);
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (isPlaying) playRadar();
  }, [isPlaying]);
  const onPlayButtonClick = () => {
    setIsPlaying(!isPlaying);
  };

  const onUpdateButtonClick = () => {
    if (endDate < startDate) {
      helpers.showMessage("Radar", "Start Date needs to be before End Date", helpers.messageColors.red);
      return;
    }
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 5) {
      helpers.showMessage("Radar", "Cannot display more than 5 days of radar.", helpers.messageColors.red);
      return;
    }
    fetchRadarImages();

    // APP STATS
    helpers.addAppStat("Weather Radar", "Custom Date");
  };

  const playRadar = async () => {
    do {
      if (!isPlayingRef.current) break;

      const steps = Math.round((endDate - startDate) / (1000 * 60) / 10);
      var stepValue = startDate;
      for (let index = 0; index < steps; index++) {
        if (!isPlayingRef.current) break;
        setRadarDateSliderValue(stepValue);

        await sleep(200);
        var newStepValue = new Date(stepValue.getTime() + 10 * 60000);
        stepValue = newStepValue;
      }
    } while (isPlayingRef.current);
  };

  const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  const getDateString = (dt) => {
    if (!dt) return "";
    var dtstring = dt.getFullYear() + "-" + pad2(dt.getMonth() + 1) + "-" + pad2(dt.getDate()) + " " + pad2(dt.getHours()) + ":" + pad2(dt.getMinutes()) + ":" + pad2(dt.getSeconds());
    return dtstring;
  };

  const pad2 = (number) => {
    var str = "" + number;
    while (str.length < 2) {
      str = "0" + str;
    }

    return str;
  };

  // STYLE USED BY SLIDER
  const sliderWrapperStyle = {
    height: 25,
  };

  return (
    <div className="sc-tool-weather-radar-container">
      <div className="sc-tool-weather-radar-refresh-container">
        <img src={images["refresh.png"]} alt="refreshtimer" style={{ verticalAlign: "bottom" }} />
        <input type="checkbox" checked={autoRefresh} onChange={onAutoRefreshChange} />
        <span>Automatically refresh every minute.</span>
      </div>
      <div className="sc-border-bottom" />
      <div className="sc-tool-weather-slider-container">
        <img className="sc-tool-weather-radar-button" src={isPlaying ? images["pause.png"] : images["play.png"]} alt="play" onClick={onPlayButtonClick} />
        <div className="sc-tool-weather-slider">
          <DateSlider value={radarDateSliderValue} onChange={onRadarDateSliderChange} max={endDate} min={startDate} />
        </div>
        <label className="sc-tool-weather-radar-label">{"Radar Date: " + getDateString(radarDateSliderValue)}</label>
      </div>
      <img src={images["loading20.gif"]} alt="loading" className={isLoading ? "sc-tool-weather-radar-loading" : "sc-hidden"} />
      <div className="sc-container sc-tool-weather-time-container">
        <div style={{ display: "table" }}>
          <div style={{ display: "table-cell" }}>
            <label>Time Settings:</label>
          </div>
          <div style={{ display: "grid" }} onChange={onTimeSettingsChange}>
            <label>
              <input type="radio" name="timesetting" value="last3hours" defaultChecked />
              Last 3 Hours
            </label>
            <label>
              <input type="radio" name="timesetting" value="custom" />
              Custom
            </label>
          </div>
        </div>

        <div style={{ marginTop: "5px" }}>
          <div className={timeSettingValue === "last3hours" ? "sc-disabled" : ""} style={{ marginBottom: "5px" }}>
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
                selected={startDate}
                onChange={(value) => {
                  value < endDate ? setStartDate(value) : helpers.showMessage("Radar", "Start Date needs to be before End Date", helpers.messageColors.red);
                }}
                showTimeSelect
                dateFormat="MMMM d, yyyy h:mm aa"
              />
            </div>
            <div className="sc-tool-weather-date-container" style={{ marginTop: "5px" }}>
              <label style={{ marginRight: "5px" }}>End:</label>
              <DatePicker
                className="sc-input sc-tool-weather-date-input"
                selected={endDate}
                onChange={(value) => {
                  value > startDate ? setEndDate(value) : helpers.showMessage("Radar", "End Date needs to be after Start Date", helpers.messageColors.red);
                }}
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
            <button className="sc-button sc-tool-weather-radar-update-button" style={{ width: "70px" }} onClick={onUpdateButtonClick}>
              Update
            </button>
          </div>
          <div style={{ fontSize: "10pt" }}>
            <label>
              <input type="checkbox" checked={CASKR} onChange={onCASKRChange} />
              CASKR (King City)
            </label>
            <label>
              <input type="checkbox" checked={CASBI} onChange={onCASBIChange} />
              CASBI (Britt)
            </label>
            <label>
              <input type="checkbox" checked={WSO} onChange={onWSOChange} />
              WSO (Exeter)
            </label>
          </div>
        </div>
      </div>
      <div>
        <Slider included={false} style={sliderWrapperStyle} max={1} min={0} step={0.01} defaultValue={0.7} onChange={onRadarOpacitySliderChange} value={radarOpacitySliderValue} />
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
        <a href="https://weather.gc.ca/">
          <img src="https://weather.gc.ca/images/ecfip_e.gif" alt="Environment Canada" style={{ marginTop: "5px" }} />
        </a>
      </div>
    </div>
  );
};

export default WeatherRadar;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}

const DateSlider = (props) => {
  const dateSteps = useRef([]);
  const [currentDate, setCurrentDate] = useState(props.value || props.min);
  const [steps, setSteps] = useState(Math.round((props.max - props.min) / (1000 * 60) / 10));
  const [value, setValue] = useState(Math.round((currentDate - props.min) / (1000 * 60) / 10));
  // STYLE USED BY SLIDER
  const sliderWrapperStyle = {
    height: 25,
  };
  useEffect(() => {
    setCurrentDate(props.value);
  }, [props.value]);

  const handleChange = (value) => {
    const { onChange } = props;
    var nextCurrentDate = dateSteps.current[value];
    onChange(nextCurrentDate);
    setCurrentDate(nextCurrentDate);
  };
  useEffect(() => {
    const currentSteps = Math.round((props.max - props.min) / (1000 * 60) / 10);
    setSteps(currentSteps);
    setValue(Math.round((currentDate - props.min) / (1000 * 60) / 10));
    // MAP OUT STEPS AND DATES FOR CLARITY
    var stepValue = props.min;
    dateSteps.current = [stepValue];
    for (let index = 0; index < currentSteps; index++) {
      var newStepValue = new Date(stepValue.getTime() + 10 * 60000);
      // console.log(newStepValue);
      dateSteps.current.push(newStepValue);
      stepValue = newStepValue;
    }
  }, [props.min, props.max, currentDate]);

  return <Slider style={sliderWrapperStyle} max={steps} value={value} onChange={handleChange} />;
};
