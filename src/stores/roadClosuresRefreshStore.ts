import { create } from "zustand";

/**
 * Bumped whenever a Road Closures ArcGIS feature (Block/Closure/Detour) is added, updated, or
 * deleted so RoadClosuresLayers.tsx knows to reload the corresponding map layer(s).
 */
interface RoadClosuresRefreshStore {
  version: number;
  bump: () => void;
}

export const useRoadClosuresRefreshStore = create<RoadClosuresRefreshStore>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));
