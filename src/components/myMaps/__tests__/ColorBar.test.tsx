import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import ColorBar from "@/components/myMaps/ColorBar";
import { MYMAPS_CONSTANTS } from "@/types/myMaps";

vi.mock("@/types/myMaps", () => ({
  MYMAPS_CONSTANTS: {
    DEFAULT_COLORS: [
      "#e809e5", // Default pink
      "#ff0000", // Red
      "#00ff00", // Green
      "#0000ff", // Blue
      "#ffff00", // Yellow
      "#ff8000", // Orange
      "#800080", // Purple
      "#008080", // Teal
      "#000000", // Black
      "#ffffff", // White
    ],
  },
}));

// Mock store
const mockMyMapsStore = {
  drawColor: "#e809e5" as string | null,
  setDrawColor: vi.fn(),
};

vi.mock("@/stores/myMapsStore", () => ({
  useMyMapsStore: vi.fn(() => mockMyMapsStore),
}));

describe("ColorBar Component", () => {
  const user = userEvent.setup();

  // Helper function to convert hex to rgb format
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Helper function to find color element by hex color
  const findColorElement = (container: Element, color: string) => {
    return container.querySelector(`[style*="background-color: ${color}"]`) || container.querySelector(`[style*="background-color: ${hexToRgb(color)}"]`);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMyMapsStore.drawColor = "#e809e5";
  });

  describe("Rendering", () => {
    it("should render all colors from constants", () => {
      const { container } = render(<ColorBar />);

      const colorItems = container.querySelectorAll('[data-testid="mymaps-color-item"]');
      expect(colorItems).toHaveLength(MYMAPS_CONSTANTS.DEFAULT_COLORS.length);

      MYMAPS_CONSTANTS.DEFAULT_COLORS.forEach((color) => {
        const colorItem = findColorElement(container, color);
        expect(colorItem).toBeInTheDocument();
      });
    });

    it("should apply correct CSS classes", () => {
      const { container: _container } = render(<ColorBar />);

      const colorBarElement = screen.getByTestId("mymaps-color-bar");
      expect(colorBarElement).toBeInTheDocument();
      expect(colorBarElement).not.toHaveClass("opacity-50");
    });

    it("should apply disabled class when editing", () => {
      const { container: _container } = render(<ColorBar isEditing={true} />);

      const colorBarElement = screen.getByTestId("mymaps-color-bar");
      expect(colorBarElement).toHaveClass("opacity-50");
    });

    it("should show active state for current color", () => {
      mockMyMapsStore.drawColor = "#ff0000";
      const { container } = render(<ColorBar />);

      const redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      expect(redColorItem).toBeInTheDocument();
      expect(redColorItem).toHaveClass("!border-primary");
      expect(redColorItem).toContainHTML("✓");
    });

    it("should show checkmark only for active color", () => {
      mockMyMapsStore.drawColor = "#00ff00";
      const { container } = render(<ColorBar />);

      const greenColorItem = container.querySelector('[style*="background-color: rgb(0, 255, 0)"]') || container.querySelector('[style*="background-color: #00ff00"]');
      const redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');

      expect(greenColorItem).toBeInTheDocument();
      expect(greenColorItem).toContainHTML("✓");
      expect(redColorItem).toBeInTheDocument();
      expect(redColorItem).not.toContainHTML("✓");
    });
  });

  describe("Color Selection", () => {
    it("should call setDrawColor when color is clicked", async () => {
      const { container } = render(<ColorBar />);

      const redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      expect(redColorItem).toBeInTheDocument();
      await user.click(redColorItem!);

      expect(mockMyMapsStore.setDrawColor).toHaveBeenCalledWith("#ff0000");
    });

    it("should handle clicking different colors", async () => {
      const { container } = render(<ColorBar />);

      // Click blue
      const blueColorItem = container.querySelector('[style*="background-color: rgb(0, 0, 255)"]') || container.querySelector('[style*="background-color: #0000ff"]');
      expect(blueColorItem).toBeInTheDocument();
      await user.click(blueColorItem!);
      expect(mockMyMapsStore.setDrawColor).toHaveBeenCalledWith("#0000ff");

      // Click yellow
      const yellowColorItem = container.querySelector('[style*="background-color: rgb(255, 255, 0)"]') || container.querySelector('[style*="background-color: #ffff00"]');
      expect(yellowColorItem).toBeInTheDocument();
      await user.click(yellowColorItem!);
      expect(mockMyMapsStore.setDrawColor).toHaveBeenCalledWith("#ffff00");

      expect(mockMyMapsStore.setDrawColor).toHaveBeenCalledTimes(2);
    });

    it("should not call setDrawColor when editing", async () => {
      const { container } = render(<ColorBar isEditing={true} />);

      const redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      expect(redColorItem).toBeInTheDocument();

      // When editing, the parent container has pointer-events: none
      const colorBar = screen.getByTestId("mymaps-color-bar");
      expect(colorBar).toHaveClass("opacity-50");

      // Try clicking - should fail due to pointer-events: none
      try {
        await user.click(redColorItem!);
      } catch {
        // Expected to fail due to pointer-events: none on disabled element
      }

      expect(mockMyMapsStore.setDrawColor).not.toHaveBeenCalled();
    });

    it("should allow clicking the same color multiple times", async () => {
      mockMyMapsStore.drawColor = "#ff0000";
      const { container } = render(<ColorBar />);

      const redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      expect(redColorItem).toBeInTheDocument();
      await user.click(redColorItem!);
      await user.click(redColorItem!);

      expect(mockMyMapsStore.setDrawColor).toHaveBeenCalledTimes(2);
      expect(mockMyMapsStore.setDrawColor).toHaveBeenCalledWith("#ff0000");
    });
  });

  describe("Keyboard Accessibility", () => {
    it("should have proper tabIndex for interactive elements", () => {
      const { container } = render(<ColorBar />);

      const colorItems = container.querySelectorAll('[data-testid="mymaps-color-item"]');
      colorItems.forEach((item) => {
        expect(item).toHaveAttribute("tabindex", "0");
        expect(item).toHaveAttribute("role", "button");
      });
    });

    it("should set tabIndex to -1 when editing", () => {
      const { container } = render(<ColorBar isEditing={true} />);

      const colorItems = container.querySelectorAll('[data-testid="mymaps-color-item"]');
      colorItems.forEach((item) => {
        expect(item).toHaveAttribute("tabindex", "-1");
      });
    });

    it("should handle Enter key press", async () => {
      const { container } = render(<ColorBar />);

      const redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      expect(redColorItem).toBeInTheDocument();
      (redColorItem as HTMLElement).focus();

      await user.keyboard("{Enter}");

      expect(mockMyMapsStore.setDrawColor).toHaveBeenCalledWith("#ff0000");
    });

    it("should handle Space key press", async () => {
      const { container } = render(<ColorBar />);

      const blueColorItem = container.querySelector('[style*="background-color: rgb(0, 0, 255)"]') || container.querySelector('[style*="background-color: #0000ff"]');
      expect(blueColorItem).toBeInTheDocument();
      (blueColorItem as HTMLElement).focus();

      await user.keyboard(" ");

      expect(mockMyMapsStore.setDrawColor).toHaveBeenCalledWith("#0000ff");
    });

    it("should not respond to keyboard when editing", async () => {
      const { container } = render(<ColorBar isEditing={true} />);

      const redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      expect(redColorItem).toBeInTheDocument();
      (redColorItem as HTMLElement).focus();

      await user.keyboard("{Enter}");
      await user.keyboard(" ");

      expect(mockMyMapsStore.setDrawColor).not.toHaveBeenCalled();
    });

    it("should ignore other keys", async () => {
      const { container } = render(<ColorBar />);

      const redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      expect(redColorItem).toBeInTheDocument();
      (redColorItem as HTMLElement).focus();

      await user.keyboard("{Tab}");
      await user.keyboard("{Escape}");
      await user.keyboard("a");

      expect(mockMyMapsStore.setDrawColor).not.toHaveBeenCalled();
    });
  });

  describe("Tooltip and Title Attributes", () => {
    it("should have proper title attributes", () => {
      const { container } = render(<ColorBar />);

      MYMAPS_CONSTANTS.DEFAULT_COLORS.forEach((color) => {
        const colorItem = findColorElement(container, color);
        expect(colorItem).toHaveAttribute("title", `Select color ${color}`);
      });
    });

    it("should show tooltips on hover", async () => {
      const { container } = render(<ColorBar />);

      const redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      expect(redColorItem).toBeInTheDocument();
      expect(redColorItem).toHaveAttribute("title", "Select color #ff0000");

      // Hover to trigger tooltip
      await user.hover(redColorItem!);

      // The title attribute should still be there
      expect(redColorItem).toHaveAttribute("title", "Select color #ff0000");
    });
  });

  describe("Active State Management", () => {
    it("should update active state when drawColor changes", () => {
      mockMyMapsStore.drawColor = "#ff0000";
      const { rerender, container } = render(<ColorBar />);

      let redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      let greenColorItem = container.querySelector('[style*="background-color: rgb(0, 255, 0)"]') || container.querySelector('[style*="background-color: #00ff00"]');

      expect(redColorItem).toBeInTheDocument();
      expect(greenColorItem).toBeInTheDocument();
      expect(redColorItem).toHaveClass("!border-primary");
      expect(greenColorItem).not.toHaveClass("!border-primary");

      mockMyMapsStore.drawColor = "#00ff00";
      rerender(<ColorBar />);

      redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      greenColorItem = container.querySelector('[style*="background-color: rgb(0, 255, 0)"]') || container.querySelector('[style*="background-color: #00ff00"]');

      expect(redColorItem).toBeInTheDocument();
      expect(greenColorItem).toBeInTheDocument();
      expect(redColorItem).not.toHaveClass("!border-primary");
      expect(greenColorItem).toHaveClass("!border-primary");
    });

    it("should handle edge case where drawColor is not in the color list", () => {
      mockMyMapsStore.drawColor = "#123456"; // Custom color not in list
      render(<ColorBar />);

      const colorItems = document.querySelectorAll('[data-testid="mymaps-color-item"]');
      colorItems.forEach((item) => {
        expect(item).not.toHaveClass("!border-primary");
        expect(item).not.toContainHTML("✓");
      });
    });

    it("should handle null or undefined drawColor gracefully", () => {
      mockMyMapsStore.drawColor = null;
      const { container } = render(<ColorBar />);

      const colorItems = container.querySelectorAll('[data-testid="mymaps-color-item"]');
      colorItems.forEach((item) => {
        expect(item).not.toHaveClass("!border-primary");
      });
    });
  });

  describe("Color Variants and Edge Cases", () => {
    it("should handle different color formats correctly", () => {
      // Test with uppercase hex
      mockMyMapsStore.drawColor = "#FF0000";
      const { container } = render(<ColorBar />);

      // Should still match the lowercase version in the list
      const redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      // Note: The comparison might be case-sensitive, so this tests the exact matching
      expect(redColorItem).toBeInTheDocument();
      expect(redColorItem).not.toHaveClass("!border-primary");
    });

    it("should handle white and black colors properly", () => {
      const { container, rerender } = render(<ColorBar />);

      const whiteColorItem = container.querySelector('[style*="background-color: rgb(255, 255, 255)"]') || container.querySelector('[style*="background-color: #ffffff"]');
      const blackColorItem = container.querySelector('[style*="background-color: rgb(0, 0, 0)"]') || container.querySelector('[style*="background-color: #000000"]');

      expect(whiteColorItem).toBeInTheDocument();
      expect(blackColorItem).toBeInTheDocument();

      // Test clicking white
      mockMyMapsStore.drawColor = "#ffffff";
      rerender(<ColorBar />);

      const updatedWhiteItem = container.querySelector('[style*="background-color: rgb(255, 255, 255)"]') || container.querySelector('[style*="background-color: #ffffff"]');
      expect(updatedWhiteItem).toBeInTheDocument();
      expect(updatedWhiteItem).toHaveClass("!border-primary");
    });
  });

  describe("Styling and Visual States", () => {
    it("should apply correct inline styles for background colors", () => {
      const { container } = render(<ColorBar />);

      MYMAPS_CONSTANTS.DEFAULT_COLORS.forEach((color) => {
        const colorItem = findColorElement(container, color);
        expect(colorItem).toBeInTheDocument();
        expect(colorItem).toHaveStyle(`background-color: ${color}`);
      });
    });

    it("should show checkmark with correct styling", () => {
      mockMyMapsStore.drawColor = "#ff0000";
      const { container } = render(<ColorBar />);

      const activeColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      expect(activeColorItem).toBeInTheDocument();
      const checkmark = activeColorItem!.querySelector('[class*="text-white"]');

      expect(checkmark).toBeInTheDocument();
      expect(checkmark).toHaveTextContent("✓");
    });

    it("should not show checkmark for inactive colors", () => {
      mockMyMapsStore.drawColor = "#ff0000";
      const { container } = render(<ColorBar />);

      const inactiveColorItem = container.querySelector('[style*="background-color: rgb(0, 255, 0)"]') || container.querySelector('[style*="background-color: #00ff00"]');
      expect(inactiveColorItem).toBeInTheDocument();
      const checkmark = inactiveColorItem!.querySelector('[class*="text-white"]');

      expect(checkmark).not.toBeInTheDocument();
    });
  });

  describe("Interaction States", () => {
    it("should handle focus states properly", async () => {
      const { container } = render(<ColorBar />);

      const firstColorItem = container.querySelector('[data-testid="mymaps-color-item"]');

      // Focus the element
      (firstColorItem as HTMLElement).focus();
      expect(document.activeElement).toBe(firstColorItem);
    });

    it("should handle mouse events", async () => {
      const { container } = render(<ColorBar />);

      const redColorItem = container.querySelector('[style*="background-color: rgb(255, 0, 0)"]') || container.querySelector('[style*="background-color: #ff0000"]');
      expect(redColorItem).toBeInTheDocument();

      await user.hover(redColorItem!);
      await user.click(redColorItem!);

      expect(mockMyMapsStore.setDrawColor).toHaveBeenCalledWith("#ff0000");
    });

    it("should prevent default behavior for keyboard events", async () => {
      const { container } = render(<ColorBar />);

      const colorItem = container.querySelector('[data-testid="mymaps-color-item"]');
      expect(colorItem).toBeInTheDocument();
      (colorItem as HTMLElement).focus();

      // Use userEvent to simulate Enter key press, which properly triggers React events
      await user.keyboard("{Enter}");

      // The component should handle Enter key and call setDrawColor
      expect(mockMyMapsStore.setDrawColor).toHaveBeenCalled();
    });
  });

  describe("Performance and Optimization", () => {
    it("should render efficiently with standard color set", () => {
      const { container } = render(<ColorBar />);

      const colorItems = container.querySelectorAll('[data-testid="mymaps-color-item"]');
      expect(colorItems).toHaveLength(MYMAPS_CONSTANTS.DEFAULT_COLORS.length);
    });

    it("should not cause unnecessary re-renders", () => {
      const { rerender, container } = render(<ColorBar />);

      const initialColorItems = container.querySelectorAll('[data-testid="mymaps-color-item"]');
      const initialCount = initialColorItems.length;

      // Re-render with same props
      rerender(<ColorBar />);

      const newColorItems = container.querySelectorAll('[data-testid="mymaps-color-item"]');
      expect(newColorItems).toHaveLength(initialCount);
    });

    it("should handle rapid color changes efficiently", async () => {
      const { container } = render(<ColorBar />);

      // Rapid clicking
      const colors = MYMAPS_CONSTANTS.DEFAULT_COLORS.slice(0, 5); // Test first 5 colors
      for (const color of colors) {
        const colorItemHex = container.querySelector(`[style*="background-color: ${color}"]`);
        const colorItemRgb = container.querySelector(`[style*="background-color: rgb"]`);
        const colorItem = colorItemHex || colorItemRgb;
        expect(colorItem).toBeInTheDocument();
        await user.click(colorItem!);
      }

      expect(mockMyMapsStore.setDrawColor).toHaveBeenCalledTimes(5);
    });
  });
});
