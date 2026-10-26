import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { TEMPORARY_MARKER_MS, cancelTemporaryMarker, removeMarker, showTemporaryMarker } from "@/utils/openlayers/LocationMarker";

const fix = { lonLat: [-79.3832, 43.6532] as [number, number], accuracy: 10 };

describe("LocationMarker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(LayerManager, "addLayer").mockReturnValue("locationFollow::graphics");
    vi.spyOn(LayerManager, "removeLayer").mockReturnValue(true);
    removeMarker();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("removes the marker after the temporary timeout", () => {
    showTemporaryMarker(fix);
    expect(LayerManager.addLayer).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(TEMPORARY_MARKER_MS - 1);
    expect(LayerManager.removeLayer).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(LayerManager.removeLayer).toHaveBeenCalledWith("locationFollow::graphics");
  });

  it("restarts the timeout when a new marker is shown", () => {
    showTemporaryMarker(fix);
    vi.advanceTimersByTime(TEMPORARY_MARKER_MS - 1000);
    showTemporaryMarker(fix);

    vi.advanceTimersByTime(TEMPORARY_MARKER_MS - 1);
    expect(LayerManager.removeLayer).not.toHaveBeenCalled();
  });

  it("keeps the marker when the timeout is cancelled", () => {
    showTemporaryMarker(fix);
    cancelTemporaryMarker();

    vi.advanceTimersByTime(TEMPORARY_MARKER_MS);
    expect(LayerManager.removeLayer).not.toHaveBeenCalled();
  });

  it("removes the marker immediately and cancels the pending timeout", () => {
    showTemporaryMarker(fix);
    removeMarker();
    expect(LayerManager.removeLayer).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(TEMPORARY_MARKER_MS);
    expect(LayerManager.removeLayer).toHaveBeenCalledTimes(1);
  });
});
