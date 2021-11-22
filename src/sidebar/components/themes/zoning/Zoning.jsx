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
    window.emitter.addListener("searchComplete", (results) => loadReport(results));
    window.map.addLayer(shadowLayer);
    return () => {
      window.map.removeLayer(shadowLayer);
    };
  });

  const loadReport = (results) => {
    if (results.geojson) {
      let geom = helpers.getFeatureFromGeoJSON(results.geojson).getGeometry();
      let sectionList = [];
      zoningConfig.queryLayers.forEach((layer) => {
        helpers.getFeaturesFromGeom(layer.url, layer.geom, geom, (zoningInfo) => {
          sectionList.push({ section: layer.title, features: zoningInfo, featureTitleColumn: layer.featureTitleColumn });
          if (sectionList.length === zoningConfig.queryLayers.length) setSections(sectionList);
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
    window.location.href = `mailto:${zoningConfig.contactUsEmail}`;
  };

  const onTermsChange = (evt) => {
    helpers.showURLWindow(zoningConfig.termsUrl);
  };

  const onByLawClick = (evt) => {
    window.open(zoningConfig.byLawUrl, "_blank");
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
        <div className={"sc-button sc-theme-zoning-terms"} onClick={onTermsChange} title="Terms">
          Terms
        </div>

        <div className={"sc-button sc-theme-zoning-tbylawerms"} onClick={onByLawClick} title="Zoning Bylaw">
          Zoning Bylaw
        </div>

        <div className={"sc-button sc-theme-zoning-contactus"} onClick={onContactClick} title="Contact Us">
          Contact Us
        </div>
      </div>
    </PanelComponent>
  );
};

export default Zoning;
