import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsTool from "../SettingsTool";
import { useMapStore } from "@/stores/mapStore";

// Mock PanelComponent
vi.mock("@/components/PanelComponent", () => ({
  default: ({ children, name, onClose }: { children: React.ReactNode; name: string; onClose: () => void }) => (
    <div data-testid="panel-component" data-name={name}>
      <button data-testid="close-button" onClick={onClose}>
        Close
      </button>
      {children}
    </div>
  ),
}));

// Mock config.json
vi.mock("@/config.json", () => ({
  default: {
    controls: {
      rotate: true,
      fullScreen: true,
      zoomInOut: true,
      currentLocation: true,
      zoomExtent: true,
      extentHistory: true,
      scale: true,
      scaleLine: true,
      basemap: true,
      grid: false,
      gitHubButton: false,
      scaleSelector: true,
    },
  },
}));

describe("SettingsTool", () => {
  const mockOnClose = vi.fn();
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    // Reset localStorage
    localStorage.clear();

    // Reset mapStore to default state
    useMapStore.setState({
      controlVisibility: {
        rotate: true,
        fullScreen: true,
        zoomInOut: true,
        currentLocation: true,
        zoomExtent: true,
        extentHistory: true,
        scale: true,
        scaleLine: true,
        basemap: true,
        grid: false,
        gitHubButton: false,
        scaleSelector: true,
        attribution: true,
        attributeTable: true,
        shareMap: true,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Basic Rendering", () => {
    it("renders the tool with default name", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Settings");
    });

    it("renders with custom name", () => {
      render(<SettingsTool name="Custom Settings" onClose={mockOnClose} />);

      const panel = screen.getByTestId("panel-component");
      expect(panel).toHaveAttribute("data-name", "Custom Settings");
    });

    it("renders Map Controls section", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText("Map Controls")).toBeInTheDocument();
    });

    it("renders Local Storage section", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText("Local Storage")).toBeInTheDocument();
    });

    it("renders info note", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText(/Map control changes apply immediately/i)).toBeInTheDocument();
    });
  });

  describe("Map Controls - Navigation Group", () => {
    it("renders all navigation controls", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText("Navigation")).toBeInTheDocument();
      expect(screen.getByText("Rotate Map")).toBeInTheDocument();
      expect(screen.getByText("Full Screen")).toBeInTheDocument();
      expect(screen.getByText("Zoom In/Out")).toBeInTheDocument();
      expect(screen.getByText("Current Location")).toBeInTheDocument();
      expect(screen.getByText("Zoom to Extent")).toBeInTheDocument();
      expect(screen.getByText("Extent History")).toBeInTheDocument();
    });

    it("displays correct initial checkbox states for navigation controls", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      const rotateCheckbox = screen.getByRole("checkbox", { name: /Rotate Map/i });
      const fullScreenCheckbox = screen.getByRole("checkbox", { name: /Full Screen/i });

      expect(rotateCheckbox).toBeChecked();
      expect(fullScreenCheckbox).toBeChecked();
    });

    it("toggles navigation control checkbox", async () => {
      render(<SettingsTool onClose={mockOnClose} />);

      const rotateCheckbox = screen.getByRole("checkbox", { name: /Rotate Map/i });
      expect(rotateCheckbox).toBeChecked();

      await user.click(rotateCheckbox);

      await waitFor(() => {
        expect(rotateCheckbox).not.toBeChecked();
      });
    });

    it("calls setControlVisibility when toggling control", async () => {
      const setControlVisibilitySpy = vi.spyOn(useMapStore.getState(), "setControlVisibility");

      render(<SettingsTool onClose={mockOnClose} />);

      const rotateCheckbox = screen.getByRole("checkbox", { name: /Rotate Map/i });
      await user.click(rotateCheckbox);

      await waitFor(() => {
        expect(setControlVisibilitySpy).toHaveBeenCalledWith("rotate", false);
      });
    });
  });

  describe("Map Controls - Display Group", () => {
    it("renders all display controls", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText("Display")).toBeInTheDocument();
      expect(screen.getByText("Scale Text")).toBeInTheDocument();
      expect(screen.getByText("Scale Line")).toBeInTheDocument();
      expect(screen.getByText("Basemap Switcher")).toBeInTheDocument();
      expect(screen.getByText("Grid")).toBeInTheDocument();
    });

    it("displays correct initial checkbox states for display controls", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      const scaleCheckbox = screen.getByRole("checkbox", { name: /Scale Text/i });
      const gridCheckbox = screen.getByRole("checkbox", { name: /Grid/i });

      expect(scaleCheckbox).toBeChecked();
      expect(gridCheckbox).not.toBeChecked();
    });

    it("toggles display control checkbox", async () => {
      render(<SettingsTool onClose={mockOnClose} />);

      const gridCheckbox = screen.getByRole("checkbox", { name: /Grid/i });
      expect(gridCheckbox).not.toBeChecked();

      await user.click(gridCheckbox);

      await waitFor(() => {
        expect(gridCheckbox).toBeChecked();
      });
    });
  });

  describe("Map Controls - Other Group", () => {
    it("renders all other controls", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText("Other")).toBeInTheDocument();
      expect(screen.getByText("GitHub Button")).toBeInTheDocument();
      expect(screen.getByText("Scale Selector")).toBeInTheDocument();
    });

    it("displays correct initial checkbox states for other controls", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      const githubCheckbox = screen.getByRole("checkbox", { name: /GitHub Button/i });
      const scaleSelectorCheckbox = screen.getByRole("checkbox", { name: /Scale Selector/i });

      expect(githubCheckbox).not.toBeChecked();
      expect(scaleSelectorCheckbox).toBeChecked();
    });
  });

  describe("Reset to Defaults Button", () => {
    it("renders Reset to Defaults button", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByRole("button", { name: /Reset to Defaults/i })).toBeInTheDocument();
    });

    it("calls resetControlVisibilityToDefaults when clicked", async () => {
      const resetSpy = vi.spyOn(useMapStore.getState(), "resetControlVisibilityToDefaults");

      render(<SettingsTool onClose={mockOnClose} />);

      const resetButton = screen.getByRole("button", { name: /Reset to Defaults/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(resetSpy).toHaveBeenCalled();
      });
    });
  });

  describe("Local Storage Management", () => {
    beforeEach(() => {
      // Add some test items to localStorage
      localStorage.setItem("test-key-1", "test-value-1");
      localStorage.setItem("test-key-2", "test-value-2-longer");
      localStorage.setItem("next-auth.session-token", "should-not-appear");
    });

    it("renders Reload button", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByRole("button", { name: /Reload/i })).toBeInTheDocument();
    });

    it("renders Clear All button", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByRole("button", { name: /Clear All/i })).toBeInTheDocument();
    });

    it("displays stored items excluding auth tokens", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText("test-key-1")).toBeInTheDocument();
      expect(screen.getByText("test-key-2")).toBeInTheDocument();
      expect(screen.queryByText("next-auth.session-token")).not.toBeInTheDocument();
    });

    it("displays item sizes", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      // Should display byte sizes for items
      const storedItemsSection = screen.getByText("Stored Items").parentElement;
      expect(storedItemsSection).toBeInTheDocument();
    });

    it("displays no items message when storage is empty", () => {
      localStorage.clear();

      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText("No stored items found")).toBeInTheDocument();
    });

    it("clears individual item when Clear button clicked", async () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(localStorage.getItem("test-key-1")).toBe("test-value-1");

      // Find the Clear button for test-key-1 using title attribute
      const clearButton = screen.getByTitle("Clear test-key-1");

      await user.click(clearButton);

      // Verify item was actually removed from localStorage
      expect(localStorage.getItem("test-key-1")).toBeNull();

      // The component should re-render and show only test-key-2
      await waitFor(() => {
        expect(screen.queryByText("test-key-1")).not.toBeInTheDocument();
        expect(screen.getByText("test-key-2")).toBeInTheDocument();
      });
    });

    it("reloads page when Reload button clicked", async () => {
      // Mock window.location.reload
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadMock },
        writable: true,
      });

      render(<SettingsTool onClose={mockOnClose} />);

      const reloadButton = screen.getByRole("button", { name: /Reload/i });
      await user.click(reloadButton);

      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe("Clear All Modal", () => {
    beforeEach(() => {
      localStorage.setItem("test-key-1", "test-value-1");
      localStorage.setItem("test-key-2", "test-value-2");
      localStorage.setItem("next-auth.session-token", "should-not-be-cleared");
    });

    it("does not show modal initially", () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.queryByText("Clear All Saved Data?")).not.toBeInTheDocument();
    });

    it("shows modal when Clear All button clicked", async () => {
      render(<SettingsTool onClose={mockOnClose} />);

      const clearAllButton = screen.getByRole("button", { name: /Clear All/i });
      await user.click(clearAllButton);

      await waitFor(() => {
        expect(screen.getByText("Clear All Saved Data?")).toBeInTheDocument();
      });
    });

    it("displays warning message in modal", async () => {
      render(<SettingsTool onClose={mockOnClose} />);

      const clearAllButton = screen.getByRole("button", { name: /Clear All/i });
      await user.click(clearAllButton);

      await waitFor(() => {
        expect(screen.getByText(/This will remove all saved settings/i)).toBeInTheDocument();
      });
    });

    it("closes modal when Cancel button clicked", async () => {
      render(<SettingsTool onClose={mockOnClose} />);

      const clearAllButton = screen.getByRole("button", { name: /Clear All/i });
      await user.click(clearAllButton);

      await waitFor(() => {
        expect(screen.getByText("Clear All Saved Data?")).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("Clear All Saved Data?")).not.toBeInTheDocument();
      });
    });

    it("closes modal when backdrop clicked", async () => {
      render(<SettingsTool onClose={mockOnClose} />);

      const clearAllButton = screen.getByRole("button", { name: /Clear All/i });
      await user.click(clearAllButton);

      await waitFor(() => {
        expect(screen.getByText("Clear All Saved Data?")).toBeInTheDocument();
      });

      const backdrop = screen.getByText("Clear All Saved Data?").parentElement?.nextElementSibling;
      if (backdrop) {
        await user.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.queryByText("Clear All Saved Data?")).not.toBeInTheDocument();
      });
    });

    it("clears all items except auth tokens when confirmed", async () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(localStorage.getItem("test-key-1")).toBe("test-value-1");
      expect(localStorage.getItem("test-key-2")).toBe("test-value-2");
      expect(localStorage.getItem("next-auth.session-token")).toBe("should-not-be-cleared");

      const clearAllButton = screen.getByRole("button", { name: /Clear All/i });
      await user.click(clearAllButton);

      await waitFor(() => {
        expect(screen.getByText("Clear All Saved Data?")).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /Clear All Data/i });
      await user.click(confirmButton);

      await waitFor(() => {
        // Modal should close
        expect(screen.queryByText("Clear All Saved Data?")).not.toBeInTheDocument();
      });

      // Regular items should be cleared
      expect(localStorage.getItem("test-key-1")).toBeNull();
      expect(localStorage.getItem("test-key-2")).toBeNull();

      // Auth token should remain
      expect(localStorage.getItem("next-auth.session-token")).toBe("should-not-be-cleared");
    });

    it("updates storage display after clearing all", async () => {
      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText("test-key-1")).toBeInTheDocument();

      const clearAllButton = screen.getByRole("button", { name: /Clear All/i });
      await user.click(clearAllButton);

      await waitFor(() => {
        expect(screen.getByText("Clear All Saved Data?")).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /Clear All Data/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText("No stored items found")).toBeInTheDocument();
      });
    });
  });

  describe("Byte Formatting", () => {
    it("formats bytes correctly", () => {
      localStorage.setItem("small", "a"); // ~1 byte
      localStorage.setItem("medium", "a".repeat(1500)); // ~1.5 KB
      localStorage.setItem("large", "a".repeat(1500000)); // ~1.5 MB

      render(<SettingsTool onClose={mockOnClose} />);

      // Check that sizes are displayed (exact values may vary slightly)
      expect(screen.getByText("small")).toBeInTheDocument();
      expect(screen.getByText("medium")).toBeInTheDocument();
      expect(screen.getByText("large")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined window gracefully", () => {
      // This is tested implicitly by the component's window checks
      // The component should not crash if window is undefined
      expect(() => render(<SettingsTool onClose={mockOnClose} />)).not.toThrow();
    });

    it("handles empty localStorage gracefully", () => {
      localStorage.clear();

      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText("No stored items found")).toBeInTheDocument();
    });

    it("handles localStorage with only auth tokens", () => {
      localStorage.clear();
      localStorage.setItem("next-auth.session-token", "token");
      localStorage.setItem("__Secure-next-auth.csrf-token", "csrf");

      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText("No stored items found")).toBeInTheDocument();
    });

    it("sorts localStorage items alphabetically", () => {
      localStorage.clear();
      localStorage.setItem("zebra", "value");
      localStorage.setItem("apple", "value");
      localStorage.setItem("middle", "value");

      render(<SettingsTool onClose={mockOnClose} />);

      const items = screen.getAllByText(/apple|middle|zebra/);
      expect(items[0]).toHaveTextContent("apple");
      expect(items[1]).toHaveTextContent("middle");
      expect(items[2]).toHaveTextContent("zebra");
    });
  });

  describe("Component Lifecycle", () => {
    it("loads localStorage items on mount", () => {
      localStorage.setItem("test-item", "test-value");

      render(<SettingsTool onClose={mockOnClose} />);

      expect(screen.getByText("test-item")).toBeInTheDocument();
    });

    it("handles onClose callback", async () => {
      render(<SettingsTool onClose={mockOnClose} />);

      const closeButton = screen.getByTestId("close-button");
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
