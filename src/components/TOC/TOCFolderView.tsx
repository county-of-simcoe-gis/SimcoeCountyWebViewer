"use client";

import React from "react";
import { TOCLayerGroup, TOCLayer } from "../../stores/tocStore";

interface TOCFolderViewProps {
  id: string;
  visible: boolean;
  layerGroups: TOCLayerGroup[];
  selectedGroup: TOCLayerGroup | null;
  searchText: string;
  sortAlpha: boolean;
  onLayerChange: (layer: TOCLayer, group: TOCLayerGroup) => void;
  onLegendToggle: (layerInfo: TOCLayer, group: TOCLayerGroup) => void;
  onLayerOptionsClick: (evt: React.MouseEvent, layerInfo: TOCLayer) => void;
  onSortEnd: ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => void;
}

export default function TOCFolderView({ id, visible, layerGroups }: TOCFolderViewProps) {
  if (!visible) {
    return <div className="sc-hidden" />;
  }

  return (
    <div id={`${id}-container-main`} className="sc-toc-folder-view-container">
      <div className="sc-toc-folder-placeholder">
        <p>Folder view coming soon...</p>
        <p>Currently showing {layerGroups.length} groups</p>
      </div>
    </div>
  );
}
