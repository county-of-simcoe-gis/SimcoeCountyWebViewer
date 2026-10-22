/**
 * Store for managing Layer Info modal state
 */

import { create } from "zustand";
import type { LayerInfoFallback } from "@/types/layerInfo";

interface LayerInfoState {
  isOpen: boolean;
  layerURL: string | null;
  showDownload: boolean;
  secured: boolean;
  fallback: LayerInfoFallback | null;
  openLayerInfo: (layerURL: string, showDownload?: boolean, secured?: boolean, fallback?: LayerInfoFallback) => void;
  closeLayerInfo: () => void;
}

export const useLayerInfoStore = create<LayerInfoState>((set) => ({
  isOpen: false,
  layerURL: null,
  showDownload: false,
  secured: false,
  fallback: null,

  openLayerInfo: (layerURL: string, showDownload: boolean = false, secured: boolean = false, fallback?: LayerInfoFallback) => {
    set({
      isOpen: true,
      layerURL,
      showDownload,
      secured,
      fallback: fallback ?? null,
    });
  },

  closeLayerInfo: () => {
    set({
      isOpen: false,
      layerURL: null,
      showDownload: false,
      secured: false,
      fallback: null,
    });
  },
}));
