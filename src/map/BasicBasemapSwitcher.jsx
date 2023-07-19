import React, { useState, useRef, useContext, useEffect } from "react";
import ReactDOM from "react-dom";
import Slider from "rc-slider";
import "./BasicBasemapSwitcher.css";
import * as helpers from "../helpers/helpers";
import FloatingMenu, { FloatingMenuItem } from "../helpers/FloatingMenu.jsx";
import Portal from "../helpers/Portal.jsx";
import { Item as MenuItem } from "rc-menu";
import BasicBasemapSwitcherItem from "./BasicBasemapSwitcherItem.jsx";
import BasemapSwitcherContext from "./BasemapSwitcherContext";

const BasicBasemapSwitcher = (props) => {
  const { loadTopoLayers, baseMapServicesOptions, topoLayersRef } = useContext(BasemapSwitcherContext);

  const storageKeyBasemapRef = useRef("Saved Basemap Options");
  const [topoPanelOpen, setTopoPanelOpen] = useState(false);
  const [topoActiveIndex, setTopoActiveIndex] = useState(0);
  const [topoCheckbox, setTopoCheckbox] = useState(true);
  const [basemapOpacity, setBasemapOpacity] = useState(1);
  const [toggleService, setToggleService] = useState(undefined);
  const [toggleIndex, setToggleIndex] = useState(1);
  const [previousIndex, setPreviousIndex] = useState(undefined);
  const [showBaseMapSwitcher, setShowBaseMapSwitcher] = useState(true);

  useEffect(() => {
    setShowBaseMapSwitcher(window.mapControls.basemap);

    // LISTEN FOR MAP TO MOUNT
    const mapLoadedListener = window.emitter.addListener("mapLoaded", () => onMapLoad());
    // LISTEN FOR CONTROL VISIBILITY CHANGES
    const mapControlsChangedListener = window.emitter.addListener("mapControlsChanged", (control, visible) => controlStateChange(control, visible));
    return () => {
      mapLoadedListener.remove();
      mapControlsChangedListener.remove();
    };
  }, []);
  useEffect(() => {
    setTopoLayerVisiblity(topoActiveIndex);
  }, [basemapOpacity]);
  const onMapLoad = () => {
    loadTopoLayers(baseMapServicesOptions);

    let savedOptions = helpers.getItemsFromStorage(storageKeyBasemapRef.current);
    if (savedOptions !== undefined) {
      setTopoActiveIndex(savedOptions.topoActiveIndex);
      setToggleIndex(savedOptions.toggleIndex);
      setPreviousIndex(savedOptions.previousIndex);
      onToggleBasemap(savedOptions.topoActiveIndex);
      setBasemapOpacity(savedOptions.basemapOpacity);
      setToggleService(savedOptions.toggleService);
    } else {
      setTopoActiveIndex(0);
      setPreviousIndex(0);
      setToggleService(baseMapServicesOptions.topoServices[1]);

      enableTopo();
    }

    // NEED TO WAIT A TAD FOR LAYERS TO INIT
    setTimeout(() => {
      handleURLParameters();
    }, 100);
  };

  // HANDLE URL PARAMETERS
  const handleURLParameters = (value) => {
    const basemap = helpers.getURLParameter("BASEMAP") !== null ? helpers.getURLParameter("BASEMAP").toUpperCase() : null;
    const name = helpers.getURLParameter("NAME") !== null ? helpers.getURLParameter("NAME").toUpperCase() : null;

    if (basemap === "TOPO") {
      enableTopo();

      for (let index = 0; index < topoLayersRef.current.length; index++) {
        let layer = topoLayersRef.current[index];
        const layerName = layer.getProperties().name;
        if (layerName.toUpperCase() === name) {
          setTopoActiveIndex(index);
          setPreviousIndex(index);
          setTopoLayerVisiblity(index);
        }
      }
    }
  };

  const enableTopo = (value) => {
    setTopoLayerVisiblity(topoActiveIndex);

    // EMIT A BASEMAP CHANGE
    window.emitter.emit("basemapChanged", "TOPO");
  };

  // PANEL DROP DOWN BUTTON
  const onTopoArrowClick = (evt) => {
    enableTopo();
    setTopoPanelOpen(!topoPanelOpen);
    // APP STATS
    helpers.addAppStat("Topo", "Arrow");
  };

  // CLICK ON TOPO THUMBNAILS
  const onTopoItemClick = (activeIndex) => {
    setTopoLayerVisiblity(activeIndex);
    setTopoPanelOpen(false);
    setTopoActiveIndex(activeIndex);
  };

  // ADJUST VISIBILITY
  const setTopoLayerVisiblity = (activeIndex) => {
    for (let index = 0; index < topoLayersRef.current.length; index++) {
      let layer = topoLayersRef.current[index];
      const layerIndex = layer.getProperties().index;
      if (layerIndex === activeIndex) {
        //let layers = layer.getLayers();

        layer.getLayers().forEach((layer) => {
          if (layer.get("isOverlay") && topoCheckbox) layer.setVisible(true);
          else if (layer.get("isOverlay") && !topoCheckbox) layer.setVisible(false);
        });
        layer.setOpacity(basemapOpacity);
        layer.setVisible(true);
      } else {
        layer.setOpacity(basemapOpacity);
        layer.setVisible(false);
      }
    }
  };
  // OPACITY SLIDER FOR EACH LAYER
  const onSliderChange = (opacity) => {
    setBasemapOpacity(opacity);
  };

  const onToggleBasemap = (index) => {
    if (index === topoActiveIndex) {
      setTopoPanelOpen(false);
      return;
    }
    let toggleIndex = topoActiveIndex;
    if (toggleIndex === undefined) toggleIndex = 0;
    baseMapServicesOptions.topoServices &&
      baseMapServicesOptions.topoServices.forEach((service) => {
        if (service.index === toggleIndex) {
          setToggleService(service);
          setToggleIndex(toggleIndex);
          onTopoItemClick(index);
        }
      });
  };
  const saveBasemap = () => {
    let basemapOptions = {
      topoActiveIndex: topoActiveIndex,
      basemapOpacity: basemapOpacity,
      toggleService: toggleService,
      toggleIndex: toggleIndex,
      previousIndex: previousIndex,
    };
    helpers.saveToStorage(storageKeyBasemapRef.current, basemapOptions);
    helpers.showMessage("Save", "Basemap options saved.");
  };
  const onMenuItemClick = (action) => {
    switch (action) {
      case "sc-floating-menu-save-basemap":
        saveBasemap();
        break;
      default:
        break;
    }
    helpers.addAppStat("Basemap Settings - ", action);
  };
  // ELLIPSIS/OPTIONS BUTTON
  const onBasemapOptionsClick = (evt) => {
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu key={helpers.getUID()} buttonEvent={evtClone} autoY={false} title="Basemap Options" item={props.info} onMenuItemClick={(action) => onMenuItemClick(action)} styleMode={"left"}>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-save-basemap">
            <FloatingMenuItem imageName={"save-disk.png"} label="Save Default Basemap" />
          </MenuItem>
          <MenuItem className="sc-layers-slider" key="sc-floating-menu-opacity">
            Adjust Transparency
            <Slider max={1} min={0} step={0.05} defaultValue={basemapOpacity} onChange={(evt) => onSliderChange(evt)} />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
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
      <div id="sc-basic-basemap-main-container">
        <div id="sc-basic-basemap-options" onClick={onBasemapOptionsClick} title="Basemap Options" alt="Basemap Options"></div>
        <div className={"sc-basic-basemap-topo"}>
          <BasicBasemapSwitcherItem
            key={helpers.getUID()}
            className="sc-basic-basemap-topo-toggle-item-container"
            index={toggleIndex}
            showLabel={true}
            topoActiveIndex={topoActiveIndex}
            service={toggleService}
            onTopoItemClick={onToggleBasemap}
          />
          <button className={"sc-button sc-basic-basemap-arrow" + (topoPanelOpen ? " open" : "")} onClick={onTopoArrowClick}></button>
        </div>
      </div>
      <div className={topoPanelOpen ? "sc-basic-basemap-topo-container" : "sc-hidden"}>
        {baseMapServicesOptions.topoServices &&
          baseMapServicesOptions.topoServices.map((service, index) => (
            <BasicBasemapSwitcherItem
              key={helpers.getUID()}
              index={index}
              showLabel={true}
              topoActiveIndex={topoActiveIndex}
              service={service}
              onTopoItemClick={onToggleBasemap}
              className={index === topoActiveIndex ? "active" : ""}
            />
          ))}
      </div>
    </div>
  );
};
export default BasicBasemapSwitcher;
