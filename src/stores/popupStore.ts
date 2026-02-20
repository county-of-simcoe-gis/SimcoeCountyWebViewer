import { create } from "zustand";
import { Overlay } from "ol";

export interface PopupFeature {
  id: string;
  title: string;
  content: React.ReactNode;
  layerName?: string;
}

interface PopupState {
  overlay: Overlay | null;
  isVisible: boolean;
  features: PopupFeature[];
  coordinates: number[] | null;
  selectedIndex: number;
  /** Optional callback invoked when the popup is hidden (e.g. via the × button). */
  onCloseCallback: (() => void) | null;

  // Actions
  setOverlay: (overlay: Overlay) => void;
  show: (coordinates: number[], content: React.ReactNode, title: string, layerName?: string) => void;
  showMultiple: (coordinates: number[], features: PopupFeature[]) => void;
  addFeature: (feature: PopupFeature) => void;
  hide: () => void;
  /** Register a callback that will be invoked when hide() is called. */
  setOnClose: (cb: (() => void) | null) => void;
  selectFeature: (index: number) => void;
  nextFeature: () => void;
  prevFeature: () => void;
  updateContent: (content: React.ReactNode) => void;
  updatePosition: (coordinates: number[]) => void;
}

export const usePopupStore = create<PopupState>((set, get) => ({
  overlay: null,
  isVisible: false,
  features: [],
  coordinates: null,
  selectedIndex: 0,
  onCloseCallback: null,

  setOverlay: (overlay) => set({ overlay }),

  setOnClose: (cb) => set({ onCloseCallback: cb }),

  // Show a single feature (backwards compatible)
  show: (coordinates, content, title, layerName) =>
    set((state) => {
      if (state.overlay) {
        state.overlay.setPosition(coordinates);
      }
      const feature: PopupFeature = {
        id: `${Date.now()}-${Math.random()}`,
        title,
        content,
        layerName,
      };
      return {
        isVisible: true,
        features: [feature],
        coordinates,
        selectedIndex: 0,
      };
    }),

  // Show multiple features at once
  showMultiple: (coordinates, features) =>
    set((state) => {
      if (state.overlay) {
        state.overlay.setPosition(coordinates);
      }
      return {
        isVisible: true,
        features,
        coordinates,
        selectedIndex: 0,
      };
    }),

  // Add a feature to existing popup (for multi-layer hits)
  addFeature: (feature) =>
    set((state) => ({
      features: [...state.features, feature],
    })),

  hide: () => {
    const { onCloseCallback } = get();
    if (onCloseCallback) {
      onCloseCallback();
    }
    set((state) => {
      if (state.overlay) {
        state.overlay.setPosition(undefined);
      }
      return {
        isVisible: false,
        features: [],
        coordinates: null,
        selectedIndex: 0,
        onCloseCallback: null,
      };
    });
  },

  selectFeature: (index) => {
    const { features } = get();
    if (index >= 0 && index < features.length) {
      set({ selectedIndex: index });
    }
  },

  nextFeature: () => {
    const { features, selectedIndex } = get();
    if (features.length > 1) {
      set({ selectedIndex: (selectedIndex + 1) % features.length });
    }
  },

  prevFeature: () => {
    const { features, selectedIndex } = get();
    if (features.length > 1) {
      set({ selectedIndex: (selectedIndex - 1 + features.length) % features.length });
    }
  },

  updateContent: (content) =>
    set((state) => {
      const currentFeature = state.features[state.selectedIndex];
      if (currentFeature) {
        const updatedFeatures = [...state.features];
        updatedFeatures[state.selectedIndex] = { ...currentFeature, content };
        return { features: updatedFeatures };
      }
      return {};
    }),

  updatePosition: (coordinates: number[]) =>
    set((state) => {
      if (state.overlay) {
        state.overlay.setPosition(coordinates);
      }
      return { coordinates };
    }),
}));
