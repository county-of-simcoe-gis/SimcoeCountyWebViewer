import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/stores/sidebarStore";

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
    useSidebarStore.setState({
      isOpen: true,
      activeTab: 1,
      tools: [{ id: "1", name: "Measure", type: "tool", imageName: "measure.png", enabled: true }] as SidebarItem[],
      themes: [],
    });
  });

  it("renders tools tab and allows item click", () => {
    render(<Sidebar />);
    const tool = screen.getByText("Measure");
    fireEvent.click(tool);
    // Active tool should be set in store
    expect(useSidebarStore.getState().activeTool).toBe("Measure");
  });
});
