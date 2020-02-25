import React, { Component } from "react";
import "./CommercialRealEstate.css";
import PanelComponent from "../../../PanelComponent";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import CommercialRealEstateSearch from "./CommercialRealEstateSearch.jsx";

class CommercialRealEstate extends Component {
  state = {};

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  render() {
    return (
      <PanelComponent onClose={this.onClose} name={this.props.name} type="themes">
        <Tabs forceRenderTabPanel={true} selectedIndex={this.state.tabIndex} onSelect={this.onTabSelect}>
          <TabList>
            <Tab id="tab-search">Search</Tab>
            <Tab id="tab-directory">Directory</Tab>
          </TabList>

          <TabPanel id="tab-layers-content-search">
            <CommercialRealEstateSearch></CommercialRealEstateSearch>
          </TabPanel>
          <TabPanel id="tab-layers-content-directory">Tab 2 Content</TabPanel>
        </Tabs>
      </PanelComponent>
    );
  }
}

export default CommercialRealEstate;
