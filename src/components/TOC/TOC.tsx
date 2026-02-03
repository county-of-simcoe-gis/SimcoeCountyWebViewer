"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTOCStore, TOCLayer, TOCLayerGroup } from "@/stores/tocStore";
import { useAppStore } from "@/stores/appStore";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import { useMapStore } from "@/stores/mapStore";
import { useEventListener } from "@/hooks/useEventListener";
import TOCHeader from "@/components/TOC/TOCHeader";
import TOCListView from "@/components/TOC/TOCListView";
import TOCFolderView from "@/components/TOC/TOCFolderView";
import LayerOptionsMenu from "@/components/TOC/LayerOptionsMenu";
import { saveToStorage, getItemsFromStorage } from "@/utils/storage";
import { showMessage } from "@/utils/helpersUI";
import { sortLayers, sortGroupsLayers } from "@/utils/tocHelpers";
import "@/components/TOC/TOC.css";

interface TOCProps {
  visible?: boolean;
}

// Types for saved layer data
interface SavedLayer {
  name: string;
  visible: boolean;
  opacity: number;
  index: number;
}

interface SavedGroup {
  name: string;
  value: string;
  label: string;
  defaultGroup: boolean;
  visibleLayers: string[];
  panelOpen?: boolean;
  wmsGroupUrl: string;
  customRestUrl: string;
  prefix: string;
  layers: Record<string, SavedLayer>;
}

export default function TOC({ visible = true }: TOCProps) {
  const {
    tocType,
    layerListGroups,
    layerFolderGroups,
    selectedGroup,
    searchText,
    sortAlpha,
    isLoading,
    layerCount,
    helpLink,
    setTocType,
    setSelectedGroup,
    setSearchText,
    setSortAlpha,
    setGlobalOpacity,
    getGlobalOpacity,
    initializeFromConfig,
    refreshTOC,
    toggleLayerLegendById,
    moveLayer,
    getAllVisibleLayers,
  } = useTOCStore();

  const { updateLayerVisibility } = useLayerManagerStore();

  const { config } = useAppStore();
  const urlParameters = useAppStore((state) => state.urlParameters);
  const [initialized, setInitialized] = useState(false);
  const [savedOptionsApplied, setSavedOptionsApplied] = useState(false);
  const expandLegendProcessedRef = useRef(false);

  // Layer options menu state
  const [layerOptionsMenu, setLayerOptionsMenu] = useState<{
    layerInfo: TOCLayer;
    group: TOCLayerGroup;
    position: { x: number; y: number };
  } | null>(null);

  // Function to apply saved layer options from localStorage
  const applySavedLayerOptions = useCallback(
    (type: "LIST" | "FOLDER") => {
      // Use a single storage key for both LIST and FOLDER views
      const storageKey = "Layers";
      const savedData = getItemsFromStorage<Record<string, SavedGroup>>(storageKey);

      if (savedData === undefined || savedData === null) {
        return;
      }

      // Convert to array for easier filtering
      const savedDataArray = Object.entries(savedData);

      // Get current layer groups from the store
      const { layerListGroups, layerFolderGroups, setLayerGroups, updateLayerVisibility: updateTOCVisibility, updateLayerOpacityById } = useTOCStore.getState();

      let layerGroups = type === "LIST" ? [...layerListGroups] : [...layerFolderGroups];

      // Map through groups and apply saved settings
      layerGroups = layerGroups.map((group) => {
        // Skip the virtual "All Layers" group
        if (group.value === "all_layers") {
          return group;
        }

        // Try to find saved group by value first, then by label
        let savedGroup = savedData[group.value];
        if (!savedGroup) {
          const savedDataArrayItem = savedDataArray.find((groupItem) => {
            if (groupItem[1]) {
              return group.label === groupItem[1].label;
            }
            return false;
          });
          if (savedDataArrayItem) {
            savedGroup = savedData[savedDataArrayItem[0]];
          }
        }

        let savedLayers: Record<string, SavedLayer> = {};
        try {
          if (savedGroup !== undefined && savedGroup.layers !== undefined) {
            savedLayers = savedGroup.layers as Record<string, SavedLayer>;
          } else if (savedGroup !== undefined) {
            // Support legacy saves where layers might be at root level
            savedLayers = savedGroup as unknown as Record<string, SavedLayer>;
          }
        } catch (e) {
          console.warn("Error parsing saved layers:", e);
        }

        // Map through layers and apply saved settings
        const updatedLayers = group.layers.map((layer) => {
          const savedLayer = savedLayers[layer.name];

          if (savedLayer !== undefined) {
            // Create a new layer object with updated properties
            const updatedLayer = {
              ...layer,
              visible: savedLayer.visible,
              opacity: savedLayer.opacity,
              index: savedLayer.index,
              drawIndex: savedLayer.index,
            };

            // Update the TOC store and OpenLayers layer visibility
            updateTOCVisibility(layer.name, group.label, savedLayer.visible);

            // Update opacity using the ID-based method
            updateLayerOpacityById(layer.id, savedLayer.opacity);

            // Update OpenLayers layer visibility if available
            if (layer.managedLayerId) {
              updateLayerVisibility(layer.managedLayerId, savedLayer.visible);
            }

            return updatedLayer;
          }

          return layer;
        });

        // Create a new group object with updated properties
        const updatedGroup = {
          ...group,
          layers: updatedLayers,
          // Restore panel open state if available
          ...(savedGroup !== undefined && savedGroup.panelOpen !== undefined && { panelOpen: savedGroup.panelOpen }),
        };

        return updatedGroup;
      });

      // Sort layers based on current sort setting
      if (type === "LIST") {
        layerGroups = layerGroups.map((group) => ({
          ...group,
          layers: sortLayers(group.layers, sortAlpha),
        }));
        // Filter out the "all_layers" group before setting, as the store will create it automatically
        const filteredGroups = layerGroups.filter((group) => group.value !== "all_layers");
        setLayerGroups("LIST", filteredGroups);
      } else {
        const sortedGroups = sortGroupsLayers(layerGroups, sortAlpha);
        setLayerGroups("FOLDER", sortedGroups);
      }
    },
    [sortAlpha, updateLayerVisibility],
  );

  // Initialize TOC from config
  useEffect(() => {
    if (config && !initialized) {
      initializeFromConfig(config);

      // Load saved TOC type from localStorage AFTER config initialization
      // This ensures the saved preference overrides the config default
      const savedTocType = localStorage.getItem("TOC_Type");
      if (savedTocType && (savedTocType === "LIST" || savedTocType === "FOLDER")) {
        setTocType(savedTocType as "LIST" | "FOLDER");
      }

      refreshTOC().then(() => {
        // Initialize OpenLayers layers after TOC is loaded
        // Wait for map to be available before initializing layers
        const waitForMap = () => {
          const map = useMapStore.getState().map;
          if (map) {
            useTOCStore.getState().initializeOpenLayersLayers();

            // Apply saved layer options after map and layers are initialized
            setTimeout(() => {
              // Use a single storage key for both LIST and FOLDER views
              const storageKey = "Layers";
              const savedData = getItemsFromStorage<Record<string, SavedGroup>>(storageKey);

              if (savedData !== undefined && savedData !== null) {
                // Apply saved options inline to avoid dependency issues
                applySavedLayerOptions(tocType);
              }
              setSavedOptionsApplied(true);
            }, 500); // Small delay to ensure layers are fully initialized
          } else {
            setTimeout(waitForMap, 100);
          }
        };

        // Start waiting for map after a small delay
        setTimeout(waitForMap, 100);
      });
      setInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, initialized, initializeFromConfig, refreshTOC, tocType]);

  // Apply saved options when TOC type changes
  useEffect(() => {
    if (initialized && savedOptionsApplied && (layerListGroups.length > 0 || layerFolderGroups.length > 0)) {
      // Apply saved options when switching between LIST and FOLDER views
      applySavedLayerOptions(tocType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tocType, initialized, savedOptionsApplied, layerListGroups.length, layerFolderGroups.length]);

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
    // Note: TOC type is saved to localStorage only when user clicks "Save All Layers"
  };

  const handleLayerChange = (layer: TOCLayer, group: TOCLayerGroup) => {
    // Check if this is just an opacity update (visibility unchanged) vs a visibility change
    const currentTOCLayer = useTOCStore.getState().getLayerById(layer.id);
    const isOpacityChange = currentTOCLayer && Math.abs(currentTOCLayer.opacity - layer.opacity) > 0.01;

    // More robust visibility change detection: check if visibility ACTUALLY changed
    // For LayerManager layers, check the actual OpenLayers layer visibility
    let actualCurrentVisibility = currentTOCLayer?.visible || false;
    if (layer.managedLayerId) {
      const managedLayer = useLayerManagerStore.getState().getLayer(layer.managedLayerId);
      if (managedLayer) {
        actualCurrentVisibility = managedLayer.visible;
      }
    }

    const isVisibilityChange = layer.visible !== actualCurrentVisibility;

    // Handle visibility changes ONLY if visibility actually changed
    if (isVisibilityChange) {
      // Update the TOC store state to reflect the visibility change
      // Use ID-based update for unique identification (handles duplicate layer names)
      const { updateLayerVisibilityById, updateLayerVisibility: updateTOCLayerVisibility } = useTOCStore.getState();

      if (layer.id) {
        // Prefer ID-based update for unique layer identification
        updateLayerVisibilityById(layer.id, layer.visible);
      } else {
        // Fall back to name-based update for legacy layers without ID
        updateTOCLayerVisibility(layer.name, group.label, layer.visible);
      }

      // Then update the OpenLayers layer via layerManagerStore if available
      if (layer.managedLayerId) {
        const success = updateLayerVisibility(layer.managedLayerId, layer.visible);
      }
    }

    // Handle opacity changes - but ONLY if it's an opacity change and NOT a visibility change
    if (isOpacityChange && !isVisibilityChange) {
      // Update opacity in TOC store
      const { updateLayerOpacityById } = useTOCStore.getState();
      updateLayerOpacityById(layer.id, layer.opacity);

      // The LayerManager opacity should already be updated by the opacity slider
    }

    // Debug: Check the actual layer state after update
    if (layer.managedLayerId) {
      const managedLayer = useLayerManagerStore.getState().getLayer(layer.managedLayerId);
      if (managedLayer) {
        // Check source state
        const source = managedLayer.layer.getSource();
        if (source) {
        }

        // Check if layer is actually on the map
        const map = useMapStore.getState().map;
        if (map) {
          const mapLayers = map.getLayers().getArray();
          const layerOnMap = mapLayers.find((l) => l === managedLayer.layer);

          // Check layer z-index

          // Check map extent
          const view = map.getView();
        }
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLegendToggle = (layerInfo: TOCLayer, group: TOCLayerGroup) => {
    // group parameter is kept for interface compatibility but not used
    // Use the new unique ID-based legend toggle function
    toggleLayerLegendById(layerInfo.id);
  };

  const handleLayerOptionsClick = (evt: React.MouseEvent, layerInfo: TOCLayer) => {
    evt.preventDefault();
    evt.stopPropagation();

    // Find the group this layer belongs to
    const group = tocType === "LIST" ? layerListGroups.find((g) => g.layers.some((l) => l.id === layerInfo.id)) : layerFolderGroups.find((g) => g.layers.some((l) => l.id === layerInfo.id));

    if (!group) {
      console.warn("Could not find group for layer:", layerInfo.name);
      return;
    }

    // Get click position for menu positioning
    const position = {
      x: evt.clientX,
      y: evt.clientY,
    };

    // Show the layer options menu
    setLayerOptionsMenu({
      layerInfo,
      group,
      position,
    });
  };

  const handleSortEnd = ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
    if (selectedGroup) {
      moveLayer(selectedGroup.label, oldIndex, newIndex);
    }
  };

  const handleResetToDefault = () => {
    // Reset TOC to default state - this will reload layers from server with default visibility
    // Clear saved layer options from localStorage
    localStorage.removeItem("Layers");
    localStorage.removeItem("TOC_Type");

    refreshTOC(true).then(() => {
      // After TOC is reloaded, reinitialize OpenLayers layers
      const waitForMap = () => {
        const map = useMapStore.getState().map;
        if (map) {
          useTOCStore.getState().initializeOpenLayersLayers();
        } else {
          setTimeout(waitForMap, 100);
        }
      };

      // Start waiting for map after a small delay
      setTimeout(waitForMap, 100);
    });
  };

  const handleTurnOffLayers = () => {
    const visibleLayers = getAllVisibleLayers();
    const { updateLayerVisibility: updateTOCLayerVisibility } = useTOCStore.getState();

    visibleLayers.forEach((layer) => {
      // Update TOC store first
      updateTOCLayerVisibility(layer.name, layer.groupName, false);

      // Then update OpenLayers layer if available
      if (layer.managedLayerId) {
        updateLayerVisibility(layer.managedLayerId, false);
      }
    });
  };

  const handleClearSavedLayers = () => {
    // Clear saved layer states and TOC type from localStorage
    localStorage.removeItem("Layers");
    localStorage.removeItem("TOC_Type");

    // Show success message
    showMessage("Clear", "Saved layers have been cleared.", "success");
  };

  const handleSaveAllLayers = () => {
    // Save TOC type to localStorage
    localStorage.setItem("TOC_Type", tocType);

    // Get all layers from the store (source of truth for current layer states)
    const { allLayers } = useTOCStore.getState();

    // Group layers by their group value
    const layersByGroup = new Map<string, TOCLayer[]>();
    allLayers.forEach((layer) => {
      if (!layersByGroup.has(layer.group)) {
        layersByGroup.set(layer.group, []);
      }
      layersByGroup.get(layer.group)!.push(layer);
    });

    // Get group metadata from either view (they should have the same groups)
    const groupMetadata = new Map<string, TOCLayerGroup>();
    const allGroups = tocType === "LIST" ? layerListGroups : layerFolderGroups;
    allGroups.forEach((group) => {
      if (group.value !== "all_layers") {
        groupMetadata.set(group.value, group);
      }
    });

    // Prepare the groups object to save
    const groups: Record<string, unknown> = {};

    // Process each group
    layersByGroup.forEach((layers, groupValue) => {
      const groupMeta = groupMetadata.get(groupValue);
      if (!groupMeta) {
        // Skip if we don't have metadata for this group
        return;
      }

      // Prepare saved layers object for this group
      const savedLayers: Record<string, unknown> = {};

      // Process each layer in the group
      layers.forEach((layer) => {
        // Save layer state
        const saveLayer = {
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          index: layer.drawIndex,
        };

        savedLayers[layer.name] = saveLayer;
      });

      // Prepare saved group object
      const savedGroup = {
        name: groupMeta.label,
        value: groupMeta.value,
        label: groupMeta.label,
        defaultGroup: groupMeta.defaultGroup,
        visibleLayers: groupMeta.visibleLayers,
        panelOpen: true, // Default to true, can be customized based on UI state if tracked
        wmsGroupUrl: groupMeta.wmsGroupUrl,
        customRestUrl: groupMeta.customRestUrl,
        prefix: groupMeta.prefix,
        layers: savedLayers,
      };

      groups[groupValue] = savedGroup;
    });

    // Use a single storage key for both LIST and FOLDER views
    const storageKey = "Layers";

    // Save to localStorage using the storage utility
    saveToStorage(storageKey, groups);

    // Show success message
    showMessage("Save", "Layers have been saved.", "success");
  };

  const handleOpenLegend = async () => {
    // Get all groups with ALL their layers (not just visible ones)
    const allGroupsData = tocType === "LIST" ? layerListGroups : layerFolderGroups;

    // Convert to legend group format with all layers
    const allGroups = allGroupsData.map((group) => ({
      label: group.label,
      value: group.value,
      layers: group.layers,
    }));

    // Get visible layers to pre-select their groups
    const allVisibleLayersData = getAllVisibleLayers();

    // Find which groups have visible layers
    const visibleGroupValues = new Set(allVisibleLayersData.map((layer) => layer.group));

    // Pre-select groups that have visible layers, or all groups if none are visible
    const selectedGroups = allGroups.filter((group) => visibleGroupValues.has(group.value));

    // If no layers are visible, pre-select all groups
    const groupsToSelect = selectedGroups.length > 0 ? selectedGroups : allGroups;

    // Open the legend modal with all groups and pre-selected groups
    const { useLegendStore } = await import("@/stores/legendStore");
    useLegendStore.getState().openLegend(allGroups, groupsToSelect);
  };

  const handleLayerVisibilityGroup = (group: TOCLayerGroup, visible: boolean) => {
    // Turn on/off all layers in a group
    const { updateLayerVisibility: updateTOCLayerVisibility } = useTOCStore.getState();

    group.layers.forEach((layer) => {
      // Update TOC store first
      updateTOCLayerVisibility(layer.name, group.label, visible);

      // Then update OpenLayers layer if available
      if (layer.managedLayerId) {
        updateLayerVisibility(layer.managedLayerId, visible);
      }
    });
  };

  const handleGroupFolderToggle = (groupValue: string, isOpen: boolean) => {
    // Handle group folder expand/collapse
    // You can add state management here if needed to track open/closed groups
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
        // Note: TOC type is saved to localStorage only when user clicks "Save All Layers"
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
                // Update layer visibility - first TOC store, then OpenLayers
                const { updateLayerVisibility: updateTOCLayerVisibility } = useTOCStore.getState();
                updateTOCLayerVisibility(layer.name, targetGroup.label, shouldBeVisible);

                if (layer.managedLayerId) {
                  updateLayerVisibility(layer.managedLayerId, shouldBeVisible);
                }
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
                // Toggle the legend to show it using unique ID
                toggleLayerLegendById(layer.id);
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
    toggleLayerLegendById,
    updateLayerVisibility,
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
        globalOpacity={getGlobalOpacity()}
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
        onClearSavedLayers={handleClearSavedLayers}
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
          onLayerVisibilityGroup={handleLayerVisibilityGroup}
          onGroupFolderToggle={handleGroupFolderToggle}
          onSortEnd={handleSortEnd}
        />
      )}

      {/* Layer Options Menu */}
      {layerOptionsMenu && (
        <LayerOptionsMenu
          layerInfo={layerOptionsMenu.layerInfo}
          group={layerOptionsMenu.group}
          position={layerOptionsMenu.position}
          onClose={() => setLayerOptionsMenu(null)}
          onLayerChange={handleLayerChange}
        />
      )}
    </div>
  );
}
