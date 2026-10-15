import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LayerTimeSlider from "@/components/TOC/LayerTimeSlider";
import type { TOCLayer } from "@/stores/tocStore";
import { useLayerTimeStore } from "@/stores/layerTimeStore";

const mocks = vi.hoisted(() => ({
  setTimeIndex: vi.fn(),
  stopLayerRefresh: vi.fn(),
}));

vi.mock("@/utils/openlayers/LayerRefresh", () => ({
  setTimeIndex: mocks.setTimeIndex,
  stopLayerRefresh: mocks.stopLayerRefresh,
}));

const layer = {
  id: "layer-1",
  tocDisplayName: "Smoke",
  visible: true,
  timeDimension: { kind: "list", values: ["2026-10-14T09:00:00.000Z", "2026-10-14T10:00:00.000Z"], defaultIndex: 0 },
} as unknown as TOCLayer;

beforeEach(() => {
  vi.clearAllMocks();
  useLayerTimeStore.setState({ indexes: {} });
});

describe("LayerTimeSlider", () => {
  it("reports interaction start on press and end on pointer release", () => {
    const onInteractionChange = vi.fn();
    render(<LayerTimeSlider layer={layer} onInteractionChange={onInteractionChange} />);

    fireEvent.pointerDown(screen.getByRole("slider"));
    expect(onInteractionChange).toHaveBeenLastCalledWith(true);

    window.dispatchEvent(new Event("pointerup"));
    expect(onInteractionChange).toHaveBeenLastCalledWith(false);
  });

  it("pauses playback and sets the time index when the slider changes", () => {
    render(<LayerTimeSlider layer={layer} />);

    fireEvent.change(screen.getByRole("slider"), { target: { value: "1" } });

    expect(mocks.stopLayerRefresh).toHaveBeenCalledWith("layer-1");
    expect(mocks.setTimeIndex).toHaveBeenCalledWith("layer-1", 1);
  });
});
