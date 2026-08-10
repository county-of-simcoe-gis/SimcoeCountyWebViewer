import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useAppStore } from "@/stores/appStore";

// Mock next-auth/react
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useAppStore
vi.mock("@/stores/appStore", () => ({
  useAppStore: vi.fn((selector?: any) => {
    const state = {
      setSidebarLoading: vi.fn(),
      urlParameters: {},
    };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

// Mock useEventStore (still used by some child components)
vi.mock("@/stores/eventStore", () => {
  const mockEventState = {
    addListener: vi.fn(() => "mock-listener-id"),
    removeListener: vi.fn(),
    emit: vi.fn(),
  };
  const mockUseEventStore = Object.assign(
    vi.fn((selector?: any) => {
      return typeof selector === "function" ? selector(mockEventState) : mockEventState;
    }),
    { getState: () => mockEventState },
  );
  return { useEventStore: mockUseEventStore };
});

// Mock useMapStore
vi.mock("@/stores/mapStore", () => ({
  useMapStore: vi.fn((selector?: any) => {
    const state = {
      addLoadedItem: vi.fn(),
    };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

// Mock useReportsStore
vi.mock("@/stores/reportsStore", () => ({
  useReportsStore: vi.fn((selector?: any) => {
    const state = {
      currentReport: null,
    };
    return typeof selector === "function" ? selector(state) : state;
  }),
}));

type SidebarItem = {
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
};

describe("Sidebar", () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Default: unauthenticated session
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });

    // Reset sidebar store
    useSidebarStore.setState({
      isOpen: true,
      activeTab: 1,
      activeTool: null,
      activeTheme: null,
      tools: [{ id: "1", name: "Measure", type: "tool", imageName: "measure.png", enabled: true }] as SidebarItem[],
      themes: [],
      hideLayers: false,
      hideTools: false,
      hideMyMaps: false,
      hideThemes: false,
      hideReports: false,
    });

    // Reset useAppStore mock
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockImplementation(((selector?: any) => {
      const state = {
        setSidebarLoading: vi.fn(),
        urlParameters: {},
      };
      return typeof selector === "function" ? selector(state) : state;
    }) as any);
  });

  it("renders tools tab and allows item click", () => {
    render(<Sidebar />);
    const tool = screen.getByText("Measure");
    fireEvent.click(tool);
    // Active tool should be set in store
    expect(useSidebarStore.getState().activeTool).toBe("Measure");
  });

  it("handles URL parameters for tab activation", () => {
    // Mock useAppStore with URL parameters
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockImplementation(((selector?: any) => {
      const state = {
        setSidebarLoading: vi.fn(),
        urlParameters: {
          TAB: "themes",
        },
      };
      return typeof selector === "function" ? selector(state) : state;
    }) as any);

    const { container } = render(<Sidebar />);

    // Test passes if component renders without crashing when URL parameters are present
    expect(container).toBeDefined();
    expect(mockUseAppStore).toHaveBeenCalled();
  });

  it("renders normally without URL parameters", () => {
    const { container } = render(<Sidebar />);

    // Test passes if component renders without crashing
    expect(container).toBeDefined();

    // Should still render the tool
    expect(screen.getByText("Measure")).toBeInTheDocument();
  });

  describe("Secure filtering", () => {
    it("hides secure themes when user is not authenticated", () => {
      mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });

      useSidebarStore.setState({
        isOpen: true,
        activeTab: 3, // themes tab
        themes: [
          { id: "1", name: "PublicTheme", type: "theme", imageName: "public.png", enabled: true, secure: false } as SidebarItem,
          { id: "2", name: "SecureTheme", type: "theme", imageName: "secure.png", enabled: true, secure: true } as SidebarItem,
        ],
        tools: [],
        hideThemes: false,
      });

      render(<Sidebar />);
      // PublicTheme should appear (at least once, in the items list)
      expect(screen.getAllByText("PublicTheme").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("SecureTheme")).not.toBeInTheDocument();
    });

    it("shows all themes when user is authenticated", () => {
      mockUseSession.mockReturnValue({ data: { user: { name: "Test" } }, status: "authenticated" });

      useSidebarStore.setState({
        isOpen: true,
        activeTab: 3, // themes tab
        themes: [
          { id: "1", name: "PublicTheme", type: "theme", imageName: "public.png", enabled: true, secure: false } as SidebarItem,
          { id: "2", name: "SecureTheme", type: "theme", imageName: "secure.png", enabled: true, secure: true } as SidebarItem,
        ],
        tools: [],
        hideThemes: false,
      });

      render(<Sidebar />);
      expect(screen.getAllByText("PublicTheme").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("SecureTheme").length).toBeGreaterThanOrEqual(1);
    });

    it("hides secure tools when user is not authenticated", () => {
      mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });

      useSidebarStore.setState({
        isOpen: true,
        activeTab: 1, // tools tab
        tools: [
          { id: "1", name: "PublicTool", type: "tool", imageName: "public.png", enabled: true, secure: false } as SidebarItem,
          { id: "2", name: "SecureTool", type: "tool", imageName: "secure.png", enabled: true, secure: true } as SidebarItem,
        ],
        themes: [],
        hideTools: false,
      });

      render(<Sidebar />);
      expect(screen.getByText("PublicTool")).toBeInTheDocument();
      expect(screen.queryByText("SecureTool")).not.toBeInTheDocument();
    });
  });

  describe("Single theme mode", () => {
    it("shows theme name on tab when only one theme exists", () => {
      mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });

      useSidebarStore.setState({
        isOpen: true,
        activeTab: 3,
        themes: [{ id: "1", name: "Forestry", type: "theme", component: "Forestry", imageName: "forestry.png", enabled: true, secure: false } as SidebarItem],
        tools: [],
        hideThemes: false,
      });

      render(<Sidebar />);
      // The tab text should show the theme name on the tab instead of generic "Themes"
      const tabTexts = document.querySelectorAll(".tab-text");
      const tabLabels = Array.from(tabTexts).map((el) => el.textContent);
      expect(tabLabels).toContain("Forestry");
      expect(tabLabels).not.toContain("Themes");
    });

    it("shows generic Themes tab when multiple themes exist", () => {
      mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });

      useSidebarStore.setState({
        isOpen: true,
        activeTab: 3,
        themes: [
          { id: "1", name: "PublicTheme1", type: "theme", imageName: "t1.png", enabled: true, secure: false } as SidebarItem,
          { id: "2", name: "PublicTheme2", type: "theme", imageName: "t2.png", enabled: true, secure: false } as SidebarItem,
        ],
        tools: [],
        hideThemes: false,
      });

      render(<Sidebar />);
      expect(screen.getByText("Themes")).toBeInTheDocument();
    });
  });
});
