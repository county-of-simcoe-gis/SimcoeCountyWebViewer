"use client";

import React, { useState, useEffect } from "react";
import { TOCLayerGroup, TOCLayer } from "@/stores/tocStore";
import GroupItem from "@/components/TOC/GroupItem";

interface TOCFolderViewProps {
  id: string;
  visible: boolean;
  layerGroups: TOCLayerGroup[];
  selectedGroup?: TOCLayerGroup | null;
  searchText: string;
  sortAlpha: boolean;
  onLayerChange: (layer: TOCLayer, group: TOCLayerGroup) => void;
  onLegendToggle: (layerInfo: TOCLayer, group: TOCLayerGroup) => void;
  onLayerOptionsClick: (evt: React.MouseEvent, layerInfo: TOCLayer) => void;
  onLayerVisibilityGroup: (group: TOCLayerGroup, visible: boolean) => void;
  onGroupFolderToggle: (groupValue: string, isOpen: boolean) => void;
}

export default function TOCFolderView({
  id,
  visible,
  layerGroups,
  searchText,
  sortAlpha,
  onLayerChange,
  onLegendToggle,
  onLayerOptionsClick,
  onLayerVisibilityGroup,
  onGroupFolderToggle,
}: TOCFolderViewProps) {
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  return (
    <div className={isVisible ? "" : "hidden"} id="sc-toc-simcoe-folder-view-container-main" data-testid="sc-toc-simcoe-folder-view-container-main">
      <div data-testid="toc-group-list" className="absolute top-[110px] bottom-[5px] w-full max-w-[370px] overflow-y-auto overflow-x-hidden ps-0">
        {layerGroups.map((group, index) => (
          <GroupItem
            key={`${id}-group-${group.value}-${index}`}
            id={`${id}-group-${group.value}-${index}`}
            group={group}
            searchText={searchText}
            sortAlpha={sortAlpha}
            panelOpen={group.sourceOpen !== undefined ? group.sourceOpen : false}
            visible={isVisible}
            onLayerChange={onLayerChange}
            onLegendToggle={onLegendToggle}
            onLayerVisibilityGroup={onLayerVisibilityGroup}
            onGroupFolderToggle={onGroupFolderToggle}
            onLayerOptionsClick={onLayerOptionsClick}
          />
        ))}
      </div>
    </div>
  );
}
