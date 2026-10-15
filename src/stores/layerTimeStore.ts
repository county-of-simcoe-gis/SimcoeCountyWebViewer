import { create } from "zustand";

interface LayerTimeState {
  indexes: Record<string, number>;
  setIndex: (layerId: string, index: number) => void;
}

export const useLayerTimeStore = create<LayerTimeState>((set) => ({
  indexes: {},
  setIndex: (layerId, index) => set((state) => ({ indexes: { ...state.indexes, [layerId]: index } })),
}));
