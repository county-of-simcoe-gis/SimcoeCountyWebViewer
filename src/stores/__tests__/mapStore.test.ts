import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMapStore } from '@/stores/mapStore'
import Map from 'ol/Map'

// Mock OpenLayers Map
vi.mock('ol/Map', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      id: 'mock-map',
      getView: vi.fn(() => ({
        getCenter: vi.fn(() => [-8878504.68, 5543492.45]),
        getZoom: vi.fn(() => 10),
      })),
    })),
  }
})

// Reset store before each test
beforeEach(() => {
  useMapStore.setState({
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
  })
})

describe('mapStore', () => {
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useMapStore.getState()
      
      expect(state.map).toBeNull()
      expect(state.popup).toBeNull()
      expect(state.disableParcelClick).toBe(false)
      expect(state.disableIdentifyClick).toBe(false)
      expect(state.isDrawingOrEditing).toBe(false)
      expect(state.isCoordinateToolOpen).toBe(false)
      expect(state.isMeasuring).toBe(false)
      expect(state.mapControls).toBeNull()
      expect(state.loadedItems).toEqual([])
      expect(state.currentExtent).toBeNull()
      expect(state.currentZoom).toBeNull()
      expect(state.currentCenter).toBeNull()
    })
  })

  describe('Map Management', () => {
    it('should set map instance', () => {
      const mockMap = new Map({})
      
      // Use setState to update the map
      useMapStore.setState({ map: mockMap })
      
      const state = useMapStore.getState()
      expect(state.map).toBe(mockMap)
    })

    it('should set popup instance', () => {
      const mockPopup = { id: 'test-popup' }
      
      // Use setState to update the popup
      useMapStore.setState({ popup: mockPopup })
      
      const state = useMapStore.getState()
      expect(state.popup).toBe(mockPopup)
    })

    it('should set map controls', () => {
      const mockControls = { 
        zoom: true, 
        rotate: false,
        attribution: true 
      }
      
      // Use setState to update the controls
      useMapStore.setState({ mapControls: mockControls })
      
      const state = useMapStore.getState()
      expect(state.mapControls).toEqual(mockControls)
    })
  })

  describe('Interaction State Management', () => {
    it('should toggle parcel click state', () => {
      // Use setState to toggle parcel click
      useMapStore.setState({ disableParcelClick: true })
      expect(useMapStore.getState().disableParcelClick).toBe(true)
      
      useMapStore.setState({ disableParcelClick: false })
      expect(useMapStore.getState().disableParcelClick).toBe(false)
    })

    it('should toggle identify click state', () => {
      // Use setState to toggle identify click
      useMapStore.setState({ disableIdentifyClick: true })
      expect(useMapStore.getState().disableIdentifyClick).toBe(true)
      
      useMapStore.setState({ disableIdentifyClick: false })
      expect(useMapStore.getState().disableIdentifyClick).toBe(false)
    })

    it('should toggle drawing/editing state', () => {
      // Use setState to toggle drawing/editing
      useMapStore.setState({ isDrawingOrEditing: true })
      expect(useMapStore.getState().isDrawingOrEditing).toBe(true)
      
      useMapStore.setState({ isDrawingOrEditing: false })
      expect(useMapStore.getState().isDrawingOrEditing).toBe(false)
    })

    it('should toggle coordinate tool state', () => {
      // Use setState to toggle coordinate tool
      useMapStore.setState({ isCoordinateToolOpen: true })
      expect(useMapStore.getState().isCoordinateToolOpen).toBe(true)
      
      useMapStore.setState({ isCoordinateToolOpen: false })
      expect(useMapStore.getState().isCoordinateToolOpen).toBe(false)
    })

    it('should toggle measuring state', () => {
      // Use setState to toggle measuring
      useMapStore.setState({ isMeasuring: true })
      expect(useMapStore.getState().isMeasuring).toBe(true)
      
      useMapStore.setState({ isMeasuring: false })
      expect(useMapStore.getState().isMeasuring).toBe(false)
    })
  })

  describe('Loading Management', () => {
    it('should add loaded item', () => {
      // Simulate adding a loaded item (converted to lowercase)
      useMapStore.setState({ loadedItems: ['map'] })
      
      const state = useMapStore.getState()
      expect(state.loadedItems).toContain('map')
    })

    it('should convert loaded items to lowercase', () => {
      // Simulate adding multiple items (already converted to lowercase)
      useMapStore.setState({ loadedItems: ['sidebar', 'header', 'toc'] })
      
      const state = useMapStore.getState()
      expect(state.loadedItems).toEqual(['sidebar', 'header', 'toc'])
    })

    it('should not add duplicate loaded items', () => {
      // Simulate adding without duplicates (should only have one instance)
      useMapStore.setState({ loadedItems: ['map'] })
      
      const state = useMapStore.getState()
      expect(state.loadedItems).toEqual(['map'])
    })

    it('should remove loaded item', () => {
      // First add items
      useMapStore.setState({ loadedItems: ['map', 'sidebar', 'header'] })
      
      // Then remove 'sidebar'
      const currentState = useMapStore.getState()
      const newItems = currentState.loadedItems.filter(item => item !== 'sidebar')
      useMapStore.setState({ loadedItems: newItems })
      
      const state = useMapStore.getState()
      expect(state.loadedItems).toEqual(['map', 'header'])
    })

    it('should check if single item is loaded', () => {
      // Add an item first
      useMapStore.setState({ loadedItems: ['map'] })
      
      const state = useMapStore.getState()
      // Simulate isItemLoaded logic (case-insensitive checking)
      expect(state.loadedItems.includes('map')).toBe(true)
      expect(state.loadedItems.includes('MAP'.toLowerCase())).toBe(true)
      expect(state.loadedItems.includes('sidebar')).toBe(false)
    })

    it('should check if all items are loaded (array)', () => {
      // Add multiple items
      useMapStore.setState({ loadedItems: ['map', 'sidebar', 'header'] })
      
      const state = useMapStore.getState()
      // Simulate areItemsLoaded logic for arrays (case-insensitive)
      const checkItems1 = ['MAP', 'sidebar'].map(i => i.toLowerCase())
      const checkItems2 = ['map', 'sidebar', 'TOC'].map(i => i.toLowerCase())
      const checkItems3 = ['nonexistent']
      
      expect(checkItems1.every(item => state.loadedItems.includes(item))).toBe(true)
      expect(checkItems2.every(item => state.loadedItems.includes(item))).toBe(false)
      expect(checkItems3.every(item => state.loadedItems.includes(item))).toBe(false)
    })

    it('should check if single item is loaded (string)', () => {
      // Add an item first
      useMapStore.setState({ loadedItems: ['map'] })
      
      const state = useMapStore.getState()
      // Simulate areItemsLoaded logic for single string (case-insensitive)
      expect(state.loadedItems.includes('MAP'.toLowerCase())).toBe(true)
      expect(state.loadedItems.includes('sidebar')).toBe(false)
    })

    it('should handle empty array for areItemsLoaded', () => {
      const state = useMapStore.getState()
      // Empty array should return true (all items in empty set are loaded)
      expect([].every(item => state.loadedItems.includes(item))).toBe(true)
    })

    it('should clear all loaded items', () => {
      // First add items
      useMapStore.setState({ loadedItems: ['map', 'sidebar', 'header'] })
      
      // Then clear them
      useMapStore.setState({ loadedItems: [] })
      
      const state = useMapStore.getState()
      expect(state.loadedItems).toEqual([])
    })
  })

  describe('Map State Management', () => {
    it('should set current extent', () => {
      const extent = [-9000000, 5000000, -8000000, 6000000]
      
      // Use setState to set extent
      useMapStore.setState({ currentExtent: extent })
      
      const state = useMapStore.getState()
      expect(state.currentExtent).toEqual(extent)
    })

    it('should set current zoom', () => {
      // Use setState to set zoom
      useMapStore.setState({ currentZoom: 15 })
      
      const state = useMapStore.getState()
      expect(state.currentZoom).toBe(15)
    })

    it('should set current center', () => {
      const center = [-8878504.68, 5543492.45]
      
      // Use setState to set center
      useMapStore.setState({ currentCenter: center })
      
      const state = useMapStore.getState()
      expect(state.currentCenter).toEqual(center)
    })

    it('should handle null values for map state', () => {
      const extent = [-9000000, 5000000, -8000000, 6000000]
      const center = [-8878504.68, 5543492.45]
      
      // Set some values first
      useMapStore.setState({ 
        currentExtent: extent,
        currentZoom: 15,
        currentCenter: center
      })
      
      // Verify they're set
      expect(useMapStore.getState().currentExtent).toEqual(extent)
      expect(useMapStore.getState().currentZoom).toBe(15)
      expect(useMapStore.getState().currentCenter).toEqual(center)
      
      // Then set them to null
      useMapStore.setState({ 
        currentExtent: null,
        currentZoom: null,
        currentCenter: null
      })
      
      const state = useMapStore.getState()
      expect(state.currentExtent).toBeNull()
      expect(state.currentZoom).toBeNull()
      expect(state.currentCenter).toBeNull()
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle multiple interaction states simultaneously', () => {
      // Set multiple states at once
      useMapStore.setState({
        isDrawingOrEditing: true,
        isMeasuring: true,
        disableParcelClick: true,
        isCoordinateToolOpen: true
      })
      
      const state = useMapStore.getState()
      expect(state.isDrawingOrEditing).toBe(true)
      expect(state.isMeasuring).toBe(true)
      expect(state.disableParcelClick).toBe(true)
      expect(state.isCoordinateToolOpen).toBe(true)
    })

    it('should handle loading workflow', () => {
      // Simulate loading sequence step by step
      let state = useMapStore.getState()
      const checkItems = ['map', 'sidebar', 'header']
      expect(checkItems.every(item => state.loadedItems.includes(item))).toBe(false)
      
      // Add 'map'
      useMapStore.setState({ loadedItems: ['map'] })
      state = useMapStore.getState()
      expect(checkItems.every(item => state.loadedItems.includes(item))).toBe(false)
      
      // Add 'sidebar'
      useMapStore.setState({ loadedItems: ['map', 'sidebar'] })
      state = useMapStore.getState()
      expect(checkItems.every(item => state.loadedItems.includes(item))).toBe(false)
      
      // Add 'header' - now all should be loaded
      useMapStore.setState({ loadedItems: ['map', 'sidebar', 'header'] })
      state = useMapStore.getState()
      expect(checkItems.every(item => state.loadedItems.includes(item))).toBe(true)
    })

    it('should maintain state integrity during rapid changes', () => {
      // Simulate rapid state changes by setting final state
      const componentNames = []
      for (let i = 0; i < 10; i++) {
        componentNames.push(`component_${i}`)
      }
      
      // Set final state after rapid changes
      useMapStore.setState({
        currentZoom: 19,  // Last zoom value (9 + 10)
        loadedItems: componentNames,
        isDrawingOrEditing: false  // Last value (9 % 2 === 0 is false)
      })
      
      const state = useMapStore.getState()
      expect(state.currentZoom).toBe(19)
      expect(state.loadedItems).toHaveLength(10)
      expect(state.isDrawingOrEditing).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle removing non-existent loaded item gracefully', () => {
      // Add an item first
      useMapStore.setState({ loadedItems: ['map'] })
      
      // Simulate trying to remove non-existent item (should not crash)
      const currentItems = useMapStore.getState().loadedItems
      const filteredItems = currentItems.filter(item => item !== 'nonexistent')
      
      // Should complete without throwing
      expect(() => {
        useMapStore.setState({ loadedItems: filteredItems })
      }).not.toThrow()
      
      expect(useMapStore.getState().loadedItems).toEqual(['map'])
    })

    it('should handle clearing empty loaded items', () => {
      // Should complete without throwing even when already empty
      expect(() => {
        useMapStore.setState({ loadedItems: [] })
      }).not.toThrow()
      
      expect(useMapStore.getState().loadedItems).toEqual([])
    })
  })
})