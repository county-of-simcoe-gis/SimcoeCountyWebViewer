import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ZoomControls from "@/components/map/controls/ZoomControls";
import type Map from "ol/Map";

const mockMap = {
  getView: vi.fn(),
} as unknown as Map;

const mockView = {
  getZoom: vi.fn(),
  animate: vi.fn(),
};

describe("ZoomControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.getView = vi.fn().mockReturnValue(mockView);
    mockView.getZoom.mockReturnValue(10);
  });

  it("renders zoom in and zoom out buttons", () => {
    render(<ZoomControls map={mockMap} />);

    expect(screen.getByTitle("Zoom in")).toBeInTheDocument();
    expect(screen.getByTitle("Zoom out")).toBeInTheDocument();
  });

  it("zooms in when zoom in button is clicked", () => {
    render(<ZoomControls map={mockMap} />);

    const zoomInButton = screen.getByTitle("Zoom in");
    fireEvent.click(zoomInButton);

    expect(mockView.animate).toHaveBeenCalledWith({
      zoom: 11,
      duration: 250,
    });
  });

  it("zooms out when zoom out button is clicked", () => {
    render(<ZoomControls map={mockMap} />);

    const zoomOutButton = screen.getByTitle("Zoom out");
    fireEvent.click(zoomOutButton);

    expect(mockView.animate).toHaveBeenCalledWith({
      zoom: 9,
      duration: 250,
    });
  });

  it("handles missing map gracefully", () => {
    render(<ZoomControls />);

    const zoomInButton = screen.getByTitle("Zoom in");
    fireEvent.click(zoomInButton);

    expect(mockView.animate).not.toHaveBeenCalled();
  });

  it("handles undefined zoom level gracefully", () => {
    mockView.getZoom.mockReturnValue(undefined);

    render(<ZoomControls map={mockMap} />);

    const zoomInButton = screen.getByTitle("Zoom in");
    fireEvent.click(zoomInButton);

    expect(mockView.animate).not.toHaveBeenCalled();
  });

  it("displays zoom control icons", () => {
    render(<ZoomControls map={mockMap} />);

    // Check that the component has the expected structure
    const container = screen.getByTitle("Zoom in").closest(".flex");
    expect(container).toHaveClass("flex", "flex-col", "gap-1");
  });
});
