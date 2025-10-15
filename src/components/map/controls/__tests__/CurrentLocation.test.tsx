import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CurrentLocation from "@/components/map/controls/CurrentLocation";
import type Map from "ol/Map";

// Mock ol/proj
vi.mock("ol/proj", () => ({
  fromLonLat: vi.fn((coords) => coords), // Simple mock that returns the same coordinates
}));

const mockMap = {
  getView: vi.fn(),
} as unknown as Map;

const mockView = {
  animate: vi.fn(),
};

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};

Object.defineProperty(global, "navigator", {
  value: {
    geolocation: mockGeolocation,
  },
  writable: true,
});

describe("CurrentLocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.getView = vi.fn().mockReturnValue(mockView);
  });

  it("renders current location button", () => {
    render(<CurrentLocation map={mockMap} />);

    expect(screen.getByTitle("Zoom to current location")).toBeInTheDocument();
  });

  it("requests geolocation when button is clicked", () => {
    render(<CurrentLocation map={mockMap} />);

    const button = screen.getByTitle("Zoom to current location");
    fireEvent.click(button);

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { timeout: 5000 });
  });

  it("animates to current location on successful geolocation", () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          longitude: -79.3832,
          latitude: 43.6532,
        },
      });
    });

    render(<CurrentLocation map={mockMap} />);

    const button = screen.getByTitle("Zoom to current location");
    fireEvent.click(button);

    expect(mockView.animate).toHaveBeenCalledWith({
      center: [-79.3832, 43.6532],
      zoom: 16,
      duration: 1000,
    });
  });

  it("handles geolocation error gracefully", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      error(new Error("Geolocation failed"));
    });

    render(<CurrentLocation map={mockMap} />);

    const button = screen.getByTitle("Zoom to current location");
    fireEvent.click(button);

    expect(consoleSpy).toHaveBeenCalledWith("Error getting current location:", expect.any(Error));
    expect(mockView.animate).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("handles missing map gracefully", () => {
    render(<CurrentLocation />);

    const button = screen.getByTitle("Zoom to current location");
    fireEvent.click(button);

    // Should not call geolocation when no map is provided
    expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("has crosshairs icon", () => {
    render(<CurrentLocation map={mockMap} />);

    // Verify the button has the expected styling classes
    const button = screen.getByTitle("Zoom to current location");
    expect(button).toHaveClass("w-[38px]", "h-[38px]", "bg-gradient-to-b");
  });
});
