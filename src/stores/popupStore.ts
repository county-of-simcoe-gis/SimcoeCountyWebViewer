import { create } from "zustand";
import { Overlay } from "ol";

interface PopupContent {
  title: string;
  content: React.ReactNode;
  coordinates: number[];
}

interface PopupState {
  overlay: Overlay | null;
  isVisible: boolean;
  content: PopupContent | null;

  // Actions
  setOverlay: (overlay: Overlay) => void;
  show: (coordinates: number[], content: React.ReactNode, title: string) => void;
  hide: () => void;
  updateContent: (content: React.ReactNode) => void;
  updatePosition: (coordinates: number[]) => void;
}

export const usePopupStore = create<PopupState>((set) => ({
  overlay: null,
  isVisible: false,
  content: null,

  setOverlay: (overlay) => set({ overlay }),

  show: (coordinates, content, title) =>
    set((state) => {
      if (state.overlay) {
        state.overlay.setPosition(coordinates);
      }
      return {
        isVisible: true,
        content: { title, content, coordinates },
      };
    }),

  hide: () =>
    set((state) => {
      if (state.overlay) {
        state.overlay.setPosition(undefined);
      }
      return {
        isVisible: false,
        content: null,
      };
    }),

  updateContent: (content) =>
    set((state) => ({
      content: state.content ? { ...state.content, content } : null,
    })),

  updatePosition: (coordinates: number[]) =>
    set((state) => {
      if (state.overlay) {
        state.overlay.setPosition(coordinates);
      }
      return {
        content: state.content ? { ...state.content, coordinates } : null,
      };
    }),
}));

