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
    // Ensure sidebar is closed
    useSidebarStore.setState({ isOpen: false, activeTab: 0, themes: [], tools: [] });

    const { container } = render(<SidebarSlim />);
    expect(screen.getByText("Layers")).toBeInTheDocument();

    const more = screen.getByTitle("More Options");

    // Debug: Check what's in the DOM before clicking
    console.log("Before click:", container.innerHTML);

    fireEvent.click(more);

    // Debug: Check what's in the DOM after clicking
    console.log("After click:", container.innerHTML);
    console.log("querySelector result:", document.querySelector(".sc-menu-button-list-container"));

    // backdrop appears
    expect(document.querySelector(".sc-menu-button-list-container")).toBeTruthy();
  });
});
