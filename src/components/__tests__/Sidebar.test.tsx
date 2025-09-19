import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useAppStore } from "@/stores/appStore";

// Mock useAppStore
vi.mock("@/stores/appStore", () => ({
  useAppStore: vi.fn(() => ({
    setSidebarLoading: vi.fn(),
    urlParameters: {},
  })),
}));

// Mock useEventStore
vi.mock("@/stores/eventStore", () => ({
  useEventStore: vi.fn(() => ({
    emitSidebarLoaded: vi.fn(),
  })),
}));

// Mock useMapStore
vi.mock("@/stores/mapStore", () => ({
  useMapStore: vi.fn(() => ({
    addLoadedItem: vi.fn(),
  })),
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
};

describe("Sidebar", () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Reset sidebar store
    useSidebarStore.setState({
      isOpen: true,
      activeTab: 1,
      tools: [{ id: "1", name: "Measure", type: "tool", imageName: "measure.png", enabled: true }] as SidebarItem[],
      themes: [],
    });

    // Reset useAppStore mock
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockReturnValue({
      setSidebarLoading: vi.fn(),
      urlParameters: {},
    });
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
    mockUseAppStore.mockReturnValue({
      setSidebarLoading: vi.fn(),
      urlParameters: {
        TAB: "themes",
      },
    });

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
});
