import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Scale from "@/components/map/controls/Scale";
import type Map from "ol/Map";
import * as mapHelpers from "@/utils/mapHelpers";

// Mock the mapHelpers
vi.mock("@/utils/mapHelpers", () => ({
  getMapScale: vi.fn(),
}));

// Mock config
vi.mock("@/config.json", () => ({
  default: {
    controls: {
      scaleLine: true,
    },
  },
}));

// Store original querySelector for restoration
const originalQuerySelector = document.querySelector;

const mockMap = {
  getView: vi.fn(),
  on: vi.fn(),
  un: vi.fn(),
} as unknown as Map;

const mockView = {
  on: vi.fn(),
  un: vi.fn(),
};

const mockScaleLineInner = {
  textContent: "100 m",
  _innerHTML: "",
  // Make innerHTML settable like a real DOM element
  set innerHTML(value) {
    this._innerHTML = value;
  },
  get innerHTML() {
    return this._innerHTML || "";
  },
};

describe("Scale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.getView = vi.fn().mockReturnValue(mockView);
    (mapHelpers.getMapScale as any).mockReturnValue(25000);

    // Mock document.querySelector for this test only
    document.querySelector = vi.fn().mockReturnValue(mockScaleLineInner);

    // Reset mock innerHTML
    mockScaleLineInner._innerHTML = "";
    mockScaleLineInner.textContent = "100 m";
  });

  afterEach(() => {
    // Restore original querySelector
    document.querySelector = originalQuerySelector;
  });

  it("returns null when scaleLine is enabled in config", () => {
    const { container } = render(<Scale map={mockMap} />);
    expect(container.firstChild).toBeNull();
  });

  it("integrates with OpenLayers scale line element", async () => {
    render(<Scale map={mockMap} />);

    // Wait for the async DOM update to complete
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(document.querySelector).toHaveBeenCalledWith(".ol-scale-line-inner");
    expect(mockScaleLineInner.innerHTML).toContain("1:25,000");
  });

  it("sets up change listeners for map view", () => {
    render(<Scale map={mockMap} />);

    expect(mockView.on).toHaveBeenCalledWith("change:resolution", expect.any(Function));
    expect(mockView.on).toHaveBeenCalledWith("change:center", expect.any(Function));
    expect(mockMap.on).toHaveBeenCalledWith("moveend", expect.any(Function));
    expect(mockMap.on).toHaveBeenCalledWith("rendercomplete", expect.any(Function));
  });

  it("cleans up event listeners on unmount", () => {
    const { unmount } = render(<Scale map={mockMap} />);

    unmount();

    expect(mockView.un).toHaveBeenCalledWith("change:resolution", expect.any(Function));
    expect(mockView.un).toHaveBeenCalledWith("change:center", expect.any(Function));
    expect(mockMap.un).toHaveBeenCalledWith("moveend", expect.any(Function));
    expect(mockMap.un).toHaveBeenCalledWith("rendercomplete", expect.any(Function));
  });

  it("formats scale with comma separators", async () => {
    (mapHelpers.getMapScale as any).mockReturnValue(1234567);

    render(<Scale map={mockMap} />);

    // Wait for the async DOM update to complete
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(mockScaleLineInner.innerHTML).toContain("1:1,234,567");
  });

  it("handles missing map gracefully", () => {
    const { container } = render(<Scale />);
    expect(container.firstChild).toBeNull();
  });
});
