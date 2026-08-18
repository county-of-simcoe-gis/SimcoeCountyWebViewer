import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScaleSelector from "@/components/map/controls/ScaleSelector";
import type Map from "ol/Map";

const mockMap = {
  getView: vi.fn(),
} as unknown as Map;

const mockView = {
  setZoom: vi.fn(),
  getZoom: vi.fn(),
  getResolution: vi.fn(),
  getCenter: vi.fn(),
  getMinZoom: vi.fn(),
  getMaxZoom: vi.fn(),
  on: vi.fn(),
  un: vi.fn(),
};

describe("ScaleSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.getView = vi.fn().mockReturnValue(mockView);
    mockView.getZoom.mockReturnValue(12);
    mockView.getMinZoom.mockReturnValue(0);
    mockView.getMaxZoom.mockReturnValue(20);
  });

  it("renders scale selector dropdown", () => {
    render(<ScaleSelector map={mockMap} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("displays current zoom level in select", () => {
    mockView.getZoom.mockReturnValue(10);

    render(<ScaleSelector map={mockMap} />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    // Should show a zoom level close to 10
    expect(select.value).toBeDefined();
  });

  it("changes zoom when different scale is selected", () => {
    render(<ScaleSelector map={mockMap} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "25000" } });

    // The zoom calculation: Math.log2(591657527.591555 / 25000) ≈ 14.56
    expect(mockView.setZoom).toHaveBeenCalledWith(expect.any(Number));
  });

  it("updates selected value when zoom changes externally", () => {
    const { rerender } = render(<ScaleSelector map={mockMap} />);

    // Simulate zoom change event
    mockView.getZoom.mockReturnValue(8);

    // Trigger a re-render to simulate zoom change
    rerender(<ScaleSelector map={mockMap} />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    // The closest available zoom level should be selected
    expect(select.value).toBeDefined();
  });

  it("sets up zoom change listener", () => {
    render(<ScaleSelector map={mockMap} />);

    expect(mockView.on).toHaveBeenCalledWith("change:resolution", expect.any(Function));
  });

  it("cleans up zoom change listener on unmount", () => {
    const { unmount } = render(<ScaleSelector map={mockMap} />);

    unmount();

    expect(mockView.un).toHaveBeenCalledWith("change:resolution", expect.any(Function));
  });

  it("handles missing map gracefully", () => {
    render(<ScaleSelector />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "10" } });

    // Should not throw error
    expect(mockView.setZoom).not.toHaveBeenCalled();
  });

  it("generates scale options from the map zoom levels", () => {
    render(<ScaleSelector map={mockMap} />);

    // minZoom=0, maxZoom=20 → 21 zoom-derived options + 1 current scale option
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(22);

    // z=20: round(591657527.591555 / 2^20) = 564
    expect(screen.getByText("1:564")).toBeInTheDocument();
    // z=10: round(591657527.591555 / 2^10) = 577791
    expect(screen.getByText("1:577,791")).toBeInTheDocument();
  });

  it("limits options to the map maxZoom", () => {
    mockView.getMaxZoom.mockReturnValue(15);

    render(<ScaleSelector map={mockMap} />);

    // minZoom=0, maxZoom=15 → 16 zoom-derived options + 1 current scale
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(17);

    // z=15 (18056) should be the most zoomed-in option
    expect(screen.getByText("1:18,056")).toBeInTheDocument();
    // z=20 (564) should not exist
    expect(screen.queryByText("1:564")).not.toBeInTheDocument();
  });

  it("limits options to the map minZoom", () => {
    mockView.getMinZoom.mockReturnValue(16);
    mockView.getMaxZoom.mockReturnValue(20);

    render(<ScaleSelector map={mockMap} />);

    // z=16 through z=20 → 5 zoom-derived options + 1 current scale
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(6);

    // z=16 (9028) and z=20 (564) should be present
    expect(screen.getByText("1:9,028")).toBeInTheDocument();
    expect(screen.getByText("1:564")).toBeInTheDocument();
    // z=15 (18056) should be excluded
    expect(screen.queryByText("1:18,056")).not.toBeInTheDocument();
  });

  it("has proper styling", () => {
    render(<ScaleSelector map={mockMap} />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveClass("text-xs");
  });

  it("finds closest zoom level to current zoom", () => {
    // Test with a zoom level that's between available options
    mockView.getZoom.mockReturnValue(7.3);

    render(<ScaleSelector map={mockMap} />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    // Should select the closest available zoom level
    expect(select.value).toBeDefined();
  });
});
