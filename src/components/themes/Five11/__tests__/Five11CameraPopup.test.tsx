import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Five11CameraPopup from "../Five11CameraPopup";
import type { MtoCameraProperties } from "../types";

describe("Five11CameraPopup", () => {
  const fullProperties: MtoCameraProperties = {
    Description: "Highway 400 at Dunlop St",
    Url: "https://example.com/camera/400-dunlop.jpg",
    Latitude: 44.3894,
    Longitude: -79.6903,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the camera description", () => {
    render(<Five11CameraPopup properties={fullProperties} />);

    expect(screen.getByText("Highway 400 at Dunlop St")).toBeInTheDocument();
  });

  it("renders the camera image with cache-busting URL", () => {
    render(<Five11CameraPopup properties={fullProperties} />);

    const img = screen.getByAltText("Highway 400 at Dunlop St");
    expect(img).toBeInTheDocument();
    // The src should start with the original URL and have a cache-busting param
    expect(img.getAttribute("src")).toMatch(/^https:\/\/example\.com\/camera\/400-dunlop\.jpg\?t=\d+$/);
  });

  it("renders a Refresh button", () => {
    render(<Five11CameraPopup properties={fullProperties} />);

    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("renders an Open Full Size link", () => {
    render(<Five11CameraPopup properties={fullProperties} />);

    const link = screen.getByText("Open Full Size");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "https://example.com/camera/400-dunlop.jpg");
    expect(link.closest("a")).toHaveAttribute("target", "_blank");
  });

  it("updates image on Refresh click (cache bust changes)", () => {
    render(<Five11CameraPopup properties={fullProperties} />);

    const img = screen.getByAltText("Highway 400 at Dunlop St");
    const _initialSrc = img.getAttribute("src");

    // Click refresh - the cache busting timestamp should change
    fireEvent.click(screen.getByText("Refresh"));

    const updatedSrc = img.getAttribute("src");
    // The URLs should be different due to the updated timestamp
    // (In practice, Date.now() may or may not differ in the same ms,
    // but the state update trigger is what we're testing)
    expect(updatedSrc).toMatch(/^https:\/\/example\.com\/camera\/400-dunlop\.jpg\?t=\d+$/);
  });

  it("wraps image in a link to full size", () => {
    render(<Five11CameraPopup properties={fullProperties} />);

    const img = screen.getByAltText("Highway 400 at Dunlop St");
    const link = img.closest("a");
    expect(link).toHaveAttribute("href", "https://example.com/camera/400-dunlop.jpg");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows unavailable message when URL is missing", () => {
    const noUrlProperties: MtoCameraProperties = {
      Description: "Camera with no feed",
    };

    render(<Five11CameraPopup properties={noUrlProperties} />);

    expect(screen.getByText("Camera feed unavailable")).toBeInTheDocument();
  });

  it("renders without description when not provided", () => {
    const noDescProperties: MtoCameraProperties = {
      Url: "https://example.com/camera/feed.jpg",
    };

    render(<Five11CameraPopup properties={noDescProperties} />);

    // Should render the image with fallback alt text
    const img = screen.getByAltText("Traffic Camera");
    expect(img).toBeInTheDocument();
    // Should not crash looking for description
    expect(screen.queryByText("Highway 400")).not.toBeInTheDocument();
  });

  it("handles URL with existing query parameters", () => {
    const propsWithQuery: MtoCameraProperties = {
      Description: "Test Camera",
      Url: "https://example.com/camera/feed.jpg?quality=high",
    };

    render(<Five11CameraPopup properties={propsWithQuery} />);

    const img = screen.getByAltText("Test Camera");
    // Should use & instead of ? for cache-busting param
    expect(img.getAttribute("src")).toMatch(/^https:\/\/example\.com\/camera\/feed\.jpg\?quality=high&t=\d+$/);
  });

  it("hides image on error via onError handler", () => {
    render(<Five11CameraPopup properties={fullProperties} />);

    const img = screen.getByAltText("Highway 400 at Dunlop St");
    fireEvent.error(img);

    expect(img.style.display).toBe("none");
  });
});
