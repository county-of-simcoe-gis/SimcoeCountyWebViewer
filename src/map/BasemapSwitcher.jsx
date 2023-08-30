import React, { useContext, useState, useEffect, useRef } from "react";
import "./BasemapSwitcher.css";

import * as helpers from "../helpers/helpers";
import BasemapSwitcherContext from "./BasemapSwitcherContext";
import BasemapItem from "./BasemapItem.jsx";
import BasemapConfig from "./basemapSwitcherConfig.json";
import Slider from "rc-slider";

const BasemapSwitcher = (props) => {
  const {
    loadBathymetry,
    loadStreets,
    loadWorldImagery,
    loadTopoLayers,
    loadImageryLayers,
    baseMapServicesOptions,
    streetsLayerRef,
    bathymetryLayerRef,
    worldImageryLayerRef,
    imageryLayersRef,
    topoLayersRef,
  } = useContext(BasemapSwitcherContext);

  // SET CONSTANTS
  const imagerySliderMin = 0;
  const sliderWrapperStyle = {
    width: 60,
    marginLeft: 13,
    height: 225,
    marginTop: 8,
    marginBottom: 15,
  };

  // CREATE YEAR MARKS ON THE SLIDER
  const getImagerySliderMarks = (options) => {
    const numServices = options.imageryServices.length;
    if (numServices < 2) return {};

    let marks = {};
    for (let index = 0; index < numServices; index++) {
      marks[index] = options.imageryServices[index].name;
    }
    return marks;
  };
  const [imagerySliderMarks, setImagerySliderMarks] = useState(getImagerySliderMarks(BasemapConfig));
  const [imagerySliderMax, setImagerySliderMax] = useState(BasemapConfig.imageryServices.length - 1);
  const [imagerySliderDefaultValue, setImagerySliderDefaultValue] = useState(BasemapConfig.imageryServices.length - 1);
  const [imagerySliderValue, setImagerySliderValue] = useState(BasemapConfig.imageryServices.length - 1);
  const [imageryPanelOpen, setImageryPanelOpen] = useState(false);
  const [streetsCheckbox, setStreetsCheckbox] = useState(true);
  const [containerCollapsed, setContainerCollapsed] = useState(false);
  const [topoPanelOpen, setTopoPanelOpen] = useState(false);
  const [topoActiveIndex, setTopoActiveIndex] = useState(0);
  const [showBaseMapSwitcher, setShowBaseMapSwitcher] = useState(true);

  const [activeButton, setActiveButton] = useState(BasemapConfig.defaultButton || "topo");

  const isLoadedRef = useRef(false);
  useEffect(() => {
    // LISTEN FOR CONTROL VISIBILITY CHANGES

    const mapControlsChangedListener = window.emitter.addListener("mapControlsChanged", (control, visible) => controlStateChange(control, visible));
    helpers.waitForLoad(["map", "settings"], Date.now(), 30, () => {
      setShowBaseMapSwitcher(window.mapControls.basemap);
      if (baseMapServicesOptions !== undefined) {
        setImagerySliderMarks(getImagerySliderMarks(baseMapServicesOptions));
        setImagerySliderMax(baseMapServicesOptions.imageryServices.length - 1);
        setImagerySliderDefaultValue(baseMapServicesOptions.imageryServices.length - 1);
        setImagerySliderValue(baseMapServicesOptions.imageryServices.length - 1);
        setActiveButton(baseMapServicesOptions.defaultButton);
        loadTopoLayers(baseMapServicesOptions);
        loadBathymetry(baseMapServicesOptions);
        loadWorldImagery(baseMapServicesOptions);
        loadStreets(baseMapServicesOptions);
        loadImageryLayers(baseMapServicesOptions);
        isLoadedRef.current = true;
        helpers.addIsLoaded("basemap");
      }
      setTimeout(() => {
        handleURLParameters();
      }, 100);
    });
    helpers.waitForLoad(["basemap"], Date.now(), 30, () => {
      if (activeButton === "topo") {
        enableTopo();
      } else {
        disableTopo();
        enableImagery();
      }
    });
    return () => {
      window.emitter.removeListener("mapControlsChanged", (control, visible) => controlStateChange(control, visible));
      // mapControlsChangedListener.remove();
    };
  }, []);

  // HANDLE URL PARAMETERS
  const handleURLParameters = (value) => {
    const basemap = helpers.getURLParameter("BASEMAP") !== null ? helpers.getURLParameter("BASEMAP").toUpperCase() : null;
    const name = helpers.getURLParameter("NAME") !== null ? helpers.getURLParameter("NAME").toUpperCase() : null;
    const imagerySliderOpen = helpers.getURLParameter("SLIDER_OPEN") !== null ? helpers.getURLParameter("SLIDER_OPEN").toUpperCase() : null;

    if (basemap === "IMAGERY") {
      enableImagery();

      if (imagerySliderOpen === "TRUE") setImageryPanelOpen(true);

      if (name !== undefined) {
        for (let index = 0; index < imageryLayersRef.current.length; index++) {
          const layer = imageryLayersRef.current[index];
          const layerName = layer.getProperties().name.toUpperCase();
          if (layerName === name) {
            updateImageryLayers(index);
            setImagerySliderValue(index);
            setImagerySliderDefaultValue(index);
            return;
          }
        }
      }
    } else if (basemap === "TOPO") {
      enableTopo();

      for (let index = 0; index < topoLayersRef.current.length; index++) {
        let layer = topoLayersRef.current[index];
        const layerName = layer.getProperties().name;
        if (layerName.toUpperCase() === name) {
          setTopoActiveIndex(index);
          setTopoLayerVisiblity(index);
        }
      }
    }
  };

  // CALLED WHEN SLIDING OR TO RESET
  const updateImageryLayers = (value) => {
    for (let index = 0; index < imageryLayersRef.current.length; index++) {
      let layer = imageryLayersRef.current[index];
      if (value === -1) layer.setVisible(false);
      else {
        const layerIndex = layer.getProperties().index;
        const indexRatio = 1 - Math.abs(layerIndex - value);
        if (layerIndex === value) {
          layer.setOpacity(1);
          layer.setVisible(true);
        } else if (indexRatio <= 0) {
          layer.setOpacity(0);
          layer.setVisible(false);
        } else {
          layer.setOpacity(indexRatio);
          layer.setVisible(true);
        }
      }
    }
  };

  // SLIDER CHANGE EVENT
  const onSliderChange = (value) => {
    updateImageryLayers(value);
    setImagerySliderValue(value);
  };

  // PANEL DROP DOWN BUTTON
  const onImageryArrowClick = (value) => {
    if (isLoadedRef.current) {
      // DISABLE TOPO
      disableTopo();

      // ENABLE IMAGERY
      setTopoPanelOpen(false);
      setImageryPanelOpen(!imageryPanelOpen);
      setActiveButton("imagery");

      updateImageryLayers(imagerySliderValue);
      if (streetsLayerRef.current) streetsLayerRef.current.setVisible(streetsCheckbox);
      if (worldImageryLayerRef.current) worldImageryLayerRef.current.setVisible(true);

      // APP STATS
      helpers.addAppStat("Imagery", "Arrow");
    }
  };

  const onImageryButtonClick = (value) => {
    // DISABLE TOPO
    disableTopo();

    // CLOSE PANEL, ONLY IF ALREADY OPEN
    if (imageryPanelOpen) setImageryPanelOpen(false);

    enableImagery();

    // APP STATS
    helpers.addAppStat("Imagery", "Button");
  };

  const enableImagery = (value) => {
    if (isLoadedRef.current) {
      // ENABLE IMAGERY
      updateImageryLayers(imagerySliderValue);
      setTopoPanelOpen(false);
      setActiveButton("imagery");
      if (streetsLayerRef.current) streetsLayerRef.current.setVisible(streetsCheckbox);
      if (worldImageryLayerRef.current) worldImageryLayerRef.current.setVisible(true);
      setTopoLayerVisiblity(-1);

      // EMIT A BASEMAP CHANGE
      window.emitter.emit("basemapChanged", "IMAGERY");
    }
  };

  const disableImagery = (value) => {
    // DISABLE IMAGERY
    if (streetsLayerRef.current) streetsLayerRef.current.setVisible(false);
    if (worldImageryLayerRef.current) worldImageryLayerRef.current.setVisible(false);
    setImageryPanelOpen(false);
    updateImageryLayers(-1);
  };

  const onStreetsCheckbox = (evt) => {
    if (isLoadedRef.current) {
      if (streetsLayerRef.current) streetsLayerRef.current.setVisible(evt.target.checked);
      setStreetsCheckbox(evt.target.checked);
    }
  };

  const onCollapsedClick = (evt) => {
    // HIDE OPEN PANELS
    if (containerCollapsed === false) {
      setImageryPanelOpen(false);
      setTopoPanelOpen(false);
    }
    setContainerCollapsed(!containerCollapsed);
  };

  const enableTopo = (value) => {
    setActiveButton("topo");
    setTopoLayerVisiblity(topoActiveIndex);
    // DISABLE IMAGERY
    disableImagery();

    // EMIT A BASEMAP CHANGE
    window.emitter.emit("basemapChanged", "TOPO");
  };

  const disableTopo = (value) => {
    setTopoLayerVisiblity(-1);
  };

  // TOPO BUTTON
  const onTopoButtonClick = (evt) => {
    // CLOSE PANEL ONLY IF ALREADY OPEN
    if (topoPanelOpen) setTopoPanelOpen(false);

    enableTopo();

    // APP STATS
    helpers.addAppStat("Topo", "Button");
  };

  // PANEL DROP DOWN BUTTON
  const onTopoArrowClick = (evt) => {
    enableTopo();
    setTopoPanelOpen(!topoPanelOpen);
    // APP STATS
    helpers.addAppStat("Topo", "Arrow");
  };

  // CLICK ON TOPO THUMBNAILS
  const onTopoItemClick = (activeIndex, name) => {
    setTopoActiveIndex(activeIndex);
    setTopoPanelOpen(false);
    setTopoLayerVisiblity(activeIndex);
    helpers.addAppStat("Basemap", name);
  };

  // ADJUST VISIBILITY
  const setTopoLayerVisiblity = (activeIndex) => {
    for (let index = 0; index < topoLayersRef.current.length; index++) {
      let layer = topoLayersRef.current[index];
      const layerIndex = layer.getProperties().index;
      if (layerIndex === activeIndex) {
        layer.setVisible(true);
      } else {
        layer.setVisible(false);
      }
    }
  };
  const controlStateChange = (control, state) => {
    switch (control) {
      case "basemap":
        setShowBaseMapSwitcher(state);
        break;
      default:
        break;
    }
  };

  return (
    <div className={!showBaseMapSwitcher ? " sc-hidden" : ""}>
      <div id="sc-basemap-main-container">
        <div id="sc-basemap-collapse-button" className={containerCollapsed ? "sc-basemap-collapse-button closed" : "sc-basemap-collapse-button"} onClick={onCollapsedClick} />
        <div className={containerCollapsed ? "sc-hidden" : "sc-basemap-imagery"}>
          <button className={activeButton === "imagery" ? "sc-button sc-basemap-imagery-button active" : "sc-button sc-basemap-imagery-button"} onClick={onImageryButtonClick}>
            Imagery
          </button>
          <button className="sc-button sc-basemap-arrow" onClick={onImageryArrowClick} />
        </div>
        <div className={containerCollapsed ? "sc-hidden" : "sc-basemap-topo"}>
          <button className={activeButton === "topo" ? "sc-button sc-basemap-topo-button active" : "sc-button sc-basemap-topo-button"} onClick={onTopoButtonClick}>
            Topo
          </button>
          <button className="sc-button sc-basemap-arrow" onClick={onTopoArrowClick} />
        </div>
      </div>
      <div id="sc-basemap-imagery-slider-container" className={imageryPanelOpen ? "sc-basemap-imagery-slider-container" : "sc-hidden"}>
        <label className="sc-basemap-streets-label">
          <input className="sc-basemap-streets-checkbox" id="sc-basemap-streets-checkbox" type="checkbox" onChange={onStreetsCheckbox} checked={streetsCheckbox} />
          &nbsp;Streets
        </label>
        <Slider
          included={false}
          style={sliderWrapperStyle}
          marks={imagerySliderMarks}
          vertical={true}
          max={imagerySliderMax}
          min={imagerySliderMin}
          step={0.01}
          defaultValue={imagerySliderDefaultValue}
          onChange={onSliderChange}
          value={imagerySliderValue}
        />
      </div>
      <div className={topoPanelOpen ? "sc-basemap-topo-container" : "sc-hidden"}>
        {baseMapServicesOptions.topoServices.map((service, index) => (
          <BasemapItem key={helpers.getUID()} index={index} topoActiveIndex={topoActiveIndex} service={service} onTopoItemClick={onTopoItemClick} />
        ))}
      </div>
    </div>
  );
};

export default BasemapSwitcher;
