/*jshint loopfunc:true */
import React, { useState, useEffect } from "react";
import "./FooterTools.css";
import * as helpers from "../helpers/helpers";
import { unByKey } from "ol/Observable.js";

const FooterTools = (props) => {
  const [scale, setScale] = useState("");
  const [basemapType, setBasemapType] = useState("IMAGERY");
  const [scaleSelector, setScaleSelector] = useState(false);
  const [showScale, setShowScale] = useState(true);
  const mapScales = [
    { label: "1:250", value: 250 },
    { label: "1:500", value: 500 },
    { label: "1:1,000", value: 1000 },
    { label: "1:2,000", value: 2000 },
    { label: "1:5,000", value: 5000 },
    { label: "1:10,000", value: 10000 },
    { label: "1:25,000", value: 25000 },
    { label: "1:50,000", value: 50000 },
  ];

  useEffect(() => {
    let onMapMoveEndListener = null;
    // LISTEN FOR MAP TO MOUNT
    const basemapChangedListener = window.emitter.addListener("basemapChanged", (type) => setBasemapType(type));
    // LISTEN FOR CONTROL VISIBILITY CHANGES
    const mapControlsChangedListner = window.emitter.addListener("mapControlsChanged", (control, visible) => controlStateChange(control, visible));
    helpers.waitForLoad("map", Date.now(), 30, () => {
      onMapLoad();
      onMapMoveEndListener = window.map.on("moveend", () => {
        const currentScale = helpers.getMapScale();
        setScale(currentScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
      });
    });
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      setScaleSelector(window.mapControls.scaleSelector);
      setShowScale(window.mapControls.scale);
    });

    return () => {
      window.emitter.removeListener("basemapChanged", (type) => setBasemapType(type));
      window.emitter.removeListener("mapControlsChanged", (control, visible) => controlStateChange(control, visible));
      // basemapChangedListener.remove();
      // mapControlsChangedListner.remove();
      if (onMapMoveEndListener) unByKey(onMapMoveEndListener);
    };
  }, []);
  useEffect(() => {
    setTimeout(function () {
      const col = document.getElementsByClassName("ol-scale-line-inner");
      if (col.length > 0) {
        const olScaleBar = col[0];
        let scScaleBar = document.getElementById("sc-scale-bar-text");
        scScaleBar.setAttribute("style", "width: " + olScaleBar.style.width);
      }
    }, 10);
  });
  const onMapLoad = () => {
    const initScale = helpers.getMapScale();
    setScale(initScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };

  const onScaleClick = (value) => {
    helpers.setMapScale(value);
  };

  const controlStateChange = (control, state) => {
    switch (control) {
      case "scale":
        setScaleSelector(state);
        break;
      default:
        break;
    }
  };

  return (
    <div className="map-theme">
      {scaleSelector ? (
        <div id="sc-scale-bar-text" className="sc-map-footer-scale-only selector">
          Scale:&nbsp;
          <select
            id="sc-scale-bar-select"
            onChange={(evt) => {
              onScaleClick(evt.target.value);
            }}
            value={scale}
          >
            <option key={helpers.getUID()} value={scale}>
              {"1:" + scale}
            </option>
            {mapScales.map((item) => {
              return (
                <option key={helpers.getUID()} value={item.value}>
                  {item.label}
                </option>
              );
            })}
          </select>
        </div>
      ) : (
        <div id="sc-scale-bar-text" className={basemapType === "IMAGERY" ? "sc-map-footer-scale-only imagery" : "sc-map-footer-scale-only topo"}>
          {showScale && "Scale: 1:" + scale}
        </div>
      )}
    </div>
  );
};

export default FooterTools;
