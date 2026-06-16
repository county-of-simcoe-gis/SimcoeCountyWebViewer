/**
 * Store for managing Layer Info modal state
 */

import { create } from "zustand";

interface LayerInfoState {
  isOpen: boolean;
  layerURL: string | null;
  showDownload: boolean;
  secured: boolean;
  openLayerInfo: (layerURL: string, showDownload?: boolean, secured?: boolean) => void;
  closeLayerInfo: () => void;
}

export const useLayerInfoStore = create<LayerInfoState>((set) => ({
  isOpen: false,
  layerURL: null,
  showDownload: false,
  secured: false,

  openLayerInfo: (layerURL: string, showDownload: boolean = false, secured: boolean = false) => {
    set({
      isOpen: true,
      layerURL,
      showDownload,
      secured,
    });
  },

  closeLayerInfo: () => {
    set({
      isOpen: false,
      layerURL: null,
      showDownload: false,
      secured: false,
    });
  },
}));
