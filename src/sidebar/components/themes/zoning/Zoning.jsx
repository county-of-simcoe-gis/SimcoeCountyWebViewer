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
  const [byLawUrl, setByLawUrl] = useState(null);
  const [contactUsEmail, setContactUsEmail] = useState(null);
  const [termsUrl, setTermsUrl] = useState(null);

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
      setByLawUrl(themeConfig.byLawUrl);
      setContactUsEmail(themeConfig.contactUsEmail);
      setTermsUrl(themeConfig.termsUrl);
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
        if (results.type !== "Assessment Parcel")
          helpers.getFeaturesFromGeom(layer.url, layer.geom, geom, (zoningInfo) => {
            sectionList.push({ section: layer.title, features: zoningInfo, featureTitleColumn: layer.featureTitleColumn });
            if (sectionList.length === themeConfig.queryLayers.length) setSections(sectionList);
          });
        else
          helpers.getFeaturesFromFilter(layer.url, "arn", results.name, (zoningInfo) => {
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
    window.location.href = `mailto:${contactUsEmail}`;
  };

  const onTermsChange = (evt) => {
    helpers.showURLWindow(termsUrl);
  };

  const onByLawClick = (evt) => {
    window.open(byLawUrl, "_blank");
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
        <div className={termsUrl ? "sc-button sc-theme-zoning-terms" : "sc-hidden"} onClick={onTermsChange} title="Terms">
          Terms
        </div>

        <div className={byLawUrl ? "sc-button sc-theme-zoning-tbylawerms" : "sc-hidden"} onClick={onByLawClick} title="Zoning Bylaw">
          Zoning Bylaw
        </div>

        <div className={contactUsEmail ? "sc-button sc-theme-zoning-contactus" : "sc-hidden"} onClick={onContactClick} title="Contact Us">
          Contact Us
        </div>
      </div>
    </PanelComponent>
  );
};

export default Zoning;
