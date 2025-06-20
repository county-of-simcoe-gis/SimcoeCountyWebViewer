import { create } from 'zustand'
import Map from 'ol/Map'

// Map interaction states that were previously window variables
interface MapState {
  // Core map instance
  map: Map | null  // OpenLayers Map instance
  
  // Popup state
  popup: unknown | null  // Popup instance
  
  // Interaction flags (previously window.disableParcelClick, etc.)
  disableParcelClick: boolean
  disableIdentifyClick: boolean
  isDrawingOrEditing: boolean
  isCoordinateToolOpen: boolean
  isMeasuring: boolean
  
  // Map controls configuration
  mapControls: Record<string, unknown> | null
  
  // Loading tracking (previously window.loaded array)
  loadedItems: string[]
  
  // Map state
  currentExtent: number[] | null
  currentZoom: number | null
  currentCenter: number[] | null
  
  // Actions
  setMap: (map: Map) => void
  setPopup: (popup: unknown) => void
  setDisableParcelClick: (disabled: boolean) => void
  setDisableIdentifyClick: (disabled: boolean) => void
  setIsDrawingOrEditing: (isDrawing: boolean) => void
  setIsCoordinateToolOpen: (isOpen: boolean) => void
  setIsMeasuring: (isMeasuring: boolean) => void
  setMapControls: (controls: Record<string, unknown>) => void
  
  // Loading management (replaces window.loaded array)
  addLoadedItem: (item: string) => void
  removeLoadedItem: (item: string) => void
  isItemLoaded: (item: string) => boolean
  areItemsLoaded: (items: string | string[]) => boolean
  clearLoadedItems: () => void
  
  // Map state management
  setCurrentExtent: (extent: number[]) => void
  setCurrentZoom: (zoom: number) => void
  setCurrentCenter: (center: number[]) => void
}

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  map: null,
  popup: null,
  disableParcelClick: false,
  disableIdentifyClick: false,
  isDrawingOrEditing: false,
  isCoordinateToolOpen: false,
  isMeasuring: false,
  mapControls: null,
  loadedItems: [],
  currentExtent: null,
  currentZoom: null,
  currentCenter: null,
  
  // Actions
  setMap: (map) => set({ map }),
  setPopup: (popup) => set({ popup }),
  setDisableParcelClick: (disabled) => set({ disableParcelClick: disabled }),
  setDisableIdentifyClick: (disabled) => set({ disableIdentifyClick: disabled }),
  setIsDrawingOrEditing: (isDrawing) => set({ isDrawingOrEditing: isDrawing }),
  setIsCoordinateToolOpen: (isOpen) => set({ isCoordinateToolOpen: isOpen }),
  setIsMeasuring: (isMeasuring) => set({ isMeasuring }),
  setMapControls: (controls) => set({ mapControls: controls }),
  
  // Loading management
  addLoadedItem: (item) => {
    const state = get()
    const itemLower = item.toLowerCase()
    if (!state.loadedItems.includes(itemLower)) {
      set({ loadedItems: [...state.loadedItems, itemLower] })
    }
  },
  
  removeLoadedItem: (item) => {
    const state = get()
    const itemLower = item.toLowerCase()
    set({ 
      loadedItems: state.loadedItems.filter(loadedItem => loadedItem !== itemLower) 
    })
  },
  
  isItemLoaded: (item) => {
    const state = get()
    return state.loadedItems.includes(item.toLowerCase())
  },
  
  areItemsLoaded: (items) => {
    const state = get()
    if (Array.isArray(items)) {
      return items.every(item => state.loadedItems.includes(item.toLowerCase()))
    } else {
      return state.loadedItems.includes(items.toLowerCase())
    }
  },
  
  clearLoadedItems: () => set({ loadedItems: [] }),
  
  // Map state management  
  setCurrentExtent: (extent) => set({ currentExtent: extent }),
  setCurrentZoom: (zoom) => set({ currentZoom: zoom }),
  setCurrentCenter: (center) => set({ currentCenter: center }),
})) 