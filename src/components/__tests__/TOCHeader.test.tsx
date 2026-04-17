import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TOCHeader from "@/components/TOC/TOCHeader";

vi.mock("react-icons/fi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-icons/fi")>();
  return { ...actual };
});

describe("TOCHeader", () => {
  it("renders and triggers controls", () => {
    const onSearchChange = vi.fn();
    const onSortChange = vi.fn();
    const onGlobalOpacityChange = vi.fn();
    const onTOCTypeChange = vi.fn();
    const onResetToDefault = vi.fn();
    const onTurnOffLayers = vi.fn();
    const onSaveAllLayers = vi.fn();
    const onOpenLegend = vi.fn();

    render(
      <TOCHeader
        tocType="LIST"
        searchText=""
        sortAlpha={false}
        globalOpacity={1}
        isLoading={false}
        layerCount={5}
        helpLink="https://example.com/help"
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
        onGlobalOpacityChange={onGlobalOpacityChange}
        onTOCTypeChange={onTOCTypeChange}
        onResetToDefault={onResetToDefault}
        onTurnOffLayers={onTurnOffLayers}
        onSaveAllLayers={onSaveAllLayers}
        onClearSavedLayers={vi.fn()}
        onOpenLegend={onOpenLegend}
      />,
    );

    // Test search functionality
    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "test search" } });
    expect(onSearchChange).toHaveBeenCalledWith("test search");

    // Test settings button exists and can be clicked
    const settingsButton = screen.getByRole("button", { name: /Settings/i });
    expect(settingsButton).toBeInTheDocument();
    fireEvent.click(settingsButton);

    // Verify help button exists (renders as a button that opens URL window)
    const helpButton = screen.getByTitle("Layer Help");
    expect(helpButton).toBeInTheDocument();
  });
});
