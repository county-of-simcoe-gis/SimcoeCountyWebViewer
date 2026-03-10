import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSidebarStore } from "@/stores/sidebarStore";
import type { SidebarComponent } from "@/utils/config";

const mockToolComponents: SidebarComponent[] = [
  {
    id: 1,
    name: "Measure",
    componentName: "MeasureTool",
    description: "Measure distances",
    imageName: "measure.png",
    enabled: true,
  },
  {
    id: 2,
    name: "Disabled_Tool",
    componentName: "DisabledTool",
    description: "Disabled tool",
    imageName: "disabled.png",
    enabled: false,
  },
];

const mockThemeComponents: SidebarComponent[] = [
  {
    id: 1,
    name: "Forestry",
    componentName: "ForestryTheme",
    description: "Forestry theme",
    imageName: "forestry.png",
    enabled: true,
  },
];

const mockSecureThemeComponents: SidebarComponent[] = [
  {
    id: 1,
    name: "Forestry",
    componentName: "ForestryTheme",
    description: "Forestry theme",
    imageName: "forestry.png",
    enabled: true,
  },
  {
    id: 2,
    name: "SecureTheme",
    componentName: "SecureThemeComponent",
    description: "Secure theme",
    imageName: "secure.png",
    enabled: true,
    secure: true,
  },
];

beforeEach(() => {
  useSidebarStore.setState({
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
  });
});

describe("sidebarStore", () => {
  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useSidebarStore.getState();

      expect(state.isOpen).toBe(true);
      expect(state.isSlim).toBe(false);
      expect(state.activeTab).toBe(0);
      expect(state.activeTheme).toBeNull();
      expect(state.activeTool).toBeNull();
      expect(state.themes).toEqual([]);
      expect(state.tools).toEqual([]);
      expect(state.activePanelId).toBeNull();
      expect(state.panelMinimized).toBe(false);
    });
  });

  describe("Sidebar Management", () => {
    it("should toggle sidebar via action", () => {
      const { toggleSidebar } = useSidebarStore.getState();
      expect(useSidebarStore.getState().isOpen).toBe(true);

      toggleSidebar();
      expect(useSidebarStore.getState().isOpen).toBe(false);

      toggleSidebar();
      expect(useSidebarStore.getState().isOpen).toBe(true);
    });

    it("should call event emitter when toggling", () => {
      const mockEmitter = vi.fn();
      useSidebarStore.getState().setEventEmitter(mockEmitter);

      useSidebarStore.getState().toggleSidebar();
      expect(mockEmitter).toHaveBeenCalledWith(false);

      useSidebarStore.getState().toggleSidebar();
      expect(mockEmitter).toHaveBeenCalledWith(true);
    });

    it("should open and close sidebar via actions", () => {
      const { openSidebar, closeSidebar } = useSidebarStore.getState();

      closeSidebar();
      expect(useSidebarStore.getState().isOpen).toBe(false);

      openSidebar();
      expect(useSidebarStore.getState().isOpen).toBe(true);
    });
  });

  describe("Active Items", () => {
    it("should activate theme and deactivate tool via action", () => {
      useSidebarStore.setState({ activeTool: "tool1", activeTheme: null, activePanelId: null });

      useSidebarStore.getState().activateSidebarItem("theme1", "themes");

      const state = useSidebarStore.getState();
      expect(state.activeTheme).toBe("theme1");
      expect(state.activeTool).toBeNull();
      expect(state.activePanelId).toBe("theme1");
    });

    it("should activate tool and deactivate theme via action", () => {
      useSidebarStore.setState({ activeTheme: "theme1", activeTool: null, activePanelId: null });

      useSidebarStore.getState().activateSidebarItem("tool1", "tools");

      const state = useSidebarStore.getState();
      expect(state.activeTool).toBe("tool1");
      expect(state.activeTheme).toBeNull();
      expect(state.activePanelId).toBe("tool1");
    });
  });

  describe("Config Loading via loadFromConfig", () => {
    it("should load enabled tools and filter disabled ones", () => {
      useSidebarStore.getState().loadFromConfig(mockToolComponents, []);

      const state = useSidebarStore.getState();
      expect(state.tools).toHaveLength(1);
      expect(state.tools[0]).toMatchObject({
        id: "1",
        name: "Measure",
        type: "tool",
        component: "MeasureTool",
        enabled: true,
      });
    });

    it("should load enabled themes", () => {
      useSidebarStore.getState().loadFromConfig([], mockThemeComponents);

      const state = useSidebarStore.getState();
      expect(state.themes).toHaveLength(1);
      expect(state.themes[0]).toMatchObject({
        id: "1",
        name: "Forestry",
        type: "theme",
        component: "ForestryTheme",
        enabled: true,
      });
    });

    it("should propagate secure flag to SidebarItem", () => {
      useSidebarStore.getState().loadFromConfig([], mockSecureThemeComponents);

      const state = useSidebarStore.getState();
      expect(state.themes).toHaveLength(2);
      expect(state.themes[0].secure).toBe(false);
      expect(state.themes[1].secure).toBe(true);
    });

    it("should apply hide flags", () => {
      useSidebarStore.getState().loadFromConfig([], [], {
        hideLayers: true,
        hideTools: true,
        hideMyMaps: false,
        hideThemes: false,
        hideReports: true,
      });

      const state = useSidebarStore.getState();
      expect(state.hideLayers).toBe(true);
      expect(state.hideTools).toBe(true);
      expect(state.hideMyMaps).toBe(false);
      expect(state.hideThemes).toBe(false);
      expect(state.hideReports).toBe(true);
    });
  });

  describe("setActiveTabByName", () => {
    it("should set correct index for all default tabs", () => {
      const { setActiveTabByName } = useSidebarStore.getState();

      setActiveTabByName("layers");
      expect(useSidebarStore.getState().activeTab).toBe(0);

      setActiveTabByName("tools");
      expect(useSidebarStore.getState().activeTab).toBe(1);

      setActiveTabByName("mymaps");
      expect(useSidebarStore.getState().activeTab).toBe(2);

      setActiveTabByName("themes");
      expect(useSidebarStore.getState().activeTab).toBe(3);

      setActiveTabByName("reports");
      expect(useSidebarStore.getState().activeTab).toBe(4);
    });

    it('should handle "my maps" alias', () => {
      useSidebarStore.getState().setActiveTabByName("my maps");
      expect(useSidebarStore.getState().activeTab).toBe(2);
    });

    it("should be case-insensitive", () => {
      useSidebarStore.getState().setActiveTabByName("Themes");
      expect(useSidebarStore.getState().activeTab).toBe(3);

      useSidebarStore.getState().setActiveTabByName("TOOLS");
      expect(useSidebarStore.getState().activeTab).toBe(1);
    });

    it("should adjust index when preceding tabs are hidden", () => {
      // Hide layers (index 0) and tools (index 1)
      useSidebarStore.setState({ hideLayers: true, hideTools: true });

      // Now visible tabs are: mymaps(0), themes(1), reports(2)
      useSidebarStore.getState().setActiveTabByName("mymaps");
      expect(useSidebarStore.getState().activeTab).toBe(0);

      useSidebarStore.getState().setActiveTabByName("themes");
      expect(useSidebarStore.getState().activeTab).toBe(1);

      useSidebarStore.getState().setActiveTabByName("reports");
      expect(useSidebarStore.getState().activeTab).toBe(2);
    });

    it("should warn and not change tab for hidden tab names", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      useSidebarStore.setState({ hideTools: true, activeTab: 0 });

      useSidebarStore.getState().setActiveTabByName("tools");
      expect(useSidebarStore.getState().activeTab).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("should warn for unknown tab names", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      useSidebarStore.setState({ activeTab: 0 });

      useSidebarStore.getState().setActiveTabByName("nonexistent");
      expect(useSidebarStore.getState().activeTab).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("activateDefaultItems", () => {
    beforeEach(() => {
      // Load themes and tools first
      useSidebarStore.getState().loadFromConfig(mockToolComponents, mockThemeComponents);
    });

    it("should activate a default theme by componentName", () => {
      useSidebarStore.getState().activateDefaultItems("ForestryTheme");

      const state = useSidebarStore.getState();
      expect(state.activeTheme).toBe("1");
      expect(state.activeTool).toBeNull();
      expect(state.activeTab).toBe(3); // themes tab
    });

    it("should activate a default theme by name", () => {
      useSidebarStore.getState().activateDefaultItems("Forestry");

      const state = useSidebarStore.getState();
      expect(state.activeTheme).toBe("1");
    });

    it("should activate a default tool by componentName", () => {
      useSidebarStore.getState().activateDefaultItems(undefined, "MeasureTool");

      const state = useSidebarStore.getState();
      expect(state.activeTool).toBe("1");
      expect(state.activeTheme).toBeNull();
      expect(state.activeTab).toBe(1); // tools tab
    });

    it("should prefer theme over tool when both provided", () => {
      useSidebarStore.getState().activateDefaultItems("ForestryTheme", "MeasureTool");

      const state = useSidebarStore.getState();
      expect(state.activeTheme).toBe("1");
      expect(state.activeTool).toBeNull();
    });

    it("should warn when default theme not found", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      useSidebarStore.getState().activateDefaultItems("NonExistentTheme");

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("not found"), "NonExistentTheme", "available:", expect.any(Array));
    });

    it("should adjust tab index for hidden tabs", () => {
      useSidebarStore.setState({ hideLayers: true, hideTools: true });
      useSidebarStore.getState().activateDefaultItems("ForestryTheme");

      // themes is now index 1 (visible: mymaps=0, themes=1, reports=2)
      expect(useSidebarStore.getState().activeTab).toBe(1);
    });
  });

  describe("More Menu", () => {
    it("should open, close, and toggle more menu", () => {
      const { openMoreMenu, closeMoreMenu, toggleMoreMenu } = useSidebarStore.getState();

      openMoreMenu();
      expect(useSidebarStore.getState().isMoreMenuOpen).toBe(true);

      closeMoreMenu();
      expect(useSidebarStore.getState().isMoreMenuOpen).toBe(false);

      toggleMoreMenu();
      expect(useSidebarStore.getState().isMoreMenuOpen).toBe(true);

      toggleMoreMenu();
      expect(useSidebarStore.getState().isMoreMenuOpen).toBe(false);
    });
  });

  describe("Event Emitter", () => {
    it("should support event emitter integration", () => {
      const mockEmitter = vi.fn();

      useSidebarStore.getState().setEventEmitter(mockEmitter);

      const state = useSidebarStore.getState();
      expect(state.emitSidebarChanged).toBe(mockEmitter);
    });
  });
});
