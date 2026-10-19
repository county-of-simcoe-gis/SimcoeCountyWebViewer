"use client";

import { create } from "zustand";
import { fromLonLat } from "ol/proj";
import { useMapStore } from "@/stores/mapStore";
import { useEventStore } from "@/stores/eventStore";
import { useInteractionManagerStore } from "@/stores/interactionManagerStore";
import { useToastStore } from "@/hooks/useToast";
import { createUserMoveInteraction, getCurrentFix, startUserWatch, stopUserWatch, updateFollowView, type LocationFix } from "@/utils/openlayers/LocationFollow";

export type LocationFollowMode = "off" | "follow" | "track";

const USER_MOVE_INTERACTION_ID = "locationFollow-userMove";
const PERMISSION_DENIED = 1;
const MIN_TRACK_POINTS = 2;

interface LocationFollowState {
  mode: LocationFollowMode;
  lastFix: LocationFix | null;
  trackCoords: number[][];
  startFollow: () => void;
  stopFollow: () => void;
  toggleFollow: () => void;
  toggleTrack: () => void;
  requestPointAtLocation: () => Promise<void>;
}

const reportLocationError = (error: unknown): void => {
  const toast = useToastStore.getState();
  if ((error as GeolocationPositionError | undefined)?.code === PERMISSION_DENIED) {
    toast.addToast("Geolocation permission denied.", "warning");
  } else {
    toast.addToast("Could not get current location.", "error");
  }
};

const saveTrack = (trackCoords: number[][]): void => {
  if (trackCoords.length < MIN_TRACK_POINTS) {
    useToastStore.getState().addToast("Track was too short to save.", "info");
    return;
  }
  useEventStore.getState().emit("mymap-location-item", { type: "LineString", coordinates: trackCoords });
};

export const useLocationFollowStore = create<LocationFollowState>((set, get) => {
  const endSession = (): void => {
    const { mode, trackCoords } = get();
    if (mode === "off") return;

    stopUserWatch();
    useInteractionManagerStore.getState().unregisterInteraction(USER_MOVE_INTERACTION_ID);
    set({ mode: "off", lastFix: null, trackCoords: [] });
    if (mode === "track") saveTrack(trackCoords);
  };

  const handleFix = (fix: LocationFix): void => {
    const { mode, trackCoords } = get();
    const coordinate = fromLonLat(fix.lonLat);
    const nextTrackCoords = mode === "track" ? [...trackCoords, coordinate] : trackCoords;

    set({ lastFix: fix, trackCoords: nextTrackCoords });
    updateFollowView({ fix, coordinate, trackCoords: mode === "track" ? nextTrackCoords : null, now: Date.now() });
  };

  const handleWatchError = (error: GeolocationPositionError): void => {
    reportLocationError(error);
    if (error.code === PERMISSION_DENIED) endSession();
  };

  // Map drags during drawing are not user movement for follow purposes.
  const handleUserMove = (): void => {
    if (useMapStore.getState().activeToolId) return;
    queueMicrotask(endSession);
  };

  const beginSession = (mode: "follow" | "track"): void => {
    if (get().mode === "off") {
      if (!startUserWatch(handleFix, handleWatchError)) {
        reportLocationError(new Error("Geolocation unavailable"));
        return;
      }
      useInteractionManagerStore.getState().registerInteraction(USER_MOVE_INTERACTION_ID, createUserMoveInteraction(handleUserMove), "locationFollow");
    }
    set({ mode, trackCoords: [] });
  };

  return {
    mode: "off",
    lastFix: null,
    trackCoords: [],

    startFollow: () => {
      if (get().mode === "off") beginSession("follow");
    },
    stopFollow: endSession,
    toggleFollow: () => (get().mode === "off" ? beginSession("follow") : endSession()),
    toggleTrack: () => (get().mode === "track" ? endSession() : beginSession("track")),

    requestPointAtLocation: async () => {
      const { mode, lastFix } = get();
      try {
        const fix = mode !== "off" && lastFix ? lastFix : await getCurrentFix();
        useEventStore.getState().emit("mymap-location-item", { type: "Point", coordinates: fromLonLat(fix.lonLat) });
      } catch (error) {
        reportLocationError(error);
      }
    },
  };
});
