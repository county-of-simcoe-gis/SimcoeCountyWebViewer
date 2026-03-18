import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PanelComponent from "@/components/PanelComponent";

vi.mock("@/utils/helpersUI", async () => {
  return {
    showURLWindow: vi.fn(),
  };
});

describe("PanelComponent", () => {
  it("renders title and triggers close", () => {
    const onClose = vi.fn();
    render(
      <PanelComponent name="Test Tool" onClose={onClose}>
        <div>content</div>
      </PanelComponent>,
    );
    expect(screen.getByText("Test Tool")).toBeInTheDocument();
    const close = screen.getByRole("button", { name: "Close panel" });
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows help icon and calls showURLWindow", async () => {
    const onClose = vi.fn();
    const { showURLWindow } = await import("@/utils/helpersUI");
    render(
      <PanelComponent name="Help Tool" helpLink="https://example.com" onClose={onClose}>
        <div />
      </PanelComponent>,
    );
    const help = screen.getByRole("button", { name: "Help" });
    fireEvent.click(help);
    expect(showURLWindow).toHaveBeenCalled();
  });
});
