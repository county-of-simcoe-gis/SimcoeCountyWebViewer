import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TOC from "@/components/TOC/TOC";
import { useAppStore } from "@/stores/appStore";
import { useTOCStore } from "@/stores/tocStore";
import type { AppConfig } from "@/utils/config";

// Mock useAppStore
vi.mock("@/stores/appStore", () => ({
  useAppStore: vi.fn(() => ({
    config: null,
    urlParameters: {},
  })),
}));

describe("TOC", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset TOC store
    useTOCStore.setState({
      tocType: "LIST",
      layerListGroups: [],
      layerFolderGroups: [],
    });

    // Reset useAppStore mock
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockReturnValue({
      config: null,
      urlParameters: {},
    });
  });

  it("initializes from config and shows header controls", async () => {
    // Mock useAppStore with config
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockReturnValue({
      config: {
        toc: { tocType: "LIST", sources: [], helpLink: "", default_group: "" },
      } as unknown as AppConfig,
      urlParameters: {},
    });

    render(<TOC visible />);

    await waitFor(() => {
      expect(useTOCStore.getState().tocType).toBe("LIST");
    });

    // Header search input exists
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });

  it("handles URL parameters for TOC configuration", async () => {
    // Mock useAppStore with URL parameters
    const mockUseAppStore = vi.mocked(useAppStore);
    mockUseAppStore.mockReturnValue({
      config: {
        toc: { tocType: "LIST", sources: [], helpLink: "", default_group: "" },
      } as unknown as AppConfig,
      urlParameters: {
        TOCTYPE: "FOLDER",
        GROUP: "environmental",
        LAYERS: "layer1,layer2",
        EXPAND_LEGEND: "true",
      },
    });

    const { container } = render(<TOC visible />);

    // Test passes if component renders without crashing when URL parameters are present
    expect(container).toBeDefined();
    expect(mockUseAppStore).toHaveBeenCalled();

    // Header search input should still exist
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });
});
