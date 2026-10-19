import { beforeEach, describe, expect, it, vi } from "vitest";
import { fromLonLat } from "ol/proj";
import { useLocationFollowStore } from "@/stores/locationFollowStore";
import { useEventStore } from "@/stores/eventStore";
import { useMapStore } from "@/stores/mapStore";
import { useInteractionManagerStore } from "@/stores/interactionManagerStore";
import { useToastStore } from "@/hooks/useToast";
import { createUserMoveInteraction, getCurrentFix, startUserWatch, stopUserWatch, updateFollowView } from "@/utils/openlayers/LocationFollow";

vi.mock("@/utils/openlayers/LocationFollow", () => ({
  RECENTER_INTERVAL_MS: 3000,
  startUserWatch: vi.fn(() => true),
  stopUserWatch: vi.fn(),
  updateFollowView: vi.fn(),
  getCurrentFix: vi.fn(),
  createUserMoveInteraction: vi.fn(() => ({})),
}));

const USER_MOVE_ID = "locationFollow-userMove";
const firstFix = { lonLat: [-79.3832, 43.6532] as [number, number], accuracy: 5 };
const secondFix = { lonLat: [-79.384, 43.654] as [number, number], accuracy: 5 };

const getOnFix = () => vi.mocked(startUserWatch).mock.calls[0][0];
const getOnError = () => vi.mocked(startUserWatch).mock.calls[0][1];

describe("locationFollowStore", () => {
  let locationListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    useLocationFollowStore.setState({ mode: "off", lastFix: null, trackCoords: [] });
    useInteractionManagerStore.setState({ interactions: [] });
    useMapStore.setState({ activeToolId: null });
    useToastStore.setState({ toasts: [] });
    locationListener = vi.fn();
    useEventStore.setState({ listeners: [] });
    useEventStore.getState().addListener("mymap-location-item", locationListener as (data?: { [key: string]: unknown }) => void);
  });

  it("starts follow, watches position and registers the user-move interaction", () => {
    useLocationFollowStore.getState().startFollow();

    expect(useLocationFollowStore.getState().mode).toBe("follow");
    expect(startUserWatch).toHaveBeenCalledTimes(1);
    expect(useInteractionManagerStore.getState().getInteraction(USER_MOVE_ID)?.owner).toBe("locationFollow");
  });

  it("stops follow and tears down the watch and interaction", () => {
    useLocationFollowStore.getState().startFollow();
    useLocationFollowStore.getState().stopFollow();

    expect(useLocationFollowStore.getState().mode).toBe("off");
    expect(stopUserWatch).toHaveBeenCalledTimes(1);
    expect(useInteractionManagerStore.getState().getInteraction(USER_MOVE_ID)).toBeUndefined();
  });

  it("keeps the watch when switching from follow to track", () => {
    useLocationFollowStore.getState().startFollow();
    useLocationFollowStore.getState().toggleTrack();

    expect(useLocationFollowStore.getState().mode).toBe("track");
    expect(startUserWatch).toHaveBeenCalledTimes(1);
    expect(stopUserWatch).not.toHaveBeenCalled();
  });

  it("records fixes while tracking and emits a LineString on stop", () => {
    useLocationFollowStore.getState().toggleTrack();
    getOnFix()(firstFix);
    getOnFix()(secondFix);
    useLocationFollowStore.getState().toggleTrack();

    expect(locationListener).toHaveBeenCalledWith({
      type: "LineString",
      coordinates: [fromLonLat(firstFix.lonLat), fromLonLat(secondFix.lonLat)],
    });
    expect(useLocationFollowStore.getState().mode).toBe("off");
  });

  it("does not emit a track with fewer than two points", () => {
    useLocationFollowStore.getState().toggleTrack();
    getOnFix()(firstFix);
    useLocationFollowStore.getState().toggleTrack();

    expect(locationListener).not.toHaveBeenCalled();
    expect(useToastStore.getState().toasts[0]?.message).toBe("Track was too short to save.");
  });

  it("passes track coordinates to the map only while tracking", () => {
    useLocationFollowStore.getState().startFollow();
    getOnFix()(firstFix);

    expect(updateFollowView).toHaveBeenLastCalledWith(expect.objectContaining({ trackCoords: null }));
  });

  it("ends the session with a permission warning when permission is denied", () => {
    useLocationFollowStore.getState().startFollow();
    getOnError()({ code: 1 } as GeolocationPositionError);

    expect(useLocationFollowStore.getState().mode).toBe("off");
    expect(useToastStore.getState().toasts[0]?.message).toBe("Geolocation permission denied.");
  });

  it("ends the session when the user drags the map", async () => {
    useLocationFollowStore.getState().startFollow();
    const onUserMove = vi.mocked(createUserMoveInteraction).mock.calls[0][0];
    onUserMove();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useLocationFollowStore.getState().mode).toBe("off");
  });

  it("ignores map drags while a MyMaps tool is active", async () => {
    useLocationFollowStore.getState().startFollow();
    useMapStore.setState({ activeToolId: "mymaps-draw" });
    const onUserMove = vi.mocked(createUserMoveInteraction).mock.calls[0][0];
    onUserMove();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useLocationFollowStore.getState().mode).toBe("follow");
  });

  it("emits a Point at the current fix when following", async () => {
    useLocationFollowStore.getState().startFollow();
    getOnFix()(firstFix);

    await useLocationFollowStore.getState().requestPointAtLocation();

    expect(getCurrentFix).not.toHaveBeenCalled();
    expect(locationListener).toHaveBeenCalledWith({ type: "Point", coordinates: fromLonLat(firstFix.lonLat) });
  });

  it("emits a Point from a one-shot position when not following", async () => {
    vi.mocked(getCurrentFix).mockResolvedValue(secondFix);

    await useLocationFollowStore.getState().requestPointAtLocation();

    expect(locationListener).toHaveBeenCalledWith({ type: "Point", coordinates: fromLonLat(secondFix.lonLat) });
  });

  it("shows an error toast when the one-shot position fails", async () => {
    vi.mocked(getCurrentFix).mockRejectedValue(new Error("timeout"));

    await useLocationFollowStore.getState().requestPointAtLocation();

    expect(locationListener).not.toHaveBeenCalled();
    expect(useToastStore.getState().toasts[0]?.message).toBe("Could not get current location.");
  });
});
