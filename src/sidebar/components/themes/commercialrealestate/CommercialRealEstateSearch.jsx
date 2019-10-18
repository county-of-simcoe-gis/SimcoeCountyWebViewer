import React, { Component } from "react";
import "./CommercialRealEstateSearch.css";
import * as helpers from "../../../../helpers/helpers";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import CommercialRealEstateSearchPropTypes from "./CommercialRealEstateSearchPropTypes.jsx";
import Select from "react-select";
import * as CommercialRealEstateSearchObjects from "./CommercialRealEstateObjects";
import CommercialRealEstateSearchType from "./CommercialRealEstateSearchType.jsx";
import CommercialRealEstateSearchBuildingSpace from "./CommercialRealEstateSearchBuildingSpace";
import CommercialRealEstateSearchLandSize from "./CommercialRealEstateSearchLandSize";
import CommercialRealEstateSearchLandPrice from "./CommercialRealEstateSearchPrice";

class CommercialRealEstateSearch extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedType: "",
      buildingSpaceFrom: "",
      buildingSpaceTo: "",
      landSizeFrom: "",
      landSizeTo: "",
      searchType: "BuildingSize"
    };

    this.types = CommercialRealEstateSearchObjects.getTypes();
    this.buildingSpaceFromItems = CommercialRealEstateSearchObjects.getBuildingSpaceFromItems();
    this.buildingSpaceToItems = CommercialRealEstateSearchObjects.getBuildingSpaceToItems();
    this.landSizeFromItems = CommercialRealEstateSearchObjects.getLandSizeFromItems();
    this.landSizeToItems = CommercialRealEstateSearchObjects.getLandSizeToItems();
    this.priceFromItems = CommercialRealEstateSearchObjects.getPriceFromItems();
    this.priceToItems = CommercialRealEstateSearchObjects.getPriceToItems();
  }

  componentDidMount() {
    this.setState({ selectedType: this.types[0], selectedBuildingSpaceFrom: this.buildingSpaceFromItems[0], selectedBuildingSpaceTo: this.buildingSpaceToItems[0] });
  }

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  onTypeDropDownChange = selectedType => {
    this.setState({ selectedType: selectedType });
  };

  onBuildingSpaceFromDropDownChange = selectedType => {
    this.setState({ selectedBuildingSpaceFrom: selectedType });
  };

  onBuildingSpaceToDropDownChange = selectedType => {
    this.setState({ selectedBuildingSpaceTo: selectedType });
  };

  onLandSizeFromDropDownChange = selectedType => {
    this.setState({ selectedLandSizeFrom: selectedType });
  };

  onLandSizeToDropDownChange = selectedType => {
    this.setState({ selectedLandSizeTo: selectedType });
  };

  onPriceFromDropDownChange = selectedType => {
    this.setState({ selectedPriceFrom: selectedType });
  };

  onPriceToDropDownChange = selectedType => {
    this.setState({ selectedPriceTo: selectedType });
  };

  onSwitchSearchType = type => {
    this.setState({ searchType: type });
  };

  render() {
    return (
      <div className="sc-theme-commercial-realestate-search-container">
        <Tabs forceRenderTabPanel={true} selectedIndex={this.state.tabIndex} onSelect={this.onTabSelect}>
          <TabList>
            <Tab id="tab-search-search">
              <CommercialRealEstateSearchTab imageName="search-10x10.png" name="Search"></CommercialRealEstateSearchTab>
            </Tab>
            <Tab id="tab-search-myresults">
              <CommercialRealEstateSearchTab imageName="results-10x10.gif" name="My Results"></CommercialRealEstateSearchTab>
            </Tab>
            <Tab id="tab-search-myfavorites">
              <CommercialRealEstateSearchTab imageName="star-10x10.png" name="My Favorites"></CommercialRealEstateSearchTab>
            </Tab>
          </TabList>

          <TabPanel id="tab-layers-content-search-search">
            <div>
              <CommercialRealEstateSearchPropTypes></CommercialRealEstateSearchPropTypes>
              <CommercialRealEstateSearchType onTypeDropDownChange={this.onTypeDropDownChange} types={this.types} selectedType={this.state.selectedType}></CommercialRealEstateSearchType>
              <CommercialRealEstateSearchBuildingSpace
                visible={this.state.searchType === "BuildingSize" ? true : false}
                onBuildingSpaceFromDropDownChange={this.onBuildingSpaceFromDropDownChange}
                selectedBuildingSpaceFrom={this.state.selectedBuildingSpaceFrom}
                buildingSpaceFromItems={this.buildingSpaceFromItems}
                onBuildingSpaceToDropDownChange={this.onBuildingSpaceToDropDownChange}
                buildingSpaceToItems={this.buildingSpaceToItems}
                selectedBuildingSpaceTo={this.state.selectedBuildingSpaceTo}
                onSwitchSearchType={this.onSwitchSearchType}
              ></CommercialRealEstateSearchBuildingSpace>
              <CommercialRealEstateSearchLandSize
                visible={this.state.searchType === "LandSize" ? true : false}
                onLandSizeFromDropDownChange={this.onLandSizeFromDropDownChange}
                selectedLandSizeFrom={this.state.selectedLandSizeFrom}
                landSizeFromItems={this.landSizeFromItems}
                onLandSizeToDropDownChange={this.onLandSizeToDropDownChange}
                landSizeToItems={this.landSizeToItems}
                selectedLandSizeTo={this.state.selectedLandSizeTo}
                onSwitchSearchType={this.onSwitchSearchType}
              ></CommercialRealEstateSearchLandSize>
              <CommercialRealEstateSearchLandPrice
                onPriceFromDropDownChange={this.onPriceFromDropDownChange}
                selectedPriceFrom={this.state.selectedPriceFrom}
                priceFromItems={this.priceFromItems}
                onPriceToDropDownChange={this.onPriceToDropDownChange}
                priceToItems={this.priceToItems}
                selectedPriceTo={this.state.selectedPriceTo}
              ></CommercialRealEstateSearchLandPrice>
            </div>
          </TabPanel>
          <TabPanel id="tab-layers-content-search-myresults">Tab 2 Content</TabPanel>
          <TabPanel id="tab-layers-content-search-myfavorites">Tab 3 Content</TabPanel>
        </Tabs>
      </div>
    );
  }
}

export default CommercialRealEstateSearch;

const CommercialRealEstateSearchTab = props => {
  return (
    <span>
      <img src={images[props.imageName]} alt={props.imageName}></img>
      &nbsp;{props.name}
    </span>
  );
};

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
