import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TOCHeader from "@/components/TOC/TOCHeader";

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
        onOpenLegend={onOpenLegend}
      />
    );

    // Open settings
    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    // Toggle view type
    fireEvent.click(screen.getByText(/Switch to Folder View/i));
    expect(onTOCTypeChange).toHaveBeenCalled();

    // Opacity change
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0.5" } });
    expect(onGlobalOpacityChange).toHaveBeenCalled();

    // Sort toggle
    fireEvent.click(screen.getByLabelText(/Sort Alphabetically/i));
    expect(onSortChange).toHaveBeenCalled();
  });
});
