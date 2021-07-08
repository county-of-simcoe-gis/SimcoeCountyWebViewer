import React, { Component } from "react";
import "./CommercialRealEstateSearch.css";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import CommercialRealEstateSearchPropTypes from "./CommercialRealEstateSearchPropTypes.jsx";
import * as CommercialRealEstateSearchObjects from "./CommercialRealEstateObjects";
import CommercialRealEstateSearchType from "./CommercialRealEstateSearchType.jsx";
import CommercialRealEstateSearchBuildingSpace from "./CommercialRealEstateSearchBuildingSpace";
import CommercialRealEstateSearchLandSize from "./CommercialRealEstateSearchLandSize";
import CommercialRealEstateSearchLandPrice from "./CommercialRealEstateSearchPrice";
import CommercialRealEstateResults from "./CommercialRealEstateResults";
import * as helpers from "../../../../helpers/helpers";

class CommercialRealEstateSearch extends Component {
	constructor(props) {
		super(props);

		this.state = {
			// landSizeFrom: "",
			// landSizeTo: "",
		};

		this.types = CommercialRealEstateSearchObjects.getTypes();
		this.buildingSpaceFromItems =
			CommercialRealEstateSearchObjects.getBuildingSpaceFromItems();
		this.buildingSpaceToItems =
			CommercialRealEstateSearchObjects.getBuildingSpaceToItems();
		this.landSizeFromItems =
			CommercialRealEstateSearchObjects.getLandSizeFromItems();
		this.landSizeToItems =
			CommercialRealEstateSearchObjects.getLandSizeToItems();
		this.priceFromItems = CommercialRealEstateSearchObjects.getPriceFromItems();
		this.priceToItems = CommercialRealEstateSearchObjects.getPriceToItems();
	}

	componentDidMount() {
		// this.setState({ selectedBuildingSpaceFrom: this.buildingSpaceFromItems[0], selectedBuildingSpaceTo: this.buildingSpaceToItems[0] });
	}

	onClose = () => {
		// ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

		// CALL PARENT WITH CLOSE
		this.props.onClose();
	};

	onPriceFromDropDownChange = (selectedType) => {
		this.setState({ selectedPriceFrom: selectedType });
	};

	onPriceToDropDownChange = (selectedType) => {
		this.setState({ selectedPriceTo: selectedType });
	};

	onSwitchSearchType = (type) => {
		this.setState({ searchType: type });
	};

	render() {
		return (
			<Tabs
				forceRenderTabPanel={true}
				selectedIndex={this.props.activeTab}
				onSelect={this.props.onTabSelect}
			>
				<TabList>
					<Tab id="tab-search-search">
						<CommercialRealEstateSearchTab
							imageName="search-10x10.png"
							name="Search"
						/>
					</Tab>
					<Tab id="tab-search-myresults">
						<CommercialRealEstateSearchTab
							imageName="results-10x10.gif"
							name="My Results"
						/>
					</Tab>
				</TabList>

				<TabPanel id="tab-layers-content-search-search">
					<div className="sc-theme-commercial-realestate-search-container">
						<CommercialRealEstateSearchPropTypes
							onLayerCheckboxClick={this.props.onLayerCheckboxClick}
							layers={this.props.layers}
						/>
						<CommercialRealEstateSearchType
							onTypeDropDownChange={this.props.onTypeDropDownChange}
							types={this.types}
							selectedType={this.props.selectedType}
						/>
						<CommercialRealEstateSearchBuildingSpace
							visible={this.props.searchType === "BuildingSize" ? true : false}
							onBuildingSpaceFromDropDownChange={
								this.props.onBuildingSpaceFromDropDownChange
							}
							selectedBuildingSpaceFrom={this.props.selectedBuildingSpaceFrom}
							buildingSpaceFromItems={this.buildingSpaceFromItems}
							onBuildingSpaceToDropDownChange={
								this.props.onBuildingSpaceToDropDownChange
							}
							buildingSpaceToItems={this.buildingSpaceToItems}
							selectedBuildingSpaceTo={this.props.selectedBuildingSpaceTo}
							onSwitchSearchType={this.props.onSwitchSearchType}
						/>
						<CommercialRealEstateSearchLandSize
							visible={this.props.searchType === "LandSize" ? true : false}
							onLandSizeFromDropDownChange={
								this.props.onLandSizeFromDropDownChange
							}
							selectedLandSizeFrom={this.props.selectedLandSizeFrom}
							landSizeFromItems={this.landSizeFromItems}
							onLandSizeToDropDownChange={this.props.onLandSizeToDropDownChange}
							landSizeToItems={this.landSizeToItems}
							selectedLandSizeTo={this.props.selectedLandSizeTo}
							onSwitchSearchType={this.props.onSwitchSearchType}
						/>
						<CommercialRealEstateSearchLandPrice
							onPriceFromDropDownChange={this.props.onPriceFromDropDownChange}
							selectedPriceFrom={this.props.selectedPriceFrom}
							priceFromItems={this.priceFromItems}
							onPriceToDropDownChange={this.props.onPriceToDropDownChange}
							priceToItems={this.priceToItems}
							selectedPriceTo={this.props.selectedPriceTo}
						/>
						<div className="sc-border-bottom" style={{ height: "43px" }}>
							<label>
								<input
									type="checkbox"
									onChange={this.props.onIncentiveChange}
									readOnly
								/>
								Only search properties with incentives
							</label>
							<label style={{ float: "left" }}>
								<input
									type="checkbox"
									onChange={this.props.onOnlyInMapChange}
									readOnly
								/>
								Only search properties visible in map
							</label>
						</div>

						<div className="sc-theme-commercial-real-estate-footer">
							<button
								className="sc-button sc-button-highlight sc-theme-commercial-real-estate-view-properties-button"
								onClick={this.props.onViewPropertiesClick}
							>
								View Properties
							</button>
							<label className="sc-theme-commercial-real-estate-result-label">
								{this.props.numRecords + " results"}
							</label>
						</div>
						{/* <div style={{ display: "table-cell", verticalAlign: "top" }} />

        <div style={{ display: "table-cell" }}>
          <label>Only search properties with incentives </label>
          <label style={{ display: "block", fontSize: "10pt" }}>(23 properties found with incentives)</label>
        </div> */}
					</div>
				</TabPanel>
				<TabPanel id="tab-layers-content-search-myresults">
					<CommercialRealEstateResults
						key={helpers.getUID()}
						results={this.props.results}
						onTabSelect={this.props.onTabSelect}
					/>
				</TabPanel>
			</Tabs>

			// <div className="sc-theme-commercial-realestate-search-container">
			//   <Tabs forceRenderTabPanel={true} selectedIndex={this.state.tabIndex} onSelect={this.onTabSelect}>
			//     <TabList>
			//       <Tab id="tab-search-search">
			//         <CommercialRealEstateSearchTab imageName="search-10x10.png" name="Search"></CommercialRealEstateSearchTab>
			//       </Tab>
			//       <Tab id="tab-search-myresults">
			//         <CommercialRealEstateSearchTab imageName="results-10x10.gif" name="My Results"></CommercialRealEstateSearchTab>
			//       </Tab>
			//       <Tab id="tab-search-myfavorites">
			//         <CommercialRealEstateSearchTab imageName="star-10x10.png" name="My Favorites"></CommercialRealEstateSearchTab>
			//       </Tab>
			//     </TabList>

			//     <TabPanel id="tab-layers-content-search-search">
			//       <div>
			//         <CommercialRealEstateSearchPropTypes></CommercialRealEstateSearchPropTypes>
			//         <CommercialRealEstateSearchType onTypeDropDownChange={this.onTypeDropDownChange} types={this.types} selectedType={this.state.selectedType}></CommercialRealEstateSearchType>
			//         <CommercialRealEstateSearchBuildingSpace
			//           visible={this.state.searchType === "BuildingSize" ? true : false}
			//           onBuildingSpaceFromDropDownChange={this.onBuildingSpaceFromDropDownChange}
			//           selectedBuildingSpaceFrom={this.state.selectedBuildingSpaceFrom}
			//           buildingSpaceFromItems={this.buildingSpaceFromItems}
			//           onBuildingSpaceToDropDownChange={this.onBuildingSpaceToDropDownChange}
			//           buildingSpaceToItems={this.buildingSpaceToItems}
			//           selectedBuildingSpaceTo={this.state.selectedBuildingSpaceTo}
			//           onSwitchSearchType={this.onSwitchSearchType}
			//         ></CommercialRealEstateSearchBuildingSpace>
			//         <CommercialRealEstateSearchLandSize
			//           visible={this.state.searchType === "LandSize" ? true : false}
			//           onLandSizeFromDropDownChange={this.onLandSizeFromDropDownChange}
			//           selectedLandSizeFrom={this.state.selectedLandSizeFrom}
			//           landSizeFromItems={this.landSizeFromItems}
			//           onLandSizeToDropDownChange={this.onLandSizeToDropDownChange}
			//           landSizeToItems={this.landSizeToItems}
			//           selectedLandSizeTo={this.state.selectedLandSizeTo}
			//           onSwitchSearchType={this.onSwitchSearchType}
			//         ></CommercialRealEstateSearchLandSize>
			//         <CommercialRealEstateSearchLandPrice
			//           onPriceFromDropDownChange={this.onPriceFromDropDownChange}
			//           selectedPriceFrom={this.state.selectedPriceFrom}
			//           priceFromItems={this.priceFromItems}
			//           onPriceToDropDownChange={this.onPriceToDropDownChange}
			//           priceToItems={this.priceToItems}
			//           selectedPriceTo={this.state.selectedPriceTo}
			//         ></CommercialRealEstateSearchLandPrice>
			//       </div>
			//     </TabPanel>
			//     <TabPanel id="tab-layers-content-search-myresults">Tab 2 Content</TabPanel>
			//     <TabPanel id="tab-layers-content-search-myfavorites">Tab 3 Content</TabPanel>
			//   </Tabs>
			// </div>
		);
	}
}

export default CommercialRealEstateSearch;

const CommercialRealEstateSearchTab = (props) => {
	return (
		<span>
			<img src={images[props.imageName]} alt={props.imageName} />
			&nbsp;{props.name}
		</span>
	);
};

// IMPORT ALL IMAGES
const images = importAllImages(
	require.context("./images", false, /\.(png|jpe?g|svg|gif)$/)
);
function importAllImages(r) {
	let images = {};
	r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
	return images;
}
