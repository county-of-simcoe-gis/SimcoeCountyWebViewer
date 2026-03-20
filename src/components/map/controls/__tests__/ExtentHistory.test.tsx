import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExtentHistory from "@/components/map/controls/ExtentHistory";
import type Map from "ol/Map";

// Mock the mapStore
const mockMapStore = {
  map: null,
  extentHistory: [],
  currentExtentIndex: -1,
  setCurrentExtentIndex: vi.fn(),
};

vi.mock("@/stores/mapStore", () => ({
  useMapStore: (selector?: any) => (typeof selector === "function" ? selector(mockMapStore) : mockMapStore),
}));

const mockMap = {
  getView: vi.fn(),
} as unknown as Map;

const mockView = {
  setZoom: vi.fn(),
  setCenter: vi.fn(),
};

describe("ExtentHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.getView = vi.fn().mockReturnValue(mockView);
    mockMapStore.map = mockMap;
    mockMapStore.extentHistory = [
      { center: [0, 0], zoom: 10 },
      { center: [100, 100], zoom: 12 },
      { center: [200, 200], zoom: 14 },
    ];
    mockMapStore.currentExtentIndex = 1;
  });

  it("renders previous and next buttons", () => {
    render(<ExtentHistory />);

    expect(screen.getByTitle("Previous Extent")).toBeInTheDocument();
    expect(screen.getByTitle("Next Extent")).toBeInTheDocument();
  });

  it("navigates to previous extent when previous button is clicked", () => {
    render(<ExtentHistory />);

    const prevButton = screen.getByTitle("Previous Extent");
    fireEvent.click(prevButton);

    expect(mockView.setZoom).toHaveBeenCalledWith(10);
    expect(mockView.setCenter).toHaveBeenCalledWith([0, 0]);
    expect(mockMapStore.setCurrentExtentIndex).toHaveBeenCalledWith(0);
  });

  it("navigates to next extent when next button is clicked", () => {
    render(<ExtentHistory />);

    const nextButton = screen.getByTitle("Next Extent");
    fireEvent.click(nextButton);

    expect(mockView.setZoom).toHaveBeenCalledWith(14);
    expect(mockView.setCenter).toHaveBeenCalledWith([200, 200]);
    expect(mockMapStore.setCurrentExtentIndex).toHaveBeenCalledWith(2);
  });

  it("disables previous button when at beginning of history", () => {
    mockMapStore.currentExtentIndex = 0;

    render(<ExtentHistory />);

    const prevButton = screen.getByTitle("Previous Extent");
    expect(prevButton).toHaveClass("opacity-50", "cursor-not-allowed");
  });

  it("disables next button when at end of history", () => {
    mockMapStore.currentExtentIndex = 2;

    render(<ExtentHistory />);

    const nextButton = screen.getByTitle("Next Extent");
    expect(nextButton).toHaveClass("opacity-50", "cursor-not-allowed");
  });

  it("does not navigate when at beginning and previous is clicked", () => {
    mockMapStore.currentExtentIndex = 0;

    render(<ExtentHistory />);

    const prevButton = screen.getByTitle("Previous Extent");
    fireEvent.click(prevButton);

    expect(mockView.setZoom).not.toHaveBeenCalled();
    expect(mockView.setCenter).not.toHaveBeenCalled();
    expect(mockMapStore.setCurrentExtentIndex).not.toHaveBeenCalled();
  });

  it("does not navigate when at end and next is clicked", () => {
    mockMapStore.currentExtentIndex = 2;

    render(<ExtentHistory />);

    const nextButton = screen.getByTitle("Next Extent");
    fireEvent.click(nextButton);

    expect(mockView.setZoom).not.toHaveBeenCalled();
    expect(mockView.setCenter).not.toHaveBeenCalled();
    expect(mockMapStore.setCurrentExtentIndex).not.toHaveBeenCalled();
  });

  it("handles missing map gracefully", () => {
    mockMapStore.map = null;

    render(<ExtentHistory />);

    const prevButton = screen.getByTitle("Previous Extent");
    fireEvent.click(prevButton);

    expect(mockMapStore.setCurrentExtentIndex).not.toHaveBeenCalled();
  });

  it("has correct button layout and styling", () => {
    render(<ExtentHistory />);

    const container = screen.getByTitle("Previous Extent").closest(".flex");
    expect(container).toHaveClass("flex", "gap-1", "w-[38px]", "h-[38px]");
  });
});
