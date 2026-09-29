import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { loadLayerGroupsFromSources, sortGroups } from "@/utils/tocHelpers";
import { LayerHelpers } from "@/utils/openlayers/LayerHelpers";
import { OL_DATA_TYPES, OLDataType } from "@/utils/openlayers/types";
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

// Parsed disclaimer metadata attached to a TOC layer
export interface LayerDisclaimer {
  title?: string;
  url?: string;
  warning?: string;
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
  defaultVisible: boolean; // Config-default visibility, used when a view is first opened with no saved state
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
  disclaimer?: LayerDisclaimer;
  infoFormat?: string; // INFO_FORMAT for WMS GetFeatureInfo requests (e.g., text/plain, text/html)
  xslTemplate?: string; // XSL template URL for transforming identify results
  extendedProperties?: { keywords: Record<string, unknown> }; // Parsed GeoServer keywords (e.g. SAR, CATEGORY)
  wfsUrl?: string; // WFS query URL template for this layer
  serverUrl?: string; // Base GeoServer URL for this layer
  sourceType?: string; // Source type override (e.g. "WMTS") for non-WMS layers
  layerUrl?: string; // Direct URL for non-WMS layers (e.g. WMTS capabilities URL)
  projection?: string; // Projection override for non-WMS layers
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
  // Fields for type: "layer" (direct layer config, e.g. WMTS)
  sourceType?: string;
  source?: string;
  name?: string;
  layerName?: string;
  tiled?: boolean;
  index?: number;
  projection?: string;
  groups?: string[];
  descriptionOverride?: string;
  appToken?: boolean; // When true, use server-side ArcGIS app token for REST requests
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

  // Layer visibility state per view (LIST / FOLDER) for independent views
  viewLayerVisibilityStates: Record<string, Record<string, boolean>>;

  // Search and filtering
  searchText: string;
  sortAlpha: boolean;

  // Loading state
  isLoading: boolean;
  hasInitialized: boolean;

  // Layer count
  layerCount: number;

  // Configuration
  helpLink: string;
  sources: TOCSource[];

  // Actions
  setTocType: (type: "LIST" | "FOLDER") => void;
  setLayerGroups: (type: "LIST" | "FOLDER", groups: TOCLayerGroup[], options?: { preserveLayerOrder?: boolean }) => void;
  setSelectedGroup: (group: TOCLayerGroup | null) => void;
  setDefaultGroup: (group: TOCLayerGroup | null) => void;
  setFolderOpenState: (groupValue: string, isOpen: boolean) => void;
  getFolderOpenState: (groupValue: string) => boolean;
  setSearchText: (text: string) => void;
  setSortAlpha: (sort: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setHasInitialized: (initialized: boolean) => void;
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
  updateLayerVisibilitiesBatch: (updates: Array<{ layerId: string; visible: boolean }>) => void;
  setAllLayersVisibility: (visible: boolean) => void;
  setGroupLayersVisibility: (groupLabel: string, visible: boolean) => void;
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
  initializeOpenLayersLayers: () => Promise<void>;

  // Alphabetical sorting
  sortLayersAlphabetically: () => void;
  updateLayerManagerZIndices: () => void;

  // Seed per-view visibility snapshots from current group state (server/localStorage/config)
  seedViewVisibilityStatesFromGroups: () => void;

  // Push the active view's committed group visibility onto the shared OL map,
  // enforcing LIST dedup winners (and forcing suppressed duplicates off).
  syncActiveViewVisibilityToMap: () => void;

  // Global opacity delegation to LayerManager
  setGlobalOpacity: (opacity: number) => void;
  getGlobalOpacity: () => number;
}

/**
 * Helper: update a layer's properties across BOTH view types (LIST and FOLDER)
 * and the allLayers array, keyed by the layer's unique id. Call inside an
 * immer set() callback with the draft. This ensures legend/showLegend data is
 * never lost when switching views and respects layer identity (layers with the
 * same name are intentionally independent and have different ids).
 *
 * Uses forEach (not find) so that ALL occurrences of the SAME id are updated \u2014
 * the same layer can appear in multiple folder groups and in the All Layers
 * virtual group, all carrying the same id.
 */
function updateLayerInAllViews(draft: TOCState, layerId: string, updater: (layer: TOCLayer) => void) {
  [draft.layerListGroups, draft.layerFolderGroups].forEach((groups) => {
    groups.forEach((g) => {
      g.layers.forEach((l) => {
        if (l.id === layerId) updater(l);
      });
    });
  });
  draft.allLayers.forEach((l) => {
    if (l.id === layerId) updater(l);
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
    viewLayerVisibilityStates: {},
    searchText: "",
    sortAlpha: false,
    isLoading: false,
    hasInitialized: false,
    layerCount: 0,
    helpLink: "",
    sources: [],

    // Actions
    setTocType: (type) => {
      set((state) => {
        const previousType = state.tocType;

        // Save current view's layer visibility states
        const viewStates: Record<string, boolean> = {};
        state.allLayers.forEach((layer) => {
          viewStates[layer.id] = layer.visible;
        });
        state.viewLayerVisibilityStates[previousType] = viewStates;

        // Save current state when leaving LIST view
        if (previousType === "LIST" && state.selectedGroup) {
          state.lastSelectedListGroup = state.selectedGroup;
        }

        state.tocType = type;

        // Restore target view's layer visibility states
        const savedViewStates = state.viewLayerVisibilityStates[type];
        if (savedViewStates) {
          state.allLayers.forEach((layer) => {
            if (savedViewStates.hasOwnProperty(layer.id)) {
              layer.visible = savedViewStates[layer.id];
            }
          });
          // Also sync to group layer arrays
          state.layerListGroups.forEach((g) => {
            g.layers.forEach((l) => {
              if (savedViewStates.hasOwnProperty(l.id)) {
                l.visible = savedViewStates[l.id];
              }
            });
          });
          state.layerFolderGroups.forEach((g) => {
            g.layers.forEach((l) => {
              if (savedViewStates.hasOwnProperty(l.id)) {
                l.visible = savedViewStates[l.id];
              }
            });
          });
        } else {
          // First visit to this view — fall back to each layer's config-default
          // visibility (NOT all-off). Server/localStorage-saved state is seeded
          // into viewLayerVisibilityStates at startup, so this branch only runs
          // when a view genuinely has no saved or seeded state.
          state.allLayers.forEach((layer) => {
            layer.visible = layer.defaultVisible;
          });
          state.layerListGroups.forEach((g) => {
            g.layers.forEach((l) => {
              l.visible = l.defaultVisible;
            });
          });
          state.layerFolderGroups.forEach((g) => {
            g.layers.forEach((l) => {
              l.visible = l.defaultVisible;
            });
          });
        }

        // Apply current sort order to the target view's groups
        const targetGroups = type === "LIST" ? state.layerListGroups : state.layerFolderGroups;
        if (state.sortAlpha) {
          targetGroups.forEach((group) => {
            group.layers = [...group.layers].sort((a, b) => a.tocDisplayName.localeCompare(b.tocDisplayName));
          });
        } else {
          targetGroups.forEach((group) => {
            group.layers = [...group.layers].sort((a, b) => b.drawIndex - a.drawIndex);
          });
        }

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

      // Update OpenLayers layer visibility to match restored/defaulted state.
      // The map reflects a SINGLE (active) view, so only push visibility onto the
      // shared OL layers when this call is for the active view. Setting the
      // inactive view's groups must update store state only — otherwise the
      // inactive view's (independent) visibility would clobber the map (e.g.
      // applySavedLayerOptions("FOLDER") overriding the active LIST state and
      // leaving an on-by-default layer invisible until toggled).
      const currentState = get();
      if (type === currentState.tocType) {
        const updatedOL = new Set<string>();

        // Build a set of winner layer ids from the virtual "all_layers" group (LIST only).
        // In LIST view, force suppressed duplicates OFF (only the deduped winner
        // shown in the virtual "all_layers" group should render).
        let winnerIds: Set<string> | undefined;
        if (currentState.tocType === "LIST") {
          const allLayersGroup = currentState.layerListGroups.find((g) => g.value === "all_layers");
          if (allLayersGroup) {
            winnerIds = new Set(allLayersGroup.layers.map((l) => l.id));
          }
        }

        currentState.allLayers.forEach((layer) => {
          if (layer.managedLayerId) {
            if (!updatedOL.has(layer.managedLayerId)) {
              updatedOL.add(layer.managedLayerId);
              // In LIST, only winners (present in all_layers) render; force suppressed duplicates off
              const shouldBeVisible = winnerIds ? (winnerIds.has(layer.id) ? layer.visible : false) : layer.visible;
              LayerManager.setLayerVisibility(layer.managedLayerId, shouldBeVisible);
            }
          } else if (layer.layer) {
            const shouldBeVisible = winnerIds ? (winnerIds.has(layer.id) ? layer.visible : false) : layer.visible;
            (layer.layer as OpenLayersLayer).setVisible(shouldBeVisible);
          }
        });
      }

      // Update LayerManager z-indices to match the new view's group ordering
      currentState.updateLayerManagerZIndices();
    },

    setLayerGroups: (type, groups, options) => {
      const preserveLayerOrder = options?.preserveLayerOrder ?? false;
      set((state) => {
        // Sort groups so primary source groups appear first, then alphabetical
        const sortedGroupsRaw = sortGroups(groups);

        // DEDUPLICATION helpers shared by both the per-category groups and the
        // virtual "All Layers" group.
        // Priority score: secured (+2) outranks primary group (+1) outranks plain (0).
        // A strictly higher score replaces the incumbent; ties keep the first seen.
        const dedupKey = (layer: TOCLayer): string => {
          if (layer.userLayer) {
            return `user:${layer.id}`;
          }

          return layer.tocDisplayName || layer.displayName || layer.name;
        };
        const dedupLayers = (layers: TOCLayer[], groupPriority: number): TOCLayer[] => {
          const map = new Map<string, { layer: TOCLayer; priority: number }>();
          layers.forEach((layer) => {
            const key = dedupKey(layer);
            const priority = (layer.secured ? 2 : 0) + groupPriority;
            const existing = map.get(key);
            if (!existing || priority > existing.priority) {
              map.set(key, { layer: { ...layer }, priority });
            }
          });
          return Array.from(map.values(), (e) => e.layer);
        };

        // Apply deduplication to every individual group so that selecting a
        // specific category in the TOC doesn't reveal duplicate entries.
        const sortedGroups = sortedGroupsRaw.map((group) => ({
          ...group,
          layers: dedupLayers(group.layers, group.primary ? 1 : 0),
        }));

        if (type === "LIST") {
          // For LIST view, create an "All Layers" group that contains all layers
          // flattened across every category. The cross-group pass deduplicates
          // the same layer appearing in *multiple* categories; the per-group pass
          // above already removed duplicates *within* each category. FOLDER view
          // is NOT deduped (it renders raw source groups directly, below).
          const deduped = new Map<string, { layer: TOCLayer; priority: number }>();
          sortedGroups.forEach((group) => {
            const groupPriority = group.primary ? 1 : 0;
            group.layers.forEach((layer) => {
              const key = dedupKey(layer);
              const priority = (layer.secured ? 2 : 0) + groupPriority;
              const existing = deduped.get(key);
              if (!existing || priority > existing.priority) {
                // Create a copy of the layer to avoid mutating the individual group's layer
                deduped.set(key, { layer: { ...layer }, priority });
              }
            });
          });
          const allLayers: TOCLayer[] = Array.from(deduped.values(), (e) => e.layer);

          if (preserveLayerOrder) {
            // When restoring saved layer order, sort by the saved drawIndex (descending)
            // which was already applied to each layer before setLayerGroups was called
            allLayers.sort((a, b) => b.drawIndex - a.drawIndex);

            // Reassign sequential drawIndex/index but preserve initialDrawIndex
            let allLayersIndex = allLayers.length;
            allLayers.forEach((layer) => {
              allLayersIndex--;
              layer.drawIndex = allLayersIndex;
              layer.index = allLayersIndex;
              // Do NOT overwrite initialDrawIndex — it preserves the server's original order
            });
          } else {
            // Sort by initialDrawIndex (descending) within each group to maintain relative order
            // Primary groups come first, then sort by group value, then by initialDrawIndex
            allLayers.sort((a, b) => {
              // First, sort by group priority (primary groups first)
              const groupA = sortedGroups.find((g) => g.value === a.group || g.label === a.groupName);
              const groupB = sortedGroups.find((g) => g.value === b.group || g.label === b.groupName);

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
          }

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
          state.layerListGroups = [allLayersGroup, ...sortedGroups];
        } else {
          state.layerFolderGroups = sortedGroups;
        }

        // Update all layers and layer count
        const allLayers: TOCLayer[] = [];
        sortedGroups.forEach((group) => {
          allLayers.push(...group.layers);
        });
        state.allLayers = allLayers;
        state.layerCount = allLayers.length;

        // Keep selectedGroup in sync — it may reference a stale object from
        // the previous layerListGroups/layerFolderGroups array.
        if (state.selectedGroup) {
          const currentGroups = type === "LIST" ? state.layerListGroups : state.layerFolderGroups;
          const updatedGroup = currentGroups.find((g) => g.value === state.selectedGroup!.value || g.label === state.selectedGroup!.label);
          if (updatedGroup) {
            state.selectedGroup = updatedGroup;
          }
        }
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
          // Return to the user's current custom order using drawIndex
          currentGroups.forEach((group) => {
            group.layers = [...group.layers].sort((a, b) => b.drawIndex - a.drawIndex);
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

      if (tocLayers.length === 0) return;

      // Create a mapping of managedLayerId to ManagedLayer for fast lookup.
      // Using the unique managedLayerId (instead of layer name) avoids
      // collisions when the same WMS layer name appears in multiple groups.
      const tocLayersById = new Map<string, ManagedLayer>();
      tocLayers.forEach((ml) => tocLayersById.set(ml.id, ml));

      // Build the reordered layer list from TOC state.
      const reorderedTocLayers: ManagedLayer[] = [];
      const consumed = new Set<string>();

      const groups = tocState.tocType === "LIST" ? tocState.layerListGroups : tocState.layerFolderGroups;

      // In LIST view with "All Layers" selected, use its ordering directly
      // so that reordering within "All Layers" is reflected on the map.
      // Otherwise iterate source groups (each group maintains its own
      // independent order).
      const useAllLayers = tocState.tocType === "LIST" && tocState.selectedGroup?.value === "all_layers";

      if (useAllLayers) {
        const allLayersGroup = groups.find((g) => g.value === "all_layers");
        if (allLayersGroup) {
          allLayersGroup.layers.forEach((tocLayer) => {
            if (!tocLayer.managedLayerId || consumed.has(tocLayer.managedLayerId)) return;
            const managedLayer = tocLayersById.get(tocLayer.managedLayerId);
            if (managedLayer) {
              reorderedTocLayers.push(managedLayer);
              consumed.add(tocLayer.managedLayerId);
            }
          });
        }
      } else {
        groups.forEach((group) => {
          if (group.value === "all_layers") return;

          group.layers.forEach((tocLayer) => {
            if (!tocLayer.managedLayerId || consumed.has(tocLayer.managedLayerId)) return;
            const managedLayer = tocLayersById.get(tocLayer.managedLayerId);
            if (managedLayer) {
              reorderedTocLayers.push(managedLayer);
              consumed.add(tocLayer.managedLayerId);
            }
          });
        });
      }

      // Append any managed TOC layers that weren't matched by a TOC
      // entry (e.g. custom/user-added layers) so they are never dropped.
      tocLayers.forEach((ml) => {
        if (!consumed.has(ml.id)) {
          reorderedTocLayers.push(ml);
          consumed.add(ml.id);
        }
      });

      if (reorderedTocLayers.length > 0) {
        // Update z-indices on the reordered layers before assigning to draft.
        // Position 0 in the array is the TOP of the TOC (highest drawIndex)
        // and calculateZIndex(category, 0) returns the max z-index, so idx maps directly.
        const updatedLayers = reorderedTocLayers.map((layer, idx) => {
          const newZIndex = calculateZIndex("TOC", idx);
          return {
            ...layer,
            zIndex: newZIndex,
          };
        });

        // Update the LayerManager store state
        useLayerManagerStore.setState((draft) => {
          draft.layers.TOC = updatedLayers;
          draft.nextZIndex.TOC = calculateZIndex("TOC", updatedLayers.length);
        });

        // Apply z-indices to the actual OpenLayers layers AFTER setState()
        // completes to avoid OL mutations inside Immer (same pattern as
        // updateLayerVisibility).
        updatedLayers.forEach((layer) => {
          layer.layer.setZIndex(layer.zIndex);
        });
      }
    },

    seedViewVisibilityStatesFromGroups: () => {
      // Capture each view's CURRENT layer visibility (which already reflects
      // server-saved → localStorage-saved → config-default precedence applied at
      // startup) into the per-view snapshots. This ensures the first switch
      // between LIST and FOLDER restores the saved/seeded state instead of
      // falling through to the config-default first-visit branch in setTocType.
      set((state) => {
        const buildSnapshot = (groups: TOCLayerGroup[]): Record<string, boolean> => {
          const snapshot: Record<string, boolean> = {};
          groups.forEach((group) => {
            if (group.value === "all_layers") return;
            group.layers.forEach((layer) => {
              snapshot[layer.id] = layer.visible;
            });
          });
          return snapshot;
        };

        state.viewLayerVisibilityStates.LIST = buildSnapshot(state.layerListGroups);
        state.viewLayerVisibilityStates.FOLDER = buildSnapshot(state.layerFolderGroups);
      });
    },

    syncActiveViewVisibilityToMap: () => {
      // The OpenLayers map reflects a SINGLE (active) view. Push the active
      // view's COMMITTED group visibility onto the shared OL layers, keyed by
      // unique managedLayerId so duplicate names never collide.
      //
      // LIST dedup: only the deduped winner (present in the virtual
      // "all_layers" group) should render; suppressed duplicates are forced
      // OFF. We resolve each managed layer with WINNER-WINS semantics so the
      // winner's intended visibility is applied regardless of iteration order
      // (a loser must never downgrade a winner's ON state).
      const state = get();

      let winnerIds: Set<string> | undefined;
      if (state.tocType === "LIST") {
        const allLayersGroup = state.layerListGroups.find((g) => g.value === "all_layers");
        if (allLayersGroup) {
          winnerIds = new Set(allLayersGroup.layers.map((l) => l.id));
        }
      }

      // Resolve desired visibility per managedLayerId (winner-wins).
      const desiredByManaged = new Map<string, { visible: boolean; isWinner: boolean }>();
      state.allLayers.forEach((layer) => {
        if (!layer.managedLayerId) return;
        const isWinner = winnerIds ? winnerIds.has(layer.id) : true;
        const shouldBeVisible = isWinner ? layer.visible : false;
        const existing = desiredByManaged.get(layer.managedLayerId);
        if (!existing || (isWinner && !existing.isWinner)) {
          desiredByManaged.set(layer.managedLayerId, { visible: shouldBeVisible, isWinner });
        }
      });
      desiredByManaged.forEach((d, managedLayerId) => {
        LayerManager.setLayerVisibility(managedLayerId, d.visible);
      });

      // Fallback for any layers tracked by raw OL reference (no managedLayerId).
      state.allLayers.forEach((layer) => {
        if (layer.managedLayerId || !layer.layer) return;
        const isWinner = winnerIds ? winnerIds.has(layer.id) : true;
        (layer.layer as OpenLayersLayer).setVisible(isWinner ? layer.visible : false);
      });
    },

    setIsLoading: (loading) => {
      set((state) => {
        state.isLoading = loading;
      });
    },

    setHasInitialized: (initialized) => {
      set((state) => {
        state.hasInitialized = initialized;
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
      // Inline save/restore logic in a SINGLE set() to avoid nested set()
      // calls whose changes get overwritten by the outer set().
      const savedStates = get().groupLayerVisibilityStates[group.value];
      const isAllLayersGroup = group.value === "all_layers";

      set((state) => {
        const currentGroup = state.selectedGroup;

        // ── Save current group's visibility states ──
        if (currentGroup) {
          const groupStates: Record<string, boolean> = {};
          if (currentGroup.value === "all_layers") {
            state.allLayers.forEach((layer) => {
              groupStates[layer.id] = layer.visible;
            });
          } else {
            currentGroup.layers.forEach((layer) => {
              const allLayerItem = state.allLayers.find((l) => l.id === layer.id);
              groupStates[layer.id] = allLayerItem ? allLayerItem.visible : layer.visible;
            });
          }
          state.groupLayerVisibilityStates[currentGroup.value] = groupStates;
        }

        // ── Set the new selected group ──
        state.selectedGroup = group;

        // ── Restore the new group's visibility states ──
        const updateVis = (layerId: string, visible: boolean) => {
          const al = state.allLayers.find((l) => l.id === layerId);
          if (al) al.visible = visible;
          state.layerListGroups.forEach((g) => {
            const l = g.layers.find((x) => x.id === layerId);
            if (l) l.visible = visible;
          });
          state.layerFolderGroups.forEach((g) => {
            const l = g.layers.find((x) => x.id === layerId);
            if (l) l.visible = visible;
          });
        };

        if (isAllLayersGroup) {
          if (savedStates) {
            Object.keys(savedStates).forEach((layerId) => {
              updateVis(layerId, savedStates[layerId]);
            });
          }
        } else {
          const currentGroupLayerNames = new Set(group.layers.map((l) => l.name));
          state.allLayers.forEach((layer) => {
            if (!currentGroupLayerNames.has(layer.name)) {
              updateVis(layer.id, false);
            }
          });
          if (savedStates) {
            group.layers.forEach((layer) => {
              if (savedStates.hasOwnProperty(layer.id)) {
                updateVis(layer.id, savedStates[layer.id]);
              } else {
                updateVis(layer.id, layer.visible);
              }
            });
          } else {
            // First visit to this group — default all layers to OFF
            group.layers.forEach((layer) => {
              updateVis(layer.id, false);
            });
          }
        }
      });

      // Update OpenLayers layer visibility AFTER state commit
      const currentState = get();
      if (isAllLayersGroup) {
        // All Layers group: apply each layer's visibility to its own OL layer.
        // In LIST view, the visible "all_layers" group shows only deduped winners;
        // force suppressed duplicates (present in allLayers but not in the group) off.
        const winnerIds = new Set(group.layers.map((l) => l.id));
        const updated = new Set<string>();
        currentState.allLayers.forEach((layer) => {
          if (layer.managedLayerId && !updated.has(layer.managedLayerId)) {
            updated.add(layer.managedLayerId);
            const shouldBeVisible = winnerIds.has(layer.id) ? layer.visible : false;
            LayerManager.setLayerVisibility(layer.managedLayerId, shouldBeVisible);
          } else if (layer.layer && !updated.has(layer.id)) {
            updated.add(layer.id);
            const shouldBeVisible = winnerIds.has(layer.id) ? layer.visible : false;
            (layer.layer as OpenLayersLayer).setVisible(shouldBeVisible);
          }
        });
      } else {
        // Specific group: hide all layers not in this group; show/hide group layers per state.
        // Use layer id (not name) for membership to handle duplicate names correctly.
        const groupLayerIds = new Set(group.layers.map((l) => l.id));
        const updated = new Set<string>();
        currentState.allLayers.forEach((layer) => {
          if (layer.managedLayerId && !updated.has(layer.managedLayerId)) {
            updated.add(layer.managedLayerId);
            const shouldBeVisible = groupLayerIds.has(layer.id) ? layer.visible : false;
            LayerManager.setLayerVisibility(layer.managedLayerId, shouldBeVisible);
          } else if (layer.layer && !updated.has(layer.id)) {
            updated.add(layer.id);
            const shouldBeVisible = groupLayerIds.has(layer.id) ? layer.visible : false;
            (layer.layer as OpenLayersLayer).setVisible(shouldBeVisible);
          }
        });
      }

      // Update map z-indices to match the new group's layer ordering
      get().updateLayerManagerZIndices();
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
        // For "All Layers", update all layers based on their current visibility state.
        // In LIST view, the visible "all_layers" group shows only deduped winners;
        // force suppressed duplicates (present in allLayers but not in the group) off.
        const winnerIds = new Set(group.layers.map((l) => l.id));
        const updatedLayers = new Set<string>();

        currentState.allLayers.forEach((layer) => {
          // Dedup by managedLayerId so each independent OL layer is updated once
          if (layer.managedLayerId && !updatedLayers.has(layer.managedLayerId)) {
            updatedLayers.add(layer.managedLayerId);
            const shouldBeVisible = winnerIds.has(layer.id) ? layer.visible : false;
            LayerManager.setLayerVisibility(layer.managedLayerId, shouldBeVisible);
          } else if (layer.layer && !updatedLayers.has(layer.id)) {
            updatedLayers.add(layer.id);
            const shouldBeVisible = winnerIds.has(layer.id) ? layer.visible : false;
            (layer.layer as OpenLayersLayer).setVisible(shouldBeVisible);
          }
        });
      } else {
        // For specific groups, hide all layers not in this group; show/hide group layers per state.
        // Use layer id (not name) for membership to handle duplicate names correctly.
        const groupLayerIds = new Set(group.layers.map((l) => l.id));
        const updatedLayers = new Set<string>();

        currentState.allLayers.forEach((layer) => {
          // Dedup by managedLayerId so each independent OL layer is updated once
          if (layer.managedLayerId && !updatedLayers.has(layer.managedLayerId)) {
            updatedLayers.add(layer.managedLayerId);
            const shouldBeVisible = groupLayerIds.has(layer.id) ? layer.visible : false;
            LayerManager.setLayerVisibility(layer.managedLayerId, shouldBeVisible);
          } else if (layer.layer && !updatedLayers.has(layer.id)) {
            updatedLayers.add(layer.id);
            const shouldBeVisible = groupLayerIds.has(layer.id) ? layer.visible : false;
            (layer.layer as OpenLayersLayer).setVisible(shouldBeVisible);
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

        // Keep selectedGroup in sync so downstream components get fresh props
        if (state.selectedGroup) {
          const viewGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
          const updatedGroup = viewGroups.find((g) => g.value === state.selectedGroup!.value || g.label === state.selectedGroup!.label);
          if (updatedGroup) {
            state.selectedGroup = updatedGroup;
          }
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

        // Keep selectedGroup in sync so downstream components get fresh props
        if (state.selectedGroup) {
          const viewGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
          const updatedGroup = viewGroups.find((g) => g.value === state.selectedGroup!.value || g.label === state.selectedGroup!.label);
          if (updatedGroup) {
            state.selectedGroup = updatedGroup;
          }
        }
      });

      // Handle OpenLayers layer visibility
      if (targetLayer.managedLayerId) {
        LayerManager.setLayerVisibility(targetLayer.managedLayerId, visible);
      } else if (targetLayer.layer) {
        (targetLayer.layer as OpenLayersLayer).setVisible(visible);
      }
    },

    // Batch update visibility for multiple layers in a single set() call
    updateLayerVisibilitiesBatch: (updates) => {
      if (updates.length === 0) return;

      const state = get();
      const updateMap = new Map(updates.map((u) => [u.layerId, u.visible]));
      const olUpdates: { managedLayerId?: string; layer?: OpenLayersLayer; visible: boolean }[] = [];

      // Capture OL layer info before set()
      for (const { layerId, visible } of updates) {
        const targetLayer = state.allLayers.find((l) => l.id === layerId);
        if (targetLayer && targetLayer.visible !== visible) {
          if (targetLayer.managedLayerId) {
            olUpdates.push({ managedLayerId: targetLayer.managedLayerId, visible });
          } else if (targetLayer.layer) {
            olUpdates.push({ layer: targetLayer.layer as OpenLayersLayer, visible });
          }
        }
      }

      set((state) => {
        const updateInGroups = (groups: TOCLayerGroup[]) => {
          groups.forEach((group) => {
            group.layers.forEach((layer) => {
              const newVisible = updateMap.get(layer.id);
              if (newVisible !== undefined && layer.visible !== newVisible) {
                layer.visible = newVisible;
              }
            });
          });
        };

        updateInGroups(state.layerListGroups);
        updateInGroups(state.layerFolderGroups);

        state.allLayers.forEach((layer) => {
          const newVisible = updateMap.get(layer.id);
          if (newVisible !== undefined) {
            layer.visible = newVisible;
          }
        });

        // Keep selectedGroup in sync
        if (state.selectedGroup) {
          const viewGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
          const updatedGroup = viewGroups.find((g) => g.value === state.selectedGroup!.value || g.label === state.selectedGroup!.label);
          if (updatedGroup) {
            state.selectedGroup = updatedGroup;
          }
        }
      });

      // Apply OL visibility changes after commit
      const seen = new Set<string>();
      olUpdates.forEach(({ managedLayerId, layer, visible }) => {
        if (managedLayerId) {
          if (!seen.has(managedLayerId)) {
            seen.add(managedLayerId);
            LayerManager.setLayerVisibility(managedLayerId, visible);
          }
        } else if (layer) {
          layer.setVisible(visible);
        }
      });
    },

    // Set visibility for ALL layers at once (single Immer set call)
    setAllLayersVisibility: (visible) => {
      // Collect managed layer IDs for OL updates AFTER commit
      const olUpdates: { managedLayerId?: string; layer?: OpenLayersLayer }[] = [];

      set((state) => {
        const updateAllInGroups = (groups: TOCLayerGroup[]) => {
          groups.forEach((group) => {
            group.layers.forEach((layer) => {
              if (layer.visible !== visible) {
                layer.visible = visible;
                // Capture OL info for post-commit update
                if (layer.managedLayerId) {
                  olUpdates.push({ managedLayerId: layer.managedLayerId });
                } else if (layer.layer) {
                  olUpdates.push({ layer: layer.layer as OpenLayersLayer });
                }
              }
            });
          });
        };

        updateAllInGroups(state.layerListGroups);
        updateAllInGroups(state.layerFolderGroups);

        state.allLayers.forEach((layer) => {
          layer.visible = visible;
        });

        // Keep selectedGroup in sync
        if (state.selectedGroup) {
          const viewGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
          const updatedGroup = viewGroups.find((g) => g.value === state.selectedGroup!.value || g.label === state.selectedGroup!.label);
          if (updatedGroup) {
            state.selectedGroup = updatedGroup;
          }
        }
      });

      // Deduplicate and apply OL visibility changes after commit
      const seen = new Set<string>();
      olUpdates.forEach(({ managedLayerId, layer }) => {
        if (managedLayerId) {
          if (!seen.has(managedLayerId)) {
            seen.add(managedLayerId);
            LayerManager.setLayerVisibility(managedLayerId, visible);
          }
        } else if (layer) {
          layer.setVisible(visible);
        }
      });
    },

    // Set visibility for all layers in a specific group (single Immer set call)
    setGroupLayersVisibility: (groupLabel, visible) => {
      // Collect the IDs of layers in the target group
      const state = get();
      const viewGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
      const targetGroup = viewGroups.find((g) => g.label === groupLabel || g.value === groupLabel);
      if (!targetGroup) return;

      const layerIds = new Set(targetGroup.layers.map((l) => l.id));
      const olUpdates: { managedLayerId?: string; layer?: OpenLayersLayer }[] = [];

      set((state) => {
        const updateByIdInGroups = (groups: TOCLayerGroup[]) => {
          groups.forEach((group) => {
            group.layers.forEach((layer) => {
              if (layerIds.has(layer.id) && layer.visible !== visible) {
                layer.visible = visible;
                if (layer.managedLayerId) {
                  olUpdates.push({ managedLayerId: layer.managedLayerId });
                } else if (layer.layer) {
                  olUpdates.push({ layer: layer.layer as OpenLayersLayer });
                }
              }
            });
          });
        };

        updateByIdInGroups(state.layerListGroups);
        updateByIdInGroups(state.layerFolderGroups);

        state.allLayers.forEach((layer) => {
          if (layerIds.has(layer.id)) {
            layer.visible = visible;
          }
        });

        // Keep selectedGroup in sync
        if (state.selectedGroup) {
          const currentViewGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
          const updatedGroup = currentViewGroups.find((g) => g.value === state.selectedGroup!.value || g.label === state.selectedGroup!.label);
          if (updatedGroup) {
            state.selectedGroup = updatedGroup;
          }
        }
      });

      // Deduplicate and apply OL visibility changes after commit
      const seen = new Set<string>();
      olUpdates.forEach(({ managedLayerId, layer }) => {
        if (managedLayerId) {
          if (!seen.has(managedLayerId)) {
            seen.add(managedLayerId);
            LayerManager.setLayerVisibility(managedLayerId, visible);
          }
        } else if (layer) {
          layer.setVisible(visible);
        }
      });
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

          // Update the showLegend state in BOTH view types (id-based)
          set((draft) => {
            updateLayerInAllViews(draft, layer.id, (l) => {
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
          // Top of list (position 0) gets the highest drawIndex (drawn on top),
          // matching the old app convention and OpenLayers z-index semantics.
          const layerCount = layers.length;
          layers.forEach((layer, i) => {
            layer.drawIndex = layerCount - 1 - i;
            layer.index = layerCount - 1 - i;
          });

          // Keep selectedGroup in sync so downstream components get fresh props
          if (state.selectedGroup) {
            const viewGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
            const updatedGroup = viewGroups.find((g) => g.value === state.selectedGroup!.value || g.label === state.selectedGroup!.label);
            if (updatedGroup) {
              state.selectedGroup = updatedGroup;
            }
          }
        }
      });

      // Update LayerManager to match the new TOC order
      const state = get();
      state.updateLayerManagerZIndices();
    },

    addCustomLayer: (layer, groupName) => {
      // Get the OpenLayers layer from the TOCLayer object
      const olLayer = layer.layer as Layer;
      let autoSwitchTargetGroupValue: string | null = null;

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

            // Update indices for all layers — top of array gets highest index
            const count = group.layers.length;
            group.layers.forEach((l, idx) => {
              l.drawIndex = count - 1 - idx;
              l.index = count - 1 - idx;
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

        // If a layer is added to a different LIST group, auto-switch to it so
        // the same visibility/state behavior applies as manual group switching.
        if (state.tocType === "LIST" && state.selectedGroup) {
          const targetGroup = state.layerListGroups.find((g) => g.value === layer.group || g.label === groupName);
          if (targetGroup && targetGroup.value !== state.selectedGroup.value) {
            autoSwitchTargetGroupValue = targetGroup.value;
          }
        }
      });

      if (autoSwitchTargetGroupValue) {
        const targetGroup = get().layerListGroups.find((g) => g.value === autoSwitchTargetGroupValue);
        if (targetGroup) {
          get().switchToGroup(targetGroup);
          // Keep Add Data behavior: newly added layer should be active by default.
          get().updateLayerVisibilityById(layer.id, true);
        }
      }

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

              // Update draw indices — top of array gets highest index
              const count = group.layers.length;
              group.layers.forEach((layer, index) => {
                layer.drawIndex = count - 1 - index;
                layer.index = count - 1 - index;
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

      // Mark that layer loading has started so the loading screen stays
      // visible until the first TOC load completes.
      state.setHasInitialized(true);

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
          state.viewLayerVisibilityStates = {};
        });
      }

      await state.loadLayersFromSources();
    },

    // Add legend fetching function
    fetchLayerLegend: async (layer: TOCLayer, group: TOCLayerGroup) => {
      // Check if already fetching to prevent duplicate requests (id-based)
      const state = get();
      const existingLayer = state.allLayers.find((l) => l.id === layer.id);
      if (existingLayer?.legendFetching) {
        return; // Already fetching, skip
      }

      // Mark as fetching in BOTH view types (id-based)
      set((draft) => {
        updateLayerInAllViews(draft, layer.id, (l) => {
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
                  updateLayerInAllViews(draft, layer.id, (l) => {
                    l.legendImage = blobUrl;
                    l.legendHeight = img.height || 20;
                    l.legendFetching = false;
                  });
                });
              };
              img.onerror = async () => {
                URL.revokeObjectURL(blobUrl);
                set((draft) => {
                  updateLayerInAllViews(draft, layer.id, (l) => {
                    l.legendFetching = false;
                  });
                });
                await get().fetchLayerLegendFromRest(layer, group);
              };
              img.src = blobUrl;
            } catch (authErr) {
              console.warn(`Secured legend fetch failed for ${layer.name}:`, authErr);
              set((draft) => {
                updateLayerInAllViews(draft, layer.id, (l) => {
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
                updateLayerInAllViews(draft, layer.id, (l) => {
                  l.legendImage = layer.styleUrl;
                  l.legendHeight = img.height || 20;
                  l.legendFetching = false;
                });
              });
            };
            img.onerror = async () => {
              set((draft) => {
                updateLayerInAllViews(draft, layer.id, (l) => {
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
          updateLayerInAllViews(draft, layer.id, (l) => {
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

                // Update layer with legend object in BOTH view types (id-based)
                set((draft) => {
                  updateLayerInAllViews(draft, layer.id, (l) => {
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
          updateLayerInAllViews(draft, layer.id, (l) => {
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
          updateLayerInAllViews(draft, layer.id, (l) => {
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
        return Promise.resolve();
      }

      // Track created OpenLayers layers by unique layer ID. The "All Layers"
      // virtual group entries are created via `{ ...layer }` spread and inherit
      // the source group entry's `id`, so they correctly share an OL layer with
      // their source. Two genuinely separate TOC entries (different ids) each
      // get their OWN OL layer \u2014 they're treated as independent layers even
      // when their `name` matches.
      const createdLayers = new Map<string, { layer: Layer; managedLayerId: string }>();

      // Track pending async layer creations so we can resolve once they all settle
      const pendingLayerPromises: Promise<void>[] = [];

      groups.forEach((group) => {
        group.layers.forEach((layer) => {
          // Check if we already created an OpenLayers layer for this layer id
          const existingLayerInfo = createdLayers.get(layer.id);

          if (existingLayerInfo) {
            // Reuse existing OpenLayers layer (same id \u2014 e.g. All Layers mirror)

            // If the layer is still pending (async creation in progress from a
            // previous iteration), skip the immediate store update \u2014 the
            // callback from the first creation already calls
            // updateLayerInGroups which updates ALL entries with matching
            // layer.id across layerListGroups, layerFolderGroups, and allLayers.
            if (!existingLayerInfo.layer) return;

            // Update the layer in the store to reference the shared OpenLayers layer
            set((state) => {
              const currentGroups = state.tocType === "LIST" ? state.layerListGroups : state.layerFolderGroups;
              const currentGroup = currentGroups.find((g) => g.label === group.label);
              if (currentGroup) {
                const currentLayer = currentGroup.layers.find((l) => l.id === layer.id);
                if (currentLayer) {
                  currentLayer.layer = existingLayerInfo.layer;
                  currentLayer.managedLayerId = existingLayerInfo.managedLayerId;
                }
              }

              // Also update in allLayers
              const allLayerItem = state.allLayers.find((l) => l.id === layer.id && l.groupName === group.label);
              if (allLayerItem) {
                allLayerItem.layer = existingLayerInfo.layer;
                allLayerItem.managedLayerId = existingLayerInfo.managedLayerId;
              }
            });
          } else if (!layer.layer && (group.wmsGroupUrl || layer.layerUrl)) {
            // Determine source type and URL for this layer
            // Direct layers (e.g. WMTS) store their own sourceType/URL;
            // GeoServer WMS layers use layer.serverUrl (set by buildLayerFromWMS) to avoid
            // picking up the wrong base URL when layers are merged across source types
            // (e.g. a GeoServer layer merged into a group whose wmsGroupUrl is an ArcGIS URL).
            const isDirectLayer = !!layer.sourceType && !!layer.layerUrl;
            const layerSourceType = isDirectLayer ? (layer.sourceType as OLDataType) : OL_DATA_TYPES.ImageWMS;
            const layerUrl = isDirectLayer
              ? layer.layerUrl!
              : layer.serverUrl
                ? `${layer.serverUrl}wms` // serverUrl has trailing "/", e.g. "https://host/geoserver/"
                : group.wmsGroupUrl.split("/wms")[0] + "/wms";

            // Wrap the callback-style getLayer in a promise so callers can
            // await full layer initialization (no more arbitrary setTimeout waits).
            let resolveLayerPromise: () => void = () => {};
            const layerReadyPromise = new Promise<void>((resolve) => {
              resolveLayerPromise = resolve;
            });
            pendingLayerPromises.push(layerReadyPromise);

            // Reserve this layer.id synchronously BEFORE the async getLayer
            // call. In LIST mode each layer appears twice ("All Layers" copy +
            // source group). Without this, both iterations pass the
            // createdLayers check before either callback fires, causing
            // duplicate LayerManager registrations.
            createdLayers.set(layer.id, { layer: null as unknown as Layer, managedLayerId: "" });

            // Debug log for secured layer detection
            // if (layer.secured) {
            //   console.debug(`[tocStore] Creating secured layer "${layer.name}":`, {
            //     layerSecured: layer.secured,
            //     groupLabel: group.label,
            //     groupValue: group.value,
            //     serverUrl,
            //   });
            // }

            // Create OpenLayers layer
            LayerHelpers.getLayer(
              {
                sourceType: layerSourceType,
                url: layerUrl,
                layerName: layer.name,
                name: layer.name,
                projection: layer.projection || "EPSG:3857",
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
                    // Store the created layer info for reuse (keyed by unique id)
                    createdLayers.set(layer.id, { layer: typedLayer, managedLayerId });

                    // Update all TOC layer entries that share this id (only the
                    // source group entry and its mirror in the All Layers
                    // virtual group). Entries with a different id are intentionally
                    // independent and keep their own OL layer.
                    set((state) => {
                      const updateLayerInGroups = (groups: TOCLayerGroup[]) => {
                        groups.forEach((grp) => {
                          grp.layers.forEach((lyr) => {
                            if (lyr.id === layer.id) {
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
                        if (allLayer.id === layer.id) {
                          allLayer.layer = typedLayer;
                          allLayer.managedLayerId = managedLayerId;
                        }
                      });
                    });
                  }
                } else {
                  console.error("❌ Failed to create OpenLayers layer for:", layer.name);
                }
                resolveLayerPromise();
              },
            );
          }
        });
      });

      return Promise.all(pendingLayerPromises).then(() => undefined);
    },

    // Global opacity: store the value then overwrite every TOC layer's individual opacity
    setGlobalOpacity: (opacity: number) => {
      // Store in LayerManager so the slider display value stays in sync
      useLayerManagerStore.getState().setGlobalOpacity(opacity);

      // Overwrite each TOC layer's stored opacity (matches legacy behaviour)
      const state = get();
      state.allLayers.forEach((layer) => {
        state.updateLayerOpacityById(layer.id, opacity);
      });
    },

    getGlobalOpacity: () => {
      return useLayerManagerStore.getState().getGlobalOpacity();
    },
  })),
);
