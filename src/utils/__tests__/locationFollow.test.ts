import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Map from "ol/Map";
import { useMapStore } from "@/stores/mapStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { RECENTER_INTERVAL_MS, createUserMoveInteraction, getCurrentFix, startUserWatch, stopUserWatch, updateFollowView } from "@/utils/openlayers/LocationFollow";
import { showTemporaryMarker } from "@/utils/openlayers/LocationMarker";

const fix = { lonLat: [-79.3832, 43.6532] as [number, number], accuracy: 10 };
const coordinate = [-8827000, 5400000];

const view = {
  animate: vi.fn(),
  getZoom: vi.fn(() => 10),
};
const mockMap = { getView: () => view } as unknown as Map;

const watchPosition = vi.fn((_success: unknown, _error: unknown, _options: unknown) => 7);
const clearWatch = vi.fn();
const getCurrentPosition = vi.fn();

const setGeolocation = (value: unknown) => {
  Object.defineProperty(navigator, "geolocation", { value, configurable: true });
};

describe("LocationFollow engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopUserWatch();
    vi.spyOn(LayerManager, "addLayer").mockReturnValue("locationFollow::graphics");
    vi.spyOn(LayerManager, "removeLayer").mockReturnValue(true);
    useMapStore.setState({ map: mockMap });
    view.getZoom.mockReturnValue(10);
    setGeolocation({ watchPosition, clearWatch, getCurrentPosition });
  });

  describe("updateFollowView", () => {
    it("zooms to follow zoom on the first fix when zoomed out", () => {
      updateFollowView({ fix, coordinate, trackCoords: null, now: 1000 });

      expect(view.animate).toHaveBeenCalledWith({ center: coordinate, duration: 1000, zoom: 16 });
    });

    it("keeps the current zoom on later recentres", () => {
      view.getZoom.mockReturnValue(18);
      updateFollowView({ fix, coordinate, trackCoords: null, now: 1000 });

      expect(view.animate).toHaveBeenCalledWith({ center: coordinate, duration: 1000 });
    });

    it("recentres at most once per interval", () => {
      updateFollowView({ fix, coordinate, trackCoords: null, now: 1000 });
      updateFollowView({ fix, coordinate, trackCoords: null, now: 1000 + RECENTER_INTERVAL_MS - 1 });
      expect(view.animate).toHaveBeenCalledTimes(1);

      updateFollowView({ fix, coordinate, trackCoords: null, now: 1000 + RECENTER_INTERVAL_MS });
      expect(view.animate).toHaveBeenCalledTimes(2);
    });

    it("does nothing when the map is not available", () => {
      useMapStore.setState({ map: null });
      updateFollowView({ fix, coordinate, trackCoords: null, now: 1000 });

      expect(view.animate).not.toHaveBeenCalled();
      expect(LayerManager.addLayer).not.toHaveBeenCalled();
    });
  });

  describe("startUserWatch / stopUserWatch", () => {
    it("watches high-accuracy position and reports fixes", () => {
      const onFix = vi.fn();
      const onError = vi.fn();

      expect(startUserWatch(onFix, onError)).toBe(true);
      expect(watchPosition).toHaveBeenCalledWith(expect.any(Function), onError, { enableHighAccuracy: true });

      const success = watchPosition.mock.calls[0][0] as unknown as (position: GeolocationPosition) => void;
      success({ coords: { longitude: fix.lonLat[0], latitude: fix.lonLat[1], accuracy: fix.accuracy } } as GeolocationPosition);
      expect(onFix).toHaveBeenCalledWith(fix);
    });

    it("returns false when geolocation is unavailable", () => {
      setGeolocation(undefined);

      expect(startUserWatch(vi.fn(), vi.fn())).toBe(false);
    });

    it("clears the watch on stop", () => {
      startUserWatch(vi.fn(), vi.fn());
      stopUserWatch();

      expect(clearWatch).toHaveBeenCalledWith(7);
    });
  });

  describe("getCurrentFix", () => {
    it("resolves with the current position", async () => {
      getCurrentPosition.mockImplementation((success: (position: GeolocationPosition) => void) => {
        success({ coords: { longitude: fix.lonLat[0], latitude: fix.lonLat[1], accuracy: fix.accuracy } } as GeolocationPosition);
      });

      await expect(getCurrentFix()).resolves.toEqual(fix);
      expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { timeout: 5000 });
    });

    it("rejects when geolocation is unavailable", async () => {
      setGeolocation(undefined);

      await expect(getCurrentFix()).rejects.toThrow("Geolocation unavailable");
    });
  });

  describe("startUserWatch with a pending temporary marker", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("keeps the follow marker when following starts before the timeout", () => {
      showTemporaryMarker(fix);
      vi.mocked(LayerManager.removeLayer).mockClear();
      startUserWatch(vi.fn(), vi.fn());

      vi.advanceTimersByTime(5000);
      expect(LayerManager.removeLayer).not.toHaveBeenCalled();
    });
  });

  describe("createUserMoveInteraction", () => {
    it("reports drags without consuming the down event", () => {
      const onUserMove = vi.fn();
      const interaction = createUserMoveInteraction(onUserMove);

      expect(interaction.stopDown(true)).toBe(false);

      (interaction as unknown as { handleDragEvent: (event: unknown) => void }).handleDragEvent({});
      expect(onUserMove).toHaveBeenCalledTimes(1);
    });
  });
});
