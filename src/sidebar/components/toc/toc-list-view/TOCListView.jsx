// REACT
import React, { Component } from "react";
import Select from "react-select";

// CUSTOM
import "./TOCListView.css";
import * as helpers from "../../../../helpers/helpers";

import Layers from "./Layers.jsx";


class TOCListView extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  } 

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.visible || this.props.visible;
  }
  onGroupDropDownChange = (selectedGroup) => {
    this.props.onGroupDropDownChange(selectedGroup, ()=>{ 
      
    });
    helpers.addAppStat("TOC Group", selectedGroup.label);
  };

  render() {
    const groupsDropDownStyles = {
      control: (provided) => ({
        ...provided,
        minHeight: "30px",
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

    return (
      <div id={this.props.id + "-container-main"} className={this.props.visible ? "" : "sc-hidden"}>
        <div className="sc-toc-groups-container">
          <div id={this.props.id + "-groups-dropdown"} title="Click here for more layers">
            <Select
              key={this.props.id + "-select"}
              id={this.props.id + "-select"}
              styles={groupsDropDownStyles}
              isSearchable={false}
              onChange={this.onGroupDropDownChange}
              options={this.props.layerGroups}
              value={this.props.selectedGroup}
              placeholder="Click Here for more Layers..."
            />
          </div>
        </div>
        <div>
          <Layers
            key={this.props.id + "-layers"}
            id={this.props.id + "-layers"}
            ref={(ref) => {
              this.layerRef = ref;
            }}
            group={this.props.selectedGroup}
            searchText={this.props.searchText}
            sortAlpha={this.props.sortAlpha}
            visible={this.props.visible}
            onLayerOptionsClick={this.props.onLayerOptionsClick}
            onLegendToggle={this.props.onLegendToggle}
            onLayerChange={this.props.onLayerChange}
            onSortMove={this.props.onSortMove}
            onSortEnd={this.props.onSortEnd}
          />
        </div>
      </div>
    );
  }
}

export default TOCListView;

