"use client";

import type { WazeAlertProperties, WazeLineProperties } from "./types";

interface Five11WazePopupContentProps {
  properties: WazeAlertProperties | WazeLineProperties;
  layerName: string;
}

const WAZE_TITLE_MAP: Record<string, string> = {
  // Accidents
  ACCIDENT_MAJOR: "Major accident",
  ACCIDENT_MINOR: "Minor accident",

  // Hazards
  HAZARD_ON_ROAD: "Hazard on road",
  HAZARD_ON_ROAD_CAR_STOPPED: "Car stopped on road",
  HAZARD_ON_ROAD_CONSTRUCTION: "Road construction",
  HAZARD_ON_ROAD_EMERGENCY_VEHICLE: "Emergency vehicle on road",
  HAZARD_ON_ROAD_ICE: "Ice on road",
  HAZARD_ON_ROAD_LANE_CLOSED: "Lane closed",
  HAZARD_ON_ROAD_OBJECT: "Object on road",
  HAZARD_ON_ROAD_POT_HOLE: "Pothole",
  HAZARD_ON_ROAD_ROAD_KILL: "Roadkill",
  HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT: "Traffic light fault",
  HAZARD_ON_SHOULDER: "Hazard on shoulder",
  HAZARD_ON_SHOULDER_ANIMALS: "Animals on shoulder",
  HAZARD_ON_SHOULDER_CAR_STOPPED: "Car stopped on shoulder",
  HAZARD_ON_SHOULDER_MISSING_SIGN: "Missing sign on shoulder",
  HAZARD_WEATHER: "Weather hazard",
  HAZARD_WEATHER_FLOOD: "Flood",
  HAZARD_WEATHER_FOG: "Fog",
  HAZARD_WEATHER_HAIL: "Hail",
  HAZARD_WEATHER_HEAVY_RAIN: "Heavy rain",
  HAZARD_WEATHER_HEAVY_SNOW: "Heavy snow",

  // Road closed
  ROAD_CLOSED_EVENT: "Road closed for event",
  ROAD_CLOSED_CONSTRUCTION: "Road closed for construction",

  // Jams
  JAM_HEAVY_TRAFFIC: "Heavy traffic",
  JAM_LIGHT_TRAFFIC: "Light traffic",
  JAM_MODERATE_TRAFFIC: "Moderate traffic",
  JAM_STAND_STILL_TRAFFIC: "Standstill traffic",

  // Top-level types
  ACCIDENT: "Accident",
  CONSTRUCTION: "Construction",
  HAZARD: "Hazard",
  JAM: "Traffic jam",
  ROAD_CLOSED: "Road closed",
};

function formatWazeTitle(type?: string, subtype?: string): string {
  const upperSubtype = subtype?.toUpperCase() || "";
  const upperType = type?.toUpperCase() || "";

  if (upperSubtype && WAZE_TITLE_MAP[upperSubtype]) {
    return WAZE_TITLE_MAP[upperSubtype];
  }
  if (upperType && WAZE_TITLE_MAP[upperType]) {
    return WAZE_TITLE_MAP[upperType];
  }

  const fallback = upperSubtype || upperType;
  if (!fallback) return "Waze Report";

  return fallback
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getRelativeTimeLabel(timestamp?: number): string | null {
  if (timestamp === undefined || timestamp === null) return null;

  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

function getThumbsUpLabel(nThumbsUp?: number): string | null {
  if (!nThumbsUp || nThumbsUp <= 0) return null;
  return `${nThumbsUp} driver${nThumbsUp === 1 ? "" : "s"}`;
}

function isLineLayer(layerName: string): boolean {
  return layerName.includes("jam-lines") || layerName.includes("irregularity-lines");
}

export default function Five11WazePopupContent({ properties, layerName }: Five11WazePopupContentProps) {
  if (isLineLayer(layerName)) {
    const lineProps = properties as WazeLineProperties;
    const timestamp = lineProps.pubMillis ?? lineProps.updateDateMillis;
    const relativeTime = getRelativeTimeLabel(timestamp);
    const { speedKMH, delay, street, city } = lineProps;
    const hasDetails = (speedKMH !== undefined && speedKMH !== null) || (delay !== undefined && delay !== null) || street || city || relativeTime;

    return (
      <div className="space-y-1">
        {speedKMH !== undefined && speedKMH !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-xs font-semibold text-base-content/70">Speed</span>
            <span className="text-sm">{speedKMH} km/h</span>
          </div>
        )}
        {delay !== undefined && delay !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-xs font-semibold text-base-content/70">Delay</span>
            <span className="text-sm">{delay} min</span>
          </div>
        )}
        {street && <div className="text-sm font-medium">{street}</div>}
        {city && <div className="text-xs text-base-content/70">{city}</div>}
        {relativeTime && <div className="text-xs text-base-content/60">{relativeTime}</div>}
        {!hasDetails && <div className="text-sm text-base-content/70">No details available</div>}
      </div>
    );
  }

  const alertProps = properties as WazeAlertProperties;
  const title = formatWazeTitle(alertProps.type, alertProps.subtype);
  const relativeTime = getRelativeTimeLabel(alertProps.pubMillis);
  const thumbsUp = getThumbsUpLabel(alertProps.nThumbsUp);
  const description = alertProps.reportDescription;
  const hasDetails = alertProps.street || relativeTime || thumbsUp || description;

  return (
    <div className="space-y-1">
      <div className="font-semibold text-base leading-tight">{title}</div>
      {alertProps.street && <div className="text-sm text-base-content/80">{alertProps.street}</div>}
      {(relativeTime || thumbsUp) && (
        <div className="text-xs text-base-content/60 flex items-center gap-2">
          {relativeTime && <span>{relativeTime}</span>}
          {relativeTime && thumbsUp && <span>•</span>}
          {thumbsUp && <span>{thumbsUp}</span>}
        </div>
      )}
      {description && description !== title && <div className="text-sm text-base-content/80 mt-1">{description}</div>}
      {alertProps.city && <div className="text-xs text-base-content/60">{alertProps.city}</div>}
      {!hasDetails && <div className="text-sm text-base-content/70">No details available</div>}
    </div>
  );
}
