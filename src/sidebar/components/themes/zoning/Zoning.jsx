import React, { useState, useEffect } from "react";
import "./Zoning.css";
import PanelComponent from "../../../PanelComponent";
import * as zoningConfig from "./config.json";
import * as helpers from "../../../../helpers/helpers";
import { Vector as VectorSource } from "ol/source.js";
import VectorLayer from "ol/layer/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style.js";
import SectionPanel from "./ZoningResults";
const Zoning = (props) => {
  //DEFINE STATE VARIABLES
  const [sections, setSections] = useState([]);
  const [themeConfig, setThemeConfig] = useState(zoningConfig.default);
  const [shadowLayer] = useState(
    new VectorLayer({
      source: new VectorSource({
        features: [],
      }),
      zIndex: 100000,
      style: new Style({
        stroke: new Stroke({
          color: [0, 255, 255, 0.3],
          width: 6,
        }),
        fill: new Fill({
          color: [0, 255, 255, 0.3],
        }),
        image: new CircleStyle({
          radius: 10,
          stroke: new Stroke({
            color: [0, 255, 255, 0.3],
            width: 6,
          }),
          fill: new Fill({
            color: [0, 255, 255, 0.3],
          }),
        }),
      }),
    })
  );
  //DEFINE USE EFFECT FUNCTIONS
  useEffect(() => {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      const globalConfig = helpers.getConfig("THEMES", "Zoning");
      if (globalConfig.config !== undefined) {
        setThemeConfig(helpers.mergeObj(themeConfig, globalConfig.config));
      }
      window.emitter.addListener("searchComplete", (results) => loadReport(results));
      window.map.addLayer(shadowLayer);
    });
    return () => {
      window.map.removeLayer(shadowLayer);
    };
  });

  const loadReport = (results) => {
    if (results.geojson) {
      let geom = helpers.getFeatureFromGeoJSON(results.geojson).getGeometry();
      let sectionList = [];
      themeConfig.queryLayers.forEach((layer) => {
        helpers.getFeaturesFromGeom(layer.url, layer.geom, geom, (zoningInfo) => {
          sectionList.push({ section: layer.title, features: zoningInfo, featureTitleColumn: layer.featureTitleColumn });
          if (sectionList.length === themeConfig.queryLayers.length) setSections(sectionList);
        });
      });
    }
  };

  const onMouseEnter = (feature) => {
    if (feature.values_.geometry !== undefined && feature.values_.geometry !== null) {
      shadowLayer.getSource().clear();
      shadowLayer.getSource().addFeature(feature);
    }
  };
  const onMouseLeave = () => {
    shadowLayer.getSource().clear();
  };
  const onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)
    // CALL PARENT WITH CLOSE
    props.onClose();
  };

  const onContactClick = () => {
    window.location.href = `mailto:${themeConfig.contactUsEmail}`;
  };

  const onTermsChange = (evt) => {
    helpers.showURLWindow(themeConfig.termsUrl);
  };

  const onByLawClick = (evt) => {
    window.open(themeConfig.byLawUrl, "_blank");
  };

  return (
    <PanelComponent onClose={props.onClose} name={props.name} helpLink={props.helpLink} hideHeader={props.hideHeader} type="themes">
      <div className={"sc-theme-zoning-header"}>Zoning Results</div>
      <div className={"sc-theme-zoning-body"}>
        {sections.length === 0 ? <div className="sc-theme-zoning-no-results">No Results</div> : ``}
        {sections.map((section) => (
          <SectionPanel key={helpers.getUID()} section={section} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
        ))}
      </div>
      <div className={"sc-theme-zoning-footer"}>
        <div className={themeConfig.termsUrl ? "sc-button sc-theme-zoning-terms" : "sc-hidden"} onClick={onTermsChange} title="Terms">
          Terms
        </div>

        <div className={themeConfig.byLawUrl ? "sc-button sc-theme-zoning-tbylawerms" : "sc-hidden"} onClick={onByLawClick} title="Zoning Bylaw">
          Zoning Bylaw
        </div>

        <div className={themeConfig.contactUsEmail ? "sc-button sc-theme-zoning-contactus" : "sc-hidden"} onClick={onContactClick} title="Contact Us">
          Contact Us
        </div>
      </div>
    </PanelComponent>
  );
};

export default Zoning;
