import { create } from "zustand";

/**
 * Layer configuration interface matching config.json structure
 */
export interface TogglerLayer {
  label: string;
  value: string;
  serverUrl: string;
  layerName: string;
  sourceTable: string;
  wfsSource: string;
  keyField: string;
  zIndex: number;
  security_keywords: string[];
}

/**
 * Toggler store state interface
 */
interface TogglerState {
  // Toggle state
  toggleOn: boolean;
  selectedLayer: TogglerLayer | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Map layer state
  layerId: string | null;
  layerUpdateTime: number;
  
  // Actions
  setToggleOn: (value: boolean) => void;
  setSelectedLayer: (layer: TogglerLayer | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLayerId: (id: string | null) => void;
  refreshLayer: () => void;
  reset: () => void;
}

/**
 * Zustand store for Toggler tool state management
 * 
 * Manages toggle switch state, selected layer, loading states, and map layer tracking.
 */
export const useTogglerStore = create<TogglerState>((set) => ({
  // Initial state
  toggleOn: false,
  selectedLayer: null,
  isLoading: false,
  error: null,
  layerId: null,
  layerUpdateTime: Date.now(),

  // Actions
  setToggleOn: (value) => set({ toggleOn: value }),
  
  setSelectedLayer: (layer) => set({ selectedLayer: layer, error: null }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  setLayerId: (id) => set({ layerId: id }),
  
  refreshLayer: () => set({ layerUpdateTime: Date.now() }),
  
  reset: () => set({
    toggleOn: false,
    selectedLayer: null,
    isLoading: false,
    error: null,
    layerId: null,
    layerUpdateTime: Date.now(),
  }),
}));

export default useTogglerStore;
