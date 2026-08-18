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
import { saveSharedItem, getSharedItem, setStorageItem, getStorageItem, removeStorageItem } from "@/utils/storage";
import { flushUserStorage } from "@/utils/userStorage";
import { showMessage } from "@/utils/helpersUI";
import { sortLayers, sortGroupsLayers } from "@/utils/tocHelpers";
import { acceptDisclaimer } from "@/utils/disclaimerHelpers";
import { LegendObject } from "@/stores/legendStore";

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
  // Subscribe to the reactive globalOpacity value so the slider re-renders on change.
  const globalOpacity = useLayerManagerStore((s) => s.globalOpacity);
  const initializeFromConfig = useTOCStore((s) => s.initializeFromConfig);
  const refreshTOC = useTOCStore((s) => s.refreshTOC);
  const toggleLayerLegendById = useTOCStore((s) => s.toggleLayerLegendById);
  const getAllVisibleLayers = useTOCStore((s) => s.getAllVisibleLayers);

  const updateLayerVisibility = useLayerManagerStore((s) => s.updateLayerVisibility);

  const config = useAppStore((s) => s.config);
  const urlParameters = useAppStore((state) => state.urlParameters);
  const [initialized, setInitialized] = useState(false);
  const expandLegendProcessedRef = useRef(false);
  const layersProcessedForUrlRef = useRef<string | null>(null);

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
      // Each view uses its own storage key so saves are independent.
      // These keys are shared with the legacy apps, so read them in the raw
      // legacy format (saveSharedItem/getSharedItem bypass the envelope).
      const storageKey = type === "LIST" ? "Layers" : "Layers_Folder_View";
      const savedData = getSharedItem<Record<string, SavedGroup>>(storageKey);

      if (savedData === undefined || savedData === null) {
        return;
      }

      // Convert to array for easier filtering
      const savedDataArray = Object.entries(savedData);

      // Build a flat "layer name -> savedLayer" lookup spanning ALL saved
      // groups (including the virtual "opengis:all_layers" group). The legacy
      // app's LIST view stores every layer flat under a single
      // "opengis:all_layers" group, so matching saved data by real group value
      // alone would miss them entirely. Falling back to this name-based lookup
      // lets legacy LIST saves restore correctly in the new app.
      //
      // PRECEDENCE: the same layer name can appear in BOTH the flat
      // "opengis:all_layers" group AND a real category group, often with
      // different visibility. The flat "opengis:all_layers" group is the
      // authoritative legacy source of truth, so it must WIN. We therefore
      // populate the lookup from the real groups first, then let
      // "opengis:all_layers" overwrite — otherwise a later real group with
      // visible:false would clobber the correct visible:true from the flat
      // group (e.g. losing a user-enabled "Bruce Trail" layer).
      const flatSavedLayers: Record<string, SavedLayer> = {};
      savedDataArray.forEach(([groupKey, grp]) => {
        if (groupKey === "opengis:all_layers") return;
        const grpLayers = grp && (grp as SavedGroup).layers;
        if (grpLayers && typeof grpLayers === "object") {
          Object.entries(grpLayers as Record<string, SavedLayer>).forEach(([layerName, sl]) => {
            flatSavedLayers[layerName] = sl;
          });
        }
      });
      const allLayersGroup = savedData["opengis:all_layers"] as SavedGroup | undefined;
      if (allLayersGroup?.layers && typeof allLayersGroup.layers === "object") {
        Object.entries(allLayersGroup.layers as Record<string, SavedLayer>).forEach(([layerName, sl]) => {
          flatSavedLayers[layerName] = sl;
        });
      }

      // SECURED-PREFIX PRIORITY: the same physical layer can be published under
      // multiple workspace prefixes (e.g. "simcoe:Bruce_Trail" and
      // "simcoe-secured:Bruce_Trail"). A given config (MAP_ID) may expose only
      // the unsecured variant, but the user enabled the SECURED one in the
      // legacy app. We therefore index every saved key by its base layer name
      // (the part after the ":") and remember any "secured"-prefixed variant
      // that was saved visible. During matching, a visible secured sibling
      // takes priority and turns the layer on, regardless of the unsecured
      // variant's saved (false) state.
      const baseLayerName = (fullName: string): string => (fullName.includes(":") ? (fullName.split(":").pop() ?? fullName) : fullName);
      const securedVisibleByBase: Record<string, SavedLayer> = {};
      Object.keys(flatSavedLayers).forEach((key) => {
        if (/secured/i.test(key) && flatSavedLayers[key]?.visible) {
          securedVisibleByBase[baseLayerName(key)] = flatSavedLayers[key];
        }
      });

      // Get current layer groups from the store
      const { layerListGroups, layerFolderGroups, setLayerGroups, updateLayerOpacityById, tocType: activeType } = useTOCStore.getState();

      // The OpenLayers map reflects a single (active) view. Only sync map layer
      // visibility while restoring that view — restoring the inactive view must
      // not push its (independent) visibility onto the shared map layers.
      const isActiveView = type === activeType;

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
          // Precedence depends on the view's storage shape:
          //  - LIST (legacy) stores the authoritative state flat under
          //    "opengis:all_layers" (captured in flatSavedLayers), so it must
          //    win over any per-group entry, which may carry stale/false
          //    visibility for the same layer name.
          //  - FOLDER stores per-group state, so the matched group wins, with
          //    the flat lookup only as a fallback.
          let savedLayer = type === "LIST" ? (flatSavedLayers[layer.name] ?? savedLayers[layer.name]) : (savedLayers[layer.name] ?? flatSavedLayers[layer.name]);

          // SECURED-PREFIX PRIORITY (LIST only): if a "secured"-prefixed sibling
          // of this layer (same base name) was saved visible, it wins and turns
          // the layer on — even when this config exposes only the unsecured
          // variant (saved false). This reconciles cross-config duplicates where
          // the user enabled the secured copy in the legacy app.
          if (type === "LIST") {
            const securedSibling = securedVisibleByBase[baseLayerName(layer.name)];
            if (securedSibling) {
              savedLayer = savedLayer !== undefined ? { ...savedLayer, visible: true } : securedSibling;
            }
          }

          if (savedLayer !== undefined) {
            // Create a new layer object with updated properties.
            // NOTE: visibility is applied here on the per-layer object and then
            // committed via setLayerGroups below. We intentionally do NOT call
            // the name-based updateLayerVisibility() here — it would update every
            // same-named layer across BOTH views, corrupting independent per-view
            // visibility when duplicate layer names exist (e.g. two "Assessment
            // Parcel" layers).
            const updatedLayer = {
              ...layer,
              visible: savedLayer.visible,
              opacity: savedLayer.opacity,
              index: savedLayer.index,
              drawIndex: savedLayer.index,
            };

            // Update opacity using the ID-based method (unique per layer)
            updateLayerOpacityById(layer.id, savedLayer.opacity);

            // Sync this specific OpenLayers layer's visibility — only for the
            // active view, and keyed by the unique managedLayerId so duplicate
            // names don't collide.
            if (isActiveView && layer.managedLayerId) {
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

      // Re-assert the active view's COMMITTED visibility onto the map. The
      // per-layer updateVisibility() calls above run BEFORE setLayerGroups
      // recomputes the LIST dedup winners, so on their own they leave
      // suppressed duplicates visible and can miss the winner. This final pass
      // applies winner-wins visibility from the now-committed group state.
      useTOCStore.getState().syncActiveViewVisibilityToMap();
    },
    [sortAlpha, updateLayerVisibility],
  );

  // Initialize TOC from config
  useEffect(() => {
    if (config && !initialized) {
      initializeFromConfig(config);

      // Load saved TOC type from localStorage AFTER config initialization
      // This ensures the saved preference overrides the config default.
      // "TOC_Type" is shared with the legacy apps, which store it
      // JSON-stringified (e.g. '"LIST"'), so strip any surrounding quotes.
      const rawTocType = getStorageItem("TOC_Type");
      const savedTocType = rawTocType?.replace(/^"|"$/g, "");
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
        const savedListData = getSharedItem<Record<string, SavedGroup>>("Layers");
        const savedFolderData = getSharedItem<Record<string, SavedGroup>>("Layers_Folder_View");
        if (savedListData !== undefined && savedListData !== null) {
          applySavedLayerOptions("LIST");
        }
        if (savedFolderData !== undefined && savedFolderData !== null) {
          applySavedLayerOptions("FOLDER");
        }

        // Seed per-view visibility snapshots from the now-restored group state
        // (server-saved → localStorage-saved → config-default). This guarantees
        // the first LIST↔FOLDER switch preserves restored visibility instead of
        // resetting a view to config defaults.
        useTOCStore.getState().seedViewVisibilityStatesFromGroups();

        // Apply URL parameters now that layers, OpenLayers objects, and saved
        // state are fully loaded. This runs after localStorage restore so URL
        // LAYERS/GROUP always take precedence over saved visibility.
        handleURLParameters();

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

    // Visibility change detection: compare against the TOC store's current state
    // (the displayed checkbox state) rather than the managed layer's actual
    // visibility. This ensures toggles always honor user intent even when the
    // map is temporarily out of sync (e.g. during dedup reconciliation).
    const actualCurrentVisibility = currentTOCLayer?.visible || false;

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

    // LIST view: the legacy app stores the entire LIST as a single flat
    // "opengis:all_layers" group (every layer keyed by name with its global
    // drawIndex). We mirror that exact format so saves are interoperable in
    // BOTH directions — legacy can read new-app LIST saves and vice versa.
    const listSave: Record<string, unknown> = {};
    const allLayersGroup = currentListGroups.find((g) => g.value === "all_layers");
    if (allLayersGroup) {
      const savedLayers: Record<string, unknown> = {};
      allLayersGroup.layers.forEach((layer) => {
        savedLayers[layer.name] = {
          name: layer.name,
          visible: layer.visible,
          opacity: layer.opacity,
          index: layer.drawIndex,
        };
      });
      listSave["opengis:all_layers"] = {
        name: "All Layers",
        value: "opengis:all_layers",
        label: "All Layers",
        defaultGroup: false,
        visibleLayers: allLayersGroup.visibleLayers,
        panelOpen: true,
        wmsGroupUrl: "",
        customRestUrl: allLayersGroup.customRestUrl,
        prefix: "",
        layers: savedLayers,
      };
    }

    // FOLDER view: keyed by real config group values (matches legacy folder format).
    const folderSave = buildSaveData(currentFolderGroups);
    saveSharedItem("Layers", listSave);
    saveSharedItem("Layers_Folder_View", folderSave);

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
      layers: group.layers.map((layer) => ({
        ...layer,
        legendObj: layer.legendObj as LegendObject | undefined,
      })),
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

    if (!visible) {
      // Turning layers off never requires disclaimer acceptance.
      group.layers.forEach((layer) => {
        updateLayerVisibilityById(layer.id, false);
      });
      return;
    }

    // Turning layers on: process each layer sequentially so disclaimer modals
    // are shown one at a time and accepted layers are toggled immediately.
    let index = 0;

    const processNext = () => {
      if (index >= group.layers.length) return;
      const layer = group.layers[index];
      index++;

      if (!acceptDisclaimer(layer, processNextWithCurrentLayer)) {
        // Modal is open; it will call back into processNext once accepted.
        return;
      }

      updateLayerVisibilityById(layer.id, true);
      processNext();
    };

    const processNextWithCurrentLayer = () => {
      const currentLayer = group.layers[index - 1];
      if (currentLayer) {
        updateLayerVisibilityById(currentLayer.id, true);
      }
      processNext();
    };

    processNext();
  };

  const handleGroupFolderToggle = (_groupValue: string, _isOpen: boolean) => {
    // Handle group folder expand/collapse - placeholder for future state management
  };

  // Handle URL parameters for TOC type, group, and layers
  const handleURLParameters = useCallback(() => {
    const params = useAppStore.getState().urlParameters;
    const tocTypeParam = params.TOCTYPE;
    const urlGroupName = params.GROUP;
    const urlVisibleLayers = params.LAYERS;
    const urlExpandLegend = params.EXPAND_LEGEND;

    if (!tocTypeParam && !urlGroupName && !urlVisibleLayers && !urlExpandLegend) {
      return;
    }

    // Read fresh TOC state to avoid stale closures when this is called from
    // the async initialization sequence.
    const tocState = useTOCStore.getState();
    let effectiveTocType = tocState.tocType;

    // Handle TOCTYPE parameter
    if (tocTypeParam !== null && tocTypeParam !== undefined) {
      const validTocTypes = ["LIST", "FOLDER"];
      const upperCaseType = tocTypeParam.toUpperCase();

      if (validTocTypes.includes(upperCaseType)) {
        effectiveTocType = upperCaseType as "LIST" | "FOLDER";
        if (effectiveTocType !== tocState.tocType) {
          setTocType(effectiveTocType);
        }
      }
    }

    if (!urlGroupName && !urlVisibleLayers && !urlExpandLegend) {
      return;
    }

    // Get the current layer groups based on the effective TOC type
    const currentGroups = effectiveTocType === "LIST" ? tocState.layerListGroups : tocState.layerFolderGroups;
    if (currentGroups.length === 0) return;

    // In LIST view, determine the single active group. In FOLDER view, all
    // groups are visible and GROUP is ignored.
    let targetGroup: TOCLayerGroup | null = null;
    if (effectiveTocType === "LIST") {
      if (urlGroupName) {
        targetGroup = currentGroups.find((group) => group.label === urlGroupName || group.value === urlGroupName) || null;
      }

      if (!targetGroup) {
        targetGroup = tocState.selectedGroup || currentGroups.find((g) => g.defaultGroup) || currentGroups[0];
      }

      if (targetGroup) {
        setSelectedGroup(targetGroup);
      }
    }

    // Handle visible layers if specified
    if (urlVisibleLayers) {
      const layersUrlKey = `${effectiveTocType}|${urlGroupName ?? ""}|${urlVisibleLayers}`;
      if (layersProcessedForUrlRef.current !== layersUrlKey) {
        const visibleLayerNames = urlVisibleLayers.split(",").map((name) => name.trim());
        const batchUpdates: Array<{ layerId: string; visible: boolean }> = [];
        const groupsToSearch = effectiveTocType === "FOLDER" ? currentGroups : targetGroup ? [targetGroup] : [];

        groupsToSearch.forEach((group) => {
          group.layers.forEach((layer) => {
            const shouldBeVisible = visibleLayerNames.includes(layer.tocDisplayName) || visibleLayerNames.includes(layer.name) || visibleLayerNames.includes(layer.displayName || layer.name);

            if (shouldBeVisible && !layer.visible && layer.disclaimer) {
              // URL-parameter activation for a layer with a disclaimer: show
              // the disclaimer modal and only turn the layer on if accepted.
              acceptDisclaimer(layer, () => {
                tocState.updateLayerVisibilityById(layer.id, true);
                tocState.syncActiveViewVisibilityToMap();
              });
              return;
            }

            if (shouldBeVisible !== layer.visible) {
              batchUpdates.push({ layerId: layer.id, visible: shouldBeVisible });
            }
          });
        });

        if (batchUpdates.length > 0) {
          tocState.updateLayerVisibilitiesBatch(batchUpdates);
        }

        // Push the active view's committed visibility onto the OpenLayers map.
        // This enforces LIST-view dedup winners and prevents stale OL state.
        tocState.syncActiveViewVisibilityToMap();

        layersProcessedForUrlRef.current = layersUrlKey;
      }
    }

    // Handle EXPAND_LEGEND parameter (only process once to avoid loops)
    if (urlExpandLegend && urlExpandLegend.toUpperCase() === "TRUE" && !expandLegendProcessedRef.current) {
      const groupsToExpand = effectiveTocType === "FOLDER" ? currentGroups : targetGroup ? [targetGroup] : [];

      groupsToExpand.forEach((group) => {
        group.layers.forEach((layer) => {
          if (!layer.showLegend) {
            tocState.toggleLayerLegendById(layer.id);
          }
        });
      });

      expandLegendProcessedRef.current = true;
    }
  }, [setTocType, setSelectedGroup]);

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
        globalOpacity={globalOpacity}
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
