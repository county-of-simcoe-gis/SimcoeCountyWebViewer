import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePopupStore } from "@/stores/popupStore";

// Mock OL Overlay
vi.mock("ol", () => ({
  Overlay: vi.fn(),
}));

function createMockOverlay() {
  return {
    setPosition: vi.fn(),
  };
}

describe("popupStore", () => {
  beforeEach(() => {
    usePopupStore.setState({
      overlay: null,
      isVisible: false,
      features: [],
      coordinates: null,
      selectedIndex: 0,
      onCloseCallback: null,
      rawResults: null,
    });
  });

  it("starts hidden with no features", () => {
    const s = usePopupStore.getState();
    expect(s.isVisible).toBe(false);
    expect(s.features).toEqual([]);
    expect(s.coordinates).toBeNull();
  });

  it("setOverlay stores the overlay", () => {
    const overlay = createMockOverlay();
    usePopupStore.getState().setOverlay(overlay as never);
    expect(usePopupStore.getState().overlay).toBe(overlay);
  });

  it("show creates a single feature and positions overlay", () => {
    const overlay = createMockOverlay();
    usePopupStore.setState({ overlay: overlay as never });

    usePopupStore.getState().show([100, 200], "Content", "Title", "MyLayer");
    const s = usePopupStore.getState();
    expect(s.isVisible).toBe(true);
    expect(s.features).toHaveLength(1);
    expect(s.features[0].title).toBe("Title");
    expect(s.features[0].layerName).toBe("MyLayer");
    expect(s.coordinates).toEqual([100, 200]);
    expect(overlay.setPosition).toHaveBeenCalledWith([100, 200]);
  });

  it("showMultiple sets multiple features", () => {
    const features = [
      { id: "1", title: "F1", content: "C1" },
      { id: "2", title: "F2", content: "C2" },
    ];
    usePopupStore.getState().showMultiple([0, 0], features);
    const s = usePopupStore.getState();
    expect(s.features).toHaveLength(2);
    expect(s.selectedIndex).toBe(0);
  });

  it("addFeature appends to existing features", () => {
    usePopupStore.getState().showMultiple([0, 0], [{ id: "1", title: "F1", content: "C1" }]);
    usePopupStore.getState().addFeature({ id: "2", title: "F2", content: "C2" });
    expect(usePopupStore.getState().features).toHaveLength(2);
  });

  it("hide clears state and calls onCloseCallback", () => {
    const overlay = createMockOverlay();
    const callback = vi.fn();
    usePopupStore.setState({ overlay: overlay as never });
    usePopupStore.getState().showMultiple([0, 0], [{ id: "1", title: "F1", content: "C1" }]);
    usePopupStore.getState().setOnClose(callback);

    usePopupStore.getState().hide();
    const s = usePopupStore.getState();
    expect(s.isVisible).toBe(false);
    expect(s.features).toEqual([]);
    expect(s.coordinates).toBeNull();
    expect(callback).toHaveBeenCalled();
    expect(overlay.setPosition).toHaveBeenCalledWith(undefined);
  });

  it("selectFeature changes selectedIndex within bounds", () => {
    usePopupStore.getState().showMultiple(
      [0, 0],
      [
        { id: "1", title: "F1", content: "C1" },
        { id: "2", title: "F2", content: "C2" },
      ],
    );
    usePopupStore.getState().selectFeature(1);
    expect(usePopupStore.getState().selectedIndex).toBe(1);
  });

  it("selectFeature ignores out-of-bounds index", () => {
    usePopupStore.getState().showMultiple([0, 0], [{ id: "1", title: "F1", content: "C1" }]);
    usePopupStore.getState().selectFeature(5);
    expect(usePopupStore.getState().selectedIndex).toBe(0);
  });

  it("nextFeature cycles through features", () => {
    usePopupStore.getState().showMultiple(
      [0, 0],
      [
        { id: "1", title: "F1", content: "C1" },
        { id: "2", title: "F2", content: "C2" },
        { id: "3", title: "F3", content: "C3" },
      ],
    );
    usePopupStore.getState().nextFeature();
    expect(usePopupStore.getState().selectedIndex).toBe(1);
    usePopupStore.getState().nextFeature();
    expect(usePopupStore.getState().selectedIndex).toBe(2);
    usePopupStore.getState().nextFeature();
    expect(usePopupStore.getState().selectedIndex).toBe(0); // wraps
  });

  it("prevFeature cycles backward through features", () => {
    usePopupStore.getState().showMultiple(
      [0, 0],
      [
        { id: "1", title: "F1", content: "C1" },
        { id: "2", title: "F2", content: "C2" },
      ],
    );
    usePopupStore.getState().prevFeature();
    expect(usePopupStore.getState().selectedIndex).toBe(1); // wraps backward
  });

  it("updateContent updates current feature's content", () => {
    usePopupStore.getState().showMultiple([0, 0], [{ id: "1", title: "F1", content: "old" }]);
    usePopupStore.getState().updateContent("new");
    expect(usePopupStore.getState().features[0].content).toBe("new");
  });

  it("updatePosition moves overlay", () => {
    const overlay = createMockOverlay();
    usePopupStore.setState({ overlay: overlay as never });
    usePopupStore.getState().updatePosition([50, 60]);
    expect(usePopupStore.getState().coordinates).toEqual([50, 60]);
    expect(overlay.setPosition).toHaveBeenCalledWith([50, 60]);
  });

  it("setAlwaysUseReportsTab persists to localStorage", () => {
    usePopupStore.getState().setAlwaysUseReportsTab(true);
    expect(usePopupStore.getState().alwaysUseReportsTab).toBe(true);
    expect(localStorage.getItem("sc-always-reports-tab")).toBe("true");
  });

  it("setRawResults stores raw results", () => {
    const results = [{ layers: ["a"] }];
    usePopupStore.getState().setRawResults(results);
    expect(usePopupStore.getState().rawResults).toEqual(results);
  });
});
