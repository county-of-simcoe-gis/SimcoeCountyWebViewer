"use client";

import React, { useEffect, useState } from "react";
import { useTOCStore, TOCLayer, TOCLayerGroup } from "../../stores/tocStore";
import { useAppStore } from "../../stores/appStore";
import { useEventListener } from "../../hooks/useEventListener";
import TOCHeader from "./TOCHeader";
import TOCListView from "./TOCListView";
import TOCFolderView from "./TOCFolderView";
import "./TOC.css";

interface TOCProps {
  visible?: boolean;
}

export default function TOC({ visible = true }: TOCProps) {
  const {
    tocType,
    layerListGroups,
    layerFolderGroups,
    selectedGroup,
    searchText,
    sortAlpha,
    globalOpacity,
    isLoading,
    layerCount,
    helpLink,
    setTocType,
    setSelectedGroup,
    setSearchText,
    setSortAlpha,
    setGlobalOpacity,
    initializeFromConfig,
    refreshTOC,
    updateLayerVisibility,
    toggleLayerLegend,
    moveLayer,
    getAllVisibleLayers,
  } = useTOCStore();

  const { config } = useAppStore();
  const [initialized, setInitialized] = useState(false);

  // Initialize TOC from config
  useEffect(() => {
    if (config && !initialized) {
      initializeFromConfig(config);
      refreshTOC();
      setInitialized(true);
    }
  }, [config, initialized, initializeFromConfig, refreshTOC]);

  // Listen for layer activation events
  useEventListener("activeTocLayerGroup", (data) => {
    if (data?.groupName && data?.callback) {
      onActivateLayerGroup(data.groupName as string, data.callback as () => void);
    }
  });

  useEventListener("activeTocLayer", (data) => {
    if (data?.layerItem) {
      onActivateLayer(data.layerItem, true);
    }
  });

  useEventListener("deactiveTocLayer", (data) => {
    if (data?.layerItem) {
      onActivateLayer(data.layerItem, false);
    }
  });

  useEventListener("getLayerList", (data) => {
    if (data?.callback) {
      getLayerList(data.callback as (layers: unknown) => void);
    }
  });

  // Event handlers
  const onActivateLayerGroup = (groupName: string, callback: () => void) => {
    const currentGroups = tocType === "LIST" ? layerListGroups : layerFolderGroups;
    const group = currentGroups.find((g) => g.label === groupName || g.value === groupName);
    if (group) {
      setSelectedGroup(group);
      callback();
    }
  };

  const onActivateLayer = (layerItem: unknown, visible = true) => {
    // Implementation for activating specific layers
    console.log("Activating layer:", layerItem, visible);
  };

  const getLayerList = (callback: (layers: unknown) => void) => {
    const currentGroups = tocType === "LIST" ? layerListGroups : layerFolderGroups;
    callback(currentGroups);
  };

  const handleGroupDropDownChange = (selectedGroup: TOCLayerGroup) => {
    setSelectedGroup(selectedGroup);
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  const handleSortChange = (sortAlpha: boolean) => {
    setSortAlpha(sortAlpha);
  };

  const handleGlobalOpacityChange = (opacity: number) => {
    setGlobalOpacity(opacity);
  };

  const handleTOCTypeChange = () => {
    const newType = tocType === "LIST" ? "FOLDER" : "LIST";
    setTocType(newType);

    // Save to localStorage
    localStorage.setItem("TOC_Type", newType);
  };

  const handleLayerChange = (layer: TOCLayer, group: TOCLayerGroup) => {
    updateLayerVisibility(layer.name, group.label, layer.visible);
  };

  const handleLegendToggle = (layerInfo: TOCLayer, group: TOCLayerGroup) => {
    toggleLayerLegend(layerInfo.name, group.label);
  };

  const handleLayerOptionsClick = (evt: React.MouseEvent, layerInfo: TOCLayer) => {
    // Handle layer options menu
    console.log("Layer options clicked:", layerInfo);
  };

  const handleSortEnd = ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
    if (selectedGroup) {
      moveLayer(selectedGroup.label, oldIndex, newIndex);
    }
  };

  const handleResetToDefault = () => {
    refreshTOC(true);
  };

  const handleTurnOffLayers = () => {
    const visibleLayers = getAllVisibleLayers();
    visibleLayers.forEach((layer) => {
      updateLayerVisibility(layer.name, layer.groupName, false);
    });
  };

  const handleSaveAllLayers = () => {
    // Implementation for saving layer state
    console.log("Saving all layers");
  };

  const handleOpenLegend = () => {
    // Emit event to open legend
    window.dispatchEvent(new CustomEvent("openLegend"));
  };

  // Get current layer groups
  const currentGroups = tocType === "LIST" ? layerListGroups : layerFolderGroups;

  if (!visible) {
    return <div className="sc-hidden" />;
  }

  return (
    <div className="sc-toc-container">
      <TOCHeader
        tocType={tocType}
        searchText={searchText}
        sortAlpha={sortAlpha}
        globalOpacity={globalOpacity}
        isLoading={isLoading}
        layerCount={layerCount}
        helpLink={helpLink}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
        onGlobalOpacityChange={handleGlobalOpacityChange}
        onTOCTypeChange={handleTOCTypeChange}
        onResetToDefault={handleResetToDefault}
        onTurnOffLayers={handleTurnOffLayers}
        onSaveAllLayers={handleSaveAllLayers}
        onOpenLegend={handleOpenLegend}
      />

      {tocType === "LIST" ? (
        <TOCListView
          id="sc-toc-list-view"
          visible={visible}
          layerGroups={currentGroups}
          selectedGroup={selectedGroup}
          searchText={searchText}
          sortAlpha={sortAlpha}
          onGroupDropDownChange={handleGroupDropDownChange}
          onLayerChange={handleLayerChange}
          onLegendToggle={handleLegendToggle}
          onLayerOptionsClick={handleLayerOptionsClick}
          onSortEnd={handleSortEnd}
        />
      ) : (
        <TOCFolderView
          id="sc-toc-folder-view"
          visible={visible}
          layerGroups={currentGroups}
          selectedGroup={selectedGroup}
          searchText={searchText}
          sortAlpha={sortAlpha}
          onLayerChange={handleLayerChange}
          onLegendToggle={handleLegendToggle}
          onLayerOptionsClick={handleLayerOptionsClick}
          onSortEnd={handleSortEnd}
        />
      )}
    </div>
  );
}
