import React, { Component } from "react";
import "./TwoOneOne.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import Select from "react-select";
import mainConfig from "../../../../config.json";
import InfoRow from "../../../../helpers/InfoRow.jsx";
import { AutoSizer, List, CellMeasurerCache } from "react-virtualized";
import "react-virtualized/styles.css";
import redDot from "./images/red-dot.png";
import { Vector as VectorSource } from "ol/source.js";
import { Style, Icon } from "ol/style.js";
import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { unByKey } from "ol/Observable.js";
import Switch from "react-switch";
import communityServices from "../../../images/communityServices.png";

const apiUrl = mainConfig.apiUrl;
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

class TwoOneOne extends Component {
  constructor(props) {
    super(props);
    this.cache = new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 144,
    });

    this.state = {
      categories: [],
      categorySelectedOption: null,
      subCategories: [],
      subCategorySelectedOption: null,
      results: [],
      ageCategorySelectedOption: ageCategoriesEnglish[0],
      backToTopVisible: false,
      scrollTop: 0,
      searchText: "",
      onlyFeaturesInMap: false,
      isFrench: false,
    };
  }

  componentWillMount() {
    this.createLayer();
    this.getCategories();
  }

  componentWillUnmount() {
    unByKey(this.mapClickEvent);
    unByKey(this.mapMoveEvent);
    window.map.removeLayer(this.layer);
  }

  getCategories = () => {
    let categories = [];
    helpers.getJSON(apiUrl + "get211Categories/" + this.state.isFrench, (result) => {
      categories.push({
        value: "All",
        label: this.state.isFrench ? "Tout" : "All",
      });
      result.forEach((category) => {
        categories.push({ value: category, label: category });
      });

      this.setState({ categories }, () => {
        this.setState({ categorySelectedOption: categories[0] }, () => {
          this.updateSubCategories();
        });
      });
    });
  };

  createLayer = () => {
    this.vectorSource = new VectorSource({
      features: [],
    });

    this.layer = new VectorLayer({
      source: this.vectorSource,
      zIndex: 1000,
      name: "sc-211",
      style: new Style({
        image: new Icon({
          src: redDot,
        }),
      }),
    });
    this.layer.set("disableParcelClick", true);
    window.map.addLayer(this.layer);

    this.mapClickEvent = window.map.on("click", (evt) => {
      // DISABLE POPUPS
      if (window.isDrawingOrEditing) return;

      const feature = window.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        if (layer === null) return;

        if (layer.get("name") !== undefined && layer.get("name") === "sc-211") return feature;
      });
      if (feature !== undefined) window.popup.show(feature.getGeometry().flatCoordinates, <PopupContent feature={feature} isFrench={this.state.isFrench} />, "Information");
    });

    this.mapMoveEvent = window.map.on("moveend", () => {
      if (this.state.onlyFeaturesInMap) this.updateResults();
    });
  };

  updateSubCategories = () => {
    let subCategories = [];
    const subCategoriesUrl = apiUrl + "get211SubCategories/" + encodeURIComponent(this.state.categorySelectedOption.value) + "/" + this.state.isFrench;
    helpers.getJSON(subCategoriesUrl, (result) => {
      subCategories.push({
        value: "All",
        label: this.state.isFrench ? "Tout" : "All",
      });
      result.forEach((subCategory) => {
        subCategories.push({ value: subCategory, label: subCategory });
      });

      this.setState({ subCategories }, () => {
        this.setState({ subCategorySelectedOption: subCategories[0] }, () => {
          this.updateResults();
        });
      });
    });
  };

  updateResults = () => {
    const resultsUrlTemplate = (apiUrl, category, subCategory, age, isFrench) =>
      `${apiUrl}get211Results/${encodeURIComponent(category)}/${encodeURIComponent(subCategory)}/${encodeURIComponent(age)}/${isFrench}`;
    const url = resultsUrlTemplate(
      apiUrl,
      this.state.categorySelectedOption.value,
      this.state.categorySelectedOption.value === "All" ? "All" : this.state.subCategorySelectedOption.value,
      this.state.ageCategorySelectedOption.value,
      this.state.isFrench
    );

    helpers.getJSON(url, (results) => {
      this.setState({ results }, () => {
        this.List.Grid._scrollingContainer.scrollTop = 100;
        setTimeout(() => {
          this.List.Grid._scrollingContainer.scrollTop = 0;
        }, 20);
      });

      this.vectorSource.clear();
      results.forEach((item) => {
        const coords = helpers.toWebMercatorFromLatLong([item.longitude.replace(",", "."), Math.abs(item.latitude.replace(",", "."))]);
        let feature = new Feature(new Point(coords));
        feature.setProperties(item);
        this.vectorSource.addFeature(feature);
      });
    });
  };

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  onChangeCategory = (selectedOption) => {
    this.setState({ categorySelectedOption: selectedOption }, () => {
      this.updateSubCategories();
    });
  };

  onChangeSubCategory = (selectedOption) => {
    this.setState({ subCategorySelectedOption: selectedOption }, () => {
      this.updateResults();
    });
  };

  onChangeAgeCategory = (selectedOption) => {
    this.setState({ ageCategorySelectedOption: selectedOption }, () => {
      this.updateResults();
    });
  };

  onChangeSearchTextbox = (evt) => {
    this.setState({ searchText: evt.target.value });
  };

  onOnlyFeatureInMap = (evt) => {
    this.setState({ onlyFeaturesInMap: evt.target.checked }, () => {
      this.updateResults();
    });
  };

  onZoomClick = (item) => {
    const coords = helpers.toWebMercatorFromLatLong([item.longitude, Math.abs(item.latitude)]);
    let feature = new Feature(new Point(coords));
    feature.setProperties(item);
    helpers.zoomToFeature(feature);
    window.popup.show(feature.getGeometry().flatCoordinates, <PopupContent feature={feature} />, "Information");
  };

  onLangChange = (isFrench) => {
    this.setState({ isFrench, ageCategorySelectedOption: isFrench ? ageCategoriesFrench[0] : ageCategoriesEnglish[0] }, () => {
      this.getCategories();
    });
    helpers.addAppStat("211 Lang Switch", "Click");
  };

  registerListRef = (listInstance) => {
    this.List = listInstance;
  };

  _rowRenderer = ({ index, parent, key, style }) => {
    const row = this.results[index];
    return (
      <div key={key} style={style}>
        <Result result={row} onZoomClick={this.onZoomClick} isFrench={this.state.isFrench} />
      </div>
    );
  };

  _getRowHeight = (evt) => {
    const row = this.results[evt.index];

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

  render() {
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
    if (this.state.categorySelectedOption === null) return <div />;

    // FILTER RESULTS FROM SEARCH INPUT
    // eslint-disable-next-line
    this.results = this.state.results.filter((item) => {
      if (this.state.searchText === "") return item;

      if (item.organization_program_name.toUpperCase().indexOf(this.state.searchText.toUpperCase()) !== -1) return item;
    });

    // ONLY IN MAP
    if (this.state.onlyFeaturesInMap) {
      const extent = window.map.getView().calculateExtent(window.map.getSize());
      const features = this.vectorSource.getFeaturesInExtent(extent);

      this.results = this.results.filter((item) => {
        const featuresFound = features.filter((itemFeature) => {
          if (item["record_#"] === itemFeature.get("record_#")) return itemFeature;
        });
        if (featuresFound.length > 0) return item;
      });
    }

    return (
      <PanelComponent onClose={this.onClose} name={this.props.name} type="themes">
        <div>
          <label className={"sc-211-theme-lang-switch-label"}>
            {this.state.isFrench ? "Back to English" : "Voir en Français?"}
            <Switch className="sc-theme-211-lang-switch" onChange={this.onLangChange} checked={this.state.isFrench} height={20} width={48} />
          </label>
          <div className="sc-theme-211-main-conainer">
            <label style={{ fontWeight: "bold" }}>{this.state.isFrench ? "Catégorie" : "Category"}</label>
            <Select styles={dropdownStyles} isSearchable={false} options={this.state.categories} value={this.state.categorySelectedOption} onChange={this.onChangeCategory} />
            <label style={{ fontWeight: "bold" }} className={this.state.categorySelectedOption.value === "All" ? "sc-disabled" : ""}>
              {this.state.isFrench ? "Sous Catégorie" : "Sub Category"}
            </label>
            <Select
              className={this.state.categorySelectedOption.value === "All" ? "sc-disabled" : ""}
              styles={dropdownStyles}
              isSearchable={true}
              options={this.state.subCategories}
              value={this.state.categorySelectedOption.value === "All" ? "" : this.state.subCategorySelectedOption}
              onChange={this.onChangeSubCategory}
              placeholder={this.state.isFrench ? "En attente de sélection de catégorie" : "Waiting for Category Selection"}
            />
            <label style={{ fontWeight: "bold" }}>{this.state.isFrench ? "Catégorie d'âge" : "Age Category"}</label>
            <Select
              styles={dropdownStyles}
              isSearchable={false}
              options={this.state.isFrench ? ageCategoriesFrench : ageCategoriesEnglish}
              value={this.state.ageCategorySelectedOption}
              onChange={this.onChangeAgeCategory}
            />
            <input
              type="text"
              style={{ paddingLeft: "5px" }}
              className="sc-theme-211-search-textbox"
              placeholder={this.state.isFrench ? "Rechercher les noms par mot-clé" : "Search Names by Keyword"}
              onChange={this.onChangeSearchTextbox}
            />
            <label className="sc-no-select">
              <input type="checkbox" value={this.state.onlyFeaturesInMap} onChange={this.onOnlyFeatureInMap} />
              {this.state.isFrench ? "Rechercher propriétés visibles sur la map" : "Only search properties visible in the map."}
            </label>
            <div style={{ borderBottom: "1px solid #ddd" }} />
            <div id="sc-theme-211-resulst-container" className="sc-theme-211-resulst-container">
              <AutoSizer>
                {({ width, height }) => {
                  return (
                    <List
                      // getRef={this.registerListRef}
                      ref={(instance) => {
                        this.List = instance;
                      }}
                      className={""}
                      height={height}
                      rowCount={this.results.length}
                      rowHeight={this._getRowHeight}
                      rowRenderer={this._rowRenderer}
                      width={width}
                    />
                  );
                }}
              </AutoSizer>
              <div className={this.results.length === 0 ? "sc-theme-211-no-results" : "sc-hidden"}>No Results Found</div>
            </div>
          </div>
        </div>
      </PanelComponent>
    );
  }
}

export default TwoOneOne;

const Result = (props) => {
  const { result } = props;
  let style = props.style;
  let website = result.website;
  if (website !== undefined && website.indexOf("http", 1) === -1) website = "https://" + website;
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
  if (website !== undefined && website.indexOf("http", 1) === -1) website = "https://" + website;
  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <img src={communityServices} alt="211logo" />
      </div>

      <InfoRow key={helpers.getUID()} label={props.isFrench ? "Nom" : "Name"} value={feature.get("organization_program_name")} />
      <InfoRow key={helpers.getUID()} label={props.isFrench ? "Description" : "Description"} value={feature.get("description_brief")} />
      <InfoRow key={helpers.getUID()} label={props.isFrench ? "Site Web" : "Website"} value={website} />
      <InfoRow
        key={helpers.getUID()}
        label={props.isFrench ? "Voir les details sur 211 Community Connections" : "View details on 211 Community Connections"}
        value={props.isFrench ? "https://centraleastontario.cioc.ca/record/" + feature.get("record_#") + "?Ln=fr-CA" : "https://centraleastontario.cioc.ca/record/" + feature.get("record_#")}
      />
    </div>
  );
};
