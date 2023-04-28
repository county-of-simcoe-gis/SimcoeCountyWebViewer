import React, { useState, useEffect } from "react";
import "./Broadband.css";
import PanelComponent from "../../../PanelComponent";
import * as broadbandConfig from "./config.json";
import * as helpers from "../../../../helpers/helpers";
import { Vector as VectorSource } from "ol/source.js";
import VectorLayer from "ol/layer/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style.js";
import SectionPanel from "./BroadbandResults";
const Broadband = (props) => {
  //DEFINE STATE VARIABLES
  const [sections, setSections] = useState([]);
  const [themeConfig, setThemeConfig] = useState(broadbandConfig.default);
  const [aboutUrl, setAboutUrl] = useState(null);
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
      const globalConfig = helpers.getConfig("THEMES", "Broadband");
      if (globalConfig.config !== undefined) {
        setThemeConfig(helpers.mergeObj(themeConfig, globalConfig.config));
      }
      setAboutUrl(themeConfig.aboutUrl);
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
      let sectionList = [];
      themeConfig.queryLayers.forEach((layer) => {
        const searchGeom = helpers.getFeatureFromGeoJSON(results.geojson).getGeometry();
        helpers.getFeaturesFromGeom(layer.url, layer.geom, searchGeom, (broadbandInfo) => {
          sectionList.push({ section: layer.title, features: broadbandInfo, featureTitleColumn: layer.featureTitleColumn });
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

  const onAboutClick = (evt) => {
    window.open(aboutUrl, "_blank");
  };
  return (
    <PanelComponent onClose={props.onClose} name={props.name} helpLink={props.helpLink} hideHeader={props.hideHeader} type="themes">
      <div className={"sc-theme-broadband-header"}>Broadband Results</div>
      <div className={"sc-theme-broadband-sub-header"}>
        Broadband information on this Web page has been provided by external sources. The County of Simcoe is not responsible for the accuracy, reliability or currency of the information supplied by
        external sources. Users wishing to rely upon this information should consult directly with the source of the information. Content provided by external sources is not subject to official
        languages, privacy and accessibility requirements. For further information please refer to the about the data section.
      </div>
      <div className={"sc-theme-broadband-body"}>
        {sections.length === 0 ? <div className="sc-theme-broadband-no-results">No Results</div> : ``}
        {sections.map((section) => (
          <SectionPanel key={helpers.getUID()} section={section} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
        ))}
      </div>
      <div className={"sc-theme-broadband-footer"}>
        <div className={termsUrl ? "sc-button sc-theme-broadband-terms" : "sc-hidden"} onClick={onTermsChange} title="Terms">
          Terms
        </div>

        <div className={aboutUrl ? "sc-button sc-theme-broadband-about" : "sc-hidden"} onClick={onAboutClick} title="About the Data">
          About the Data
        </div>

        <div className={contactUsEmail ? "sc-button sc-theme-broadband-contactus" : "sc-hidden"} onClick={onContactClick} title="Contact Us">
          Contact Us
        </div>
      </div>
    </PanelComponent>
  );
};

export default Broadband;
