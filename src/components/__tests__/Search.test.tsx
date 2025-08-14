import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Search from "@/components/Search";

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

vi.mock("@/utils/helpersUrl", () => ({
  getURLParameter: vi.fn().mockReturnValue(null),
}));

vi.mock("@/utils/storage", () => ({
  appendToStorage: vi.fn(),
  getItemsFromStorage: vi.fn().mockReturnValue([]),
}));

vi.mock("@/stores/eventStore", () => ({
  useEventStore: () => ({ emit: vi.fn() }),
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
});
