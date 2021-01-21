// REACT
import React, { Component } from "react";

// CUSTOM
import "./TOCFolderView.css";
import GroupItem from "./GroupItem.jsx";

class TOCFolderView extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }
  

  componentWillUnmount() {
    console.log("unmounting");
  }

 render() {
    return (
      <div className={this.props.visible ? "" : "sc-hidden"} id="sc-toc-simcoe-folder-view-container-main">
        <div className="toc-group-list">
          {this.props.layerGroups.map((group) => (
            <GroupItem
              key={"group-item" + group.value}
              group={group}
              searchText={this.props.searchText}
              sortAlpha={this.props.sortAlpha}
              allGroups={this.props.layerGroups}
              panelOpen={false}
              saveLayerOptions={this.props.saveLayerOptions[group.value]}
              onLayerChange={this.props.onLayerChange}
              onLegendToggle={this.props.onLegendToggle}
              onLegendToggleGroup={this.props.onLegendToggleGroup}
              onLayerVisibilityGroup={this.props.onLayerVisibilityGroup}
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