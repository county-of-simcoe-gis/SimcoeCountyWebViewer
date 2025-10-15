import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ZoomToExtent from "@/components/map/controls/ZoomToExtent";
import type Map from "ol/Map";

// Create mock map and view
const mockView = {
  animate: vi.fn(),
};

const mockMap = {
  getView: vi.fn(),
} as unknown as Map;

describe("ZoomToExtent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure the mock map returns the mock view
    mockMap.getView = vi.fn().mockReturnValue(mockView);
  });

  it("renders a clickable element", () => {
    render(<ZoomToExtent map={mockMap} centerCoords={[100, 200]} defaultZoom={10} />);

    const element = screen.getByTitle("Zoom to full extent");
    expect(element).toBeInTheDocument();
    expect(element).toHaveAttribute("title", "Zoom to full extent");
  });

  it("displays globe icon", () => {
    render(<ZoomToExtent map={mockMap} centerCoords={[100, 200]} defaultZoom={10} />);

    expect(screen.getByTestId("globe-icon")).toBeInTheDocument();
  });

  it("calls animate with correct parameters when clicked", () => {
    const centerCoords = [100, 200];
    const defaultZoom = 12;

    render(<ZoomToExtent map={mockMap} centerCoords={centerCoords} defaultZoom={defaultZoom} />);

    const element = screen.getByTitle("Zoom to full extent");
    fireEvent.click(element);

    expect(mockView.animate).toHaveBeenCalledWith({
      center: centerCoords,
      zoom: defaultZoom,
      duration: 1000,
    });
  });

  it("does nothing when clicked without map", () => {
    render(<ZoomToExtent centerCoords={[100, 200]} defaultZoom={10} />);

    const element = screen.getByTitle("Zoom to full extent");
    fireEvent.click(element);

    expect(mockView.animate).not.toHaveBeenCalled();
  });

  it("passes custom center coordinates to animate", () => {
    const customCoords = [-79.3832, 43.6532];

    render(<ZoomToExtent map={mockMap} centerCoords={customCoords} defaultZoom={8} />);

    const element = screen.getByTitle("Zoom to full extent");
    fireEvent.click(element);

    expect(mockView.animate).toHaveBeenCalledWith({
      center: customCoords,
      zoom: 8,
      duration: 1000,
    });
  });

  it("passes custom zoom level to animate", () => {
    const customZoom = 15;

    render(<ZoomToExtent map={mockMap} centerCoords={[0, 0]} defaultZoom={customZoom} />);

    const element = screen.getByTitle("Zoom to full extent");
    fireEvent.click(element);

    expect(mockView.animate).toHaveBeenCalledWith({
      center: [0, 0],
      zoom: customZoom,
      duration: 1000,
    });
  });

  it("has clickable styling and behavior", () => {
    render(<ZoomToExtent map={mockMap} centerCoords={[100, 200]} defaultZoom={10} />);

    const element = screen.getByTitle("Zoom to full extent");
    expect(element).toHaveClass("cursor-pointer");
    expect(element).toHaveAttribute("title", "Zoom to full extent");
  });

  it("has consistent animation duration", () => {
    render(<ZoomToExtent map={mockMap} centerCoords={[100, 200]} defaultZoom={10} />);

    const element = screen.getByTitle("Zoom to full extent");
    fireEvent.click(element);

    expect(mockView.animate).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 1000,
      })
    );
  });
});
