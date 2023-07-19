import React, { useRef, useState, useEffect } from "react";
import "./Navigation.css";
import { fromLonLat } from "ol/proj";
import * as helpers from "../helpers/helpers";
import { FaForward, FaBackward } from "react-icons/fa";
import Graticule from "ol/layer/Graticule";
import { Stroke } from "ol/style.js";
import { MdGridOn, MdGridOff } from "react-icons/md";
const Navigation = (props) => {
  const [containerClassName, setContainerClassName] = useState("nav-container");
  const [showCurrentLocation, setShowCurrentLocation] = useState(true);
  const [showZoomExtent, setShowZoomExtent] = useState(true);
  const [extentHistory, setExtentHistory] = useState([0, 1]);
  const [showGridButton, setShowGridButton] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const graticuleRef = useRef(
    new Graticule({
      // the style to use for the lines, optional.
      strokeStyle: new Stroke({
        color: "rgba(255,120,0,0.9)",
        width: 2,
        lineDash: [0.5, 4],
      }),
      showLabels: true,
      wrapX: false,
      zIndex: 10000,
    })
  );

  useEffect(() => {
    // LISTEN FOR SIDEPANEL CHANGES
    const sidebarChangedListner = window.emitter.addListener("sidebarChanged", (isSidebarOpen) => sidebarChanged(isSidebarOpen));
    // LISTEN FOR HISTORY CHANGES
    const extentHistoryChangedListner = window.emitter.addListener("extentHistoryChanged", (index, count) => extentHistoryChanged([index, count]));
    // LISTEN FOR CONTROL VISIBILITY CHANGES
    const mapControlsChangedListener = window.emitter.addListener("mapControlsChanged", (control, visible) => controlStateChange(control, visible));

    helpers.waitForLoad(["settings", "map"], Date.now(), 30, () => {
      setShowCurrentLocation(window.mapControls && window.mapControls.currentLocation);
      setShowZoomExtent(window.mapControls && window.mapControls.zoomExtent);
      setShowGridButton(window.mapControls && window.mapControls.showGrid);
    });
    return () => {
      sidebarChangedListner.remove();
      extentHistoryChangedListner.remove();
      mapControlsChangedListener.remove();
    };
  }, []);

  useEffect(() => {
    helpers.waitForLoad(["settings", "map"], Date.now(), 30, () => {
      if (showGrid) window.map.addLayer(graticuleRef.current);
      else window.map.removeLayer(graticuleRef.current);
    });
  }, [showGrid]);

  const extentHistoryChanged = (extentHistory) => {
    setExtentHistory(extentHistory);
  };
  // ZOOM TO FULL EXTENT
  const zoomFullExtent = () => {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      let centerCoords = window.config.centerCoords;
      let defaultZoom = window.config.defaultZoom;
      window.map.getView().animate({ center: centerCoords, zoom: defaultZoom });
    });
  };

  const onShowGridToggle = () => {
    setShowGrid(!showGrid);
  };
  // ZOOM TO CURRENT LOCATION
  const zoomToCurrentLocation = () => {
    var options = { timeout: 5000 };
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        const coords = fromLonLat([pos.coords.longitude, pos.coords.latitude]);
        helpers.flashPoint(coords);
      },
      (err) => {
        helpers.showMessage("Location", "Getting your location failed: " + err.message);
      },
      options
    );

    helpers.addAppStat("Current Location", "Click");
  };

  // HANDLE SIDEBAR CHANGES
  const sidebarChanged = (isSidebarOpen) => {
    //  SIDEBAR IN AND OUT
    if (isSidebarOpen) {
      setContainerClassName("nav-container nav-container-slideout");
    } else {
      setContainerClassName("nav-container nav-container-slidein");
    }
  };
  const controlStateChange = (control, state) => {
    switch (control) {
      case "fullExtent":
        setShowZoomExtent(state);
        break;
      case "zoomToCurrentLocation":
        setShowCurrentLocation(state);
        break;
      case "showExtent":
        setShowGridButton(state);
        break;
      default:
        break;
    }
  };

  return (
    <div>
      <div className="map-theme">
        <div className={containerClassName}>
          <div
            className="zoomButton"
            title="Zoom In"
            onClick={() => {
              window.map.getView().setZoom(window.map.getView().getZoom() + 1);
            }}
          >
            +
          </div>
          <div
            className="zoomButton"
            title="Zoom Out"
            onClick={() => {
              window.map.getView().setZoom(window.map.getView().getZoom() - 1);
            }}
          >
            -
          </div>
          <div className="extentHistory">
            <div
              className={`prevExtentButton ${extentHistory[0] === 0 ? "disabled" : ""}`}
              title="Previous Extent"
              onClick={() => {
                helpers.addAppStat("ExtentHistory", "Button press previous");
                helpers.extentHistory("previous");
              }}
            >
              <FaBackward size={15} />
            </div>
            <div
              className={`nextExtentButton ${extentHistory[0] === extentHistory[1] - 1 ? "disabled" : ""}`}
              title="Next Extent"
              onClick={() => {
                helpers.addAppStat("ExtentHistory", "Button press next");
                helpers.extentHistory("next");
              }}
            >
              <FaForward size={15} />
            </div>
          </div>

          <div className="fullExtentButton" onClick={zoomFullExtent}>
            <div className="fullExtentContent" />
          </div>
          <div className="zoomToCurrentLocationButton" onClick={zoomToCurrentLocation}>
            <div className="zoomToCurrentLocationContent" />
          </div>
          <div className="showGridButton" onClick={onShowGridToggle} title={`${showGrid ? "Hide" : "Show"} map grid`}>
            <div className={`showGridContent${showGrid ? " active" : ""}`}>{showGrid ? <MdGridOff size={25} color={"#838383"} /> : <MdGridOn size={25} color={"#838383"} />}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navigation;
