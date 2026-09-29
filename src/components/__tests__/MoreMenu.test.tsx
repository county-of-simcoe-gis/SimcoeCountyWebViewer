import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MoreMenu from "@/components/MoreMenu";
import { useSidebarStore } from "@/stores/sidebarStore";

// Mock next-auth session controller
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock stores/utilities that MoreMenu touches
vi.mock("@/stores/appStore", () => ({
  useAppStore: vi.fn((selector?: any) => {
    const state = { config: {} as Record<string, unknown> };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

vi.mock("@/stores/mapStore", () => ({
  useMapStore: vi.fn((selector?: any) => {
    const state = { map: null };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

vi.mock("@/stores/legendStore", () => ({
  useLegendStore: vi.fn((selector?: any) => {
    const state = { openLegend: vi.fn() };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

vi.mock("@/stores/tocStore", () => ({
  useTOCStore: Object.assign(
    vi.fn((selector?: any) => {
      const state = { tocType: "LIST", layerListGroups: [], layerFolderGroups: [], getAllVisibleLayers: () => [] };
      return typeof selector === "function" ? selector(state) : state;
    }),
    {
      getState: () => ({
        tocType: "LIST",
        layerListGroups: [],
        layerFolderGroups: [],
        getAllVisibleLayers: () => [],
      }),
    },
  ),
}));

vi.mock("@/utils/mapHelpers", () => ({
  showFeedbackWindow: vi.fn(),
}));

vi.mock("@/utils/helpersUI", () => ({
  showURLWindow: vi.fn(),
  showHelpWindow: vi.fn(),
}));

vi.mock("@/components/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle-mock">ThemeToggle</div>,
}));

type SidebarItem = {
  id: string;
  name: string;
  type: "theme" | "tool";
  component?: string;
  imageName: string;
  enabled: boolean;
  secure?: boolean;
};

function resetStore(overrides: Partial<ReturnType<typeof useSidebarStore.getState>> = {}) {
  useSidebarStore.setState({
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
    isMoreMenuOpen: true,
    moreMenuAnchor: "sidebar",
    moreMenuPosition: null,
    pendingActivation: null,
    ...overrides,
  });
}

describe("MoreMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    resetStore();
  });

  it("renders nothing when isMoreMenuOpen is false", () => {
    resetStore({ isMoreMenuOpen: false });
    const { container } = render(<MoreMenu />);
    // Portal target: only the modal/menu content should be absent
    expect(container.querySelector("ul")).toBeNull();
    expect(screen.queryByText("MAP THEMES")).not.toBeInTheDocument();
  });

  it("renders sections when opened", () => {
    resetStore({
      themes: [{ id: "t1", name: "Forestry", type: "theme", imageName: "f.png", enabled: true } as SidebarItem],
      tools: [{ id: "tl1", name: "Measure", type: "tool", imageName: "m.png", enabled: true } as SidebarItem],
    });
    render(<MoreMenu />);
    expect(screen.getByText("MAP THEMES")).toBeInTheDocument();
    expect(screen.getByText("MAP TOOLS")).toBeInTheDocument();
    expect(screen.getByText("MY MAPS")).toBeInTheDocument();
    expect(screen.getByText("Forestry")).toBeInTheDocument();
    expect(screen.getByText("Measure")).toBeInTheDocument();
  });

  it("renders a single pinned 'Take a Screenshot' item at the top", () => {
    resetStore({
      themes: [{ id: "t1", name: "Forestry", type: "theme", imageName: "f.png", enabled: true } as SidebarItem],
      tools: [{ id: "tl1", name: "Measure", type: "tool", imageName: "m.png", enabled: true } as SidebarItem],
    });
    const { container } = render(<MoreMenu />);
    // Only one Take a Screenshot entry
    expect(screen.getAllByText("Take a Screenshot")).toHaveLength(1);
    // It should be the first list item in the menu
    const list = container.ownerDocument.querySelector("ul");
    const firstItem = list?.querySelector("li");
    expect(firstItem?.textContent).toContain("Take a Screenshot");
  });

  describe("Secure filtering", () => {
    it("hides secure themes/tools when unauthenticated", () => {
      resetStore({
        themes: [
          { id: "t1", name: "PublicTheme", type: "theme", imageName: "p.png", enabled: true, secure: false } as SidebarItem,
          { id: "t2", name: "SecureTheme", type: "theme", imageName: "s.png", enabled: true, secure: true } as SidebarItem,
        ],
        tools: [
          { id: "tl1", name: "PublicTool", type: "tool", imageName: "p.png", enabled: true, secure: false } as SidebarItem,
          { id: "tl2", name: "SecureTool", type: "tool", imageName: "s.png", enabled: true, secure: true } as SidebarItem,
        ],
      });
      render(<MoreMenu />);
      expect(screen.getByText("PublicTheme")).toBeInTheDocument();
      expect(screen.queryByText("SecureTheme")).not.toBeInTheDocument();
      expect(screen.getByText("PublicTool")).toBeInTheDocument();
      expect(screen.queryByText("SecureTool")).not.toBeInTheDocument();
    });

    it("shows secure items when authenticated", () => {
      mockUseSession.mockReturnValue({ data: { user: { name: "Test" } }, status: "authenticated" });
      resetStore({
        themes: [{ id: "t2", name: "SecureTheme", type: "theme", imageName: "s.png", enabled: true, secure: true } as SidebarItem],
        tools: [{ id: "tl2", name: "SecureTool", type: "tool", imageName: "s.png", enabled: true, secure: true } as SidebarItem],
      });
      render(<MoreMenu />);
      expect(screen.getByText("SecureTheme")).toBeInTheDocument();
      expect(screen.getByText("SecureTool")).toBeInTheDocument();
    });
  });

  describe("Hide flags", () => {
    it("hides themes section when hideThemes is true", () => {
      resetStore({
        hideThemes: true,
        themes: [{ id: "t1", name: "Forestry", type: "theme", imageName: "f.png", enabled: true } as SidebarItem],
      });
      render(<MoreMenu />);
      expect(screen.queryByText("MAP THEMES")).not.toBeInTheDocument();
      expect(screen.queryByText("Forestry")).not.toBeInTheDocument();
    });

    it("hides configured tools and MAP TOOLS heading when hideTools is true", () => {
      resetStore({
        hideTools: true,
        tools: [{ id: "tl1", name: "Measure", type: "tool", imageName: "m.png", enabled: true } as SidebarItem],
      });
      render(<MoreMenu />);
      expect(screen.queryByText("MAP TOOLS")).not.toBeInTheDocument();
      expect(screen.queryByText("Measure")).not.toBeInTheDocument();
      // Pinned screenshot remains at the top of the menu
      expect(screen.getByText("Take a Screenshot")).toBeInTheDocument();
    });

    it("hides My Maps section when hideMyMaps is true", () => {
      resetStore({ hideMyMaps: true });
      render(<MoreMenu />);
      expect(screen.queryByText("MY MAPS")).not.toBeInTheDocument();
    });
  });

  describe("Activation", () => {
    it("clicking a theme requests activation, opens sidebar, and closes menu", () => {
      resetStore({
        themes: [{ id: "t1", name: "Forestry", type: "theme", imageName: "f.png", enabled: true } as SidebarItem],
      });

      render(<MoreMenu />);
      fireEvent.click(screen.getByText("Forestry"));

      const state = useSidebarStore.getState();
      expect(state.isMoreMenuOpen).toBe(false);
      expect(state.isOpen).toBe(true);
      expect(state.pendingActivation).toEqual({ itemName: "Forestry", itemType: "themes", options: undefined });
    });

    it("clicking a tool requests activation with type 'tools'", () => {
      resetStore({
        tools: [{ id: "tl1", name: "Measure", type: "tool", imageName: "m.png", enabled: true } as SidebarItem],
      });

      render(<MoreMenu />);
      fireEvent.click(screen.getByText("Measure"));

      const state = useSidebarStore.getState();
      expect(state.pendingActivation).toEqual({ itemName: "Measure", itemType: "tools", options: undefined });
      expect(state.isOpen).toBe(true);
      expect(state.isMoreMenuOpen).toBe(false);
    });

    it("clicking My Maps uses setActiveTabByName for the correct visible index", () => {
      // Hide layers + tools so mymaps is visible at index 0
      resetStore({ hideLayers: true, hideTools: true });

      render(<MoreMenu />);
      fireEvent.click(screen.getByText("My Maps"));

      const state = useSidebarStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.isMoreMenuOpen).toBe(false);
      expect(state.activeTab).toBe(0); // mymaps is now the first visible tab
    });
  });

  describe("Anchor positioning", () => {
    it("uses absolute sidebar positioning when anchor is 'sidebar'", () => {
      resetStore({ moreMenuAnchor: "sidebar" });
      const { container } = render(<MoreMenu />);
      const list = container.ownerDocument.querySelector("ul");
      expect(list).not.toBeNull();
      expect(list!.className).toContain("absolute");
      expect(list!.className).toContain("bottom-[70px]");
      expect(list!.getAttribute("style")).toBeFalsy();
    });

    it("uses fixed positioning with computed top/left when anchor is 'mapControl'", () => {
      resetStore({
        moreMenuAnchor: "mapControl",
        moreMenuPosition: { top: 42, left: 99 },
      });
      const { container } = render(<MoreMenu />);
      const list = container.ownerDocument.querySelector("ul");
      expect(list).not.toBeNull();
      expect(list!.className).toContain("fixed");
      expect(list!.getAttribute("style")).toMatch(/top:\s*42px/);
      expect(list!.getAttribute("style")).toMatch(/left:\s*99px/);
    });
  });

  describe("Escape to close", () => {
    it("closes menu when Escape is pressed", () => {
      resetStore();
      render(<MoreMenu />);
      expect(useSidebarStore.getState().isMoreMenuOpen).toBe(true);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(useSidebarStore.getState().isMoreMenuOpen).toBe(false);
    });
  });
});
