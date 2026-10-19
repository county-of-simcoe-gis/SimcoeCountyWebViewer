import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GroupItem from "@/components/TOC/GroupItem";
import { DEFAULT_FOLDER_COLOR, type TOCLayer, type TOCLayerGroup } from "@/stores/tocStore";

vi.mock("@/components/TOC/LayerItem", () => ({ default: () => null }));
vi.mock("@/components/TOC/GroupRefreshButton", () => ({ default: () => null }));
vi.mock("@/lib/appStats", () => ({ trackGroup: vi.fn() }));

function buildGroup(folderColor?: string): TOCLayerGroup {
  return {
    value: "test-group",
    label: "Test Group",
    defaultGroup: false,
    url: "",
    prefix: "",
    visibleLayers: [],
    wmsGroupUrl: "",
    customRestUrl: "",
    layers: [{ id: "layer-1", tocDisplayName: "Layer 1", groupName: "Test Group" } as unknown as TOCLayer],
    folderColor,
  };
}

function renderGroup(group: TOCLayerGroup): HTMLElement {
  render(
    <GroupItem
      id="test"
      group={group}
      searchText=""
      sortAlpha={false}
      visible={true}
      panelOpen={false}
      onLayerChange={vi.fn()}
      onLegendToggle={vi.fn()}
      onLayerOptionsClick={vi.fn()}
      onGroupFolderToggle={vi.fn()}
      onLayerVisibilityGroup={vi.fn()}
    />,
  );
  return screen.getByTestId("folder-icon");
}

describe("GroupItem folder color", () => {
  it("applies the group folderColor to the folder icon", () => {
    const icon = renderGroup(buildGroup("#cc0000"));
    expect(icon).toHaveStyle({ color: "#cc0000" });
  });

  it("falls back to the default folder color when folderColor is unset", () => {
    const icon = renderGroup(buildGroup(undefined));
    expect(icon).toHaveStyle({ color: DEFAULT_FOLDER_COLOR });
  });
});
