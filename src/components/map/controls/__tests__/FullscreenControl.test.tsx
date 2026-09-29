import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FullscreenControl from "@/components/map/controls/FullscreenControl";
import type Map from "ol/Map";

const mockMap = {
  getTarget: vi.fn().mockReturnValue("map"),
  updateSize: vi.fn(),
} as unknown as Map;

// Simple fullscreen API mocks
Object.defineProperty(document, "fullscreenElement", {
  value: null,
  writable: true,
});

Object.defineProperty(document, "exitFullscreen", {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(document, "getElementById", {
  value: vi.fn().mockReturnValue({
    requestFullscreen: vi.fn(),
  }),
  writable: true,
});

describe("FullscreenControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.addEventListener = vi.fn();
    document.removeEventListener = vi.fn();
  });

  it("renders fullscreen control button", () => {
    render(<FullscreenControl map={mockMap} />);

    expect(screen.getByTitle("Enter fullscreen")).toBeInTheDocument();
    expect(screen.getByTestId("expand-icon")).toBeInTheDocument();
  });

  it("shows expand icon by default", () => {
    render(<FullscreenControl map={mockMap} />);

    const button = screen.getByTitle("Enter fullscreen");
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId("expand-icon")).toBeInTheDocument();
  });

  it("handles click events without errors", () => {
    render(<FullscreenControl map={mockMap} />);

    const button = screen.getByTitle("Enter fullscreen");

    // Should not throw when clicked
    expect(() => fireEvent.click(button)).not.toThrow();
  });

  it("handles missing map gracefully", () => {
    render(<FullscreenControl />);

    const button = screen.getByTitle("Enter fullscreen");
    expect(button).toBeInTheDocument();

    // Should not throw when clicked without map
    expect(() => fireEvent.click(button)).not.toThrow();
  });

  it("handles missing map target gracefully", () => {
    const mapWithoutTarget = { ...mockMap, getTarget: vi.fn().mockReturnValue(null) };

    render(<FullscreenControl map={mapWithoutTarget as Map} />);

    const button = screen.getByTitle("Enter fullscreen");
    expect(button).toBeInTheDocument();

    // Should not throw when clicked with null target
    expect(() => fireEvent.click(button)).not.toThrow();
  });

  it("sets up fullscreen change event listener", () => {
    render(<FullscreenControl map={mockMap} />);

    expect(document.addEventListener).toHaveBeenCalledWith("fullscreenchange", expect.any(Function));
  });

  it("cleans up event listener on unmount", () => {
    const { unmount } = render(<FullscreenControl map={mockMap} />);

    unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith("fullscreenchange", expect.any(Function));
  });

  it("has proper button styling", () => {
    render(<FullscreenControl map={mockMap} />);

    const button = screen.getByTitle("Enter fullscreen");
    expect(button).toHaveClass("cursor-pointer", "rounded-full", "inline-flex", "items-center", "justify-center");
  });
});
