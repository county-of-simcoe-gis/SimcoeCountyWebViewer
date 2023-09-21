import React, { useState, useEffect, useRef } from "react";
import "./TwoOneOne.css";
import * as themeConfig from "./config.json";

import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import Select from "react-select";
import InfoRow from "../../../../helpers/InfoRow.jsx";
import { AutoSizer, List } from "react-virtualized";
import "react-virtualized/styles.css";
import redDot from "./images/red-dot.png";
import { Vector as VectorSource } from "ol/source.js";
import { Style, Icon } from "ol/style.js";
import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { unByKey } from "ol/Observable.js";
import Switch from "react-switch";

const ageCategoriesEnglish = [
  {
    value: "All",
    label: "All",
  },
  {
    value: "Adults",
    label: "Adults",
  },
  {
    value: "Children",
    label: "Children",
  },
  {
    value: "Seniors",
    label: "Seniors",
  },
  {
    value: "Youth",
    label: "Youth",
  },
];

const ageCategoriesFrench = [
  {
    value: "All",
    label: "Tout",
  },
  {
    value: "Adultes",
    label: "Adultes",
  },
  {
    value: "Aînés",
    label: "Aînés",
  },
  {
    value: "Jeunes",
    label: "Jeunes",
  },
];

const TwoOneOne = (props) => {
  const vectorSource = useRef(
    new VectorSource({
      features: [],
    })
  );
  const [categories, setCategories] = useState([]);
  const [categorySelectedOption, setCategorySelectedOption] = useState({ value: "All", label: "All" });
  const [subCategories, setSubCategories] = useState([]);
  const [subCategorySelectedOption, setSubCategorySelectedOption] = useState({ value: "All", label: "All" });
  const [results, setResults] = useState([]);
  const [ageCategorySelectedOption, setAgeCategorySelectedOption] = useState(ageCategoriesEnglish[0]);
  const [searchText, setSearchText] = useState("");
  const [onlyFeaturesInMap, setOnlyFeaturesInMap] = useState(false);
  const [isFrench, setIsFrench] = useState(false);
  const apiUrl = useRef(null);
  const mapMoveEvent = useRef(null);
  const mapClickEvent = useRef(null);
  const onlyFeaturesInMapRef = useRef(onlyFeaturesInMap);
  const searchTextRef = useRef(searchText);
  const ageCategorySelectedOptionRef = useRef(ageCategorySelectedOption);
  const subCategorySelectedOptionRef = useRef(subCategorySelectedOption);
  const categorySelectedOptionRef = useRef(categorySelectedOption);
  const isFrenchRef = useRef(isFrench);
  const layer = useRef(null);

  useEffect(() => {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      apiUrl.current = themeConfig.default.apiUrl;
      mapClickEvent.current = window.map.on("click", (evt) => {
        // DISABLE POPUPS
        if (window.isDrawingOrEditing || window.isCoordinateToolOpen || window.isMeasuring) return;

        const feature = window.map.forEachFeatureAtPixel(
          evt.pixel,
          function (feature, layer) {
            return feature;
          },
          {
            layerFilter: function (layer) {
              return layer.get("name") !== undefined && layer.get("name") === "sc-211";
            },
          }
        );
        if (feature !== undefined) window.popup.show(feature.getGeometry().flatCoordinates, <PopupContent feature={feature} isFrench={isFrench} />, "Information");
      });
      mapMoveEvent.current = window.map.on("moveend", () => {
        if (onlyFeaturesInMapRef.current) updateResults();
      });
      createLayer();
      getCategories();
    });
  }, []);

  useEffect(() => {
    updateSubCategories();
  }, [categorySelectedOption, isFrench]);

  useEffect(() => {
    updateResults();
  }, [ageCategorySelectedOption, isFrench, categorySelectedOption, subCategorySelectedOption, onlyFeaturesInMap, searchText]);

  const getCategories = () => {
    let categories = [];
    helpers.getJSON(apiUrl.current + "public/map/theme/211/Categories/" + isFrench, (result) => {
      categories.push({
        value: "All",
        label: isFrench ? "Tout" : "All",
      });
      result.forEach((category) => {
        categories.push({ value: category, label: category });
      });

      setCategories(categories);
      setCategorySelectedOption(categories[0]);
    });
  };
  const updateSubCategories = () => {
    let subCategories = [];
    const subCategoriesUrl = apiUrl.current + "public/map/theme/211/SubCategories/" + encodeURIComponent(categorySelectedOption.value) + "/" + isFrench;
    helpers.getJSON(subCategoriesUrl, (result) => {
      subCategories.push({
        value: "All",
        label: isFrench ? "Tout" : "All",
      });
      result.forEach((subCategory) => {
        subCategories.push({ value: subCategory, label: subCategory });
      });

      setSubCategories(subCategories);
      setSubCategorySelectedOption(subCategories[0]);
    });
  };
  const createLayer = () => {
    vectorSource.current = new VectorSource({
      features: [],
    });

    layer.current = new VectorLayer({
      source: vectorSource.current,
      zIndex: 1000,
      name: "sc-211",
      style: new Style({
        image: new Icon({
          src: redDot,
        }),
      }),
    });
    layer.current.set("disableParcelClick", true);
    window.map.addLayer(layer.current);
  };

  const updateResults = () => {
    const resultsUrlTemplate = (apiUrl, category, subCategory, age, isFrench) =>
      `${apiUrl}public/map/theme/211/Results/${encodeURIComponent(category)}/${encodeURIComponent(subCategory)}/${encodeURIComponent(age)}/${isFrench}`;
    const url = resultsUrlTemplate(
      apiUrl.current,
      categorySelectedOptionRef.current.value,
      categorySelectedOptionRef.current.value === "All" ? "All" : subCategorySelectedOptionRef.current.value,
      ageCategorySelectedOptionRef.current.value,
      isFrenchRef.current
    );

    helpers.getJSON(url, (apiResults) => {
      // FILTER RESULTS FROM SEARCH INPUT
      // eslint-disable-next-line
      let filteredResults = apiResults.filter((item) => {
        if (searchTextRef.current === "") return item;
        else if (item.organization_program_name.toUpperCase().indexOf(searchTextRef.current.toUpperCase()) !== -1) return item;
      });
      vectorSource.current.clear();
      filteredResults.map((item) => {
        const coords = helpers.toWebMercatorFromLatLong([item.longitude.replace(",", "."), Math.abs(item.latitude.replace(",", "."))]);
        let feature = new Feature(new Point(coords));
        feature.setProperties(item);
        vectorSource.current.addFeature(feature);
      });

      // ONLY IN MAP
      if (onlyFeaturesInMapRef.current) {
        const extent = window.map.getView().calculateExtent(window.map.getSize());
        const features = vectorSource.current.getFeaturesInExtent(extent);
        filteredResults = apiResults.filter((item) => {
          const featuresFound = features.filter((itemFeature) => {
            return item["record_#"] === itemFeature.get("record_#") ? true : false;
          });
          return featuresFound.length > 0 ? true : false;
        });
      }

      setResults(filteredResults);
    });
  };

  const onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)
    unByKey(mapClickEvent.current);
    unByKey(mapMoveEvent.current);
    window.map.removeLayer(layer.current);

    // CALL PARENT WITH CLOSE
    props.onClose();
  };

  const onChangeCategory = (selectedOption) => {
    setCategorySelectedOption(selectedOption);
    categorySelectedOptionRef.current = selectedOption;
  };

  const onChangeSubCategory = (selectedOption) => {
    setSubCategorySelectedOption(selectedOption);
    subCategorySelectedOptionRef.current = selectedOption;
  };

  const onChangeAgeCategory = (selectedOption) => {
    setAgeCategorySelectedOption(selectedOption);
    ageCategorySelectedOptionRef.current = selectedOption;
  };

  const onChangeSearchTextbox = (evt) => {
    setSearchText(evt.target.value);
    searchTextRef.current = evt.target.value;
  };

  const onOnlyFeatureInMap = (evt) => {
    setOnlyFeaturesInMap(evt.target.checked);
    onlyFeaturesInMapRef.current = evt.target.checked;
  };

  const onZoomClick = (item) => {
    const coords = helpers.toWebMercatorFromLatLong([item.longitude, Math.abs(item.latitude)]);
    let feature = new Feature(new Point(coords));
    feature.setProperties(item);
    helpers.zoomToFeature(feature);
    window.popup.show(feature.getGeometry().flatCoordinates, <PopupContent feature={feature} />, "Information");
  };

  const onLangChange = (isFrench) => {
    setIsFrench(isFrench);
    setAgeCategorySelectedOption(isFrench ? ageCategoriesFrench[0] : ageCategoriesEnglish[0]);
    isFrenchRef.current = isFrench;
    ageCategorySelectedOptionRef.current = isFrench ? ageCategoriesFrench[0] : ageCategoriesEnglish[0];
    helpers.addAppStat("211 Lang Switch", "Click");
  };

  const _rowRenderer = ({ index, parent, key, style }) => {
    const row = results[index];
    return (
      <div key={key} style={style}>
        <Result result={row} onZoomClick={onZoomClick} isFrench={isFrench} />
      </div>
    );
  };

  const _getRowHeight = (evt) => {
    const row = results[evt.index];

    if (row.organization_program_name.length <= 35) {
      return 72;
    } else if (row.organization_program_name.length > 35 && row.organization_program_name.length <= 70) {
      return 82;
    } else if (row.organization_program_name.length > 70 && row.organization_program_name.length <= 105) {
      return 88;
    } else if (row.organization_program_name.length > 105 && row.organization_program_name.length <= 140) {
      return 94;
    } else if (row.organization_program_name.length > 140 && row.organization_program_name.length <= 175) {
      return 100;
    } else if (row.organization_program_name.length > 175 && row.organization_program_name.length <= 210) {
      return 106;
    } else if (row.organization_program_name.length > 210 && row.organization_program_name.length <= 245) {
      return 112;
    } else {
      return 120;
    }
  };
  const dropdownStyles = {
    control: (provided) => ({
      ...provided,
      minHeight: "30px",
      marginBottom: "5px",
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      height: "30px",
    }),
    clearIndicator: (provided) => ({
      ...provided,
      padding: "5px",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "5px",
    }),
  };
  useEffect(() => {
    if (categorySelectedOption === null) return <div />;
  });

  return (
    <PanelComponent onClose={onClose} name={props.name} helpLink={props.helpLink} hideHeader={props.hideHeader} type="themes">
      <div>
        <label className={"sc-211-theme-lang-switch-label"}>
          {isFrench ? "Back to English" : "Voir en Français?"}
          <Switch className="sc-theme-211-lang-switch" onChange={onLangChange} checked={isFrench} height={20} width={48} />
        </label>
        <div className="sc-theme-211-main-conainer">
          <label style={{ fontWeight: "bold" }}>{isFrench ? "Catégorie" : "Category"}</label>
          <Select styles={dropdownStyles} isSearchable={false} options={categories} value={categorySelectedOption} onChange={onChangeCategory} />
          <label style={{ fontWeight: "bold" }} className={categorySelectedOption.value === "All" ? "sc-disabled" : ""}>
            {isFrench ? "Sous Catégorie" : "Sub Category"}
          </label>
          <Select
            className={categorySelectedOption.value === "All" ? "sc-disabled" : ""}
            styles={dropdownStyles}
            isSearchable={true}
            options={subCategories}
            value={categorySelectedOption.value === "All" ? "" : subCategorySelectedOption}
            onChange={onChangeSubCategory}
            placeholder={isFrench ? "En attente de sélection de catégorie" : "Waiting for Category Selection"}
          />
          <label style={{ fontWeight: "bold" }}>{isFrench ? "Catégorie d'âge" : "Age Category"}</label>
          <Select styles={dropdownStyles} isSearchable={false} options={isFrench ? ageCategoriesFrench : ageCategoriesEnglish} value={ageCategorySelectedOption} onChange={onChangeAgeCategory} />
          <input
            type="text"
            style={{ paddingLeft: "5px" }}
            className="sc-theme-211-search-textbox"
            placeholder={isFrench ? "Rechercher les noms par mot-clé" : "Search Names by Keyword"}
            onChange={onChangeSearchTextbox}
            value={searchText}
          />
          <label className="sc-no-select">
            <input type="checkbox" value={onlyFeaturesInMap.current} onChange={onOnlyFeatureInMap} />
            {isFrench ? "Rechercher propriétés visibles sur la map" : "Only search properties visible in the map."}
          </label>
          <div style={{ borderBottom: "1px solid #ddd" }} />
          <div id="sc-theme-211-resulst-container" className="sc-theme-211-resulst-container">
            <AutoSizer>
              {({ width, height }) => {
                return <List className={""} height={height} rowCount={results.length} rowHeight={_getRowHeight} rowRenderer={_rowRenderer} width={width} />;
              }}
            </AutoSizer>
            <div className={results.length === 0 ? "sc-theme-211-no-results" : "sc-hidden"}>No Results Found</div>
          </div>
        </div>
      </div>
    </PanelComponent>
  );
};

export default TwoOneOne;

const Result = (props) => {
  const { result } = props;
  let style = props.style;
  let website = result.website;
  if (website && website.indexOf("http", 1) === -1) website = "https://" + website;
  return (
    <div className="sc-theme-211-result" style={style}>
      <div>
        <div>
          <InfoRow key={helpers.getUID()} label={props.isFrench ? "Nom" : "Name"} value={result.organization_program_name} />
        </div>

        {/* <InfoRow key={helpers.getUID()} label="Address" value={result.address} /> */}
        {/* <InfoRow key={helpers.getUID()} label="Phone" value={result.tty_phone} /> */}
        {/* <InfoRow key={helpers.getUID()} label="Website" value={website} /> */}
        <div className="sc-list-item-action-bar" style={{ marginTop: "5px", fontSize: "9pt" }}>
          <label
            className="sc-fakeLink"
            onClick={() => {
              props.isFrench
                ? window.open("https://simcoecounty.cioc.ca/record/" + result["record_#"] + "?Ln=fr-CA", "_blank")
                : window.open("https://simcoecounty.cioc.ca/record/" + result["record_#"], "_blank");
            }}
          >
            {props.isFrench ? "Voir les détails" : "View details"}
          </label>
          <label
            className="sc-fakeLink"
            style={{ marginLeft: "5px" }}
            onClick={() => {
              props.onZoomClick(result);
            }}
          >
            Zoom
          </label>
        </div>
      </div>
    </div>
  );
};

const PopupContent = (props) => {
  const { feature } = props;
  let website = feature.get("website");
  if (website && website.indexOf("http", 1) === -1) website = "https://" + website;
  return (
    <div>
      <InfoRow key={helpers.getUID()} label={props.isFrench ? "Nom" : "Name"} value={feature.get("organization_program_name")} />
      <InfoRow key={helpers.getUID()} label={props.isFrench ? "Description" : "Description"} value={feature.get("description_brief")} />
      <InfoRow key={helpers.getUID()} label={props.isFrench ? "Site Web" : "Website"} value={website} />
      <InfoRow
        key={helpers.getUID()}
        label={props.isFrench ? "Voir les details sur 211 Community Connections" : "View details on 211 Community Connections"}
        value={props.isFrench ? "https://simcoecounty.cioc.ca/record/" + feature.get("record_#") + "?Ln=fr-CA" : "https://simcoecounty.cioc.ca/record/" + feature.get("record_#")}
      />
    </div>
  );
};
