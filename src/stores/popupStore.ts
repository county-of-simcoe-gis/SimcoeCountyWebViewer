import { create } from "zustand";
import { Overlay } from "ol";
import { setStorageItem, getStorageItem } from "@/utils/storage";

const ALWAYS_REPORTS_TAB_KEY = "sc-always-reports-tab";

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
  /** When true, map-click popup content is sent directly to the Reports tab. */
  alwaysUseReportsTab: boolean;
  /** The raw interaction Result[] from the last map click (used by pop-out to render collapsible list). */
  rawResults: unknown[] | null;
  /** Pending property report coordinates requested by another component (e.g. AppTrackPopup). */
  pendingPropertyLookup: { coordinates: number[]; zoomToFeature: boolean } | null;

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
  setAlwaysUseReportsTab: (value: boolean) => void;
  setRawResults: (results: unknown[] | null) => void;
  /** Request that PropertyReportClick show a property report for the given coordinates. */
  requestPropertyReport: (coordinates: number[], zoomToFeature?: boolean) => void;
  /** Clear the pending property lookup after it has been consumed. */
  clearPendingPropertyLookup: () => void;
}

export const usePopupStore = create<PopupState>((set, get) => ({
  overlay: null,
  isVisible: false,
  features: [],
  coordinates: null,
  selectedIndex: 0,
  onCloseCallback: null,
  alwaysUseReportsTab: typeof window !== "undefined" && getStorageItem(ALWAYS_REPORTS_TAB_KEY) === "true",
  rawResults: null,
  pendingPropertyLookup: null,

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
        rawResults: null,
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

  setAlwaysUseReportsTab: (value: boolean) => {
    if (typeof window !== "undefined") {
      setStorageItem(ALWAYS_REPORTS_TAB_KEY, String(value));
    }
    set({ alwaysUseReportsTab: value });
  },

  setRawResults: (results) => set({ rawResults: results }),

  requestPropertyReport: (coordinates, zoomToFeature = true) => set({ pendingPropertyLookup: { coordinates, zoomToFeature } }),

  clearPendingPropertyLookup: () => set({ pendingPropertyLookup: null }),
}));
