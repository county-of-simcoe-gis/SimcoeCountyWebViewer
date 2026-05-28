"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTOCStore, TOCLayer, TOCLayerGroup } from "@/stores/tocStore";
import { useAppStore } from "@/stores/appStore";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import { useMapStore } from "@/stores/mapStore";
import { useUrlParameterContextOptional } from "@/contexts/UrlParameterContext";
import TOCHeader from "@/components/TOC/TOCHeader";
import TOCListView from "@/components/TOC/TOCListView";
import TOCFolderView from "@/components/TOC/TOCFolderView";
import LayerOptionsMenu from "@/components/TOC/LayerOptionsMenu";
import { saveToStorage, getItemsFromStorage, setStorageItem, getStorageItem, removeStorageItem } from "@/utils/storage";
import { flushUserStorage } from "@/utils/userStorage";
import { showMessage } from "@/utils/helpersUI";
import { sortLayers, sortGroupsLayers } from "@/utils/tocHelpers";

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
  const tocType = useTOCStore((s) => s.tocType);
  const layerListGroups = useTOCStore((s) => s.layerListGroups);
  const layerFolderGroups = useTOCStore((s) => s.layerFolderGroups);
  const selectedGroup = useTOCStore((s) => s.selectedGroup);
  const searchText = useTOCStore((s) => s.searchText);
  const sortAlpha = useTOCStore((s) => s.sortAlpha);
  const isLoading = useTOCStore((s) => s.isLoading);
  const helpLink = useTOCStore((s) => s.helpLink);
  const setTocType = useTOCStore((s) => s.setTocType);
  const setSelectedGroup = useTOCStore((s) => s.setSelectedGroup);
  const setSearchText = useTOCStore((s) => s.setSearchText);
  const setSortAlpha = useTOCStore((s) => s.setSortAlpha);
  const setGlobalOpacity = useTOCStore((s) => s.setGlobalOpacity);
  const getGlobalOpacity = useTOCStore((s) => s.getGlobalOpacity);
  const initializeFromConfig = useTOCStore((s) => s.initializeFromConfig);
  const refreshTOC = useTOCStore((s) => s.refreshTOC);
  const toggleLayerLegendById = useTOCStore((s) => s.toggleLayerLegendById);
  const updateLayerVisibilitiesBatch = useTOCStore((s) => s.updateLayerVisibilitiesBatch);
  const moveLayer = useTOCStore((s) => s.moveLayer);
  const getAllVisibleLayers = useTOCStore((s) => s.getAllVisibleLayers);

  const updateLayerVisibility = useLayerManagerStore((s) => s.updateLayerVisibility);

  const config = useAppStore((s) => s.config);
  const urlParameters = useAppStore((state) => state.urlParameters);
  const [initialized, setInitialized] = useState(false);
  const expandLegendProcessedRef = useRef(false);

  // URL Parameter context for registering TOC readiness
  const urlParamContext = useUrlParameterContextOptional();

  // Layer options menu state
  const [layerOptionsMenu, setLayerOptionsMenu] = useState<{
    layerInfo: TOCLayer;
    group: TOCLayerGroup;
    position: { x: number; y: number };
  } | null>(null);

  // Function to apply saved layer options from localStorage
  const applySavedLayerOptions = useCallback(
    (type: "LIST" | "FOLDER") => {
      // Each view uses its own storage key so saves are independent
      const storageKey = type === "LIST" ? "Layers" : "Layers_Folder_View";
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

      // Apply saved order to the store — pass preserveLayerOrder so that
      // setLayerGroups sorts the "All Layers" virtual group by the restored
      // drawIndex values instead of re-sorting by initialDrawIndex (server order).
      if (type === "LIST") {
        // Filter out the "all_layers" group before setting, as the store will create it automatically
        const filteredGroups = layerGroups.filter((group) => group.value !== "all_layers");
        if (sortAlpha) {
          // Alpha sort: let sortLayers renumber — order comes from alphabetical comparison
          const sorted = filteredGroups.map((group) => ({
            ...group,
            layers: sortLayers(group.layers, true),
          }));
          setLayerGroups("LIST", sorted);
        } else {
          // Preserve saved order: do NOT call sortLayers() here — it would
          // renumber each group's drawIndex to 0..N-1 and destroy the global
          // ordering info.  The saved drawIndex values are global z-indices
          // that setLayerGroups needs intact to sort the flattened "All Layers".
          setLayerGroups("LIST", filteredGroups, { preserveLayerOrder: true });
        }
      } else {
        const sortedGroups = sortGroupsLayers(layerGroups, sortAlpha);
        setLayerGroups("FOLDER", sortedGroups);
      }

      // Sync OpenLayers z-indices to match the restored layer order
      useTOCStore.getState().updateLayerManagerZIndices();
    },
    [sortAlpha, updateLayerVisibility],
  );

  // Initialize TOC from config
  useEffect(() => {
    if (config && !initialized) {
      initializeFromConfig(config);

      // Load saved TOC type from localStorage AFTER config initialization
      // This ensures the saved preference overrides the config default
      const savedTocType = getStorageItem("TOC_Type");
      if (savedTocType && (savedTocType === "LIST" || savedTocType === "FOLDER")) {
        setTocType(savedTocType as "LIST" | "FOLDER");
      }

      // Wait for map to be available via store subscription (no polling).
      // Resolves immediately if the map is already initialized.
      const whenMapReady = () =>
        new Promise<void>((resolve) => {
          if (useMapStore.getState().map) return resolve();
          const unsubscribe = useMapStore.subscribe((state) => {
            if (state.map) {
              unsubscribe();
              resolve();
            }
          });
        });

      // Mark initialized synchronously so re-renders triggered by the state
      // updates above (initializeFromConfig / setTocType) don't cause this
      // effect to attempt initialization again. We intentionally do NOT use a
      // cancellation flag here — the TOC/Map stores are global singletons, so
      // the initialization should run to completion regardless of any
      // intermediate component re-renders.
      setInitialized(true);

      (async () => {
        await refreshTOC();
        await whenMapReady();

        // initializeOpenLayersLayers now returns a Promise that resolves once
        // every async LayerHelpers.getLayer callback has settled — no more
        // arbitrary 500ms wait.
        await useTOCStore.getState().initializeOpenLayersLayers();

        // Sync z-indices to match the final TOC order. ArcGIS layers are added
        // to the map during source loading (before the global order is known),
        // so their z-indices may be stale. This pass ensures all layers —
        // ArcGIS and WMS — share a consistent, TOC-driven draw order.
        useTOCStore.getState().updateLayerManagerZIndices();

        // Apply saved layer options for BOTH views so each view's
        // order/visibility is independent and fully restored.
        const savedListData = getItemsFromStorage<Record<string, SavedGroup>>("Layers");
        const savedFolderData = getItemsFromStorage<Record<string, SavedGroup>>("Layers_Folder_View");
        if (savedListData !== undefined && savedListData !== null) {
          applySavedLayerOptions("LIST");
        }
        if (savedFolderData !== undefined && savedFolderData !== null) {
          applySavedLayerOptions("FOLDER");
        }

        if (urlParamContext?.registerComponentReady) {
          urlParamContext.registerComponentReady("toc", { readinessType: "dataLoaded" });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, initialized, initializeFromConfig, refreshTOC, tocType]);

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
        // updateLayerVisibilityById already handles both the TOC store state
        // AND the OpenLayers layer visibility via LayerManager
        updateLayerVisibilityById(layer.id, layer.visible);
      } else {
        // Fall back to name-based update for legacy layers without ID
        // updateTOCLayerVisibility already handles both the TOC store state
        // AND the OpenLayers layer visibility via LayerManager
        updateTOCLayerVisibility(layer.name, group.label, layer.visible);
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

        // Debug: Check if layer is actually on the map
        // const map = useMapStore.getState().map;
        // if (map) {
        //   const mapLayers = map.getLayers().getArray();
        //   const layerOnMap = mapLayers.find((l) => l === managedLayer.layer);
        //   const view = map.getView();
        // }
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
    removeStorageItem("Layers");
    removeStorageItem("TOC_Type");
    flushUserStorage();

    refreshTOC(true).then(async () => {
      // After TOC is reloaded, reinitialize OpenLayers layers.
      // Wait for the map via store subscription instead of polling.
      if (!useMapStore.getState().map) {
        await new Promise<void>((resolve) => {
          const unsubscribe = useMapStore.subscribe((state) => {
            if (state.map) {
              unsubscribe();
              resolve();
            }
          });
        });
      }
      await useTOCStore.getState().initializeOpenLayersLayers();
      useTOCStore.getState().updateLayerManagerZIndices();
    });
  };

  const handleTurnOffLayers = () => {
    useTOCStore.getState().setAllLayersVisibility(false);
  };

  const handleClearSavedLayers = () => {
    // Clear saved layer states and TOC type from localStorage
    removeStorageItem("Layers");
    removeStorageItem("Layers_Folder_View");
    removeStorageItem("TOC_Type");
    flushUserStorage();

    // Show success message
    showMessage("Clear", "Saved layers have been cleared.", "success");
  };

  const handleSaveAllLayers = () => {
    // Save TOC type to localStorage
    setStorageItem("TOC_Type", tocType);

    // Get layers from BOTH views so we can save them independently
    const { layerListGroups: currentListGroups, layerFolderGroups: currentFolderGroups } = useTOCStore.getState();

    // Helper: build a save-ready groups object from a set of TOC groups
    const buildSaveData = (sourceGroups: TOCLayerGroup[], globalDrawIndexById?: Map<string, number>) => {
      const groups: Record<string, unknown> = {};

      sourceGroups.forEach((group) => {
        if (group.value === "all_layers") return;

        const savedLayers: Record<string, unknown> = {};
        group.layers.forEach((layer) => {
          const drawIndex = globalDrawIndexById?.get(layer.id) ?? layer.drawIndex;
          savedLayers[layer.name] = {
            name: layer.name,
            visible: layer.visible,
            opacity: layer.opacity,
            index: drawIndex,
          };
        });

        groups[group.value] = {
          name: group.label,
          value: group.value,
          label: group.label,
          defaultGroup: group.defaultGroup,
          visibleLayers: group.visibleLayers,
          panelOpen: true,
          wmsGroupUrl: group.wmsGroupUrl,
          customRestUrl: group.customRestUrl,
          prefix: group.prefix,
          layers: savedLayers,
        };
      });

      return groups;
    };

    // LIST view: use global drawIndex from "All Layers" so saved indices
    // are unique across all groups (not per-group 0..N-1).
    const globalDrawIndexById = new Map<string, number>();
    const allLayersGroup = currentListGroups.find((g) => g.value === "all_layers");
    if (allLayersGroup) {
      allLayersGroup.layers.forEach((layer) => {
        globalDrawIndexById.set(layer.id, layer.drawIndex);
      });
    }

    // Save BOTH views to separate storage keys
    saveToStorage("Layers", buildSaveData(currentListGroups, globalDrawIndexById));
    saveToStorage("Layers_Folder_View", buildSaveData(currentFolderGroups));

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

    let groupsToSelect;

    if (tocType === "LIST") {
      // In list view, pre-select the currently active group
      const { selectedGroup } = useTOCStore.getState();
      if (selectedGroup) {
        const activeGroup = allGroups.find((group) => group.value === selectedGroup.value);
        groupsToSelect = activeGroup ? [activeGroup] : allGroups;
      } else {
        groupsToSelect = allGroups;
      }
    } else {
      // In folder view, pre-select groups that have visible layers
      const allVisibleLayersData = getAllVisibleLayers();
      const visibleGroupValues = new Set(allVisibleLayersData.map((layer) => layer.group));
      const selectedGroups = allGroups.filter((group) => visibleGroupValues.has(group.value));
      groupsToSelect = selectedGroups.length > 0 ? selectedGroups : allGroups;
    }

    // Open the legend modal with all groups and pre-selected groups
    const { useLegendStore } = await import("@/stores/legendStore");
    useLegendStore.getState().openLegend(allGroups, groupsToSelect);
  };

  const handleLayerVisibilityGroup = (group: TOCLayerGroup, visible: boolean) => {
    const { updateLayerVisibilityById } = useTOCStore.getState();

    group.layers.forEach((layer) => {
      updateLayerVisibilityById(layer.id, visible);
    });
  };

  const handleGroupFolderToggle = (_groupValue: string, _isOpen: boolean) => {
    // Handle group folder expand/collapse - placeholder for future state management
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

            // Build batch updates for all layers that need visibility changes
            const batchUpdates: Array<{ layerId: string; visible: boolean }> = [];

            targetGroup.layers.forEach((layer) => {
              const shouldBeVisible = visibleLayerNames.includes(layer.tocDisplayName) || visibleLayerNames.includes(layer.name) || visibleLayerNames.includes(layer.displayName || layer.name);

              if (shouldBeVisible !== layer.visible) {
                batchUpdates.push({ layerId: layer.id, visible: shouldBeVisible });
              }
            });

            // Apply all visibility changes in a single store update
            if (batchUpdates.length > 0) {
              updateLayerVisibilitiesBatch(batchUpdates);
            }
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
    updateLayerVisibilitiesBatch,
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

  // Compute displayed layer count based on current view and selected group
  const displayedLayerCount = React.useMemo(() => {
    if (tocType === "LIST" && selectedGroup) {
      return selectedGroup.layers.length;
    }
    // FOLDER view: sum layers across all folder groups
    return currentGroups.reduce((sum, group) => sum + group.layers.length, 0);
  }, [tocType, selectedGroup, currentGroups]);

  if (!visible) {
    return <div className="hidden" />;
  }

  return (
    <div className="h-full w-full flex flex-col font-[Verdana,Arial,sans-serif] text-[9pt] select-none">
      <TOCHeader
        tocType={tocType}
        searchText={searchText}
        sortAlpha={sortAlpha}
        globalOpacity={getGlobalOpacity()}
        isLoading={isLoading}
        layerCount={displayedLayerCount}
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
