import React, { Component } from "react";
import "./CommercialRealEstate.css";
import PanelComponent from "../../../PanelComponent";
import "react-tabs/style/react-tabs.css";
import CommercialRealEstateSearch from "./CommercialRealEstateSearch.jsx";
import { default as localConfig } from "./config.json";
import * as helpers from "../../../../helpers/helpers";
import * as CommercialRealEstateSearchObjects from "./CommercialRealEstateObjects";
import { unByKey } from "ol/Observable.js";
import { GeoJSON } from "ol/format.js";
import CommercialRealEstatePopupContent from "./CommercialRealEstatePopupContent.jsx";
import CommercialRealEstateLayers from "./CommercialRealEstateLayers";
const propTypes = ["Vacant Land", "Commercial", "Farm", "Industrial", "Institutional"];
// const polygonLayerName = localConfig.polygonLayerName;
const pointLayerName = localConfig.pointLayerName;
class CommercialRealEstate extends Component {
  constructor(props) {
    super(props);

    this.types = CommercialRealEstateSearchObjects.getTypes();
    this.buildingSpaceFromItems = CommercialRealEstateSearchObjects.getBuildingSpaceFromItems();
    this.buildingSpaceToItems = CommercialRealEstateSearchObjects.getBuildingSpaceToItems();
    this.landSizeFromItems = CommercialRealEstateSearchObjects.getLandSizeFromItems();
    this.landSizeToItems = CommercialRealEstateSearchObjects.getLandSizeToItems();
    this.priceFromItems = CommercialRealEstateSearchObjects.getPriceFromItems();
    this.priceToItems = CommercialRealEstateSearchObjects.getPriceToItems();

    this.sql = "";
    this.state = {
      layers: [],
      selectedType: this.types[0],
      incentiveChecked: false,
      onlyInMapChecked: false,
      searchType: "BuildingSize",
      selectedBuildingSpaceFrom: this.buildingSpaceFromItems[0],
      selectedBuildingSpaceTo: this.buildingSpaceToItems[0],
      selectedLandSizeFrom: this.landSizeFromItems[0],
      selectedLandSizeTo: this.landSizeToItems[0],
      selectedPriceFrom: this.priceFromItems[0],
      selectedPriceTo: this.priceToItems[0],
      numRecords: 0,
      allResults: [],
      activeTab: 0,
      layerAll: null,
      toggleLayers: localConfig.toggleLayers,
    };
  }

  onFeatureChange = (feature) => {
    helpers.getGeometryCenter(feature.getGeometry(), (geo) => {
      const center = window.map.getView().getCenter();
      const newCenter = [center[0] + 100, center[1] + 50];
      window.map.getView().setCenter(newCenter);
      window.popup.show(geo.flatCoordinates, <CommercialRealEstatePopupContent key={helpers.getUID()} feature={feature} />, "Real Estate");
    });
  };

  componentDidMount() {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      let themeConfig = localConfig;
      const globalConfig = helpers.getConfig("THEMES", "CommercialRealEstate");
      if (globalConfig.config !== undefined) {
        themeConfig = helpers.mergeObj(themeConfig, globalConfig.config);
        this.setState({ toggleLayers: themeConfig.toggleLayers });
      }

      const obj = {
        wfsUrl: themeConfig.incentiveWfsUrl,
        imageUrlField: "_imageurl",
        detailFields: ["Address", "Property Type", "Municipality"],
      };
      if (themeConfig.featurePropertyPanelOpen !== undefined) obj["panelOpen"] = themeConfig.featurePropertyPanelOpen;
      window.emitter.emit("showImageSlider", obj, this.onFeatureChange);
      this.buildLayers();

      this.onMapMoveEndEvent = window.map.on("moveend", () => {
        if (this.state.onlyInMapChecked) {
          this.updateLayerSource();
        }
      });

      this.mapClickEvent = window.map.on("click", (evt) => {
        // DISABLE POPUPS
        if (window.isDrawingOrEditing || window.isCoordinateToolOpen || window.isMeasuring) return;

        var viewResolution = window.map.getView().getResolution();
        var url = this.state.layerAll.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", {
          INFO_FORMAT: "application/json",
        });
        if (url) {
          helpers.getJSON(url, (result) => {
            const features = result.features;
            if (features.length === 0) {
              return;
            }

            const geoJSON = new GeoJSON().readFeatures(result);
            geoJSON.forEach((feature) => {
              window.popup.show(evt.coordinate, <CommercialRealEstatePopupContent key={helpers.getUID()} feature={feature} />, "Real Estate");
            });
          });
        }
      });
    });
  }

  componentWillUnmount() {
    unByKey(this.onMapMoveEndEvent);
    unByKey(this.mapClickEvent);

    //this.mapClickEvent = () =>
    propTypes.forEach((propType) => {
      window.map.removeLayer(this.state.layers[propType].pointLayer);
      // window.map.removeLayer(this.state.layers[propType].polygonLayer);
    });

    window.emitter.emit("hideImageSlider");
  }

  buildLayers = () => {
    let layers = {};
    const serverUrl = localConfig.geoserverUrl + "wms/";
    propTypes.forEach((propType) => {
      const wmsPointLayer = helpers.getImageWMSLayer(serverUrl, pointLayerName, "geoserver", "_proptype = '" + propType + "'", 200, true);

      wmsPointLayer.setVisible(true);
      wmsPointLayer.setZIndex(200);
      wmsPointLayer.setProperties({
        name: propType,
        tocDisplayName: propType,
        disableParcelClick: true,
        queryable: true,
      });

      window.map.addLayer(wmsPointLayer);

      // const wmsPolygonLayer = helpers.getImageWMSLayer(serverUrl, polygonLayerName, "geoserver", "_proptype = '" + propType + "'", 200, true);
      // wmsPolygonLayer.setVisible(true);
      // wmsPolygonLayer.setZIndex(200);
      // wmsPolygonLayer.setProperties({
      //   name: propType,
      //   tocDisplayName: propType,
      //   disableParcelClick: false,
      //   queryable: true,
      // });
      // window.map.addLayer(wmsPolygonLayer);

      layers[propType] = {
        propType: propType,
        pointLayer: wmsPointLayer,
        // polygonLayer: wmsPolygonLayer,
        visible: true,
      };
    });

    this.setNumRecords();
    const layerAll = helpers.getImageWMSLayer(serverUrl, pointLayerName, "geoserver", null, 200, true);

    this.setState({ layers: layers, layerAll });
  };

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  onLayerCheckboxClick = (evt, layerName) => {
    let layers = Object.assign(this.state.layers, {});
    layers[layerName].visible = evt.target.checked;
    layers[layerName].pointLayer.setVisible(evt.target.checked);
    // layers[layerName].polygonLayer.setVisible(evt.target.checked);
    this.setState({ layers: layers });
  };

  onTypeDropDownChange = (selectedType) => {
    this.setState({ selectedType }, () => {
      this.updateLayerSource();
    });
  };

  onIncentiveChange = (evt) => {
    this.setState({ incentiveChecked: evt.target.checked }, () => {
      this.updateLayerSource();
    });
  };

  onOnlyInMapChange = (evt) => {
    this.setState({ onlyInMapChecked: evt.target.checked }, () => {
      this.updateLayerSource();
    });
  };

  onBuildingSpaceFromDropDownChange = (selectedBuildingSpaceFrom) => {
    this.setState({ selectedBuildingSpaceFrom }, () => {
      this.updateLayerSource();
    });
  };

  onBuildingSpaceToDropDownChange = (selectedBuildingSpaceTo) => {
    this.setState({ selectedBuildingSpaceTo }, () => {
      this.updateLayerSource();
    });
  };

  onLandSizeFromDropDownChange = (selectedLandSizeFrom) => {
    this.setState({ selectedLandSizeFrom }, () => {
      this.updateLayerSource();
    });
  };

  onLandSizeToDropDownChange = (selectedLandSizeTo) => {
    this.setState({ selectedLandSizeTo }, () => {
      this.updateLayerSource();
    });
  };

  onPriceFromDropDownChange = (selectedPriceFrom) => {
    this.setState({ selectedPriceFrom }, () => {
      this.updateLayerSource();
    });
  };

  onPriceToDropDownChange = (selectedPriceTo) => {
    this.setState({ selectedPriceTo }, () => {
      this.updateLayerSource();
    });
  };

  onSwitchSearchType = (searchType) => {
    this.setState({ searchType }, () => {
      this.updateLayerSource();
    });
  };

  onViewPropertiesClick = () => {
    this.setState({ activeTab: 1 });
  };

  onTabSelect = (activeTab) => {
    this.setState({ activeTab });
  };
  setNumRecords = () => {
    const serverUrl = localConfig.geoserverUrl + "wms/";
    const extent = window.map.getView().calculateExtent();

    this.setState({ numRecords: 0, allResults: [] }, () => {
      propTypes.forEach((propType) => {
        const params = this.state.layers[propType].pointLayer.getSource().getParams();
        helpers.getWFSGeoJSON(
          {
            serverUrl: serverUrl,
            layerName: "simcoe:Economic_Development_Property_Listings_Polygon_Theme",
            sortField: "Incentive+D",
            extent: this.state.onlyInMapChecked ? extent : null,
            cqlFilter: params.cql_filter,
          },
          (result) => {
            if (result.length === 0) return;

            this.setState((prevState) => ({
              numRecords: prevState.numRecords + result.length,
              allResults: prevState.allResults.concat(result),
            }));
          }
        );
      });
    });
  };

  updateLayerSource = () => {
    propTypes.forEach((propType) => {
      // BASE SQL
      this.sql = "[_proptype] = '" + propType + "'";

      // TYPE
      if (this.state.selectedType.value !== "For Sale or Lease") {
        this.sql += " AND _saletype = '" + this.state.selectedType.value + "'";
      }

      // INCENTIVE
      if (this.state.incentiveChecked) {
        this.sql += " AND Incentive = 'Yes'";
      }

      // BUILDING SPACE
      const fromSpace = this.state.selectedBuildingSpaceFrom.value;
      const toSpace = this.state.selectedBuildingSpaceTo.value;
      if (this.state.searchType === "BuildingSize") {
        if (toSpace <= fromSpace) {
          helpers.showMessage("Building Space", "Building Space From Size must be smaller then To Size");
        } else if (fromSpace !== 0 || toSpace !== 99999999999) {
          this.sql += " AND _squarefeet >= " + fromSpace + " AND _squarefeet <= " + toSpace;
        }
      }

      // LAND SIZE
      const fromLandSize = this.state.selectedLandSizeFrom.value;
      const toLandSize = this.state.selectedLandSizeTo.value;
      if (this.state.searchType !== "BuildingSize") {
        if (toLandSize <= fromLandSize) {
          helpers.showMessage("Land Size", "Land From Size must be smaller then To Size");
        } else if (fromLandSize !== 0 || toLandSize !== 99999999999) {
          this.sql += " AND Acres >= " + fromLandSize + " AND Acres <= " + toLandSize;
        }
      }

      // PRICE
      const fromPrice = this.state.selectedPriceFrom.value;
      const toPrice = this.state.selectedPriceTo.value;
      if (toPrice <= fromPrice) {
        helpers.showMessage("Price", "Price To Size must be smaller then From Price");
      } else if (fromPrice !== 0 || toPrice !== 99999999999) {
        this.sql += " AND _listprice >= " + fromPrice + " AND _listprice <= " + toPrice;
      }

      // console.log(this.state.searchType);
      // console.log(fromPrice);
      // console.log(toPrice);
      // console.log(this.sql);
      let params = this.state.layers[propType].pointLayer.getSource().getParams();
      params.cql_filter = this.sql;

      this.state.layers[propType].pointLayer.getSource().updateParams(params);
      // this.state.layers[propType].polygonLayer.getSource().updateParams(params);
    });

    this.setNumRecords();
  };

  render() {
    return (
      <PanelComponent onClose={this.props.onClose} name={this.props.name} helpLink={this.props.helpLink} type="themes">
        <div className="sc-theme-commercial-real-estate-main-container">
          <CommercialRealEstateSearch
            activeTab={this.state.activeTab}
            onTabSelect={this.onTabSelect}
            onLayerCheckboxClick={this.onLayerCheckboxClick}
            layers={this.state.layers}
            onTypeDropDownChange={this.onTypeDropDownChange}
            selectedType={this.state.selectedType}
            onIncentiveChange={this.onIncentiveChange}
            incentiveChecked={this.state.incentiveChecked}
            onOnlyInMapChange={this.onOnlyInMapChange}
            onlyInMapChecked={this.state.onlyInMapChecked}
            onBuildingSpaceFromDropDownChange={this.onBuildingSpaceFromDropDownChange}
            onBuildingSpaceToDropDownChange={this.onBuildingSpaceToDropDownChange}
            selectedBuildingSpaceFrom={this.state.selectedBuildingSpaceFrom}
            selectedBuildingSpaceTo={this.state.selectedBuildingSpaceTo}
            searchType={this.state.searchType}
            onLandSizeFromDropDownChange={this.onLandSizeFromDropDownChange}
            onLandSizeToDropDownChange={this.onLandSizeToDropDownChange}
            selectedLandSizeFrom={this.state.selectedLandSizeFrom}
            selectedLandSizeTo={this.state.selectedLandSizeTo}
            onSwitchSearchType={this.onSwitchSearchType}
            onPriceFromDropDownChange={this.onPriceFromDropDownChange}
            onPriceToDropDownChange={this.onPriceToDropDownChange}
            selectedPriceFrom={this.state.selectedPriceFrom}
            selectedPriceTo={this.state.selectedPriceTo}
            numRecords={this.state.numRecords}
            onViewPropertiesClick={this.onViewPropertiesClick}
            results={this.state.allResults}
          />
          <CommercialRealEstateLayers layers={this.state.toggleLayers} />
        </div>
      </PanelComponent>
    );
  }
}

export default CommercialRealEstate;
