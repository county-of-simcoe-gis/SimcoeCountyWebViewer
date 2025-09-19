import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Search from "@/components/Search";
import { useAppStore } from "@/stores/appStore";

// Mock all external dependencies to prevent infinite loops
vi.mock("@/hooks/useConfig", () => ({
  useConfig: () => ({
    config: null, // Start with null config to avoid triggering useEffects
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/utils/helpersHttp", () => ({
  getJSON: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/utils/storage", () => ({
  appendToStorage: vi.fn(),
  getItemsFromStorage: vi.fn().mockReturnValue([]),
}));

vi.mock("@/stores/eventStore", () => ({
  useEventStore: () => ({ emit: vi.fn() }),
}));

vi.mock("@/stores/appStore", () => ({
  useAppStore: vi.fn(() => ({
    urlParameters: {},
  })),
}));

// Mock window.location to prevent URL parameter issues
Object.defineProperty(window, "location", {
  value: {
    search: "",
    href: "http://localhost/",
  },
  writable: true,
});

describe("Search component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Reset useAppStore mock
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockReturnValue({
      urlParameters: {},
    });
  });

  it("renders search input without crashing", () => {
    render(<Search />);
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Search...");
  });

  it("renders with custom placeholder", () => {
    render(<Search placeholder="Custom search..." />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder", "Custom search...");
  });

  it("handles URL parameters properly", () => {
    // Mock useAppStore with URL parameters
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockReturnValue({
      urlParameters: {
        SEARCH: "test search term",
        MUNICIPALITY: "Barrie",
      },
    });

    const { container } = render(<Search />);

    // Test passes if component renders without crashing when URL parameters are present
    expect(container).toBeDefined();
    expect(mockUseAppStore).toHaveBeenCalled();

    // Search input should still exist and function normally
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });
});
