import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMyMapsStore, createMyMapsItem } from '@/stores/myMapsStore'
import type { MyMapsItem, DrawType } from '@/types/myMaps'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Reset store before each test
beforeEach(() => {
  useMyMapsStore.setState({
    drawType: 'Cancel',
    drawColor: '#e809e5',
    drawStyle: null,
    isEditing: false,
    editMode: null,
    items: [],
    toolTipId: '',
    toolTipClass: ''
  })
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
})

describe('myMapsStore', () => {
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      expect(result.current.drawType).toBe('Cancel')
      expect(result.current.drawColor).toBe('#e809e5')
      expect(result.current.drawStyle).toBeNull()
      expect(result.current.isEditing).toBe(false)
      expect(result.current.editMode).toBeNull()
      expect(result.current.items).toEqual([])
      expect(result.current.toolTipId).toBe('')
      expect(result.current.toolTipClass).toBe('')
    })
  })

  describe('Drawing State Management', () => {
    it('should update draw type', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      result.current.setDrawType('Point')
      expect(useMyMapsStore.getState().drawType).toBe('Point')
    })

    it('should update draw color', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      result.current.setDrawColor('#ff0000')
      expect(useMyMapsStore.getState().drawColor).toBe('#ff0000')
    })

    it('should update draw style', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      result.current.setDrawStyle(null)
      expect(useMyMapsStore.getState().drawStyle).toBeNull()
    })
  })

  describe('Edit Mode Management', () => {
    it('should toggle editing mode on', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      result.current.setEditMode(true, 'vertices')
      expect(useMyMapsStore.getState().isEditing).toBe(true)
      expect(useMyMapsStore.getState().editMode).toBe('vertices')
    })

    it('should toggle editing mode off', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      result.current.setEditMode(true, 'translate')
      result.current.setEditMode(false)
      expect(useMyMapsStore.getState().isEditing).toBe(false)
      expect(useMyMapsStore.getState().editMode).toBeNull()
    })
  })

  describe('Items Management', () => {
    it('should add new item', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      const newItem: MyMapsItem = {
        id: '1',
        label: 'Test Point',
        labelVisible: true,
        labelRotation: 0,
        drawType: 'Point',
        geometryType: 'Point',
        visible: true,
        featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        style: { fill: { color: '#e809e5' } }
      }
      
      result.current.addItem(newItem)
      
      const state = useMyMapsStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0]).toEqual(newItem)
    })

    it('should update existing item', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      const initialItem: MyMapsItem = {
        id: '1',
        label: 'Test Point',
        labelVisible: true,
        labelRotation: 0,
        drawType: 'Point',
        geometryType: 'Point',
        visible: true,
        featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        style: { fill: { color: '#e809e5' } }
      }
      
      result.current.addItem(initialItem)
      
      result.current.updateItem(initialItem.id, { label: 'Updated Point' })
      
      const state = useMyMapsStore.getState()
      expect(state.items[0].label).toBe('Updated Point')
    })

    it('should update item label', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      const item: MyMapsItem = {
        id: '1',
        label: 'Test Point',
        labelVisible: true,
        labelRotation: 0,
        drawType: 'Point',
        geometryType: 'Point',
        visible: true,
        featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        style: { fill: { color: '#e809e5' } }
      }
      
      result.current.addItem(item)
      result.current.updateItemLabel('1', 'New Label')
      
      const state = useMyMapsStore.getState()
      expect(state.items[0].label).toBe('New Label')
    })

    it('should remove item', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      const item: MyMapsItem = {
        id: '1',
        label: 'Test Point',
        labelVisible: true,
        labelRotation: 0,
        drawType: 'Point',
        geometryType: 'Point',
        visible: true,
        featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        style: { fill: { color: '#e809e5' } }
      }
      
      result.current.addItem(item)
      expect(useMyMapsStore.getState().items).toHaveLength(1)
      
      result.current.removeItem('1')
      expect(useMyMapsStore.getState().items).toHaveLength(0)
    })

    it('should toggle item visibility', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      const item: MyMapsItem = {
        id: '1',
        label: 'Test Point',
        labelVisible: true,
        labelRotation: 0,
        drawType: 'Point',
        geometryType: 'Point',
        visible: true,
        featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        style: { fill: { color: '#e809e5' } }
      }
      
      result.current.addItem(item)
      result.current.toggleItemVisibility('1')
      
      expect(useMyMapsStore.getState().items[0].visible).toBe(false)
      
      result.current.toggleItemVisibility('1')
      expect(useMyMapsStore.getState().items[0].visible).toBe(true)
    })

    it('should clear all items', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      const items: MyMapsItem[] = [
        {
          id: '1',
          label: 'Test Point 1',
          labelVisible: true,
          labelRotation: 0,
          drawType: 'Point',
          geometryType: 'Point',
          visible: true,
          featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
          style: { fill: { color: '#e809e5' } }
        },
        {
          id: '2',
          label: 'Test Point 2',
          labelVisible: true,
          labelRotation: 0,
          drawType: 'Point',
          geometryType: 'Point',
          visible: true,
          featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[1,1]}}',
          style: { fill: { color: '#ff0000' } }
        }
      ]
      
      items.forEach(item => result.current.addItem(item))
      expect(useMyMapsStore.getState().items).toHaveLength(2)
      
      result.current.clearAllItems()
      expect(useMyMapsStore.getState().items).toHaveLength(0)
    })
  })

  describe('Computed Properties', () => {
    it('should compute hasItems correctly when empty', () => {
      const { result } = renderHook(() => useMyMapsStore())
      expect(result.current.hasItems()).toBe(false)
    })

    it('should compute hasItems correctly when has items', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      const item: MyMapsItem = {
        id: '1',
        label: 'Test Point',
        labelVisible: true,
        labelRotation: 0,
        drawType: 'Point',
        geometryType: 'Point',
        visible: true,
        featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        style: { fill: { color: '#e809e5' } }
      }
      
      result.current.addItem(item)
      expect(result.current.hasItems()).toBe(true)
    })
  })

  describe('Storage Operations', () => {
    it('should save items to storage', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      const item: MyMapsItem = {
        id: '1',
        label: 'Test Point',
        labelVisible: true,
        labelRotation: 0,
        drawType: 'Point',
        geometryType: 'Point',
        visible: true,
        featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        style: { fill: { color: '#e809e5' } }
      }
      
      result.current.addItem(item)
      result.current.saveToStorage()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'simcoe-mymaps-data',
        expect.stringContaining('"items":[{"id":"1"')
      )
    })

    it('should load items from storage', () => {
      const savedItems: MyMapsItem[] = [{
        id: '1',
        label: 'Saved Point',
        labelVisible: true,
        labelRotation: 0,
        drawType: 'Point',
        geometryType: 'Point',
        visible: true,
        featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        style: { fill: { color: '#e809e5' } }
      }]
      
      const storageData = {
        items: savedItems,
        drawColor: '#e809e5',
        drawOpacity: 0.8,
        drawingCounter: 1,
        config: { showBearingButton: true, showMeasureButton: false, nonPointCursorSize: 1 }
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storageData))
      
      const { result } = renderHook(() => useMyMapsStore())
      result.current.loadFromStorage()
      
      expect(useMyMapsStore.getState().items).toEqual(savedItems)
    })

    it('should handle storage load error gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      const { result } = renderHook(() => useMyMapsStore())
      
      // Should not throw
      expect(() => result.current.loadFromStorage()).not.toThrow()
      
      // Should keep empty items array
      expect(useMyMapsStore.getState().items).toEqual([])
    })

    it('should handle null storage gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useMyMapsStore())
      result.current.loadFromStorage()
      
      expect(useMyMapsStore.getState().items).toEqual([])
    })
  })

  describe('Import Operations', () => {
    it('should import items and merge with existing', () => {
      const { result } = renderHook(() => useMyMapsStore())
      
      const existingItem: MyMapsItem = {
        id: '1',
        label: 'Existing Point',
        labelVisible: true,
        labelRotation: 0,
        drawType: 'Point',
        geometryType: 'Point',
        visible: true,
        featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        style: { fill: { color: '#e809e5' } }
      }
      
      const importedItem: MyMapsItem = {
        id: '2',
        label: 'Imported Point',
        labelVisible: true,
        labelRotation: 0,
        drawType: 'Point',
        geometryType: 'Point',
        visible: true,
        featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[1,1]}}',
        style: { fill: { color: '#ff0000' } }
      }
      
      result.current.addItem(existingItem)
      result.current.importItems(JSON.stringify({ items: [importedItem] }))
      
      const state = useMyMapsStore.getState()
      expect(state.items).toHaveLength(2)
      expect(state.items.find(i => i.id === '1')).toBeTruthy()
      expect(state.items.find(i => i.id === '2')).toBeTruthy()
    })
  })

  // Tooltip properties are managed internally and don't have specific setter methods
})

describe('createMyMapsItem helper', () => {
  it('should create item with correct structure', () => {
    const mockFeature = {
      getId: vi.fn(() => 'feature-1'),
      get: vi.fn(() => undefined),
      getProperties: vi.fn(() => ({ label: 'Test Label', drawType: 'Point' })),
      getGeometry: vi.fn(() => ({ getType: vi.fn(() => 'Point') }))
    }
    
    const item = createMyMapsItem(
      mockFeature as unknown as Parameters<typeof createMyMapsItem>[0],
      'Point' as DrawType,
      'Test Feature',
      { fill: { color: '#ff0000' } } // Valid StyleJSON
    )
    
    expect(item).toMatchObject({
      id: expect.any(String),
      label: 'Test Feature',
      drawType: 'Point',
      geometryType: 'Point',
      visible: true,
      featureGeoJSON: expect.any(String)
    })
  })

  it('should handle missing feature properties', () => {
    const mockFeature = {
      getId: vi.fn(() => null),
      get: vi.fn(() => undefined),
      getProperties: vi.fn(() => ({})),
      getGeometry: vi.fn(() => ({ getType: vi.fn(() => 'Point') }))
    }
    
    const item = createMyMapsItem(
      mockFeature as unknown as Parameters<typeof createMyMapsItem>[0],
      'Point' as DrawType,
      'Default Label',
      { fill: { color: '#ff0000' } } // Valid StyleJSON
    )
    
    expect(item.id).toMatch(/^mymaps_\d+_[a-z0-9]+$/)
    expect(item.label).toBe('Default Label')
  })
})










