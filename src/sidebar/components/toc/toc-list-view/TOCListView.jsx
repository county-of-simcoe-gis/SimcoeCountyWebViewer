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


  onGroupDropDownChange = (selectedGroup) => {
    this.props.onGroupDropDownChange(selectedGroup, ()=>{ 
      const iFrame = document.getElementById("sc-url-window-iframe");
      const urlWindow = document.getElementById("sc-url-window-container");
      if (iFrame !== null && urlWindow !== null) {
        const classes = urlWindow.className;
        if (classes.indexOf("sc-hidden") === -1) {
          const legend = document.getElementById("sc-url-window-iframe").contentWindow.document.getElementById("sc-legend-app-main-container");
          if (legend !== null) this.openLegend();
        }
      }
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
      <div id="sc-toc-simcoe-list-view-container-main" className={this.props.visible ? "" : "sc-hidden"}>
        <div className="sc-toc-groups-container">
          <div id="sc-toc-groups-dropdown" title="Click here for more layers">
            <Select
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
            ref={(ref) => {
              this.layerRef = ref;
            }}
            group={this.props.selectedGroup}
            searchText={this.props.searchText}
            sortAlpha={this.props.sortAlpha}
            allGroups={this.props.layerGroups}
            visible={this.props.visible}
            allLayers={this.props.allLayers}
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

