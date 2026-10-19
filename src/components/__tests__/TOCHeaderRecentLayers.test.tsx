import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TOCHeader from "@/components/TOC/TOCHeader";
import { useTOCStore, MY_FAVOURITES_VALUE, type TOCLayer } from "@/stores/tocStore";

function makeLayer(name: string, tocDisplayName: string, group = "parcels"): TOCLayer {
  return { id: name, name, tocDisplayName, group, groupName: group, visible: false } as unknown as TOCLayer;
}

function renderHeader(searchText = "") {
  const onSearchChange = vi.fn();
  const props = {
    tocType: "LIST" as const,
    searchText,
    sortAlpha: false,
    globalOpacity: 1,
    isLoading: false,
    layerCount: 5,
    helpLink: "",
    onSearchChange,
    onSortChange: vi.fn(),
    onGlobalOpacityChange: vi.fn(),
    onTOCTypeChange: vi.fn(),
    onResetToDefault: vi.fn(),
    onTurnOffLayers: vi.fn(),
    onSaveAllLayers: vi.fn(),
    onClearSavedLayers: vi.fn(),
    onOpenLegend: vi.fn(),
  };
  const view = render(<TOCHeader {...props} />);
  return { onSearchChange, input: screen.getByRole("textbox"), rerenderWith: (text: string) => view.rerender(<TOCHeader {...props} searchText={text} />) };
}

describe("TOCHeader - recent layers dropdown", () => {
  beforeEach(() => {
    localStorage.clear();
    useTOCStore.setState({
      allLayers: [makeLayer("Zoning", "Zoning Layer"), makeLayer("Bruce Trail", "Bruce Trail Route", "trails"), makeLayer("Zoning", "Zoning Favourite", MY_FAVOURITES_VALUE)],
      recentLayers: ["Zoning", "Bruce Trail"],
    });
  });

  it("shows recent layers on focus when the filter is empty", () => {
    const { input } = renderHeader();

    fireEvent.focus(input);

    expect(screen.getByRole("listbox", { name: "Recent layers" })).toBeInTheDocument();
    expect(screen.getByText("Zoning Layer")).toBeInTheDocument();
    expect(screen.getByText("Bruce Trail Route")).toBeInTheDocument();
  });

  it("hides the list once the filter has text", () => {
    const { input, rerenderWith } = renderHeader();
    fireEvent.focus(input);

    rerenderWith("z");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("fills the filter with the layer name when an entry is clicked", () => {
    const { input, onSearchChange } = renderHeader();
    fireEvent.focus(input);

    fireEvent.click(screen.getByText("Bruce Trail Route"));

    expect(onSearchChange).toHaveBeenCalledWith("Bruce Trail Route");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("moves the highlight with arrow keys and selects with Enter", () => {
    const { input, onSearchChange } = renderHeader();
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { selected: true })).toHaveTextContent("Bruce Trail Route");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSearchChange).toHaveBeenCalledWith("Bruce Trail Route");
  });

  it("closes on Escape", () => {
    const { input } = renderHeader();
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("omits favourite-only entries and names no longer loaded", () => {
    useTOCStore.setState({ recentLayers: ["Missing Layer"], allLayers: [makeLayer("Zoning", "Zoning Favourite", MY_FAVOURITES_VALUE)] });
    const { input } = renderHeader();

    fireEvent.focus(input);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
