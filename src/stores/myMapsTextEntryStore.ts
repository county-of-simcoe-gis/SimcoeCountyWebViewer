"use client";

import { create } from "zustand";
import type { DrawType } from "@/stores/myMapsStore";
import { getMinimumPathPoints, type TextEntryGeometry, type TextEntryUnit } from "@/utils/myMapsTextEntry";

// Tools that complete after a single bearing and distance.
export const SINGLE_SEGMENT_DRAW_TYPES: string[] = ["Bearing", "Measure"];

export interface MyMapsTextEntryState {
  enabled: boolean;
  unit: TextEntryUnit;
  drawType: string;
  // EPSG:3857 coordinates; the start point is first.
  points: number[][];
  error: string | null;
  completed: TextEntryGeometry | null;

  setEnabled: (enabled: boolean) => void;
  setUnit: (unit: TextEntryUnit) => void;
  startSession: (drawType: DrawType) => void;
  setStartPoint: (coordinate: number[]) => void;
  addPoint: (coordinate: number[]) => void;
  undo: () => void;
  finish: () => void;
  complete: (geometry: TextEntryGeometry) => void;
  setError: (error: string | null) => void;
  clearCompleted: () => void;
  reset: () => void;
}

export const useMyMapsTextEntryStore = create<MyMapsTextEntryState>((set, get) => ({
  enabled: false,
  unit: "m",
  drawType: "Cancel",
  points: [],
  error: null,
  completed: null,

  setEnabled: (enabled) => set({ enabled, drawType: "Cancel", points: [], error: null, completed: null }),

  setUnit: (unit) => set({ unit }),

  startSession: (drawType) => set({ drawType, points: [], error: null, completed: null }),

  setStartPoint: (coordinate) => set({ points: [coordinate], error: null }),

  addPoint: (coordinate) => {
    const { drawType, points } = get();
    const nextPoints = [...points, coordinate];

    if (SINGLE_SEGMENT_DRAW_TYPES.includes(drawType)) {
      set({ points: nextPoints, error: null, completed: { kind: "path", drawType, points: nextPoints } });
      return;
    }

    set({ points: nextPoints, error: null });
  },

  undo: () => {
    const { points } = get();
    // The start point is kept; leaving the tool cancels the session.
    if (points.length > 1) {
      set({ points: points.slice(0, -1), error: null });
    }
  },

  finish: () => {
    const { drawType, points } = get();
    const minimum = getMinimumPathPoints(drawType);

    if (points.length < minimum) {
      set({ error: drawType === "Polygon" ? "Add at least two segments to close a polygon." : "Add at least one segment." });
      return;
    }

    set({ error: null, completed: { kind: "path", drawType, points } });
  },

  complete: (geometry) => set({ error: null, completed: geometry }),

  setError: (error) => set({ error }),

  clearCompleted: () => set({ completed: null }),

  reset: () => set({ drawType: "Cancel", points: [], error: null, completed: null }),
}));
