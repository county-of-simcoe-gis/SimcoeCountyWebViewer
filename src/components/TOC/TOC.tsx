"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const urlParameters = useAppStore((state) => state.urlParameters);
  const [initialized, setInitialized] = useState(false);
  const expandLegendProcessedRef = useRef(false);

  // Initialize TOC from config
  useEffect(() => {
    if (config && !initialized) {
      initializeFromConfig(config);
      refreshTOC().then(() => {
        // Initialize OpenLayers layers after TOC is loaded
        setTimeout(() => {
          // Small delay to ensure layers are ready
          useTOCStore.getState().initializeOpenLayersLayers();
        }, 500);
      });
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
    console.log("🎯 handleLayerChange called for:", layer.name, "group:", group.label, "visible:", layer.visible);
    console.log("🎯 Layer has OpenLayers layer object:", !!layer.layer);
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

  // Handle URL parameters for TOC type, group, and layers
  const handleURLParameters = useCallback(() => {
    // Handle TOCTYPE parameter
    const tocTypeParam = urlParameters.TOCTYPE;

    if (tocTypeParam !== null && tocTypeParam !== undefined) {
      // Available TOC types for validation
      const validTocTypes = ["LIST", "FOLDER"];

      // Check if the tocType is valid, convert to uppercase for comparison
      const upperCaseType = tocTypeParam.toUpperCase();

      if (validTocTypes.includes(upperCaseType)) {
        const validTocType = upperCaseType as "LIST" | "FOLDER";
        setTocType(validTocType);
        // Also save to localStorage to persist the setting
        localStorage.setItem("TOC_Type", validTocType);
      }
    }

    // Handle GROUP and LAYERS parameters
    const urlGroupName = urlParameters.GROUP;
    const urlVisibleLayers = urlParameters.LAYERS;
    const urlExpandLegend = urlParameters.EXPAND_LEGEND;

    if (urlGroupName || urlVisibleLayers || urlExpandLegend) {
      // Get the current layer groups based on TOC type
      const currentGroups = tocType === "LIST" ? layerListGroups : layerFolderGroups;

      if (currentGroups.length > 0) {
        let targetGroup: TOCLayerGroup | null = null;

        if (urlGroupName) {
          // Find group by label or value
          targetGroup = currentGroups.find((group) => group.label === urlGroupName || group.value === urlGroupName) || null;
        }

        // If no specific group found or specified, use current selected/default group
        if (!targetGroup) {
          targetGroup = selectedGroup || currentGroups.find((g) => g.defaultGroup) || currentGroups[0];
        }

        if (targetGroup) {
          // Set the group as selected
          setSelectedGroup(targetGroup);

          // Handle visible layers if specified
          if (urlVisibleLayers) {
            const visibleLayerNames = urlVisibleLayers.split(",").map((name) => name.trim());

            // Update layer visibility in the target group
            const updatedLayers = targetGroup.layers.map((layer) => {
              const shouldBeVisible = visibleLayerNames.includes(layer.tocDisplayName) || visibleLayerNames.includes(layer.name) || visibleLayerNames.includes(layer.displayName || layer.name);

              if (shouldBeVisible !== layer.visible) {
                // Update layer visibility using the store action
                updateLayerVisibility(layer.name, targetGroup!.label, shouldBeVisible);
              }

              return layer;
            });

            // Store the visible layers list in the group for reference
            const updatedGroup = {
              ...targetGroup,
              visibleLayers: visibleLayerNames,
              layers: updatedLayers,
            };

            // Update the group with the new layer visibility
            setSelectedGroup(updatedGroup);
          }

          // Handle EXPAND_LEGEND parameter (only process once to avoid loops)
          if (urlExpandLegend && urlExpandLegend.toUpperCase() === "TRUE" && !expandLegendProcessedRef.current) {
            // Expand legends for all layers in the target group
            targetGroup.layers.forEach((layer) => {
              if (!layer.showLegend) {
                // Toggle the legend to show it
                toggleLayerLegend(layer.name, targetGroup!.label);
              }
            });
            // Mark as processed to prevent repeated execution
            expandLegendProcessedRef.current = true;
          }
        }
      }
    }
  }, [
    urlParameters.TOCTYPE,
    urlParameters.GROUP,
    urlParameters.LAYERS,
    urlParameters.EXPAND_LEGEND,
    setTocType,
    tocType,
    layerListGroups,
    layerFolderGroups,
    selectedGroup,
    setSelectedGroup,
    updateLayerVisibility,
    toggleLayerLegend,
  ]);

  // Handle URL parameters after TOC is initialized
  useEffect(() => {
    if (initialized && Object.keys(urlParameters).length > 0) {
      // Add a small delay to ensure TOC is fully loaded and groups are available
      setTimeout(() => {
        handleURLParameters();
      }, 200); // Slightly longer delay to ensure groups are loaded
    }
  }, [initialized, urlParameters, handleURLParameters]);

  // Reset expandLegendProcessed when URL parameters change (for new page loads)
  useEffect(() => {
    expandLegendProcessedRef.current = false;
  }, [urlParameters.EXPAND_LEGEND]);

  // Also handle URL parameters when groups change (for dynamic loading)
  useEffect(() => {
    if (initialized && (layerListGroups.length > 0 || layerFolderGroups.length > 0) && Object.keys(urlParameters).length > 0) {
      // Handle URL parameters when groups become available
      setTimeout(() => {
        handleURLParameters();
      }, 100);
    }
  }, [initialized, layerListGroups.length, layerFolderGroups.length, urlParameters, handleURLParameters]);

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
          onGroupDropDownChange={handleGroupDropDownChange}
          onLayerChange={handleLayerChange}
          onLegendToggle={handleLegendToggle}
          onLayerOptionsClick={handleLayerOptionsClick}
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
