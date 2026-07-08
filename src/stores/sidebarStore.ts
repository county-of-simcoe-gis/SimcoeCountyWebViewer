import { create } from "zustand";
import type { SidebarComponent } from "@/utils/config";

/** Canonical tab names in default order. */
const ALL_TAB_NAMES = ["layers", "tools", "mymaps", "themes", "reports"] as const;
export type TabName = (typeof ALL_TAB_NAMES)[number];

export interface SidebarItem {
  id: string;
  name: string;
  type: "theme" | "tool";
  component?: string;
  config?: Record<string, unknown> | string;
  imageName: string;
  description?: string;
  helpLink?: string;
  enabled: boolean;
  secure?: boolean;
}

interface SidebarState {
  // Sidebar visibility and state
  isOpen: boolean;
  isSlim: boolean;
  activeTab: number; // Track which tab is active (0=layers, 1=tools, 2=mymaps, 3=themes, 4=reports)
  activeContentTab: TabName | null; // Override tab content to show (used for hidden tabs)
  activeTheme: string | null;
  activeTool: string | null;

  // Available items (loaded from config)
  themes: SidebarItem[];
  tools: SidebarItem[];

  // Section hide flags (from map config)
  hideLayers: boolean;
  hideTools: boolean;
  hideMyMaps: boolean;
  hideThemes: boolean;
  hideReports: boolean;

  // Panel state
  activePanelId: string | null;
  panelMinimized: boolean;

  // More menu state
  isMoreMenuOpen: boolean;
  /** Which UI element opened the More menu. "sidebar" anchors above the slim sidebar button; "mapControl" anchors below the map control. */
  moreMenuAnchor: "sidebar" | "mapControl";
  /** Viewport-relative position (in px) used when moreMenuAnchor is "mapControl". */
  moreMenuPosition: { top: number; left: number } | null;

  // Actions
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  setActiveTab: (tabIndex: number) => void;
  setActiveTabByName: (tabName: string) => void;
  setActiveContentTab: (tabName: TabName | null) => void;
  setSlimMode: (slim: boolean) => void;
  setActiveTheme: (themeId: string | null) => void;
  setActiveTool: (toolId: string | null) => void;
  setThemes: (themes: SidebarItem[]) => void;
  setTools: (tools: SidebarItem[]) => void;
  setActivePanel: (panelId: string | null) => void;
  togglePanelMinimized: () => void;
  activateSidebarItem: (itemId: string, itemType: "themes" | "tools") => void;
  loadFromConfig: (
    sidebarToolComponents: SidebarComponent[],
    sidebarThemeComponents: SidebarComponent[],
    hideFlags?: { hideLayers?: boolean; hideTools?: boolean; hideMyMaps?: boolean; hideThemes?: boolean; hideReports?: boolean },
  ) => void;
  activateDefaultItems: (defaultTheme?: string, defaultTool?: string) => void;
  openMoreMenu: () => void;
  closeMoreMenu: () => void;
  toggleMoreMenu: () => void;
  /** Open the More menu anchored below a map control button at the given viewport position. */
  openMoreMenuAtMapControl: (position: { top: number; left: number }) => void;
  /** Toggle the More menu from the slim sidebar (default anchor above the sidebar button). */
  toggleMoreMenuFromSidebar: () => void;

  // Pending activation request from external callers (replaces activateSidebarItem event)
  pendingActivation: { itemName: string; itemType: "themes" | "tools"; options?: Record<string, unknown> } | null;
  requestActivateSidebarItem: (itemName: string, itemType: "themes" | "tools", options?: Record<string, unknown>) => void;
  clearPendingActivation: () => void;
}

function convertToSidebarItem(component: SidebarComponent, type: "theme" | "tool"): SidebarItem {
  let config = {};
  try {
    if (component.config) {
      if (typeof component.config === "string") {
        // Skip file path references (e.g. "./configSolidWaste.json") — they aren't inline JSON
        if (!component.config.startsWith("./") && !component.config.startsWith("../")) {
          config = JSON.parse(component.config);
        }
      } else {
        config = component.config;
      }
    }
  } catch {
    // ignore invalid JSON config
  }

  return {
    id: component.id.toString(),
    name: component.name,
    type,
    component: component.componentName,
    imageName: component.imageName,
    description: component.description,
    helpLink: component.helpLink,
    enabled: component.enabled !== false && component.disable !== true, // Default to enabled unless explicitly disabled
    config,
    secure: component.secure ?? false,
  };
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  // Initial state - closed by default (basic mode); opened by Layout when viewerMode is "advanced"
  isOpen: false,
  isSlim: false,
  activeTab: 0,
  activeContentTab: null,
  activeTheme: null,
  activeTool: null,
  themes: [],
  tools: [],
  hideLayers: false,
  hideTools: false,
  hideMyMaps: false,
  hideThemes: false,
  hideReports: false,
  activePanelId: null,
  panelMinimized: false,
  isMoreMenuOpen: false,
  moreMenuAnchor: "sidebar",
  moreMenuPosition: null,
  pendingActivation: null,

  // Actions
  toggleSidebar: () => {
    const newIsOpen = !get().isOpen;
    set({ isOpen: newIsOpen });
  },

  openSidebar: () => set({ isOpen: true }),
  closeSidebar: () => set({ isOpen: false }),
  setActiveTab: (tabIndex) => set({ activeTab: tabIndex, activeContentTab: null }), // Clear content override when selecting a visible tab

  setActiveContentTab: (tabName) => set({ activeContentTab: tabName }),

  setActiveTabByName: (tabName) => {
    const state = get();
    const normalizedName = tabName.toLowerCase().trim();
    const lookup = (normalizedName === "my maps" ? "mymaps" : normalizedName) as TabName;

    // Validate the tab name
    if (!ALL_TAB_NAMES.includes(lookup)) {
      console.warn(`[sidebarStore] setActiveTabByName: unknown tab "${tabName}"`);
      return;
    }

    // Map tab names to their hide flag keys
    const hideFlags: Record<TabName, keyof SidebarState> = {
      layers: "hideLayers",
      tools: "hideTools",
      mymaps: "hideMyMaps",
      themes: "hideThemes",
      reports: "hideReports",
    };

    // Check if the tab is hidden
    const hideFlagKey = hideFlags[lookup];
    const isHidden = hideFlagKey && state[hideFlagKey];

    if (isHidden) {
      // Tab is hidden - use activeContentTab to show its content without making the tab visible
      console.log(`[sidebarStore] setActiveTabByName: tab "${tabName}" is hidden, using activeContentTab`);
      set({ activeContentTab: lookup });
      return;
    }

    // Tab is visible - find its index and activate it normally
    const visibleTabs = ALL_TAB_NAMES.filter((tab) => {
      if (tab === "layers" && state.hideLayers) return false;
      if (tab === "tools" && state.hideTools) return false;
      if (tab === "mymaps" && state.hideMyMaps) return false;
      if (tab === "themes" && state.hideThemes) return false;
      if (tab === "reports" && state.hideReports) return false;
      return true;
    });
    const index = visibleTabs.indexOf(lookup);
    if (index !== -1) {
      set({ activeTab: index, activeContentTab: null });
    }
  },

  setSlimMode: (slim) => set({ isSlim: slim }),
  setActiveTheme: (themeId) => set({ activeTheme: themeId }),
  setActiveTool: (toolId) => set({ activeTool: toolId }),
  setThemes: (themes) => set({ themes }),
  setTools: (tools) => set({ tools }),
  setActivePanel: (panelId) => set({ activePanelId: panelId }),
  togglePanelMinimized: () => set((state) => ({ panelMinimized: !state.panelMinimized })),

  activateSidebarItem: (itemId, itemType) => {
    if (itemType === "themes") {
      // Activate theme (keep tool active if it is)
      set({
        activeTheme: itemId,
        activePanelId: itemId,
      });
    } else if (itemType === "tools") {
      // Activate tool (keep theme active if it is)
      set({
        activeTool: itemId,
        activePanelId: itemId,
      });
    }
  },

  loadFromConfig: (sidebarToolComponents, sidebarThemeComponents, hideFlags) => {
    // Convert and filter enabled tools
    const tools = sidebarToolComponents.filter((component) => component.enabled !== false && component.disable !== true).map((component) => convertToSidebarItem(component, "tool"));

    // Convert and filter enabled themes
    const themes = sidebarThemeComponents.filter((component) => component.enabled !== false && component.disable !== true).map((component) => convertToSidebarItem(component, "theme"));

    set({
      tools,
      themes,
      hideLayers: hideFlags?.hideLayers || false,
      hideTools: hideFlags?.hideTools || false,
      hideMyMaps: hideFlags?.hideMyMaps || false,
      hideThemes: hideFlags?.hideThemes || false,
      hideReports: hideFlags?.hideReports || false,
    });
  },

  activateDefaultItems: (defaultTheme, defaultTool) => {
    const state = get();
    if (defaultTheme) {
      // Find the theme by name or componentName (case-insensitive, matching old app behavior)
      const needle = defaultTheme.toLowerCase();
      const theme = state.themes.find((t) => t.component?.toLowerCase() === needle || t.name.toLowerCase() === needle);
      if (theme) {
        set({
          isOpen: true,
          activeTheme: theme.id,
          activePanelId: theme.id,
        });
        // Use name-based activation so hidden tabs don't shift the index
        get().setActiveTabByName("themes");
      } else {
        console.warn(
          "Default theme not found in loaded themes:",
          defaultTheme,
          "available:",
          state.themes.map((t) => t.name),
        );
      }
    }

    if (defaultTool) {
      // Find the tool by name or componentName (case-insensitive)
      const needle = defaultTool.toLowerCase();
      const tool = state.tools.find((t) => t.component?.toLowerCase() === needle || t.name.toLowerCase() === needle);
      if (tool) {
        set({
          isOpen: true,
          activeTool: tool.id,
          activePanelId: tool.id, // Sets active panel to tool (overwrites theme panel if both provided, matching tab switch)
        });
        // Use name-based activation so hidden tabs don't shift the index
        get().setActiveTabByName("tools");
      } else {
        console.warn(
          "Default tool not found in loaded tools:",
          defaultTool,
          "available:",
          state.tools.map((t) => t.name),
        );
      }
    }
  },

  openMoreMenu: () => set({ isMoreMenuOpen: true }),
  closeMoreMenu: () => set({ isMoreMenuOpen: false }),
  toggleMoreMenu: () => set((state) => ({ isMoreMenuOpen: !state.isMoreMenuOpen })),

  openMoreMenuAtMapControl: (position) => set({ isMoreMenuOpen: true, moreMenuAnchor: "mapControl", moreMenuPosition: position }),

  toggleMoreMenuFromSidebar: () =>
    set((state) => ({
      isMoreMenuOpen: !state.isMoreMenuOpen,
      moreMenuAnchor: "sidebar",
      moreMenuPosition: null,
    })),

  requestActivateSidebarItem: (itemName, itemType, options) => set({ pendingActivation: { itemName, itemType, options } }),

  clearPendingActivation: () => set({ pendingActivation: null }),
}));
