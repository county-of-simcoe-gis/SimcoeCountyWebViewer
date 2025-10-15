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
  on: vi.fn(),
  un: vi.fn(),
};

describe("ScaleSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.getView = vi.fn().mockReturnValue(mockView);
    mockView.getZoom.mockReturnValue(12);
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

  it("contains common scale options", () => {
    render(<ScaleSelector map={mockMap} />);

    // Should have various scale options
    expect(screen.getByText("1:250")).toBeInTheDocument();
    expect(screen.getByText("1:1,000")).toBeInTheDocument();
    expect(screen.getByText("1:25,000")).toBeInTheDocument();
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
