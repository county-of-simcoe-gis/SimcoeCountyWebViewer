// REACT
import React, { useState, useEffect } from "react";

// CUSTOM
import "./TOCFolderView.css";
import GroupItem from "./GroupItem.jsx";
import * as helpers from "../../../../helpers/helpers";

function TOCFolderView(props) {
  const [visible, setVisible] = useState(props.visible);
  useEffect(() => {
    setVisible(props.visible);
  }, [props.visible]);

  return (
    <div className={visible ? "" : "sc-hidden"} id="sc-toc-simcoe-folder-view-container-main">
      <div className="toc-group-list">
        {props.layerGroups.map((group) => (
          <GroupItem
            key={props.id + "-group-" + helpers.getHash(group.value)}
            id={props.id + "-group-" + helpers.getHash(group.value)}
            group={group}
            searchText={props.searchText}
            sortAlpha={props.sortAlpha}
            panelOpen={group.panelOpen}
            saveLayerOptions={props.saveLayerOptions[group.value]}
            onLayerChange={props.onLayerChange}
            onLegendToggle={props.onLegendToggle}
            onLayerVisibilityGroup={props.onLayerVisibilityGroup}
            onGroupFolderToggle={props.onGroupFolderToggle}
            onSliderChange={props.onSliderChange}
            tocVisible={visible}
            onLayerOptionsClick={props.onLayerOptionsClick}
          />
        ))}
      </div>
    </div>
  );
}
export default TOCFolderView;
