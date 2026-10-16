/**
 * Geometry helpers for MyMaps keyboard (text) entry.
 * Distances are ground distances on the sphere (same radius as ol/sphere).
 */

import { transform } from "ol/proj";
import { degreesToRadians, radiansToDegrees } from "@/utils/myMapsHelpers";
import myMapsConfig from "@/config/myMapsConfig.json";

export const EARTH_RADIUS_M = 6371008.8;

export type TextEntryUnit = "m" | "km" | "ft" | "mi";

export const TEXT_ENTRY_UNITS: Record<TextEntryUnit, number> = {
  m: 1,
  km: 1000,
  ft: 0.3048,
  mi: 1609.344,
};

export type TextEntryGeometry =
  | { kind: "path"; drawType: string; points: number[][] }
  | { kind: "circle"; center: number[]; radiusM: number }
  | { kind: "rectangle"; corner: number[]; widthM: number; heightM: number };

const CIRCLE_SEGMENTS = 64;

export const unitsToMeters = (value: number, unit: TextEntryUnit): number => value * TEXT_ENTRY_UNITS[unit];

// Start and destination are EPSG:3857; bearing is true north, clockwise.
export const destinationPoint = (start: number[], bearingDeg: number, distanceM: number): number[] => {
  const [lon1, lat1] = transform(start, "EPSG:3857", "EPSG:4326");
  const phi1 = degreesToRadians(lat1);
  const lambda1 = degreesToRadians(lon1);
  const theta = degreesToRadians(bearingDeg);
  const delta = distanceM / EARTH_RADIUS_M;

  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta));
  const lambda2 = lambda1 + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2));

  const lon2 = ((radiansToDegrees(lambda2) + 540) % 360) - 180;
  return transform([lon2, radiansToDegrees(phi2)], "EPSG:4326", "EPSG:3857");
};

// Closed ring (first coordinate repeated at the end).
export const geodesicCircleCoords = (center: number[], radiusM: number): number[][] => {
  const ring: number[][] = [];
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    ring.push(destinationPoint(center, (360 * i) / CIRCLE_SEGMENTS, radiusM));
  }
  ring.push(ring[0]);
  return ring;
};

// Corner is the south-west corner; the rectangle extends east by width and north by height.
export const rectangleFromCorner = (corner: number[], widthM: number, heightM: number): number[][] => {
  const southEast = destinationPoint(corner, 90, widthM);
  const northEast = destinationPoint(southEast, 0, heightM);
  const northWest = destinationPoint(corner, 0, heightM);
  return [corner, southEast, northEast, northWest, corner];
};

export const parseBearing = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 && value <= 360 ? value : null;
};

export const parseDistance = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value > 0 ? value : null;
};

export const supportsTextEntry = (drawType: string): boolean =>
  myMapsConfig.drawingTools.some((tool) => tool.drawType === drawType && tool.supportsTextEntry === true);

// Points including the start point. Polygon needs three to close a ring.
export const getMinimumPathPoints = (drawType: string): number => (drawType === "Polygon" ? 3 : 2);
