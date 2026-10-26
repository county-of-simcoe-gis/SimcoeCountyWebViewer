import type Map from "ol/Map";
import PointerInteraction from "ol/interaction/Pointer";
import { useMapStore } from "@/stores/mapStore";
import { cancelTemporaryMarker, removeMarker, setMarkerPosition, type LocationFix } from "@/utils/openlayers/LocationMarker";

export type { LocationFix };

export const RECENTER_INTERVAL_MS = 3000;
const FOLLOW_ZOOM = 16;
const INITIAL_ANIMATION_MS = 1000;
const RECENTER_ANIMATION_MS = 800;
const GEOLOCATION_TIMEOUT_MS = 5000;

interface FollowUpdate {
  fix: LocationFix;
  coordinate: number[];
  trackCoords: number[][] | null;
  now: number;
}

let watchId: number | null = null;
let wakeLock: WakeLockSentinel | null = null;
let lastRecenterAt = 0;

const toFix = (position: GeolocationPosition): LocationFix => ({
  lonLat: [position.coords.longitude, position.coords.latitude],
  accuracy: position.coords.accuracy,
});

const requestWakeLock = (): void => {
  navigator.wakeLock
    ?.request("screen")
    .then((sentinel) => {
      if (watchId === null) void sentinel.release();
      else wakeLock = sentinel;
    })
    .catch(() => undefined);
};

const handleVisibilityChange = (): void => {
  if (document.visibilityState === "visible" && watchId !== null && (!wakeLock || wakeLock.released)) requestWakeLock();
};

const recenter = (map: Map, coordinate: number[], isInitial: boolean): void => {
  const view = map.getView();
  const zoomOptions = isInitial && (view.getZoom() ?? 0) < FOLLOW_ZOOM ? { zoom: FOLLOW_ZOOM } : {};
  view.animate({
    center: coordinate,
    duration: isInitial ? INITIAL_ANIMATION_MS : RECENTER_ANIMATION_MS,
    ...zoomOptions,
  });
};

export function startUserWatch(onFix: (fix: LocationFix) => void, onError: (error: GeolocationPositionError) => void): boolean {
  if (!navigator.geolocation) return false;

  cancelTemporaryMarker();
  watchId = navigator.geolocation.watchPosition((position) => onFix(toFix(position)), onError, { enableHighAccuracy: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  requestWakeLock();
  return true;
}

export function stopUserWatch(): void {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  void wakeLock?.release();
  wakeLock = null;
  lastRecenterAt = 0;
  removeMarker();
}

export function updateFollowView({ fix, coordinate, trackCoords, now }: FollowUpdate): void {
  const map = useMapStore.getState().map;
  if (!map) return;

  setMarkerPosition(fix, coordinate, trackCoords);

  const isInitial = lastRecenterAt === 0;
  if (isInitial || now - lastRecenterAt >= RECENTER_INTERVAL_MS) {
    recenter(map, coordinate, isInitial);
    lastRecenterAt = now;
  }
}

export function getCurrentFix(): Promise<LocationFix> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => resolve(toFix(position)), reject, { timeout: GEOLOCATION_TIMEOUT_MS });
  });
}

// Drags and pinches are reported without consuming the event, so map panning still works.
export function createUserMoveInteraction(onUserMove: () => void): PointerInteraction {
  return new PointerInteraction({
    handleDownEvent: () => true,
    handleDragEvent: () => onUserMove(),
    stopDown: () => false,
  });
}
