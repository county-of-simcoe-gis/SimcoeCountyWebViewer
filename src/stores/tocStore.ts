import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { loadLayerGroupsFromSources } from "@/utils/tocHelpers";
import { LayerHelpers } from "@/utils/openlayers/LayerHelpers";
import { OL_DATA_TYPES } from "@/utils/openlayers/types";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import { useMapStore } from "@/stores/mapStore";
import { type LayerCategory, type ManagedLayer } from "@/stores/layerManagerStore";
import LayerOrderConfig from "@/utils/openlayers/LayerOrderConfig.json";
import { fetchWithAuth, isSecuredUrl } from "@/utils/auth";
import { useToastStore } from "@/hooks/useToast";

// Helper function to calculate z-index for a layer based on category and position
// Layers at the beginning of the array (index 0) should have HIGHER z-index (drawn on top)
// Layers at the end of the array should have LOWER z-index (drawn underneath)
export function calculateZIndex(category: LayerCategory, index: number): number {
  const categoryConfig = LayerOrderConfig.categories[category];
  if (!categoryConfig) {
    console.warn(`Unknown layer category: ${category}`);
    return 0;
  }

  // Calculate z-index in reverse: first item (index 0) gets max, last item gets min
  const zIndex = categoryConfig.zIndexRange.max - index;

  // Ensure we don't go below the min z-index for this category
  if (zIndex < categoryConfig.zIndexRange.min) {
    console.warn(`Z-index ${zIndex} is below minimum for category ${category} (${categoryConfig.zIndexRange.min})`);
    return categoryConfig.zIndexRange.min;
  }

  return zIndex;
}
import type { Layer } from "ol/layer";
// OpenLayers layer interface for type safety
interface OpenLayersLayer {
  setVisible: (visible: boolean) => void;
  getVisible: () => boolean;
  setOpacity: (opacity: number) => void;
  setProperties: (properties: Record<string, unknown>) => void;
}

// Layer interface based on the old app's layer structure
export interface TOCLayer {
  id: string; // Unique identifier for the layer
  name: string;
  displayName: string;
  tocDisplayName: string;
  styleUrl: string;
  height: number;
  drawIndex: number;
  index: number;
  initialDrawIndex: number; // Preserves the original sort order from the server
  showLegend: boolean;
  legendHeight: number;
  legendImage: string | null;
  legendObj: unknown | null;
  legendFetching?: boolean; // Flag to prevent duplicate legend fetches
  visible: boolean;
  layer: unknown | null; // OpenLayers layer object
  managedLayerId?: string; // ID from LayerManager for proper layer management
  metadataUrl: string | null;
  opacity: number;
  minScale: number;
  maxScale: number;
  liveLayer: boolean;
  isQueryable?: boolean; // Queryable by default for identify functionality
  groupName: string;
  group: string;
  userLayer: boolean;
  secured?: boolean;
  canDownload?: boolean;
  hasAttachments?: boolean;
  disclaimer?: string;
  infoFormat?: string; // INFO_FORMAT for WMS GetFeatureInfo requests (e.g., text/plain, text/html)
  xslTemplate?: string; // XSL template URL for transforming identify results
  extendedProperties?: { keywords: Record<string, unknown> }; // Parsed GeoServer keywords (e.g. SAR, CATEGORY)
  wfsUrl?: string; // WFS query URL template for this layer
  serverUrl?: string; // Base GeoServer URL for this layer
}

// Layer group interface based on the old app's group structure
export interface TOCLayerGroup {
  value: string;
  label: string;
  defaultGroup: boolean;
  url: string;
  prefix: string;
  visibleLayers: string[];
  wmsGroupUrl: string;
  customRestUrl: string;
  layers: TOCLayer[];
  primary?: boolean;
  secured?: boolean;
  panelOpen?: boolean; // Track if the group panel is open in the UI
  useRedFolder?: boolean; // Use red folder icons instead of default gray
  sourceOpen?: boolean; // Whether the source folder should be initially expanded
}

// Configuration for TOC sources from config.json
export interface TOCSource {
  group?: {
    name: string;
    displayName: string;
    visibleLayers: string[];
  };
  layerUrl: string;
  secure: boolean;
  primary: boolean;
  urlType: string;
  type: string;
  useRedFolder?: boolean;
  open?: boolean;
}

interface TOCState {
  // TOC Type (LIST or FOLDER)
  tocType: "LIST" | "FOLDER";

  // Layer groups for both views
  layerListGroups: TOCLayerGroup[];
  layerFolderGroups: TOCLayerGroup[];

  // All layers flattened for search/filtering
  allLayers: TOCLayer[];

  // Currently selected group
  selectedGroup: TOCLayerGroup | null;
  defaultGroup: TOCLayerGroup | null;

  // View state persistence
  lastSelectedListGroup: TOCLayerGroup | null;
  folderOpenStates: Record<string, boolean>;

  // Layer visibility state per group for category switching
  groupLayerVisibilityStates: Record<string, Record<string, boolean>>;

  // Search and filtering
  searchText: string;
  sortAlpha: boolean;

  // Loading state
  isLoading: boolean;

  // Layer count
  layerCount: number;

  // Configuration
  helpLink: string;
  sources: TOCSource[];

  // Actions
  setTocType: (type: "LIST" | "FOLDER") => void;
  setLayerGroups: (type: "LIST" | "FOLDER", groups: TOCLayerGroup[]) => void;
  setSelectedGroup: (group: TOCLayerGroup | null) => void;
  setDefaultGroup: (group: TOCLayerGroup | null) => void;
  setFolderOpenState: (groupValue: string, isOpen: boolean) => void;
  getFolderOpenState: (groupValue: string) => boolean;
  setSearchText: (text: string) => void;
  setSortAlpha: (sort: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setLayerCount: (count: number) => void;
  setHelpLink: (link: string) => void;
  setSources: (sources: TOCSource[]) => void;

  // Group switching with layer visibility management
  switchToGroup: (group: TOCLayerGroup) => void;
  saveGroupLayerStates: (group: TOCLayerGroup) => void;
  restoreGroupLayerStates: (group: TOCLayerGroup) => void;

  // Layer manipulation
  updateLayerVisibility: (layerName: string, groupName: string, visible: boolean) => void;
  updateLayerVisibilityById: (layerId: string, visible: boolean) => void;
  updateLayerOpacity: (layerName: string, groupName: string, opacity: number) => void;
  updateLayerOpacityById: (layerId: string, opacity: number) => void;
  toggleLayerLegend: (layerName: string, groupName: string) => void;
  toggleLayerLegendById: (layerId: string) => void;
  moveLayer: (groupName: string, oldIndex: number, newIndex: number) => void;

  // Group manipulation
  addCustomLayer: (layer: TOCLayer, groupName: string) => void;
  removeCustomLayer: (layerName: string, groupName: string, layerId?: string) => void;

  // Utility functions
  getLayerByName: (layerName: string, groupName?: string) => TOCLayer | null;
  getLayerById: (layerId: string) => TOCLayer | null;
  getGroupByName: (groupName: string) => TOCLayerGroup | null;
  getAllVisibleLayers: () => TOCLayer[];
  getFilteredLayers: (groupName: string, searchText: string) => TOCLayer[];

  // Initialization
  initializeFromConfig: (config: {
    toc: {
      tocType: string;
      sources: TOCSource[];
      helpLink: string;
      default_group: string;
    };
  }) => void;

  // Layer loading
  loadLayersFromSources: () => Promise<void>;
  refreshTOC: (isReset?: boolean) => Promise<void>;

  // Legend fetching
  fetchLayerLegend: (layer: TOCLayer, group: TOCLayerGroup) => Promise<void>;
  fetchLayerLegendFromRest: (layer: TOCLayer, group: TOCLayerGroup) => Promise<void>;

  // Auto-fetch all legends asynchronously after initial load
  autoFetchAllLegends: () => void;

  // Utility function to check if a legend is blank/empty
  isLegendBlank: (layer: TOCLayer) => boolean;

  // Debug helpers
  debugGroupSwitching: () => void;

  // Initialize OpenLayers layers for all TOC layers
  initializeOpenLayersLayers: () => void;

  // Alphabetical sorting
  sortLayersAlphabetically: () => void;
  updateLayerManagerZIndices: () => void;

  // Global opacity delegation to LayerManager
  setGlobalOpacity: (opacity: number) => void;
  getGlobalOpacity: () => number;
}

/**
 * Helper: update a layer's properties across BOTH view types (LIST and FOLDER)
 * and the allLayers array. Call inside an immer set() callback with the draft.
 * This ensures legend/showLegend data is never lost when switching views.
 *
 * Uses forEach (not find) so that ALL occurrences of the layer are updated —
 * in folder view the same layer can appear in more than one folder group,
 * and allLayers may contain duplicate entries for such layers.
 */
function updateLayerInAllViews(draft: TOCState, layerName: string, updater: (layer: TOCLayer) => void) {
  [draft.layerListGroups, draft.layerFolderGroups].forEach((groups) => {
    groups.forEach((g) => {
      g.layers.forEach((l) => {
        if (l.name === layerName) updater(l);
      });
    });
  });
  draft.allLayers.forEach((l) => {
    if (l.name === layerName) updater(l);
  });
}

export const useTOCStore = create<TOCState>()(
  immer((set, get) => ({
    // Initial state
    tocType: "LIST",
    layerListGroups: [],
    layerFolderGroups: [],
    allLayers: [],
    selectedGroup: null,
    defaultGroup: null,
    lastSelectedListGroup: null,
    folderOpenStates: {},
    groupLayerVisibilityStates: {},
    searchText: "",
    sortAlpha: false,
    isLoading: false,
    layerCount: 0,
    helpLink: "",
    sources: [],

    // Actions
    setTocType: (type) => {
      set((state) => {
        const previousType = state.tocType;

        // Save current state when leaving LIST view
        if (previousType === "LIST" && state.selectedGroup) {
          state.lastSelectedListGroup = state.selectedGroup;
        }

        state.tocType = type;

        // When switching to LIST view, restore last selected group or default to "All Layers"
        if (type === "LIST" && state.layerListGroups.length > 0) {
          if (state.lastSelectedListGroup) {
            // Try to find the same group in current groups
            const restoredGroup = state.layerListGroups.find((g) => g.value === state.lastSelectedListGroup!.value || g.label === state.lastSelectedListGroup!.label);
            state.selectedGroup = restoredGroup || state.lastSelectedListGroup;
          } else {
            // Default to "All Layers" group if no previous selection
            const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");
            if (allLayersGroup) {
              state.selectedGroup = allLayersGroup;
            }
          }
        }
        // When switching to FOLDER view, clear selected group to show all groups
        else if (type === "FOLDER") {
          state.selectedGroup = null;
        }
      });
    },

    setLayerGroups: (type, groups) => {
      set((state) => {
        if (type === "LIST") {
          // For LIST view, create an "All Layers" group that contains all layers flattened
          const allLayers: TOCLayer[] = [];
          // Use tocDisplayName for dedup to match mergeGroups() duplicate detection
          const seenLayers = new Map<string, number>();

          groups.forEach((group) => {
            group.layers.forEach((layer) => {
              const key = layer.tocDisplayName;
              const existingIndex = seenLayers.get(key);

              if (existingIndex !== undefined) {
                // Duplicate found — apply same priority logic as mergeGroups:
                // prefer secured/primary layers over non-primary
                const existingLayer = allLayers[existingIndex];
                const existingGroup = groups.find((g) => g.value === existingLayer.group || g.label === existingLayer.groupName);
                if ((layer.secured || group.primary) && !existingGroup?.primary) {
                  // Incoming layer wins — keep its entry in the All Layers group
                  // Do NOT remove the OL layer here; initializeOpenLayersLayers() manages
                  // shared OL layers across groups and removing one would break all references.
                  allLayers[existingIndex] = { ...layer };
                } else {
                  // Existing layer wins — skip the incoming duplicate
                  // Do NOT remove the OL layer; it may be shared across groups.
                }
              } else {
                seenLayers.set(key, allLayers.length);
                // Create a copy of the layer to avoid mutating the original group's layer
                allLayers.push({ ...layer });
              }
            });
          });

          // Sort by initialDrawIndex (descending) within each group to maintain relative order
          // Primary groups come first, then sort by group value, then by initialDrawIndex
          allLayers.sort((a, b) => {
            // First, sort by group priority (primary groups first)
            const groupA = groups.find((g) => g.value === a.group || g.label === a.groupName);
            const groupB = groups.find((g) => g.value === b.group || g.label === b.groupName);

            if (groupA?.primary && !groupB?.primary) return -1;
            if (!groupA?.primary && groupB?.primary) return 1;

            // Then sort by group name to keep groups together
            const groupCompare = (a.groupName || a.group).localeCompare(b.groupName || b.group);
            if (groupCompare !== 0) return groupCompare;

            // Finally, within the same group, sort by initialDrawIndex (descending)
            return b.initialDrawIndex - a.initialDrawIndex;
          });

          // Now set a consistent initialDrawIndex for the "All Layers" view
          // This preserves the flattened order as the "initial order" for this group
          let allLayersIndex = allLayers.length;
          allLayers.forEach((layer) => {
            allLayersIndex--;
            layer.initialDrawIndex = allLayersIndex;
            layer.drawIndex = allLayersIndex;
            layer.index = allLayersIndex;
          });

          // Create the special "All Layers" group
          const allLayersGroup: TOCLayerGroup = {
            value: "all_layers",
            label: "All Layers",
            defaultGroup: true,
            url: "",
            prefix: "",
            visibleLayers: [],
            wmsGroupUrl: "",
            customRestUrl: "",
            layers: allLayers,
          };

          // Set layerListGroups with All Layers first, then individual groups
          state.layerListGroups = [allLayersGroup, ...groups];
        } else {
          state.layerFolderGroups = groups;
        }

        // Update all layers and layer count
        const allLayers: TOCLayer[] = [];
        groups.forEach((group) => {
          allLayers.push(...group.layers);
        });
        state.allLayers = allLayers;
        state.layerCount = allLayers.length;
      });
    },

    setSelectedGroup: (group) => {
      set((state) => {
        state.selectedGroup = group;
      });
    },

    setDefaultGroup: (group) => {
      set((state) => {
        state.defaultGroup = group;
        if (!state.selectedGroup) {
          // For LIST view, default to "All Layers" group if it exists
          if (state.tocType === "LIST" && state.layerListGroups.length > 0) {
            const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");
            state.selectedGroup = allLayersGroup || group;
          } else {
            state.selectedGroup = group;
          }
        }
      });
    },

    setSearchText: (text) => {
      set((state) => {
        state.searchText = text;
      });
    },

    setSortAlpha: (sort) => {
      set((state) => {
        state.sortAlpha = sort;

        // Sort layers in all groups
        const currentGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;

        if (sort) {
          // Sort alphabetically - create new sorted arrays to trigger React updates
          currentGroups.forEach((group) => {
            group.layers = [...group.layers].sort((a, b) => a.tocDisplayName.localeCompare(b.tocDisplayName));
          });
        } else {
          // Return to initial sort order using initialDrawIndex when turning off alphabetical sort
          currentGroups.forEach((group) => {
            group.layers = [...group.layers].sort((a, b) => b.initialDrawIndex - a.initialDrawIndex);
          });
        }

        // Update selectedGroup reference to trigger React re-render
        if (state.selectedGroup) {
          const updatedGroup = currentGroups.find((g) => g.value === state.selectedGroup!.value || g.label === state.selectedGroup!.label);
          if (updatedGroup) {
            state.selectedGroup = updatedGroup;
          }
        }
      });

      // Update LayerManager z-indices to match the new TOC order (outside of set)
      const state = get();
      state.updateLayerManagerZIndices();
    },

    sortLayersAlphabetically: () => {
      set((state) => {
        state.sortAlpha = true;

        // Sort layers in all groups alphabetically - create new sorted arrays to trigger React updates
        const currentGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
        currentGroups.forEach((group) => {
          group.layers = [...group.layers].sort((a, b) => a.tocDisplayName.localeCompare(b.tocDisplayName));
        });

        // Update selectedGroup reference to trigger React re-render
        if (state.selectedGroup) {
          const updatedGroup = currentGroups.find((g) => g.value === state.selectedGroup!.value || g.label === state.selectedGroup!.label);
          if (updatedGroup) {
            state.selectedGroup = updatedGroup;
          }
        }
      });

      // Update LayerManager z-indices to match the sorted TOC order (outside of set)
      const state = get();
      state.updateLayerManagerZIndices();
    },

    // Helper function to update LayerManager z-indices to match TOC order
    updateLayerManagerZIndices: () => {
      // Get current TOC state to access current groups
      const tocState = get();

      // Use LayerManager to reorder TOC layers to match current TOC order
      const layerManagerState = useLayerManagerStore.getState();

      // Get all TOC layers currently in the LayerManager
      const tocLayers = layerManagerState.getLayersByCategory("TOC");

      // Create a mapping of layer names to managed layers for quick lookup
      const tocLayersMap = new Map<string, ManagedLayer>();
      tocLayers.forEach((managedLayer) => {
        // Use the layer's name property from OpenLayers properties if available
        const layerProperties = (managedLayer.layer as unknown as { getProperties?: () => Record<string, unknown> }).getProperties?.();
        const layerName = (typeof layerProperties?.name === "string" ? layerProperties.name : undefined) || managedLayer.name;
        if (layerName) {
          tocLayersMap.set(layerName, managedLayer);
        }
      });

      // If we have TOC layers, reorder them based on the current TOC order
      if (tocLayersMap.size > 0) {
        useLayerManagerStore.setState((draft) => {
          // Create new order for TOC layers based on current TOC layer order
          const reorderedTocLayers: ManagedLayer[] = [];

          // For LIST view, use the "All Layers" group if it exists (which has all unique layers)
          // For FOLDER view, process all groups
          let layersToProcess: TOCLayer[] = [];

          if (tocState.tocType === "LIST") {
            // Find the "All Layers" group which contains all unique layers in the correct order
            const allLayersGroup = tocState.layerListGroups.find((g) => g.value === "all_layers");
            if (allLayersGroup) {
              layersToProcess = allLayersGroup.layers;
            } else {
              // Fallback: collect unique layers from all groups
              const seenLayerNames = new Set<string>();
              tocState.layerListGroups.forEach((group) => {
                group.layers.forEach((layer) => {
                  if (!seenLayerNames.has(layer.name)) {
                    seenLayerNames.add(layer.name);
                    layersToProcess.push(layer);
                  }
                });
              });
            }
          } else {
            // FOLDER view: collect unique layers from all groups in order
            const seenLayerNames = new Set<string>();
            tocState.layerFolderGroups.forEach((group) => {
              group.layers.forEach((layer) => {
                if (!seenLayerNames.has(layer.name)) {
                  seenLayerNames.add(layer.name);
                  layersToProcess.push(layer);
                }
              });
            });
          }

          // Order the layers based on the processed list
          layersToProcess.forEach((tocLayer) => {
            const managedLayer = tocLayersMap.get(tocLayer.name);
            if (managedLayer) {
              reorderedTocLayers.push(managedLayer);
            }
          });

          // Update the layerManager store with the new order
          if (reorderedTocLayers.length > 0) {
            // Update z-indices on the reordered layers before assigning to draft
            const updatedLayers = reorderedTocLayers.map((layer, idx) => {
              const newZIndex = calculateZIndex("TOC", idx);
              // Create a new object with updated z-index to ensure Immer can track changes
              return {
                ...layer,
                zIndex: newZIndex,
              };
            });

            draft.layers.TOC = updatedLayers;

            // Update the actual OpenLayers layer z-indices
            updatedLayers.forEach((layer, idx) => {
              const newZIndex = calculateZIndex("TOC", idx);
              layer.layer.setZIndex(newZIndex);
            });

            // Update next available z-index
            draft.nextZIndex.TOC = calculateZIndex("TOC", updatedLayers.length);
          }
        });
      }
    },

    setIsLoading: (loading) => {
      set((state) => {
        state.isLoading = loading;
      });
    },

    setLayerCount: (count) => {
      set((state) => {
        state.layerCount = count;
      });
    },

    setHelpLink: (link) => {
      set((state) => {
        state.helpLink = link;
      });
    },

    setSources: (sources) => {
      set((state) => {
        state.sources = sources;
      });
    },

    setFolderOpenState: (groupValue, isOpen) => {
      set((state) => {
        state.folderOpenStates[groupValue] = isOpen;
      });
    },

    getFolderOpenState: (groupValue) => {
      const state = get();
      return state.folderOpenStates[groupValue] ?? false; // Default to closed, matching old app behavior
    },

    // Group switching with layer visibility management
    switchToGroup: (group) => {
      set((state) => {
        const currentGroup = state.selectedGroup;

        // Save current group's layer states if there is one
        if (currentGroup) {
          state.saveGroupLayerStates(currentGroup);
        }

        // Set the new selected group
        state.selectedGroup = group;

        // Restore the new group's layer states
        state.restoreGroupLayerStates(group);
      });
    },

    saveGroupLayerStates: (group) => {
      set((state) => {
        const groupStates: Record<string, boolean> = {};
        const isAllLayersGroup = group.value === "all_layers";

        if (isAllLayersGroup) {
          // For "All Layers" group, save visibility state for ALL layers
          state.allLayers.forEach((layer) => {
            groupStates[layer.id] = layer.visible;
          });
        } else {
          // For specific groups, save visibility state for layers in this group only
          group.layers.forEach((layer) => {
            const allLayerItem = state.allLayers.find((l) => l.id === layer.id);
            if (allLayerItem) {
              groupStates[layer.id] = allLayerItem.visible;
            } else {
              // Fallback to group layer if not found in allLayers
              groupStates[layer.id] = layer.visible;
            }
          });
        }

        state.groupLayerVisibilityStates[group.value] = groupStates;
      });
    },

    restoreGroupLayerStates: (group) => {
      const state = get();
      const savedStates = state.groupLayerVisibilityStates[group.value];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const currentGroupLayerIds = new Set(group.layers.map((l) => l.id));

      // Special handling for "All Layers" group
      const isAllLayersGroup = group.value === "all_layers";

      // Update TOC store state
      set((state) => {
        // Helper function to update layer visibility across all views
        const updateLayerVisibility = (layerId: string, visible: boolean) => {
          // Update in allLayers array
          const allLayerItem = state.allLayers.find((l) => l.id === layerId);
          if (allLayerItem) {
            allLayerItem.visible = visible;
          }

          // Update in layerListGroups
          state.layerListGroups.forEach((listGroup) => {
            const layer = listGroup.layers.find((l) => l.id === layerId);
            if (layer) {
              layer.visible = visible;
            }
          });

          // Update in layerFolderGroups
          state.layerFolderGroups.forEach((folderGroup) => {
            const layer = folderGroup.layers.find((l) => l.id === layerId);
            if (layer) {
              layer.visible = visible;
            }
          });
        };

        if (isAllLayersGroup) {
          // For "All Layers" group, restore all previously saved states or show all layers

          if (savedStates) {
            // Restore saved states for all layers that have them
            Object.keys(savedStates).forEach((layerId) => {
              const shouldBeVisible = savedStates[layerId];
              updateLayerVisibility(layerId, shouldBeVisible);
            });
          } else {
            // No saved states for "All Layers" - this shouldn't normally happen, but handle gracefully
          }
        } else {
          // For specific groups, hide all layers first, then show only group layers

          // Create a set of layer names in this group for efficient lookup
          const currentGroupLayerNames = new Set(group.layers.map((l) => l.name));

          // First, hide ALL layers that are not in this group (by name, not ID)
          state.allLayers.forEach((layer) => {
            if (!currentGroupLayerNames.has(layer.name)) {
              updateLayerVisibility(layer.id, false);
            }
          });

          if (savedStates) {
            // Restore saved states for layers in this group
            group.layers.forEach((layer) => {
              if (savedStates.hasOwnProperty(layer.id)) {
                const shouldBeVisible = savedStates[layer.id];
                updateLayerVisibility(layer.id, shouldBeVisible);
              } else {
                // Layer doesn't have saved state, keep its current visibility if it was visible
                const currentVisibility = layer.visible;
                updateLayerVisibility(layer.id, currentVisibility);
              }
            });
          } else {
            // No saved states for this group, keep current visibility for layers in this group
            group.layers.forEach((layer) => {
              const currentVisibility = layer.visible;
              updateLayerVisibility(layer.id, currentVisibility);
            });
          }
        }
      });

      // Update OpenLayers layer visibility via LayerManager after state update
      const currentState = get();

      if (isAllLayersGroup) {
        // For "All Layers", update all layers based on their current visibility state
        // Use a Set to track which layers we've already updated to avoid duplicates
        const updatedLayers = new Set<string>();

        currentState.allLayers.forEach((layer) => {
          // Only update each unique layer name once (since they share OpenLayers layers)
          if (!updatedLayers.has(layer.name)) {
            updatedLayers.add(layer.name);

            if (layer.managedLayerId) {
              LayerManager.setLayerVisibility(layer.managedLayerId, layer.visible);
            } else if (layer.layer) {
              (layer.layer as OpenLayersLayer).setVisible(layer.visible);
            }
          }
        });
      } else {
        // For specific groups, update all layers (hide non-group, show/hide group layers based on state)
        // Use a Set to track which layers we've already updated to avoid duplicates
        const updatedLayers = new Set<string>();
        const currentGroupLayerNames = new Set(group.layers.map((l) => l.name));

        currentState.allLayers.forEach((layer) => {
          // Only update each unique layer name once (since they share OpenLayers layers)
          if (!updatedLayers.has(layer.name)) {
            updatedLayers.add(layer.name);

            // Check if this layer name exists in the current group
            const shouldBeVisible = currentGroupLayerNames.has(layer.name) ? layer.visible : false;

            if (layer.managedLayerId) {
              LayerManager.setLayerVisibility(layer.managedLayerId, shouldBeVisible);
            } else if (layer.layer) {
              (layer.layer as OpenLayersLayer).setVisible(shouldBeVisible);
            }
          }
        });
      }
    },

    // Layer manipulation
    updateLayerVisibility: (layerName, groupName, visible) => {
      // Track the managed layer ID for the OL layer update AFTER the store commit
      let managedLayerIdForOL: string | undefined;
      let olLayerDirect: OpenLayersLayer | undefined;

      set((state) => {
        // Update layer in ALL views - both LIST and FOLDER groups
        const updateLayerInGroups = (groups: TOCLayerGroup[], viewType: string) => {
          const group = groups.find((g) => g.label === groupName || g.value === groupName);
          if (group) {
            const layer = group.layers.find((l) => l.name === layerName);
            if (layer) {
              layer.visible = visible;

              // Capture the OL layer info for update AFTER set() completes
              // (avoids cross-store updates inside immer set that cause React 19 errors)
              if (layer.layer && viewType === "PRIMARY") {
                if (layer.managedLayerId) {
                  managedLayerIdForOL = layer.managedLayerId;
                } else {
                  olLayerDirect = layer.layer as OpenLayersLayer;
                }
              }

              return true; // Layer found and updated
            }
          }
          return false; // Layer not found in this view
        };

        // Update in current view first (to capture OL layer info)
        const currentGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
        const foundInCurrent = updateLayerInGroups(currentGroups, "PRIMARY");

        // Update in opposite view
        const oppositeGroups = state.tocType === "LIST" ? state.layerFolderGroups : state.layerListGroups;
        const foundInOpposite = updateLayerInGroups(oppositeGroups, "SECONDARY");

        // Sync within LIST view groups (All Layers + individual groups)
        if (state.tocType === "LIST") {
          state.layerListGroups.forEach((otherGroup) => {
            if (otherGroup.label !== groupName && otherGroup.value !== groupName) {
              const sameLayer = otherGroup.layers.find((l) => l.name === layerName);
              if (sameLayer) {
                sameLayer.visible = visible;
              }
            }
          });
        }

        // Also sync the opposite view's groups if we're in FOLDER view
        else if (state.tocType === "FOLDER") {
          state.layerListGroups.forEach((listGroup) => {
            const sameLayer = listGroup.layers.find((l) => l.name === layerName);
            if (sameLayer) {
              sameLayer.visible = visible;
            }
          });
        }

        // Update the allLayers array to keep it in sync
        const allLayerItem = state.allLayers.find((l) => l.name === layerName);
        if (allLayerItem) {
          allLayerItem.visible = visible;
        }

        if (!foundInCurrent && !foundInOpposite) {
          console.warn(`⚠️ Layer ${layerName} not found in group ${groupName} in any view`);
        }
      });

      // Update OpenLayers layer visibility AFTER set() completes to avoid
      // cross-store updates inside immer that trigger React 19 commit errors
      if (managedLayerIdForOL) {
        LayerManager.setLayerVisibility(managedLayerIdForOL, visible);
      } else if (olLayerDirect) {
        olLayerDirect.setVisible(visible);
      }
    },

    updateLayerOpacity: (layerName, groupName, opacity) => {
      set((state) => {
        const groups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
        const group = groups.find((g) => g.label === groupName || g.value === groupName);
        if (group) {
          const layer = group.layers.find((l) => l.name === layerName);
          if (layer) {
            layer.opacity = opacity;
            if (layer.layer && layer.visible) {
              // Apply to OpenLayers layer when available
              // layer.layer.setOpacity(opacity * state.globalOpacity)
            }
          }
        }
      });
    },

    // Update layer visibility by unique ID - handles duplicate layer names correctly
    updateLayerVisibilityById: (layerId, visible) => {
      const state = get();
      const targetLayer = state.allLayers.find((l) => l.id === layerId);

      if (!targetLayer) {
        console.warn(`⚠️ Layer with ID ${layerId} not found`);
        return;
      }

      // Update TOC store state in all views
      set((state) => {
        const updateLayerInAllGroups = (groups: TOCLayerGroup[]) => {
          groups.forEach((group) => {
            const layer = group.layers.find((l) => l.id === layerId);
            if (layer) {
              layer.visible = visible;
            }
          });
        };

        updateLayerInAllGroups(state.layerListGroups);
        updateLayerInAllGroups(state.layerFolderGroups);

        const allLayerItem = state.allLayers.find((l) => l.id === layerId);
        if (allLayerItem) {
          allLayerItem.visible = visible;
        }
      });

      // Handle OpenLayers layer visibility
      if (targetLayer.managedLayerId) {
        LayerManager.setLayerVisibility(targetLayer.managedLayerId, visible);
      } else if (targetLayer.layer) {
        (targetLayer.layer as OpenLayersLayer).setVisible(visible);
      }
    },

    // Update layer opacity by unique ID
    updateLayerOpacityById: (layerId, opacity) => {
      const state = get();
      const targetLayer = state.allLayers.find((l) => l.id === layerId);

      if (!targetLayer) {
        console.warn(`⚠️ Layer with ID ${layerId} not found`);
        return;
      }

      // Update TOC store state
      set((state) => {
        // Update opacity in ALL views
        const updateLayerInAllGroups = (groups: TOCLayerGroup[]) => {
          groups.forEach((group) => {
            const layer = group.layers.find((l) => l.id === layerId);
            if (layer) {
              layer.opacity = opacity;
            }
          });
        };

        updateLayerInAllGroups(state.layerListGroups);
        updateLayerInAllGroups(state.layerFolderGroups);

        const allLayerItem = state.allLayers.find((l) => l.id === layerId);
        if (allLayerItem) {
          allLayerItem.opacity = opacity;
        }
      });

      // Use LayerManager to handle OpenLayers layer opacity
      if (targetLayer.managedLayerId) {
        useLayerManagerStore.getState().updateLayerOpacity(targetLayer.managedLayerId, opacity);
      } else if (targetLayer.layer) {
        // LayerManager handles global opacity, so we only set the individual layer opacity
        (targetLayer.layer as OpenLayersLayer).setOpacity(opacity);
      }
    },

    toggleLayerLegend: (layerName, groupName) => {
      const state = get();
      const groups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
      const group = groups.find((g) => g.label === groupName || g.value === groupName);

      if (group) {
        const layer = group.layers.find((l) => l.name === layerName);
        if (layer) {
          const shouldShow = !layer.showLegend;

          // Update the showLegend state in BOTH view types
          set((draft) => {
            updateLayerInAllViews(draft, layerName, (l) => {
              l.showLegend = shouldShow;
            });
          });

          // If showing legend and no legend data exists, fetch it (outside of set)
          if (shouldShow && !layer.legendImage && !layer.legendObj && !layer.legendFetching && layer.styleUrl) {
            state.fetchLayerLegend(layer, group);
          } else if (shouldShow && !layer.legendImage && !layer.legendObj && !layer.legendFetching && !layer.styleUrl) {
            state.fetchLayerLegendFromRest(layer, group);
          }
        }
      }
    },

    // Toggle layer legend by unique ID
    toggleLayerLegendById: (layerId) => {
      const state = get();
      const targetLayer = state.allLayers.find((l) => l.id === layerId);

      if (!targetLayer) {
        console.warn(`⚠️ Layer with ID ${layerId} not found`);
        return;
      }

      const shouldShow = !targetLayer.showLegend;

      // Update the showLegend state in all views
      set((state) => {
        const updateLayerInAllGroups = (groups: TOCLayerGroup[]) => {
          groups.forEach((group) => {
            const layer = group.layers.find((l) => l.id === layerId);
            if (layer) {
              layer.showLegend = shouldShow;
            }
          });
        };

        updateLayerInAllGroups(state.layerListGroups);
        updateLayerInAllGroups(state.layerFolderGroups);

        // Update allLayers array
        const allLayerItem = state.allLayers.find((l) => l.id === layerId);
        if (allLayerItem) {
          allLayerItem.showLegend = shouldShow;
        }
      });

      // If showing legend and no legend data exists, fetch it
      if (shouldShow && !targetLayer.legendImage && !targetLayer.legendObj && !targetLayer.legendFetching && targetLayer.styleUrl) {
        // Find the group to pass to fetchLayerLegend
        const group = state.layerListGroups.find((g) => g.layers.some((l) => l.id === layerId)) || state.layerFolderGroups.find((g) => g.layers.some((l) => l.id === layerId));
        if (group) {
          state.fetchLayerLegend(targetLayer, group);
        }
      } else if (shouldShow && !targetLayer.legendImage && !targetLayer.legendObj && !targetLayer.legendFetching && !targetLayer.styleUrl) {
        // Find the group to pass to fetchLayerLegendFromRest
        const group = state.layerListGroups.find((g) => g.layers.some((l) => l.id === layerId)) || state.layerFolderGroups.find((g) => g.layers.some((l) => l.id === layerId));
        if (group) {
          state.fetchLayerLegendFromRest(targetLayer, group);
        }
      }
    },

    moveLayer: (groupName, oldIndex, newIndex) => {
      set((state) => {
        const groups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
        const group = groups.find((g) => g.label === groupName || g.value === groupName);
        if (group && !state.sortAlpha) {
          const layers = group.layers;
          const movedLayer = layers.splice(oldIndex, 1)[0];
          layers.splice(newIndex, 0, movedLayer);

          // Update draw indices (but not initialDrawIndex - that preserves original order)
          layers.forEach((layer, index) => {
            layer.drawIndex = index;
            layer.index = index;
          });
        }
      });

      // Update LayerManager to match the new TOC order
      const state = get();
      state.updateLayerManagerZIndices();
    },

    addCustomLayer: (layer, groupName) => {
      // Get the OpenLayers layer from the TOCLayer object
      const olLayer = layer.layer as Layer;

      if (olLayer) {
        // New custom layers should always go at the top (index 0)
        const drawIndex = 0;

        // Add to map using LayerManager - THIS IS THE CRITICAL STEP
        const managedLayerId = LayerManager.addLayer(olLayer, "TOC", layer.name, {
          index: drawIndex,
          clickable: layer.liveLayer || layer.isQueryable || false,
          metadata: {
            groupName: groupName,
            userLayer: true,
            drawIndex: drawIndex,
          },
        });

        if (managedLayerId) {
          layer.managedLayerId = managedLayerId;
        } else {
          console.error("❌ Failed to add custom layer to map:", layer.name);
        }
      } else {
        console.error("❌ No OpenLayers layer object provided for custom layer:", layer.name);
      }

      set((state) => {
        // Add layer to BOTH LIST and FOLDER views so it's available when switching
        const addLayerToGroups = (groups: TOCLayerGroup[]) => {
          let group = groups.find((g) => g.label === groupName || g.value === groupName);

          if (!group) {
            // Create new group if it doesn't exist
            group = {
              value: groupName.toLowerCase().replace(/\s+/g, "_"),
              label: groupName,
              defaultGroup: false,
              url: "",
              prefix: "",
              visibleLayers: [],
              wmsGroupUrl: "",
              customRestUrl: "",
              layers: [],
            };
            groups.push(group);
          }

          // Check if layer already exists in this group (by id to handle duplicates)
          const existingLayer = group.layers.find((l) => l.id === layer.id);
          if (!existingLayer) {
            // Clone the layer for this view
            const layerClone = { ...layer };
            layerClone.groupName = groupName;
            layerClone.group = group.value;
            layerClone.drawIndex = 0; // New layers go at the top
            layerClone.index = 0;
            layerClone.initialDrawIndex = 0;

            // Add new layer at the beginning of the array (top of TOC)
            group.layers = [layerClone, ...group.layers];

            // Update indices for all existing layers
            group.layers.forEach((l, idx) => {
              l.drawIndex = idx;
              l.index = idx;
            });
          }
        };

        // Add to both views
        addLayerToGroups(state.layerListGroups);
        addLayerToGroups(state.layerFolderGroups);

        // Update all layers from current view
        const currentGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
        const allLayers: TOCLayer[] = [];
        currentGroups.forEach((grp) => {
          allLayers.push(...grp.layers);
        });
        state.allLayers = allLayers;
        state.layerCount = allLayers.length;

        // CRITICAL: Update selectedGroup reference to trigger React re-render
        // This ensures the TOC UI updates immediately when a layer is added
        if (state.selectedGroup) {
          const updatedGroup = currentGroups.find((g) => g.value === state.selectedGroup!.value || g.label === state.selectedGroup!.label);
          if (updatedGroup) {
            state.selectedGroup = { ...updatedGroup }; // Create new reference to trigger re-render
          }
        }
      });

      // Update z-indices in LayerManager to match the new order
      LayerManager.reorderCategory("TOC");
    },

    removeCustomLayer: (layerName, groupName, layerId) => {
      set((state) => {
        // Helper function to remove layer from a group array
        const removeFromGroups = (groups: TOCLayerGroup[]) => {
          const group = groups.find((g) => g.label === groupName || g.value === groupName);
          if (group) {
            // Find by ID first (more reliable), then by name
            const layerIndex = layerId ? group.layers.findIndex((l) => l.id === layerId) : group.layers.findIndex((l) => l.name === layerName);

            if (layerIndex !== -1) {
              group.layers.splice(layerIndex, 1);

              // Update draw indices
              group.layers.forEach((layer, index) => {
                layer.drawIndex = index;
                layer.index = index;
              });
            }
          }
        };

        // Remove from BOTH views (like addCustomLayer does)
        removeFromGroups(state.layerListGroups);
        removeFromGroups(state.layerFolderGroups);

        // Update allLayers from whichever view is current
        const currentGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
        const allLayers: TOCLayer[] = [];
        currentGroups.forEach((grp) => {
          allLayers.push(...grp.layers);
        });
        state.allLayers = allLayers;
        state.layerCount = allLayers.length;

        // Update selectedGroup reference to trigger re-render
        if (state.selectedGroup) {
          const updatedGroup = currentGroups.find((g) => g.value === state.selectedGroup!.value || g.label === state.selectedGroup!.label);
          if (updatedGroup) {
            state.selectedGroup = { ...updatedGroup };
          }
        }
      });

      // Update z-indices in LayerManager to match the new order
      LayerManager.reorderCategory("TOC");
    },

    // Utility functions
    getLayerByName: (layerName, groupName) => {
      const state = get();
      const groups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;

      if (groupName) {
        const group = groups.find((g) => g.label === groupName || g.value === groupName);
        return group?.layers.find((l) => l.name === layerName) || null;
      } else {
        for (const group of groups) {
          const layer = group.layers.find((l) => l.name === layerName);
          if (layer) return layer;
        }
        return null;
      }
    },

    // Get layer by unique ID
    getLayerById: (layerId) => {
      const state = get();
      return state.allLayers.find((l) => l.id === layerId) || null;
    },

    getGroupByName: (groupName) => {
      const state = get();
      const groups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
      return groups.find((g) => g.label === groupName || g.value === groupName) || null;
    },

    getAllVisibleLayers: () => {
      const state = get();
      return state.allLayers.filter((layer) => layer.visible);
    },

    getFilteredLayers: (groupName, searchText) => {
      const state = get();
      const group = state.getGroupByName(groupName);
      if (!group) return [];

      if (!searchText) return group.layers;

      return group.layers.filter((layer) => layer.tocDisplayName.toLowerCase().includes(searchText.toLowerCase()));
    },

    // Initialization
    initializeFromConfig: (config) => {
      set((state) => {
        state.tocType = (config.toc.tocType as "LIST" | "FOLDER") || "LIST";
        state.sources = config.toc.sources || [];
        state.helpLink = config.toc.helpLink || "";
      });
    },

    // Layer loading (now implemented with actual geoserver calls)
    loadLayersFromSources: async () => {
      const state = get();

      // Prevent multiple simultaneous calls
      if (state.isLoading) {
        return;
      }

      state.setIsLoading(true);

      // Log which sources are being loaded
      // console.log(
      //   `[TOC] Loading layers from ${state.sources.length} source(s):`
      // );

      try {
        // Get config from app store
        const appConfig = (await import("@/stores/appStore")).useAppStore.getState().config;

        const config = (appConfig as {
          toc: {
            keywords: Record<
              string,
              {
                keyword: string;
                type: string;
                value: unknown;
                splitChar?: string;
                checkValue?: string;
                relatedKeys?: string[];
              }
            >;
            default_group?: string;
          };
          geoserverPath?: string;
        }) || {
          toc: {
            keywords: {
              DEFAULT_GROUP: { keyword: "DEFAULT_GROUP", type: "string", value: "" },
              LIVE_LAYER: { keyword: "LIVE_LAYER", type: "bool", value: false },
              GROUP_PREFIX: { keyword: "GROUP_PREFIX", type: "string", value: "" },
              DISPLAY_NAME: { keyword: "DISPLAY_NAME", type: "string", value: "" },
              IDENTIFY_TITLE_COLUMN: { keyword: "IDENTIFY_TITLE_COLUMN", type: "string", value: "" },
              IDENTIFY_DISPLAY_NAME: { keyword: "IDENTIFY_DISPLAY_NAME", type: "string", value: "" },
              WARNING: { keyword: "WARNING", type: "string", value: "", splitChar: '"' },
              DISCLAIMER_URL: { keyword: "DISCLAIMER_URL", type: "string", value: "", splitChar: '"' },
              DISCLAIMER_TITLE: { keyword: "DISCLAIMER_TITLE", type: "string", value: "", splitChar: '"' },
              IDENTIFY_ID_COLUMN: { keyword: "IDENTIFY_ID_COLUMN", type: "string", value: "" },
              VISIBLE_LAYERS: { keyword: "VISIBLE_LAYERS", type: "array", value: [], splitChar: ",", relatedKeys: ["All_VISIBLE_LAYERS"] },
              All_VISIBLE_LAYERS: { keyword: "VISIBLE_LAYERS", type: "bool", value: false, checkValue: "ALL" },
              MAP_CENTER: { keyword: "MAP_CENTER", type: "array", value: [], splitChar: "," },
              MAP_ZOOM: { keyword: "MAP_ZOOM", type: "int", value: 1 },
              OPACITY: { keyword: "OPACITY", type: "float", value: 1 },
              DOWNLOAD: { keyword: "DOWNLOAD", type: "bool", value: false },
              NO_ATTRIBUTE_TABLE: { keyword: "NO_ATTRIBUTE_TABLE", type: "bool", value: false },
              STATIC_IMAGE_LEGEND: { keyword: "STATIC_IMAGE_LEGEND", type: "bool", value: false },
            },
            default_group: "All_Layers_Public",
          },
          geoserverPath: "geoserver",
        };

        // Load from actual sources using TOC helpers
        const result = await loadLayerGroupsFromSources(state.sources, config);

        // Notify user if any sources failed to load
        if (result.failedSources.length > 0) {
          useToastStore.getState().addToast("Some layer sources could not be loaded. Not all layers may be available.", "warning", 8000);
        }

        // Set the layer groups for BOTH LIST and FOLDER types (same data, different display)
        state.setLayerGroups("LIST", result.groups);
        state.setLayerGroups("FOLDER", result.groups);

        // Set default group if found
        if (result.groups.length > 0) {
          // Use the defaultGroupName from config/geoserver to find the right group
          const configDefaultName = result.defaultGroupName;
          let defaultGroup: TOCLayerGroup | undefined;

          // First, try matching by name/value/label against the config default_group
          if (configDefaultName) {
            defaultGroup = result.groups.find(
              (g) =>
                g.value === configDefaultName ||
                g.label === configDefaultName ||
                g.value.toUpperCase() === configDefaultName.toUpperCase() ||
                g.label.toUpperCase() === configDefaultName.toUpperCase(),
            );
          }

          // Fall back to the boolean defaultGroup flag (set from GeoServer DEFAULT_GROUP keyword)
          if (!defaultGroup) {
            defaultGroup = result.groups.find((g) => g.defaultGroup);
          }

          // Fall back to primary source's group
          if (!defaultGroup) {
            const primarySource = state.sources.find((s) => s.primary);
            if (primarySource) {
              defaultGroup = result.groups.find((g) => g.url.includes(primarySource.layerUrl));
            }
          }

          // Last resort: first group
          if (!defaultGroup) {
            defaultGroup = result.groups[0];
          }

          state.setDefaultGroup(defaultGroup);

          // Initialize folder open states: only sourceOpen groups (source config `open: true`) are expanded
          // The config default_group (e.g. "All_Layers_Public") only affects LIST view, not FOLDER view
          result.groups.forEach((group) => {
            const isSourceOpen = group.sourceOpen === true;
            if (get().folderOpenStates[group.value] === undefined) {
              state.setFolderOpenState(group.value, isSourceOpen);
            }
          });

          // Set the selected group based on the current TOC type
          const currentState = get();
          if (currentState.tocType === "LIST") {
            // For LIST view, check if the default group matches "All Layers" or a specific group
            // Try to find the matching group in layerListGroups (which includes "All Layers")
            const listGroups = currentState.layerListGroups;
            let selectedGroup: TOCLayerGroup | undefined;

            if (configDefaultName) {
              selectedGroup = listGroups.find(
                (g) =>
                  g.value === configDefaultName ||
                  g.label === configDefaultName ||
                  g.value.toUpperCase() === configDefaultName.toUpperCase() ||
                  g.label.toUpperCase() === configDefaultName.toUpperCase(),
              );
            }

            // Fall back to "All Layers"
            if (!selectedGroup) {
              selectedGroup = listGroups.find((g) => g.value === "all_layers");
            }

            if (selectedGroup) {
              state.setSelectedGroup(selectedGroup);
            }
          } else {
            // For FOLDER view, clear selected group to show all folders
            state.setSelectedGroup(null);
          }
        }

        // After loading is complete, start fetching legends asynchronously
        // DISABLED: Legend fetching is now handled by lazy loading in LayerItem components
        // state.autoFetchAllLegends();
      } catch (error) {
        console.error("Error loading layers:", error);

        // Fallback to mock data if loading fails
        const mockGroups: TOCLayerGroup[] = state.sources.map((source, index) => ({
          value: source.group?.name || `group_${index}`,
          label: source.group?.displayName || `Group ${index}`,
          defaultGroup: source.primary || false,
          url: source.layerUrl,
          prefix: "",
          visibleLayers: source.group?.visibleLayers || [],
          wmsGroupUrl: source.layerUrl,
          customRestUrl: "",
          layers: [], // Empty layers for mock data
        }));

        state.setLayerGroups("LIST", mockGroups);
        state.setLayerGroups("FOLDER", mockGroups);

        if (mockGroups.length > 0) {
          const defaultGroup = mockGroups.find((g) => g.defaultGroup) || mockGroups[0];
          state.setDefaultGroup(defaultGroup);
        }
      } finally {
        state.setIsLoading(false);
      }
    },

    refreshTOC: async (isReset = false) => {
      const state = get();

      if (isReset) {
        // Clear all existing TOC layers from the map before reloading
        LayerManager.clearCategory("TOC");

        // Clear existing data
        state.setLayerGroups("LIST", []);
        state.setLayerGroups("FOLDER", []);
        state.setSelectedGroup(null);
        state.setDefaultGroup(null);

        // Reset any saved visibility states
        set((state) => {
          state.groupLayerVisibilityStates = {};
        });
      }

      await state.loadLayersFromSources();
    },

    // Add legend fetching function
    fetchLayerLegend: async (layer: TOCLayer, group: TOCLayerGroup) => {
      // Check if already fetching to prevent duplicate requests
      const state = get();
      const existingLayer = state.allLayers.find((l) => l.name === layer.name);
      if (existingLayer?.legendFetching) {
        return; // Already fetching, skip
      }

      // Mark as fetching in BOTH view types
      set((draft) => {
        updateLayerInAllViews(draft, layer.name, (l) => {
          l.legendFetching = true;
        });
      });

      try {
        // If we have a style URL (WMS GetLegendGraphic), try to fetch it
        if (layer.styleUrl) {
          // For secured endpoints, use fetch with auth headers and convert to blob URL
          if (layer.secured || isSecuredUrl(layer.styleUrl)) {
            try {
              const response = await fetchWithAuth(layer.styleUrl, true);
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);

              // Probe image dimensions
              const img = new Image();
              img.onload = () => {
                set((draft) => {
                  updateLayerInAllViews(draft, layer.name, (l) => {
                    l.legendImage = blobUrl;
                    l.legendHeight = img.height || 20;
                    l.legendFetching = false;
                  });
                });
              };
              img.onerror = async () => {
                URL.revokeObjectURL(blobUrl);
                set((draft) => {
                  updateLayerInAllViews(draft, layer.name, (l) => {
                    l.legendFetching = false;
                  });
                });
                await get().fetchLayerLegendFromRest(layer, group);
              };
              img.src = blobUrl;
            } catch (authErr) {
              console.warn(`Secured legend fetch failed for ${layer.name}:`, authErr);
              set((draft) => {
                updateLayerInAllViews(draft, layer.name, (l) => {
                  l.legendFetching = false;
                });
              });
              await get().fetchLayerLegendFromRest(layer, group);
            }
          } else {
            // Public endpoint — load directly with an <img> tag
            const img = new Image();
            img.onload = () => {
              set((draft) => {
                updateLayerInAllViews(draft, layer.name, (l) => {
                  l.legendImage = layer.styleUrl;
                  l.legendHeight = img.height || 20;
                  l.legendFetching = false;
                });
              });
            };
            img.onerror = async () => {
              set((draft) => {
                updateLayerInAllViews(draft, layer.name, (l) => {
                  l.legendFetching = false;
                });
              });
              await get().fetchLayerLegendFromRest(layer, group);
            };
            img.src = layer.styleUrl;
          }
        } else {
          // No style URL, try to fetch from REST API
          await get().fetchLayerLegendFromRest(layer, group);
        }
      } catch (error) {
        console.error("Error fetching layer legend:", error);
        // Clear fetching flag in BOTH view types on error
        set((draft) => {
          updateLayerInAllViews(draft, layer.name, (l) => {
            l.legendFetching = false;
          });
        });
      }
    },

    // Fetch legend from GeoServer REST API
    fetchLayerLegendFromRest: async (layer: TOCLayer, _group: TOCLayerGroup) => {
      try {
        if (layer.metadataUrl) {
          const isSecured = layer.secured || isSecuredUrl(layer.metadataUrl);

          try {
            let metadata: Record<string, unknown>;

            if (isSecured) {
              // Use fetchWithAuth for secured endpoints
              const response = await fetchWithAuth(layer.metadataUrl, true);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              metadata = await response.json();
            } else {
              const { getAxiosClient } = await import("@/lib/axiosInstance");
              const axiosClient = getAxiosClient(layer.metadataUrl);
              const response = await axiosClient.get(layer.metadataUrl);
              metadata = response.data;
            }

            // Check if there's style information in the metadata
            if (metadata.defaultStyle && (metadata.defaultStyle as Record<string, unknown>).href) {
              try {
                const styleHref = (metadata.defaultStyle as Record<string, unknown>).href as string;
                const styleUrl = styleHref + ".json";
                let styleData: unknown;

                if (isSecured) {
                  const styleResp = await fetchWithAuth(styleUrl, true);
                  if (!styleResp.ok) throw new Error(`HTTP ${styleResp.status}`);
                  styleData = await styleResp.json();
                } else {
                  const { getAxiosClient: getStyleAxiosClient } = await import("@/lib/axiosInstance");
                  const styleAxiosClient = getStyleAxiosClient(styleUrl);
                  const styleResponse = await styleAxiosClient.get(styleUrl);
                  styleData = styleResponse.data;
                }

                // Update layer with legend object in BOTH view types
                set((draft) => {
                  updateLayerInAllViews(draft, layer.name, (l) => {
                    l.legendObj = styleData;
                    l.legendHeight = 100; // Default height for object legends
                  });
                });
                return;
              } catch (styleError) {
                console.error("Error fetching style data:", styleError);
              }
            }
          } catch (metadataError) {
            console.error("Error fetching metadata:", metadataError);
          }
        }

        // Fallback: create a simple text legend in BOTH view types
        set((draft) => {
          updateLayerInAllViews(draft, layer.name, (l) => {
            l.legendObj = {
              type: "text",
              content: `Legend for ${layer.tocDisplayName}`,
            };
            l.legendHeight = 30;
          });
        });
      } catch (error) {
        console.error("Error fetching legend from REST API:", error);

        // Fallback: create a simple text legend in BOTH view types
        set((draft) => {
          updateLayerInAllViews(draft, layer.name, (l) => {
            l.legendObj = {
              type: "text",
              content: `Legend for ${layer.tocDisplayName}`,
            };
            l.legendHeight = 30;
          });
        });
      }
    },

    // Auto-fetch all legends asynchronously after initial load
    autoFetchAllLegends: async () => {
      const state = get();
      const groups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;

      let totalLegendFetches = 0;

      // Iterate through all groups and layers
      for (const group of groups) {
        for (const layer of group.layers) {
          // Only fetch if layer has a styleUrl and doesn't already have legend data
          if (layer.styleUrl && !layer.legendImage && !layer.legendObj) {
            totalLegendFetches++;

            // Fetch legend asynchronously without waiting
            state.fetchLayerLegend(layer, group).catch(() => {
              // We can ignore individual fetch errors here as it's a background process
            });

            // Add small delay to prevent overwhelming the server
            if (totalLegendFetches % 10 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
        }
      }
    },

    // Utility function to check if a legend is blank/empty
    isLegendBlank: (layer: TOCLayer): boolean => {
      // Check if no legend data at all
      if (!layer.legendImage && !layer.legendObj) {
        return true;
      }

      // Check for blank/empty legend image
      if (layer.legendImage) {
        // Add specific checks for blank images when we get the sample data
        if (layer.legendImage === "" || layer.legendImage === null) {
          return true;
        }

        // Check for known blank legend patterns from GeoServer
        const url = layer.legendImage;

        // Check if it's a GetLegendGraphic request with small dimensions that often indicate blank legends
        if (url.includes("GetLegendGraphic")) {
          // Extract dimensions from URL if present
          const widthMatch = url.match(/[?&]width=(\d+)/);
          const heightMatch = url.match(/[?&]height=(\d+)/);

          if (widthMatch && heightMatch) {
            const width = parseInt(widthMatch[1]);
            const height = parseInt(heightMatch[1]);

            // Common blank legend dimensions (adjust based on your server's patterns)
            if (
              (width <= 63 && height <= 21) || // Sample case
              (width <= 20 && height <= 20) || // Very small legends
              (width <= 1 && height <= 1)
            ) {
              // 1x1 pixel blanks
              return true;
            }
          }
        }

        // Check for specific layer patterns that tend to have blank legends
        if (url.includes("Named_Place_Label") || (url.includes("Label") && url.includes("GetLegendGraphic"))) {
          return true;
        }
      }

      // Check for blank legend object
      if (layer.legendObj) {
        // Handle different types of blank legend objects
        if (layer.legendObj === null) {
          return true;
        }

        if (typeof layer.legendObj === "object") {
          const obj = layer.legendObj as Record<string, unknown>;

          // Check for empty object
          if (Object.keys(obj).length === 0) {
            return true;
          }

          // Check for text type with empty content
          if (obj.type === "text" && (!obj.content || obj.content === "")) {
            return true;
          }

          // Check for fallback text legends (our generated ones)
          if (obj.type === "text" && typeof obj.content === "string" && obj.content.startsWith("Legend for ")) {
            return true;
          }
        }
      }

      return false;
    },

    // Debug helpers
    debugGroupSwitching: () => {
      const state = get();
      console.group("🔍 TOC Group Switching Debug");

      console.group("📊 Layer Visibility Summary");
      const visibleLayers = state.allLayers.filter((l) => l.visible);
      visibleLayers.forEach(() => {});
      console.groupEnd();

      console.group("💾 Saved Group States");
      Object.keys(state.groupLayerVisibilityStates).forEach((groupValue) => {
        const states = state.groupLayerVisibilityStates[groupValue];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const visibleCount = Object.values(states).filter((v) => v).length;
      });
      console.groupEnd();

      console.group("🗺️ OpenLayers Layer Status (Shared Layers)");
      const layersByName = new Map<string, TOCLayer[]>();

      // Group layers by name to show sharing
      state.allLayers.forEach((layer) => {
        if (!layersByName.has(layer.name)) {
          layersByName.set(layer.name, []);
        }
        layersByName.get(layer.name)!.push(layer);
      });

      layersByName.forEach((layers) => {
        const firstLayer = layers[0];
        const _olVisible = "no layer";

        if (firstLayer.managedLayerId) {
          const managedLayer = useLayerManagerStore.getState().getLayer(firstLayer.managedLayerId);
          const _olVisible2 = managedLayer?.visible?.toString() || "unknown";
        } else if (firstLayer.layer) {
          const _olVisible3 = (firstLayer.layer as OpenLayersLayer).getVisible ? (firstLayer.layer as OpenLayersLayer).getVisible().toString() : "unknown";
        }

        const _tocStates = layers.map((l) => `${l.groupName}:${l.visible}`).join(", ");
        const _sharedInfo = layers.length > 1 ? ` (SHARED across ${layers.length} groups)` : "";
      });
      console.groupEnd();

      console.groupEnd();
    },

    // Initialize OpenLayers layers for all TOC layers
    initializeOpenLayersLayers: () => {
      const state = get();
      const groups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;

      // Check if map is available
      const map = useMapStore.getState().map;
      if (!map) {
        console.error("❌ Map not available during TOC layer initialization");
        return;
      }

      // Track created OpenLayers layers by layer name to avoid duplicates
      const createdLayers = new Map<string, { layer: Layer; managedLayerId: string }>();

      groups.forEach((group) => {
        group.layers.forEach((layer) => {
          // Check if we already created an OpenLayers layer for this layer name
          const existingLayerInfo = createdLayers.get(layer.name);

          if (existingLayerInfo) {
            // Reuse existing OpenLayers layer

            // Update the layer in the store to reference the shared OpenLayers layer
            set((state) => {
              const currentGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
              const currentGroup = currentGroups.find((g) => g.label === group.label);
              if (currentGroup) {
                const currentLayer = currentGroup.layers.find((l) => l.name === layer.name);
                if (currentLayer) {
                  currentLayer.layer = existingLayerInfo.layer;
                  currentLayer.managedLayerId = existingLayerInfo.managedLayerId;
                }
              }

              // Also update in allLayers
              const allLayerItem = state.allLayers.find((l) => l.name === layer.name && l.groupName === group.label);
              if (allLayerItem) {
                allLayerItem.layer = existingLayerInfo.layer;
                allLayerItem.managedLayerId = existingLayerInfo.managedLayerId;
              }
            });
          } else if (!layer.layer && group.wmsGroupUrl) {
            // Create new OpenLayers layer
            const serverUrl = group.wmsGroupUrl.split("/wms")[0] + "/wms";

            // Debug log for secured layer detection
            if (layer.secured) {
              console.debug(`[tocStore] Creating secured layer "${layer.name}":`, {
                layerSecured: layer.secured,
                groupLabel: group.label,
                groupValue: group.value,
                serverUrl,
              });
            }

            // Create OpenLayers layer
            LayerHelpers.getLayer(
              {
                sourceType: OL_DATA_TYPES.ImageWMS,
                url: serverUrl,
                layerName: layer.name,
                name: layer.name,
                projection: "EPSG:3857",
                secured: !!layer.secured,
              },
              (olLayer: unknown) => {
                if (olLayer) {
                  const typedLayer = olLayer as Layer;

                  // Set layer properties
                  (typedLayer as OpenLayersLayer).setProperties({
                    name: layer.name,
                    tocDisplayName: layer.tocDisplayName,
                    displayName: layer.displayName,
                    minScale: layer.minScale,
                    maxScale: layer.maxScale,
                    queryable: layer.isQueryable !== undefined ? layer.isQueryable : true, // Default to queryable
                    liveLayer: layer.liveLayer, // Keep liveLayer for special features
                    secured: layer.secured,
                    disableParcelClick: false,
                    extendedProperties: layer.extendedProperties,
                    wfsUrl: layer.wfsUrl,
                    group: group.label,
                    INFO_FORMAT: layer.infoFormat,
                  });

                  // Set initial visibility and opacity
                  if (layer.visible) {
                    // console.log(`[TOC] initializeOpenLayersLayers: Setting "${layer.name}" VISIBLE (group="${group.label}")`);
                  }
                  (typedLayer as OpenLayersLayer).setVisible(layer.visible);
                  (typedLayer as OpenLayersLayer).setOpacity(layer.opacity);

                  // Add to map using LayerManager for proper categorization and z-index management
                  const managedLayerId = LayerManager.addLayer(typedLayer as Layer, "TOC", layer.name, {
                    index: layer.drawIndex, // Use drawIndex as insertion index for proper z-ordering
                    clickable: layer.liveLayer || (layer.isQueryable !== undefined ? layer.isQueryable : true),
                    metadata: {
                      groupName: group.label,
                      groupUrl: group.wmsGroupUrl,
                      secured: !!layer.secured,
                      drawIndex: layer.drawIndex,
                    },
                  });

                  if (managedLayerId) {
                    // Store the created layer info for reuse
                    createdLayers.set(layer.name, { layer: typedLayer, managedLayerId });

                    // Update ALL TOC layer instances that represent this same server layer
                    set((state) => {
                      // Update in all groups (both LIST and FOLDER views)
                      const updateLayerInGroups = (groups: TOCLayerGroup[]) => {
                        groups.forEach((grp) => {
                          grp.layers.forEach((lyr) => {
                            if (lyr.name === layer.name) {
                              lyr.layer = typedLayer;
                              lyr.managedLayerId = managedLayerId;
                            }
                          });
                        });
                      };

                      updateLayerInGroups(state.layerListGroups);
                      updateLayerInGroups(state.layerFolderGroups);

                      // Update in allLayers
                      state.allLayers.forEach((allLayer) => {
                        if (allLayer.name === layer.name) {
                          allLayer.layer = typedLayer;
                          allLayer.managedLayerId = managedLayerId;
                        }
                      });
                    });
                  }
                } else {
                  console.error("❌ Failed to create OpenLayers layer for:", layer.name);
                }
              },
            );
          }
        });
      });
    },

    // Global opacity delegation to LayerManager
    setGlobalOpacity: (opacity: number) => {
      useLayerManagerStore.getState().setGlobalOpacity(opacity);
    },

    getGlobalOpacity: () => {
      return useLayerManagerStore.getState().getGlobalOpacity();
    },
  })),
);
