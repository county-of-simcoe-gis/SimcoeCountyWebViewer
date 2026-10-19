import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FollowLocationButton from "@/components/map/controls/FollowLocation";
import { useLocationFollowStore } from "@/stores/locationFollowStore";
import { startUserWatch, stopUserWatch } from "@/utils/openlayers/LocationFollow";

vi.mock("@/utils/openlayers/LocationFollow", () => ({
  RECENTER_INTERVAL_MS: 3000,
  startUserWatch: vi.fn(() => true),
  stopUserWatch: vi.fn(),
  updateFollowView: vi.fn(),
  getCurrentFix: vi.fn(),
  createUserMoveInteraction: vi.fn(() => ({})),
}));

describe("FollowLocationButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocationFollowStore.setState({ mode: "off", lastFix: null, trackCoords: [] });
  });

  it("starts following when clicked while off", () => {
    render(<FollowLocationButton />);

    fireEvent.click(screen.getByTitle("Follow my location"));

    expect(startUserWatch).toHaveBeenCalledTimes(1);
    expect(useLocationFollowStore.getState().mode).toBe("follow");
  });

  it("stops following when clicked while following", () => {
    render(<FollowLocationButton />);
    fireEvent.click(screen.getByTitle("Follow my location"));
    fireEvent.click(screen.getByTitle("Stop following my location"));

    expect(stopUserWatch).toHaveBeenCalledTimes(1);
    expect(useLocationFollowStore.getState().mode).toBe("off");
  });

  it("reflects the active state with aria-pressed", () => {
    useLocationFollowStore.setState({ mode: "follow" });
    render(<FollowLocationButton />);

    expect(screen.getByTitle("Stop following my location")).toHaveAttribute("aria-pressed", "true");
  });
});
