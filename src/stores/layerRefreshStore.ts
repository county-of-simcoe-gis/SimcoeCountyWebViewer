import { create } from "zustand";

interface LayerRefreshState {
  playing: Record<string, boolean>;
  setPlaying: (layerId: string, playing: boolean) => void;
}

export const useLayerRefreshStore = create<LayerRefreshState>((set) => ({
  playing: {},
  setPlaying: (layerId, playing) => set((state) => ({ playing: { ...state.playing, [layerId]: playing } })),
}));
