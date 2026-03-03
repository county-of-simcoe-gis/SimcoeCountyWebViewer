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
  config?: Record<string, unknown>;
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

  // Actions
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  setActiveTab: (tabIndex: number) => void;
  setActiveTabByName: (tabName: string) => void;
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

  // Event emitters (integrate with event store when available)
  emitSidebarChanged?: (isOpen: boolean) => void;
  setEventEmitter: (emitter: (isOpen: boolean) => void) => void;
}

function convertToSidebarItem(component: SidebarComponent, type: "theme" | "tool"): SidebarItem {
  return {
    id: component.id.toString(),
    name: component.name,
    type,
    component: component.componentName,
    imageName: component.imageName,
    description: component.description,
    helpLink: component.helpLink,
    enabled: component.enabled !== false && component.disable !== true, // Default to enabled unless explicitly disabled
    config: {},
    secure: component.secure ?? false,
  };
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  // Initial state
  isOpen: true,
  isSlim: false,
  activeTab: 0,
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
  emitSidebarChanged: undefined,

  // Actions
  toggleSidebar: () => {
    const state = get();
    const newIsOpen = !state.isOpen;
    set({ isOpen: newIsOpen });

    // Emit sidebar changed event if emitter is available
    if (state.emitSidebarChanged) {
      state.emitSidebarChanged(newIsOpen);
    }
  },

  openSidebar: () => set({ isOpen: true }),
  closeSidebar: () => set({ isOpen: false }),
  setActiveTab: (tabIndex) => set({ activeTab: tabIndex }),

  setActiveTabByName: (tabName) => {
    const state = get();
    const normalizedName = tabName.toLowerCase().trim();
    // Build the same visible-tabs list the Sidebar component uses
    const visibleTabs = ALL_TAB_NAMES.filter((tab) => {
      if (tab === "layers" && state.hideLayers) return false;
      if (tab === "tools" && state.hideTools) return false;
      if (tab === "mymaps" && state.hideMyMaps) return false;
      if (tab === "themes" && state.hideThemes) return false;
      if (tab === "reports" && state.hideReports) return false;
      return true;
    });
    const lookup = normalizedName === "my maps" ? "mymaps" : normalizedName;
    const index = visibleTabs.indexOf(lookup as TabName);
    if (index !== -1) {
      set({ activeTab: index });
    } else {
      console.warn(`[sidebarStore] setActiveTabByName: unknown or hidden tab "${tabName}"`);
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
      // Deactivate current tool and activate theme
      set({
        activeTheme: itemId,
        activeTool: null,
        activePanelId: itemId,
      });
    } else if (itemType === "tools") {
      // Deactivate current theme and activate tool
      set({
        activeTool: itemId,
        activeTheme: null,
        activePanelId: itemId,
      });
    }
  },

  loadFromConfig: (sidebarToolComponents, sidebarThemeComponents, hideFlags) => {
    // Convert and filter enabled tools
    const tools = sidebarToolComponents.filter((component) => component.enabled !== false && component.disable !== true).map((component) => convertToSidebarItem(component, "tool"));

    // Convert and filter enabled themes
    const themes = sidebarThemeComponents.filter((component) => component.enabled !== false && component.disable !== true).map((component) => convertToSidebarItem(component, "theme"));

    console.log("Sidebar store loadFromConfig:", {
      rawTools: sidebarToolComponents.length,
      filteredTools: tools.length,
      rawThemes: sidebarThemeComponents.length,
      filteredThemes: themes.length,
      hideFlags: hideFlags || {},
    });

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
      // Find the theme by componentName (matching old app behavior)
      const theme = state.themes.find((t) => t.component === defaultTheme || t.name === defaultTheme);
      if (theme) {
        console.log("Activating default theme:", defaultTheme, "-> id:", theme.id);
        set({
          activeTheme: theme.id,
          activeTool: null,
          activePanelId: theme.id,
        });
        // Use name-based activation so hidden tabs don't shift the index
        get().setActiveTabByName("themes");
      } else {
        console.warn("Default theme not found in loaded themes:", defaultTheme);
      }
    } else if (defaultTool) {
      // Find the tool by componentName
      const tool = state.tools.find((t) => t.component === defaultTool || t.name === defaultTool);
      if (tool) {
        console.log("Activating default tool:", defaultTool, "-> id:", tool.id);
        set({
          activeTool: tool.id,
          activeTheme: null,
          activePanelId: tool.id,
        });
        // Use name-based activation so hidden tabs don't shift the index
        get().setActiveTabByName("tools");
      } else {
        console.warn("Default tool not found in loaded tools:", defaultTool);
      }
    }
  },

  openMoreMenu: () => set({ isMoreMenuOpen: true }),
  closeMoreMenu: () => set({ isMoreMenuOpen: false }),
  toggleMoreMenu: () => set((state) => ({ isMoreMenuOpen: !state.isMoreMenuOpen })),

  setEventEmitter: (emitter) => set({ emitSidebarChanged: emitter }),
}));
