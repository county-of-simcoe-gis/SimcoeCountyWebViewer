import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SidebarSlim from "@/components/SidebarSlim";
import { useSidebarStore } from "@/stores/sidebarStore";

describe("SidebarSlim", () => {
  it("renders buttons when sidebar closed and toggles More menu", () => {
    // Ensure sidebar is closed
    useSidebarStore.setState({ isOpen: false, activeTab: 0, themes: [], tools: [] });

    render(<SidebarSlim />);
    expect(screen.getByText("Layers")).toBeInTheDocument();

    const more = screen.getByTitle("More Options");
    fireEvent.click(more);
    // backdrop appears
    expect(document.querySelector(".sc-menu-button-list-container")).toBeTruthy();
  });
});
