/**
 * Store for managing Layer Info modal state
 */

import { create } from "zustand";

interface LayerInfoState {
  isOpen: boolean;
  layerURL: string | null;
  showDownload: boolean;
  openLayerInfo: (layerURL: string, showDownload?: boolean) => void;
  closeLayerInfo: () => void;
}

export const useLayerInfoStore = create<LayerInfoState>((set) => ({
  isOpen: false,
  layerURL: null,
  showDownload: false,

  openLayerInfo: (layerURL: string, showDownload: boolean = false) => {
    set({
      isOpen: true,
      layerURL,
      showDownload,
    });
  },

  closeLayerInfo: () => {
    set({
      isOpen: false,
      layerURL: null,
      showDownload: false,
    });
  },
}));
