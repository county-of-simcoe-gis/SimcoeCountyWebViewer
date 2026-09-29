import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RotateControl from "@/components/map/controls/RotateControl";
import type Map from "ol/Map";

const mockMap = {
  getView: vi.fn(),
} as unknown as Map;

const mockView = {
  getRotation: vi.fn(),
  animate: vi.fn(),
  on: vi.fn(),
  un: vi.fn(),
};

describe("RotateControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMap.getView = vi.fn().mockReturnValue(mockView);
    mockView.getRotation.mockReturnValue(0);
  });

  it("renders rotate control button when rotated", () => {
    mockView.getRotation.mockReturnValue(Math.PI / 4); // 45 degrees

    render(<RotateControl map={mockMap} />);

    expect(screen.getByTitle("Reset rotation (45°)")).toBeInTheDocument();
  });

  it("resets rotation when clicked", () => {
    mockView.getRotation.mockReturnValue(Math.PI / 2); // 90 degrees

    render(<RotateControl map={mockMap} />);

    const button = screen.getByTitle("Reset rotation (90°)");
    fireEvent.click(button);

    expect(mockView.animate).toHaveBeenCalledWith({
      rotation: 0,
      duration: 250,
    });
  });

  it("displays rotation angle in title when rotated", () => {
    // Set rotation to 45 degrees (π/4 radians)
    mockView.getRotation.mockReturnValue(Math.PI / 4);

    render(<RotateControl map={mockMap} />);

    expect(screen.getByTitle("Reset rotation (45°)")).toBeInTheDocument();
  });

  it("applies rotation transform to button", async () => {
    mockView.getRotation.mockReturnValue(Math.PI / 2); // 90 degrees

    render(<RotateControl map={mockMap} />);

    const button = screen.getByTitle("Reset rotation (90°)");
    await waitFor(() => {
      expect(button.getAttribute("style")).toContain("rotate(90deg)");
    });
  });

  it("renders nothing when not rotated", () => {
    mockView.getRotation.mockReturnValue(0);

    const { container } = render(<RotateControl map={mockMap} />);

    expect(container.firstChild).toBeNull();
  });

  it("shows full opacity when rotated", () => {
    mockView.getRotation.mockReturnValue(Math.PI / 4);

    render(<RotateControl map={mockMap} />);

    const button = screen.getByTitle("Reset rotation (45°)");
    expect(button).toHaveClass("opacity-100");
  });

  it("sets up rotation change listener", () => {
    render(<RotateControl map={mockMap} />);

    expect(mockView.on).toHaveBeenCalledWith("change:rotation", expect.any(Function));
  });

  it("cleans up rotation change listener on unmount", () => {
    const { unmount } = render(<RotateControl map={mockMap} />);

    unmount();

    expect(mockView.un).toHaveBeenCalledWith("change:rotation", expect.any(Function));
  });

  it("handles missing map gracefully", () => {
    const { container } = render(<RotateControl />);

    expect(container.firstChild).toBeNull();
    expect(mockView.animate).not.toHaveBeenCalled();
  });

  it("rounds rotation degrees for display", () => {
    // Test with a non-round angle
    mockView.getRotation.mockReturnValue(Math.PI / 3.7); // ~48.6 degrees

    render(<RotateControl map={mockMap} />);

    // Should round to nearest degree
    expect(screen.getByTitle(/Reset rotation \(49°\)/)).toBeInTheDocument();
  });
});
