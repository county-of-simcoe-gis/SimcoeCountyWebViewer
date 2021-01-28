// REACT
import React, { Component } from "react";

// CUSTOM
import "./TOCFolderView.css";
import GroupItem from "./GroupItem.jsx";
import * as helpers from "../../../../helpers/helpers";

class TOCFolderView extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }
  
  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.visible || this.props.visible;
  }

 render() {
    return (
      <div className={this.props.visible ? "" : "sc-hidden"} id="sc-toc-simcoe-folder-view-container-main">
        <div className="toc-group-list">
          {this.props.layerGroups.map((group) => (
            <GroupItem
              key={this.props.id + "-group-" + helpers.getHash(group.value)}
              id={this.props.id + "-group-" + helpers.getHash(group.value)}
              group={group}
              searchText={this.props.searchText}
              sortAlpha={this.props.sortAlpha}
              panelOpen={group.panelOpen}
              saveLayerOptions={this.props.saveLayerOptions[group.value]}
              onLayerChange={this.props.onLayerChange}
              onLegendToggle={this.props.onLegendToggle}
              onLegendToggleGroup={this.props.onLegendToggleGroup}
              onLayerVisibilityGroup={this.props.onLayerVisibilityGroup}
              onGroupFolderToggle={this.props.onGroupFolderToggle}
              onSliderChange={this.props.onSliderChange}
              tocVisible={this.props.visible}
              onLayerOptionsClick={this.props.onLayerOptionsClick}
            />
          ))}
        </div>
      </div>
    );
  }
}
export default TOCFolderView;