import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SidebarSlim from "@/components/SidebarSlim";
import { useSidebarStore } from "@/stores/sidebarStore";

describe("SidebarSlim", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all zustand stores to clean state
    useSidebarStore.setState({
      isOpen: false,
      activeTab: 0,
      themes: [],
      tools: [],
    });

    // Ensure DOM is clean
    document.body.innerHTML = "";

    // Ensure no lingering event listeners or timers
    vi.clearAllTimers();
  });
  it("renders buttons when sidebar closed and toggles More menu", () => {
    // Ensure sidebar is closed and more menu is closed
    useSidebarStore.setState({ isOpen: false, activeTab: 0, themes: [], tools: [], isMoreMenuOpen: false });

    const { unmount } = render(<SidebarSlim />);
    expect(screen.getByText("Layers")).toBeInTheDocument();

    const more = screen.getByTitle("More Options");

    // Check that more menu is initially closed
    expect(useSidebarStore.getState().isMoreMenuOpen).toBe(false);

    fireEvent.click(more);

    // Check that clicking More button toggles the store state
    expect(useSidebarStore.getState().isMoreMenuOpen).toBe(true);

    // Clean up
    unmount();
  });
});
